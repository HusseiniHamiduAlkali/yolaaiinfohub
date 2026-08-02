// Save section + scroll before navigating to a details page so the details back-button
// can return to the same section and scroll position.
(function(){
  function getCurrentSection(){
    if(window.currentSection) return window.currentSection;
    if(document && document.body && document.body.classList.length){
      for(const c of Array.from(document.body.classList)){
        if(c && c.endsWith('-section')) return c.replace(/-section$/,'');
      }
    }
    let path = window.location.pathname.replace(/^\/+/, '').toLowerCase();
    if(!path || path === '' || path === 'index.html') return 'home';
    path = path.split('/').pop().split('?')[0].split('#')[0];
    return path;
  }

  function savePosition(){
    try{
      const section = getCurrentSection();
      const main = document.getElementById('main-content');
      const mainScroll = main ? (main.scrollTop || 0) : 0;
      const windowScroll = (window.scrollY || window.pageYOffset || 0) || 0;
      sessionStorage.setItem('lastSection', section);
      sessionStorage.setItem('lastScrollMain', String(mainScroll));
      sessionStorage.setItem('lastScrollWindow', String(windowScroll));
      sessionStorage.setItem('lastScroll', String(mainScroll || windowScroll || 0));
      sessionStorage.setItem('lastSectionTs', String(Date.now()));
      return { section, mainScroll, windowScroll };
    }catch(e){ console.warn('savePosition failed', e); return null; }
  }

  function getAppLanguage(){
    try{
      if(window.getAppLanguage && typeof window.getAppLanguage === 'function'){
        const lang = window.getAppLanguage();
        if(lang) return lang;
      }
    }catch(e){}
    try{
      return localStorage.getItem('appLanguage') || 'en';
    }catch(e){
      return 'en';
    }
  }

  function getTranslationTargetLanguage(lang){
    if(!lang || lang === 'en') return null;
    const mapping = { ar:'ar', fr:'fr', ha:'ha', ff:'ff', yo:'yo', ig:'ig', pcm:'pcm' };
    return mapping[lang] || null;
  }

  function applyDetailPageTranslationHint(){
    try{
      const currentUrl = new URL(window.location.href);
      if(!currentUrl.pathname.includes('/details/')) return;

      const appLang = getAppLanguage();
      const targetLang = getTranslationTargetLanguage(appLang);
      if(targetLang){
        document.documentElement.lang = targetLang;
        document.documentElement.setAttribute('translate', 'yes');
        document.documentElement.setAttribute('data-app-language', appLang);
        document.documentElement.setAttribute('dir', ['ar'].includes(targetLang) ? 'rtl' : 'ltr');
      } else {
        document.documentElement.lang = 'en';
        document.documentElement.setAttribute('translate', 'yes');
      }
    }catch(e){ console.warn('detail page translation hint failed', e); }
  }

  document.addEventListener('click', function(e){
    try{
      const a = e.target.closest && e.target.closest('a');
      if(!a || !a.getAttribute) return;
      const href = a.getAttribute('href') || '';
      if(href.indexOf('details/') === -1) return;
      if(a.target && a.target.toLowerCase() === '_blank') return;

      if(a.classList && a.classList.contains('back-button')){
        e.preventDefault();
        savePosition();
        const lastSection = sessionStorage.getItem('lastSection');
        if(lastSection){
          const detailsMatch = window.location.pathname.match(/details\/([^/]+)\//);
          const depth = detailsMatch ? 2 : 1;
          const relativePath = '../'.repeat(depth) + 'index.html';
          window.location.href = relativePath;
        } else {
          history.back();
        }
        return;
      }

      savePosition();
      return;
    }catch(err){ console.warn('details-nav handler error', err); }
  }, true);

  window.addEventListener('beforeunload', function(){
    try{ savePosition(); }catch(e){}
  });

  window.saveLastSectionPosition = savePosition;

  if(typeof window !== 'undefined'){
    window.addEventListener('DOMContentLoaded', function(){
      applyDetailPageTranslationHint();
    });
    if(document.readyState !== 'loading'){
      applyDetailPageTranslationHint();
    }
  }
})();
