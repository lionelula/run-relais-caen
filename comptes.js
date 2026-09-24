// Ephemeral presentation only: no login, persistence, submission or billing.
(() => {
  for (const [name, target, empty, prefix] of [
    ['activity', 'activity-summary', 'Aucune activité sélectionnée dans cet aperçu.', 'Activités choisies pour cet aperçu : '],
    ['service', 'service-summary', 'Aucun service sélectionné dans cet aperçu.', 'Services envisagés, non vérifiés : ']
  ]) {
    const fields = [...document.querySelectorAll('input[name="' + name + '"]')];
    const summary = document.getElementById(target);
    if (!summary) continue;
    const update = () => {
      const labels = fields.filter(input => input.checked).map(input => input.nextElementSibling.textContent);
      summary.textContent = labels.length ? prefix + labels.join(', ') + '. Rien n’est enregistré.' : empty;
    };
    fields.forEach(input => { input.checked = false; input.addEventListener('change', update); });
    window.addEventListener('pageshow', () => {
      fields.forEach(input => { input.checked = false; });
      update();
    });
    update();
  }
  const context = document.getElementById('claim-context');
  const place = new URLSearchParams(location.search).get('lieu');
  if (context && place) {
    context.hidden = false;
    context.textContent = 'Fiche repérée : ' + place.slice(0, 200) + '. La revendication sera disponible après ouverture des comptes ; aucune demande envoyée.';
  }
})();
