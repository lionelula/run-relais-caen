/* Pedestrian routing only. Native Valhalla shapes use polyline precision 6.
 * https://valhalla.github.io/valhalla/api/route/api-reference/ */
(function (root) {
  'use strict';
  const endpoint = 'https://valhalla1.openstreetmap.de/route';

  function buildRequest(start, end) {
    const valid = (p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite) && Math.abs(p[0]) <= 90 && Math.abs(p[1]) <= 180;
    if (!valid(start) || !valid(end)) throw new Error('Points de départ ou d’arrivée invalides.');
    if (Math.abs(start[0] - end[0]) + Math.abs(start[1] - end[1]) < 0.00005) throw new Error('Choisis deux points différents pour calculer un trajet.');
    return {
      locations: [start, end].map(([lat, lon]) => ({ lat, lon, type: 'break', search_cutoff: 100 })),
      costing: 'pedestrian',
      costing_options: { pedestrian: { walking_speed: 5, use_ferry: 0 } },
      units: 'kilometers', language: 'fr-FR', directions_type: 'instructions'
    };
  }

  function decodeShape(shape) {
    if (typeof shape !== 'string' || !shape.length) throw new Error('Tracé absent.');
    let index = 0, lat = 0, lon = 0;
    const points = [];
    function delta() {
      let result = 0, shift = 0, byte;
      do {
        if (index >= shape.length || shift > 30) throw new Error('Tracé incomplet.');
        byte = shape.charCodeAt(index++) - 63;
        if (byte < 0 || byte > 63) throw new Error('Tracé invalide.');
        result |= (byte & 31) << shift;
        shift += 5;
      } while (byte >= 32);
      return (result & 1) ? ~(result >> 1) : result >> 1;
    }
    while (index < shape.length) {
      lat += delta(); lon += delta();
      if (Math.abs(lat) > 90000000 || Math.abs(lon) > 180000000) throw new Error('Coordonnées de tracé invalides.');
      points.push([lat / 1e6, lon / 1e6]);
    }
    if (points.length < 2) throw new Error('Tracé trop court.');
    return points;
  }

  function parseResponse(data) {
    const trip = data && data.trip;
    if (!trip || trip.status !== 0 || !Array.isArray(trip.legs) || !trip.legs.length) throw new Error('Aucun itinéraire piéton trouvé entre ces points.');
    if (!trip.summary || !Number.isFinite(trip.summary.length) || !Number.isFinite(trip.summary.time) || trip.summary.length <= 0 || trip.summary.time < 0 || trip.units !== 'kilometers') throw new Error('La réponse du service de calcul est incomplète.');
    const points = [], instructions = [];
    for (const leg of trip.legs) {
      const shape = decodeShape(leg.shape);
      points.push(...(points.length ? shape.slice(1) : shape));
      if (!Array.isArray(leg.maneuvers) || !leg.maneuvers.length || leg.maneuvers.some(step => step.travel_mode !== 'pedestrian')) throw new Error('Le service n’a pas renvoyé un trajet entièrement piéton.');
      for (const step of leg.maneuvers) {
        if (typeof step.instruction === 'string') instructions.push({ text: step.instruction, length: step.length || 0 });
      }
    }
    return { points, instructions, kilometers: trip.summary.length, seconds: trip.summary.time };
  }

  async function requestRoute(start, end, signal, fetcher = root.fetch.bind(root)) {
    const request = buildRequest(start, end);
    const url = endpoint + '?json=' + encodeURIComponent(JSON.stringify(request));
    const response = await fetcher(url, { signal, headers: { 'X-Client-Id': 'run-relais-caen-prototype' } });
    if (!response.ok) {
      if (response.status === 429) throw new Error('Le service est très sollicité. Réessaie dans un moment.');
      if (response.status === 400) throw new Error('Aucun chemin piéton trouvé. Choisis des points plus proches des rues ou sentiers.');
      throw new Error('Le service de calcul est indisponible. Réessaie dans un moment.');
    }
    return parseResponse(await response.json());
  }

  const api = { buildRequest, decodeShape, parseResponse, requestRoute };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WalkingRoutes = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
