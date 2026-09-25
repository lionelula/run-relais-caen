(() => {
  'use strict';
  const form = document.getElementById('training-filters');
  if (!form) return;
  const distance = document.getElementById('training-distance');
  const level = document.getElementById('training-level');
  const count = document.getElementById('training-count');
  const cards = [...document.querySelectorAll('.training-card')];
  function update() {
    let visible = 0;
    for (const card of cards) {
      card.hidden = !((distance.value === 'all' || card.dataset.distance === distance.value) &&
        (level.value === 'all' || card.dataset.level === level.value));
      if (!card.hidden) visible++;
    }
    count.textContent = `${visible} plan${visible > 1 ? 's' : ''} à découvrir`;
  }
  form.hidden = false;
  form.addEventListener('change', update);
  form.addEventListener('submit', event => event.preventDefault());
  form.addEventListener('reset', () => { distance.value = 'all'; level.value = 'all'; update(); });
  window.addEventListener('pageshow', update);
  update();
})();
