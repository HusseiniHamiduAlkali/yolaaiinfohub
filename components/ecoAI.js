(function(){
  function init(){
    const root = document.getElementById('ecoai-root');
    if (root) {
      root.innerHTML = '<div class="ecoai-placeholder">Eco AI ready.</div>';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.ecoAI = { init };
})();
