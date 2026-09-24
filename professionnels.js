// Interest stays on this page; there is no submission or account creation.
document.querySelectorAll('[data-interest]').forEach(link => {
  link.addEventListener('click', () => {
    document.querySelector('#contact-interest').textContent = `Votre sélection : ${link.dataset.interest}.`;
    document.querySelector('#contact-title').focus({preventScroll: true});
  });
});
