const caenCenter = [49.18355, -0.3625];
// Operational selection area covering Caen and the Caen la Mer urban community.
const caenLaMerArea = { south: 49.05, north: 49.34, west: -0.59, east: -0.14 };
const map = L.map('run-map', { zoomControl: false, scrollWheelZoom: true }).setView(caenCenter, 15);
L.control.zoom({ position: 'bottomright' }).addTo(map);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap contributors' }).addTo(map);

const places = [
  { id: 'cafe-de-caen', name: 'Le Café de Caen', type: 'food', icon: '☕', coordinates: [49.183078, -0.361949], address: '90 boulevard du Maréchal Leclerc, 14000 Caen', description: 'Adresse locale réelle à contacter pour le lancement.', source: 'https://www.lecafedecaen.com/informations-pratiques' },
  { id: 'multiverre', name: 'Le Multiverre', type: 'food', icon: '🍹', coordinates: [49.18546, -0.36516], address: '59 rue de Geôle, 14000 Caen', description: 'Adresse locale réelle à contacter pour le lancement.', source: 'https://hellocaen.com/partenaire/le-multiverre/' },
  { id: 'relais-test', name: 'Emplacement à tester', type: 'future', icon: '＋', coordinates: [49.1818, -0.3567], address: 'Zone de test autour du centre de Caen', description: 'Point illustratif : aucun établissement n’est encore associé à ce relais.', source: 'https://hellocaen.com/a-propos/' }
];
const markerLayer = L.layerGroup().addTo(map);
const markers = new Map();
const nearbyCache = NearbyPlaces.readCache();
let nearbySnapshot = null;
let nearbyMetadata = null;
let nearbyLine = null;
let nearbyData = [];
let nearbyReady = false;
let nearbyRequest = 0;
let nearbyController = null;
const nearbyFilters = new Set();
let listedPlaces = [];
let visiblePlaceCount = 8;

// No illustrative segments: only geometry returned by pedestrian routing is drawn.
const routeLayer = L.layerGroup().addTo(map);
const endpointLayer = L.layerGroup().addTo(map);
const routePlaces = places.filter(place => place.type !== 'future');
const routeSelects = { start: document.querySelector('#route-start'), end: document.querySelector('#route-end') };
const routePoints = {
  start: { coordinates: [...routePlaces[0].coordinates], id: routePlaces[0].id },
  end: { coordinates: [...routePlaces[1].coordinates], id: routePlaces[1].id }
};
const routeWaypoints = [];
const routeStatus = document.querySelector('#route-status');
const routeResult = document.querySelector('#route-result');
const calculateButton = document.querySelector('#calculate-route');
const routeCache = new Map();
let requestNumber = 0;
let requestController = null;
let routeBounds = null;
let picking = null;

function setRouteStatus(message, error = false) {
  routeStatus.textContent = message;
  routeStatus.classList.toggle('error', error);
}

function updateSelects() {
  for (const key of ['start', 'end']) {
    const select = routeSelects[key];
    select.replaceChildren(...routePlaces.map(place => new Option(place.name, place.id)));
    if (!routePoints[key].id) {
      const [lat, lon] = routePoints[key].coordinates;
      select.add(new Option(routePoints[key].label || `Point choisi (${lat.toFixed(4)}, ${lon.toFixed(4)})`, 'custom'));
    }
    select.value = routePoints[key].id || 'custom';
  }
  renderWaypoints();
}

function routeCoordinates() {
  return [routePoints.start, ...routeWaypoints, routePoints.end].map(point => [...point.coordinates]);
}

function renderWaypoints() {
  const list = document.querySelector('#waypoint-list');
  list.replaceChildren();
  routeWaypoints.forEach((point, index) => {
    const row = document.createElement('div'); row.className = 'waypoint-row';
    const title = textElement('p', `${index + 1} · ${point.label || 'Point sur la carte'}`);
    const actions = document.createElement('div'); actions.className = 'waypoint-actions';
    const controls = [
      ['⌖', `Déplacer l’étape ${index + 1} sur la carte`, () => beginPicking(`waypoint:${index}`), false],
      ['↑', `Avancer l’étape ${index + 1}`, () => moveWaypoint(index, -1), index === 0],
      ['↓', `Reculer l’étape ${index + 1}`, () => moveWaypoint(index, 1), index === routeWaypoints.length - 1],
      ['×', `Supprimer l’étape ${index + 1}`, () => { routeWaypoints.splice(index, 1); updateSelects(); calculateRoute(); }, false]
    ];
    controls.forEach(([label, name, action, disabled]) => {
      const button = textElement('button', label); button.type = 'button';
      button.setAttribute('aria-label', name); button.disabled = disabled;
      button.addEventListener('click', action); actions.append(button);
    });
    row.append(title, actions); list.append(row);
  });
}

function moveWaypoint(index, offset) {
  const target = index + offset;
  if (target < 0 || target >= routeWaypoints.length) return;
  [routeWaypoints[index], routeWaypoints[target]] = [routeWaypoints[target], routeWaypoints[index]];
  updateSelects(); calculateRoute();
}

function beginPicking(key) {
  stopPicking(); invalidateRoute(); picking = key;
  if (key === 'start' || key === 'end') document.querySelector(`#pick-${key}`).setAttribute('aria-pressed', 'true');
  if (key === 'new') document.querySelector('#add-waypoint').setAttribute('aria-pressed', 'true');
  document.querySelector('#cancel-pick').hidden = false;
  map.getContainer().classList.add('picking-route');
  const label = key === 'start' ? 'le départ A' : key === 'end' ? 'l’arrivée B' : key === 'new' ? `l’étape ${routeWaypoints.length + 1}` : `l’étape ${Number(key.split(':')[1]) + 1}`;
  setRouteStatus(`Clique sur la carte pour choisir ${label}.`);
  if (window.matchMedia('(max-width: 800px)').matches) map.getContainer().scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function showEndpointMarkers(coordinates) {
  endpointLayer.clearLayers();
  coordinates.forEach((point, i) => {
    const label = i === 0 ? 'A' : i === coordinates.length - 1 ? 'B' : String(i);
    L.marker(point, { zIndexOffset: 1000, interactive: false, icon: L.divIcon({
      className: 'route-endpoint-icon', html: `<span class="route-endpoint ${i === coordinates.length - 1 ? 'end' : i ? 'via' : ''}">${label}</span>`,
      iconSize: [26, 26], iconAnchor: [13, 13]
    }) }).addTo(endpointLayer);
  });
}

function invalidateRoute() {
  clearNearby();
  requestNumber += 1;
  if (requestController) requestController.abort();
  requestController = null;
  routeLayer.clearLayers();
  routeResult.hidden = true;
  routeBounds = null;
  calculateButton.disabled = false;
  calculateButton.textContent = 'Calculer à pied →';
  showEndpointMarkers(routeCoordinates());
}

function stopPicking() {
  picking = null;
  map.getContainer().classList.remove('picking-route');
  document.querySelector('#cancel-pick').hidden = true;
  document.querySelector('#add-waypoint').setAttribute('aria-pressed', 'false');
  for (const key of ['start', 'end']) document.querySelector(`#pick-${key}`).setAttribute('aria-pressed', 'false');
}

function fitRoute() {
  if (routeBounds) map.fitBounds(routeBounds, { padding: [55, 70], maxZoom: 17 });
}

function distanceLabel(kilometers) {
  return kilometers < 1 ? `${Math.round(kilometers * 1000)} m` : `${kilometers.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} km`;
}

async function calculateRoute() {
  stopPicking();
  invalidateRoute();
  const currentRequest = requestNumber;
  const start = [...routePoints.start.coordinates], end = [...routePoints.end.coordinates];
  const via = routeWaypoints.map(point => [...point.coordinates]);
  const cacheKey = JSON.stringify([start, ...via, end]);
  const controller = new AbortController();
  requestController = controller;
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 18000);
  calculateButton.disabled = true;
  calculateButton.textContent = 'Calcul en cours…';
  setRouteStatus('Recherche d’un chemin accessible à pied…');
  try {
    WalkingRoutes.buildRequest(start, end, via);
    const route = routeCache.get(cacheKey) || await WalkingRoutes.requestRoute(start, end, controller.signal, undefined, via);
    if (currentRequest !== requestNumber) return;
    if (!routeCache.has(cacheKey)) {
      if (routeCache.size >= 20) routeCache.delete(routeCache.keys().next().value);
      routeCache.set(cacheKey, route);
    }
    L.polyline(route.points, { color: '#fffdf6', weight: 9, opacity: .95, interactive: false }).addTo(routeLayer);
    const line = L.polyline(route.points, { color: '#267a53', weight: 5, opacity: 1, lineCap: 'round', lineJoin: 'round', interactive: false, className: 'walking-route' }).addTo(routeLayer);
    routeBounds = line.getBounds();
    showEndpointMarkers(route.stops);
    document.querySelector('#route-distance').textContent = distanceLabel(route.kilometers);
    const minutes = Math.max(1, Math.round(route.seconds / 60));
    document.querySelector('#route-duration').textContent = `≈ ${minutes < 60 ? minutes + ' min' : Math.floor(minutes / 60) + ' h ' + (minutes % 60) + ' min'} à pied`;
    const steps = document.querySelector('#route-steps');
    steps.replaceChildren(...route.instructions.map(step => {
      const item = document.createElement('li');
      item.textContent = step.text;
      if (step.length > 0) {
        const length = document.createElement('small');
        length.textContent = distanceLabel(step.length);
        item.append(length);
      }
      return item;
    }));
    routeResult.hidden = false;
    setRouteStatus(`Trajet piéton calculé${via.length ? ` avec ${via.length} étape${via.length > 1 ? 's' : ''}` : ''} · suis la ligne verte.`);
    fitRoute();
    loadNearby(route.points);
  } catch (error) {
    if (currentRequest !== requestNumber) return;
    routeLayer.clearLayers();
    routeResult.hidden = true;
    const message = timedOut ? 'Le calcul prend trop de temps. Réessaie dans un moment.' : error instanceof TypeError ? 'Connexion au service de calcul impossible. Vérifie Internet, puis réessaie.' : error.message;
    setRouteStatus(message, true);
  } finally {
    clearTimeout(timer);
    if (currentRequest === requestNumber) {
      requestController = null;
      calculateButton.disabled = false;
      calculateButton.textContent = 'Calculer à pied →';
    }
  }
}

for (const key of ['start', 'end']) {
  routeSelects[key].addEventListener('change', () => {
    const place = routePlaces.find(place => place.id === routeSelects[key].value);
    if (place) routePoints[key] = { id: place.id, coordinates: [...place.coordinates] };
    updateSelects();
    stopPicking(); invalidateRoute();
    setRouteStatus('Points modifiés. Clique sur « Calculer à pied ».');
  });
  document.querySelector(`#pick-${key}`).addEventListener('click', () => {
    beginPicking(key);
  });
}
document.querySelector('#add-waypoint').addEventListener('click', () => beginPicking('new'));
map.on('click', (event) => {
  if (!picking) return;
  const point = event.latlng;
  if (point.lat < caenLaMerArea.south || point.lat > caenLaMerArea.north || point.lng < caenLaMerArea.west || point.lng > caenLaMerArea.east) {
    setRouteStatus('Choisis un point dans Caen ou Caen la Mer.', true); return;
  }
  const selected = { id: null, coordinates: [point.lat, point.lng] };
  if (picking === 'new') routeWaypoints.push(selected);
  else if (picking.startsWith('waypoint:')) routeWaypoints[Number(picking.split(':')[1])] = selected;
  else routePoints[picking] = selected;
  updateSelects();
  calculateRoute();
});
document.querySelector('#route-form').addEventListener('submit', event => { event.preventDefault(); calculateRoute(); });
document.querySelector('#swap-route').addEventListener('click', () => {
  [routePoints.start, routePoints.end] = [routePoints.end, routePoints.start];
  routeWaypoints.reverse();
  updateSelects(); calculateRoute();
});
document.querySelector('#show-route').addEventListener('click', () => {
  fitRoute();
  if (window.matchMedia('(max-width: 800px)').matches) map.getContainer().scrollIntoView({ behavior: 'smooth', block: 'center' });
});
document.querySelector('#cancel-pick').addEventListener('click', () => {
  stopPicking(); setRouteStatus('Choix annulé. Clique sur « Calculer à pied » pour retrouver le trajet.');
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && picking) document.querySelector('#cancel-pick').click();
});
function clearNearby() {
  nearbyRequest++;
  if (nearbyController) nearbyController.abort();
  nearbyController = null;
  nearbyLine = null; nearbyData = []; nearbyReady = false;
  nearbyMetadata = null;
  markerLayer.clearLayers(); markers.clear();
  document.querySelector('#location-list').replaceChildren();
  document.querySelector('#nearby-count').textContent = '—';
  document.querySelector('#nearby-status').textContent = 'Les lieux apparaîtront après le calcul du trajet.';
  document.querySelector('#nearby-data-date').textContent = '';
  document.querySelector('#retry-nearby').hidden = true;
  document.querySelector('#more-places').hidden = true;
  document.querySelector('#all-places').hidden = true;
  listedPlaces = [];
}

async function loadNearby(line) {
  clearNearby();
  nearbyLine = line;
  const current = nearbyRequest;
  const bounds = NearbyPlaces.boundsForRoute(line);
  const controller = new AbortController();
  nearbyController = controller;
  visiblePlaceCount = 8;
  let timeout = false;
  const sectors = NearbyPlaces.splitRoute(line).length;
  const timer = setTimeout(() => { timeout = true; controller.abort(); }, 45000);
  document.querySelector('#nearby-status').textContent = sectors > 1
    ? `Recherche des lieux autour de ton trajet (${sectors} secteurs)…`
    : 'Recherche des lieux autour de ton trajet…';
  try {
    const cached = nearbyCache.find(entry => Date.now() - entry.savedAt < 30 * 60 * 1000 && bounds[0] >= entry.bounds[0] && bounds[1] >= entry.bounds[1] && bounds[2] <= entry.bounds[2] && bounds[3] <= entry.bounds[3]);
    const lineBounds = NearbyPlaces.boundsForRoute(line,0);
    if (nearbySnapshot && boundsContain(nearbySnapshot.bounds,lineBounds)) {
      nearbyData = nearbySnapshot.places;
      nearbyMetadata = nearbySnapshot;
      nearbyReady = true;
      renderPlaces();
      return;
    }
    if (!cached && nearbySnapshot && NearbyPlaces.nearRoute(nearbySnapshot.places, line, 550).length) {
      nearbyData = nearbySnapshot.places;
      nearbyMetadata = nearbySnapshot;
      nearbyReady = true;
      renderPlaces();
      document.querySelector('#nearby-status').textContent = 'Mise à jour des lieux autour du trajet…';
    }
    const data = cached ? cached.places : await NearbyPlaces.fetchPlacesAlongRoute(line, 550, controller.signal, undefined, places => {
      if (current !== nearbyRequest) return;
      nearbyData = places;
      nearbyReady = true;
      renderPlaces();
      document.querySelector('#nearby-status').textContent = 'Mise à jour des lieux autour du trajet…';
    });
    if (current !== nearbyRequest) return;
    if (!cached) {
      if (nearbyCache.length >= 8) nearbyCache.shift();
      nearbyCache.push({bounds, places:data, savedAt:Date.now()});
      NearbyPlaces.writeCache(nearbyCache);
    }
    nearbyMetadata = cached || {bounds,savedAt:Date.now(), sectors:NearbyPlaces.splitRoute(line).length};
    nearbyData = data; nearbyReady = true;
    renderPlaces();
  } catch (error) {
    if (current !== nearbyRequest) return;
    const radius = Number(document.querySelector('#nearby-radius').value);
    if (nearbySnapshot && NearbyPlaces.nearRoute(nearbySnapshot.places,line,radius).length) {
      nearbyData = nearbySnapshot.places; nearbyMetadata = nearbySnapshot; nearbyReady = true;
      renderPlaces();
      document.querySelector('#nearby-data-date').textContent += ' Recherche en direct indisponible.';
      document.querySelector('#retry-nearby').hidden = false;
      return;
    }
    document.querySelector('#nearby-status').textContent = timeout ? 'La recherche prend trop de temps. Le trajet reste disponible.' : 'Lieux indisponibles pour le moment. Le trajet reste disponible.';
    document.querySelector('#retry-nearby').hidden = false;
  } finally {
    clearTimeout(timer);
    if (current === nearbyRequest) nearbyController = null;
  }
}

function boundsContain(outer,inner) {
  return inner[0] >= outer[0] && inner[1] >= outer[1] && inner[2] <= outer[2] && inner[3] <= outer[3];
}

function textElement(tag, text, className) {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  return element;
}

function placePopup(place) {
  // OSM tags are untrusted content: always render them as text, never HTML.
  const popup = document.createElement('div'); popup.className = 'place-popup';
  popup.append(textElement('p',place.label,'tag'), textElement('h3',place.name), textElement('p',place.address));
  popup.append(textElement('p',`≈ ${Math.round(place.distance)} m du trajet à vol d’oiseau`));
  if (place.access) popup.append(textElement('p',place.access));
  if (place.fee) popup.append(textElement('p',place.fee));
  if (place.openingHours) popup.append(textElement('p',`Horaires indiqués : ${place.openingHours}`));
  const source = textElement('a','Fiche OpenStreetMap ↗');
  source.href = place.source; source.target = '_blank'; source.rel = 'noreferrer'; popup.append(source);
  const go = textElement('button','Choisir comme arrivée →','nearby-go'); go.type = 'button';
  go.addEventListener('click', () => {
    routePoints.end = {id:null, label:place.name, coordinates:[...place.coordinates]};
    updateSelects(); map.closePopup(); calculateRoute();
    document.querySelector('#route-title').scrollIntoView({behavior:'smooth',block:'nearest'});
  });
  popup.append(go);
  const via = textElement('button', 'Ajouter comme étape →', 'nearby-go'); via.type = 'button';
  via.addEventListener('click', () => {
    routeWaypoints.push({id:null, label:place.name, coordinates:[...place.coordinates]});
    updateSelects(); map.closePopup(); calculateRoute();
    document.querySelector('#route-title').scrollIntoView({behavior:'smooth',block:'nearest'});
  });
  popup.append(via);
  if (place.type !== 'services') {
    const claim = textElement('a', 'Cet établissement est le vôtre ? Revendication prévue →', 'claim-link');
    claim.href = `compte-professionnel.html?lieu=${encodeURIComponent(place.name)}&osm=${encodeURIComponent(place.id)}#etablissement`;
    popup.append(claim);
  }
  return popup;
}

function renderPlaces() {
  markerLayer.clearLayers(); markers.clear();
  const list = document.querySelector('#location-list'); list.replaceChildren();
  if (!nearbyReady || !nearbyLine) return;
  const radius = Number(document.querySelector('#nearby-radius').value);
  if (nearbyMetadata) {
    const date = new Date(nearbyMetadata.dataTimestamp || nearbyMetadata.savedAt).toLocaleDateString('fr-FR', {timeZone:'UTC'});
    const partial = !boundsContain(nearbyMetadata.bounds,NearbyPlaces.boundsForRoute(nearbyLine,radius));
    document.querySelector('#nearby-data-date').textContent = `Données OpenStreetMap du ${date}${nearbyMetadata.snapshot ? ' · ' + (nearbyMetadata.scope || 'centre de Caen') : ''}.${partial ? ' Couverture partielle : ce rayon dépasse la zone répertoriée.' : ''}`;
  }
  const nearby = NearbyPlaces.nearRoute(nearbyData,nearbyLine,radius);
  const filtered = nearby.filter(place => nearbyFilters.size === 0 || nearbyFilters.has(place.category));
  document.querySelector('#nearby-count').textContent = String(filtered.length);
  document.querySelector('#nearby-status').textContent = !filtered.length ? 'Aucun lieu répertorié dans ce rayon pour ces filtres. Essaie un autre type ou 500 m.' : `${filtered.length} lieu${filtered.length > 1 ? 'x' : ''} affiché${filtered.length > 1 ? 's' : ''} sur la carte, du départ à l’arrivée. Zoome pour distinguer les repères proches.`;
  for (const place of filtered) {
    const icon = L.divIcon({className:'nearby-marker-icon',html:`<span class="nearby-marker ${place.type}">${place.icon}</span>`,iconSize:[27,27],iconAnchor:[13,13]});
    const marker = L.marker(place.coordinates,{icon,title:place.name}).bindPopup(() => placePopup(place));
    markerLayer.addLayer(marker); markers.set(place.id,marker);
  }
  listedPlaces = filtered;
  renderPlaceList();
}

function renderPlaceList() {
  const list = document.querySelector('#location-list'); list.replaceChildren();
  for (const place of listedPlaces.slice(0,visiblePlaceCount)) {
    const card = document.createElement('button'); card.type = 'button'; card.className = 'location-card';
    const content = document.createElement('span');
    content.append(textElement('h3',place.name),textElement('p',place.label),textElement('p',`≈ ${Math.round(place.distance)} m du tracé · à vol d’oiseau`,'place-status'));
    card.append(textElement('span',place.icon,'location-symbol'),content);
    card.addEventListener('click',() => {
      map.flyTo(place.coordinates,17,{duration:.6}); markers.get(place.id).openPopup();
      if (window.matchMedia('(max-width: 800px)').matches) map.getContainer().scrollIntoView({behavior:'smooth',block:'center'});
    });
    list.append(card);
  }
  const remaining = Math.max(0, listedPlaces.length - visiblePlaceCount);
  document.querySelector('#more-places').hidden = remaining === 0;
  document.querySelector('#more-places').textContent = `Voir ${Math.min(8, remaining)} lieux de plus (${remaining} restants)`;
  document.querySelector('#all-places').hidden = remaining === 0;
  document.querySelector('#all-places').textContent = `Déplier toute la liste (${listedPlaces.length})`;
}

document.querySelectorAll('.filter-chip').forEach(button => button.addEventListener('click', () => {
  const category = button.dataset.filter;
  if (category === 'all') nearbyFilters.clear();
  else if (nearbyFilters.has(category)) nearbyFilters.delete(category);
  else nearbyFilters.add(category);
  visiblePlaceCount = 8;
  document.querySelectorAll('.filter-chip').forEach(item => { const selected = item.dataset.filter === 'all' ? nearbyFilters.size === 0 : nearbyFilters.has(item.dataset.filter); item.classList.toggle('active',selected); item.setAttribute('aria-pressed',String(selected)); });
  renderPlaces();
}));
document.querySelector('#nearby-radius').addEventListener('change', () => { visiblePlaceCount = 8; renderPlaces(); });
document.querySelector('#jump-nearby').addEventListener('click', () => {
  const heading = document.querySelector('#nearby-title');
  if (window.matchMedia('(max-width: 800px)').matches) heading.scrollIntoView({behavior:'smooth',block:'start'});
  else {
    window.scrollTo({top:0,behavior:'smooth'});
    document.querySelector('.map-sidebar').scrollTo({top:heading.offsetTop-16,behavior:'smooth'});
  }
});
document.querySelector('#more-places').addEventListener('click', () => { visiblePlaceCount += 8; renderPlaceList(); });
document.querySelector('#all-places').addEventListener('click', () => { visiblePlaceCount = listedPlaces.length; renderPlaceList(); });
document.querySelector('#retry-nearby').addEventListener('click', () => { if (nearbyLine) loadNearby(nearbyLine); });
document.querySelector('#recenter-map').addEventListener('click', () => map.flyTo(caenCenter, 15, { duration: 0.8 }));
updateSelects();
// Load the regional extract once; route changes then filter locally without
// waiting for Overpass. Online search is retained outside the extract bounds.
(async function initializeNearby() {
  try {
    const response = await fetch('nearby-snapshot.json?v=caen-la-mer-categories-20260924',{signal:AbortSignal.timeout(10000)});
    if (response.ok) {
      const snapshot = await response.json();
      if (Array.isArray(snapshot.places) && snapshot.bounds?.length === 4 && Number.isFinite(snapshot.savedAt)) nearbySnapshot = snapshot;
    }
  } catch { /* Optional local extract; online search remains available. */ }
  calculateRoute();
})();
