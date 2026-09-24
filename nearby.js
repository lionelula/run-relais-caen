/* OpenStreetMap POIs via Overpass. Proximity is geometric, not walking distance. */
(function (root) {
  'use strict';
  const metersPerDegree = 111195;
  const categories = {
    cafe: ['food','☕','Café'], restaurant: ['food','🍴','Restaurant'], fast_food: ['food','🥪','Restauration rapide'], bar: ['food','🍹','Bar'], pub: ['food','🍹','Pub'],
    bakery: ['shop','🥖','Boulangerie'], convenience: ['shop','🛒','Épicerie'], supermarket: ['shop','🛒','Supermarché'], sports: ['shop','👟','Magasin de sport'],
    drinking_water: ['services','💧','Eau potable'], toilets: ['services','WC','Toilettes']
  };

  function boundsForRoute(points, radius = 550) {
    if (!Array.isArray(points) || points.length < 2 || points.some(p => !Array.isArray(p) || p.length !== 2 || p.some(v => !Number.isFinite(v)))) throw new Error('Tracé manquant pour chercher les lieux.');
    const latitudes = points.map(p => p[0]), longitudes = points.map(p => p[1]);
    const south = Math.min(...latitudes), north = Math.max(...latitudes), west = Math.min(...longitudes), east = Math.max(...longitudes);
    const latMargin = radius / metersPerDegree, lonMargin = latMargin / Math.cos((south + north) / 2 * Math.PI / 180);
    return [south - latMargin, west - lonMargin, north + latMargin, east + lonMargin];
  }

  function buildQuery(bounds) {
    const box = bounds.map(v => v.toFixed(6)).join(',');
    return `[out:json][timeout:20];(nwr["amenity"~"^(cafe|restaurant|fast_food|bar|pub|drinking_water|toilets)$"](${box});nwr["shop"~"^(bakery|convenience|supermarket|sports)$"](${box}););out center tags;`;
  }

  // Local equirectangular projection: appropriate for the Caen-sized search area.
  // Segment distance includes its endpoints; points near the middle of a long
  // route are found too, rather than only those close to A or B.
  function distanceToRoute(point, line) {
    const lonScale = metersPerDegree * Math.cos(point[0] * Math.PI / 180);
    let closestSquared = Infinity;
    for (let i = 1; i < line.length; i++) {
      const ax = (line[i-1][1] - point[1]) * lonScale, ay = (line[i-1][0] - point[0]) * metersPerDegree;
      const bx = (line[i][1] - point[1]) * lonScale, by = (line[i][0] - point[0]) * metersPerDegree;
      const dx = bx - ax, dy = by - ay, lengthSquared = dx*dx + dy*dy;
      const fraction = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, -(ax*dx + ay*dy) / lengthSquared));
      closestSquared = Math.min(closestSquared, (ax + fraction*dx)**2 + (ay + fraction*dy)**2);
    }
    return Math.sqrt(closestSquared);
  }

  function parsePlaces(data) {
    if (data.remark || !Array.isArray(data.elements)) throw new Error('La recherche des lieux n’a pas abouti. Réessaie dans un moment.');
    const result = [], ids = new Set();
    for (const element of data.elements) {
      const tags = element.tags || {};
      if (['private','no'].includes(tags.access) || tags.disused === 'yes' || tags.abandoned === 'yes' || (tags.amenity === 'drinking_water' && tags.drinking_water === 'no')) continue;
      const categoryId = categories[tags.amenity] ? tags.amenity : tags.shop;
      const category = categories[categoryId];
      const location = element.type === 'node' ? element : element.center;
      if (!category || !location || !Number.isFinite(location.lat) || !Number.isFinite(location.lon) || Math.abs(location.lat) > 90 || Math.abs(location.lon) > 180 || !['node','way','relation'].includes(element.type) || !Number.isSafeInteger(element.id)) continue;
      const id = `${element.type}/${element.id}`;
      if (ids.has(id)) continue;
      ids.add(id);
      const [type, icon, label] = category;
      const place = {
        id, type, category: categoryId, icon, label, name: tags.name || tags.brand || `${label} (nom non renseigné)`,
        coordinates: [location.lat,location.lon],
        address: [tags['addr:housenumber'],tags['addr:street']].filter(Boolean).join(' ') || 'Adresse non renseignée dans OpenStreetMap',
        source: `https://www.openstreetmap.org/${id}`,
        access: tags.access === 'customers' ? 'Accès réservé à la clientèle' : null,
        fee: tags.fee === 'yes' ? 'Accès payant indiqué' : null,
        openingHours: tags.opening_hours || null
      };
      // One venue can be mapped as both a building and a node.
      if (tags.name && result.some(p => p.name.toLocaleLowerCase('fr') === place.name.toLocaleLowerCase('fr') && p.type === type && distanceToRoute(place.coordinates,[p.coordinates,p.coordinates]) < 35)) continue;
      result.push(place);
    }
    return result;
  }

  function nearRoute(places, line, radius) {
    return places.map(place => ({ ...place, distance: distanceToRoute(place.coordinates,line) }))
      .filter(place => place.distance <= radius).sort((a,b) => a.distance-b.distance || a.name.localeCompare(b.name,'fr'));
  }

  function routeLengthMeters(line) {
    if (!Array.isArray(line) || line.length < 2) throw new Error('Tracé manquant pour découper la recherche.');
    let total = 0;
    for (let i = 1; i < line.length; i++) {
      const lat = (line[i - 1][0] + line[i][0]) / 2 * Math.PI / 180;
      const dx = (line[i][1] - line[i - 1][1]) * metersPerDegree * Math.cos(lat);
      const dy = (line[i][0] - line[i - 1][0]) * metersPerDegree;
      total += Math.hypot(dx, dy);
    }
    return total;
  }

  function splitRoute(line, maximumMeters = 1400) {
    if (!Number.isFinite(maximumMeters) || maximumMeters < 300) throw new Error('Taille de secteur invalide.');
    const chunks = [];
    let chunk = [line[0]], length = 0;
    for (let i = 1; i < line.length; i++) {
      const previous = line[i - 1], current = line[i];
      const lat = (previous[0] + current[0]) / 2 * Math.PI / 180;
      const segment = Math.hypot((current[1] - previous[1]) * metersPerDegree * Math.cos(lat), (current[0] - previous[0]) * metersPerDegree);
      if (chunk.length > 1 && length + segment > maximumMeters) {
        chunks.push(chunk);
        chunk = [previous, current];
        length = segment;
      } else {
        chunk.push(current);
        length += segment;
      }
    }
    if (chunk.length > 1) chunks.push(chunk);
    return chunks;
  }

  async function fetchPlaces(bounds, signal, fetcher = root.fetch.bind(root)) {
    const response = await fetcher('https://overpass.private.coffee/api/interpreter', {
      method: 'POST', body: new URLSearchParams({data:buildQuery(bounds)}), signal
    });
    if (!response.ok) throw new Error(response.status === 429 ? 'La recherche est très sollicitée. Réessaie dans un moment.' : 'La recherche des lieux est indisponible. Tu peux réessayer.');
    return parsePlaces(await response.json());
  }

  async function fetchPlacesAlongRoute(line, radius = 550, signal, fetcher = root.fetch.bind(root), onChunk) {
    const chunks = splitRoute(line);
    const merged = new Map();
    let nextChunk = 0;
    async function worker() {
      while (nextChunk < chunks.length) {
        const chunk = chunks[nextChunk++];
        const places = await fetchPlaces(boundsForRoute(chunk, radius), signal, fetcher);
        for (const place of places) if (!merged.has(place.id)) merged.set(place.id, place);
        if (typeof onChunk === 'function') onChunk([...merged.values()]);
      }
    }
    const workers = Array.from({ length: Math.min(3, chunks.length) }, () => worker());
    const results = await Promise.allSettled(workers);
    const failure = results.find(result => result.status === 'rejected');
    if (failure) throw failure.reason;
    return [...merged.values()];
  }

  const cacheKey = 'run-relais-nearby-v2';
  const cacheLifetime = 30 * 60 * 1000;
  function readCache(storage, now = Date.now()) {
    try {
      storage = storage || root.sessionStorage;
      const entries = JSON.parse(storage.getItem(cacheKey) || '[]');
      if (!Array.isArray(entries)) return [];
      return entries.filter(entry => entry && Number.isFinite(entry.savedAt) && now - entry.savedAt >= 0 && now - entry.savedAt < cacheLifetime && Array.isArray(entry.bounds) && entry.bounds.length === 4 && entry.bounds.every(Number.isFinite) && Array.isArray(entry.places)).slice(-8);
    } catch { return []; }
  }
  function writeCache(entries, storage) {
    try { (storage || root.sessionStorage).setItem(cacheKey,JSON.stringify(entries.slice(-8))); } catch { /* Storage unavailable: in-memory cache still works. */ }
  }

  const api = { boundsForRoute, buildQuery, distanceToRoute, nearRoute, routeLengthMeters, splitRoute, parsePlaces, fetchPlaces, fetchPlacesAlongRoute, readCache, writeCache };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.NearbyPlaces = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
