/* One position request, only after a click. No background tracking or storage. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RunLocation = factory();
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  function locationError(message, name = 'LocationError') {
    const error = new Error(message); error.name = name; return error;
  }
  function inside(coordinates, bounds) {
    const [lat, lon] = coordinates;
    return lat >= bounds.south && lat <= bounds.north && lon >= bounds.west && lon <= bounds.east;
  }
  function requestPosition({ geolocation, secure = true, signal, maxWait = 20000 } = {}) {
    return new Promise((resolve, reject) => {
      if (!secure) return reject(locationError('La localisation nécessite une connexion sécurisée. Ouvre le site en HTTPS.'));
      if (!geolocation || typeof geolocation.getCurrentPosition !== 'function') return reject(locationError('Ce navigateur ne propose pas la localisation. Tu peux choisir un point sur la carte.'));
      if (signal?.aborted) return reject(locationError('Localisation annulée.', 'AbortError'));
      let finished = false, timer;
      function finish(error, value) {
        if (finished) return;
        finished = true; clearTimeout(timer); signal?.removeEventListener('abort', abort);
        if (error) reject(error); else resolve(value);
      }
      const abort = () => finish(locationError('Localisation annulée.', 'AbortError'));
      signal?.addEventListener('abort', abort, { once: true });
      timer = setTimeout(() => finish(locationError('La localisation prend trop de temps. Vérifie l’autorisation du navigateur, puis réessaie ou choisis un point sur la carte.')), maxWait);
      try {
        geolocation.getCurrentPosition(position => {
          const { latitude, longitude, accuracy } = position?.coords || {};
          if (![latitude, longitude, accuracy].every(Number.isFinite) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || accuracy < 0) {
            finish(locationError('La position reçue est invalide. Réessaie ou choisis un point sur la carte.')); return;
          }
          finish(null, { coordinates: [latitude, longitude], accuracy });
        }, error => {
          const messages = {
            1: 'Localisation refusée ou bloquée. Autorise-la dans les réglages du site si tu le souhaites, ou choisis un point sur la carte.',
            2: 'Ta position est indisponible. Vérifie la localisation de ton appareil, puis réessaie ou choisis un point sur la carte.',
            3: 'La localisation prend trop de temps. Réessaie ou choisis un point sur la carte.'
          };
          finish(locationError(messages[error?.code] || 'La localisation a échoué. Tu peux choisir un point sur la carte.'));
        }, { enableHighAccuracy: true, maximumAge: 0, timeout: 12000 });
      } catch (_) {
        finish(locationError('La localisation est bloquée ou indisponible dans ce navigateur. Tu peux choisir un point sur la carte.'));
      }
    });
  }
  function bindControl({ buttons, status, bounds, onPosition, onClear, clearButton }) {
    let active = null;
    const labels = buttons.map(button => button.querySelector('[data-location-label]'));
    const titles = buttons.map(button => button.getAttribute('aria-label'));
    function busy(value) {
      buttons.forEach((button, index) => {
        button.setAttribute('aria-busy', String(value));
        if (labels[index]) labels[index].textContent = value ? 'Annuler la localisation' : 'Ma position';
        button.setAttribute('aria-label', value ? 'Annuler la localisation' : titles[index]);
      });
    }
    function clear() {
      active?.abort(); onClear?.();
      if (clearButton) clearButton.hidden = true;
      status.textContent = 'Repère de position masqué. Les points de parcours ou de recherche déjà choisis restent inchangés.';
      status.classList.remove('error');
    }
    async function locate() {
      if (active) { active.abort(); return; }
      const controller = new AbortController(); active = controller;
      onClear?.(); if (clearButton) clearButton.hidden = true;
      busy(true); status.classList.remove('error');
      status.textContent = 'Recherche de ta position… Autorise la localisation si le navigateur te le demande.';
      try {
        const result = await requestPosition({ geolocation: navigator.geolocation, secure: window.isSecureContext, signal: controller.signal });
        if (active !== controller || controller.signal.aborted) return;
        const inArea = inside(result.coordinates, bounds);
        status.textContent = inArea
          ? `Position trouvée · précision annoncée : ± ${Math.ceil(result.accuracy)} m.${result.accuracy > 100 ? ' Position approximative : ajuste le point sur la carte si nécessaire.' : ''}`
          : 'Position trouvée, hors de la zone Caen / Caen la Mer. Choisis un point dans la zone pour les parcours et lieux locaux.';
        status.classList.toggle('error', !inArea);
        onPosition(result, inArea);
        if (clearButton) clearButton.hidden = false;
      } catch (error) {
        if (active !== controller) return;
        status.textContent = error.message; status.classList.toggle('error', error.name !== 'AbortError');
      } finally {
        if (active === controller) { active = null; busy(false); }
      }
    }
    buttons.forEach(button => button.addEventListener('click', locate));
    clearButton?.addEventListener('click', clear);
    window.addEventListener('pagehide', () => active?.abort());
    return { clear };
  }
  function drawPosition(L, map, result) {
    const layer = L.layerGroup().addTo(map);
    L.circle(result.coordinates, { radius: result.accuracy, color: '#3288dc', fillColor: '#3288dc', fillOpacity: .12, weight: 1, interactive: false }).addTo(layer);
    L.circleMarker(result.coordinates, { radius: 8, color: '#fff', fillColor: '#1675d1', fillOpacity: 1, weight: 3, className: 'my-location-dot' })
      .addTo(layer).bindTooltip(`Ma position · précision annoncée ± ${Math.ceil(result.accuracy)} m`, { direction: 'top' });
    map.setView(result.coordinates, result.accuracy > 500 ? 12 : 16);
    return layer;
  }
  return { requestPosition, inside, bindControl, drawPosition };
});
