(function(){
  function init(){
    document.querySelectorAll('[data-learn-more]').forEach((element) => {
      element.addEventListener('click', () => {
        const target = element.getAttribute('data-learn-more');
        if (target) {
          const el = document.querySelector(target);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.learnMoreLinks = { init };
})();
