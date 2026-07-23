(function(){
  function applyTheme(theme){
    const nextTheme = theme || localStorage.getItem('yola-theme') || 'light';
    document.documentElement.setAttribute('data-theme', nextTheme);
    document.body.classList.toggle('dark', nextTheme === 'dark');
    return nextTheme;
  }

  function init(){
    applyTheme();
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      button.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        localStorage.setItem('yola-theme', current);
        applyTheme(current);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.applyDarkMode = applyTheme;
})();
