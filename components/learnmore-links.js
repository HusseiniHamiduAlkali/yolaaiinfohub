// Dynamically insert the current language folder into details page links
(function(){
  function mapLangFolder(lang){
    const map = { en: 'En', ar: 'Ar', fr: 'Fr', ha: 'Ha', ff: 'Fu', yo: 'Yo', ig: 'Ig', pcm: 'Pi' };
    return map[lang] || (lang ? (lang.charAt(0).toUpperCase() + lang.slice(1)) : 'En');
  }

  function shouldSkipHref(href){
    if(!href) return true;
    // Skip absolute URLs (contain ://) and mailto/tel
    if(href.match(/^[a-zA-Z0-9+.-]+:\/\//) || href.startsWith('mailto:') || href.startsWith('tel:')) return true;
    return false;
  }

  function updateLinksForLang(lang){
    try{
      const folder = mapLangFolder(lang);

      // 1) links using data attributes (newer templates)
      document.querySelectorAll('a.learn-more-link[data-section][data-file]').forEach(a=>{
        const section = a.getAttribute('data-section');
        const file = a.getAttribute('data-file');
        if(!section || !file) return;
        a.setAttribute('href', `details/${section}/${folder}/${file}`);
      });

      // 2) anchors that already point to details/ — insert or replace language segment
      document.querySelectorAll('a[href*="details/"]').forEach(a=>{
        const raw = a.getAttribute('href');
        if(shouldSkipHref(raw)) return;
        // normalize leading ./ or ../ segments for manipulation but preserve prefix
        const prefixMatch = raw.match(/^(\.\.\/|\.\/|\/)?/);
        const prefix = prefixMatch ? prefixMatch[0] : '';
        const rest = raw.replace(/^\.\.\//, '').replace(/^\.\//, '').replace(/^\//, '');
        const parts = rest.split('/');
        // Expected shapes: details/Category/file.html  -> parts = ["details","Category","file.html"]
        // or details/Category/Lang/file.html -> parts = ["details","Category","Lang","file.html"]
        if(parts[0] !== 'details') return;
        if(parts.length >= 4){
          // already has language segment at parts[2] -> replace it
          parts[2] = folder;
        } else if(parts.length === 3){
          // insert language folder between category and file
          parts.splice(2, 0, folder);
        } else {
          return; // unexpected format
        }
        const newHref = prefix + parts.join('/');
        a.setAttribute('href', newHref);
      });
    }catch(e){ console.warn('learnmore-links update failed', e); }
  }

  function init(){
    const lang = window.getAppLanguage?.() || 'en';
    updateLinksForLang(lang);
    // update whenever language is changed
    document.addEventListener('languageChanged', function(e){
      const newLang = (e && e.detail && e.detail.language) || window.getAppLanguage?.() || 'en';
      updateLinksForLang(newLang);
    });

    // re-run when new nodes are added (e.g., sections loaded dynamically)
    try{
      const obs = new MutationObserver(muts => {
        let added = false;
        muts.forEach(m => { if(m.addedNodes && m.addedNodes.length) added = true; });
        if(added) updateLinksForLang(window.getAppLanguage?.() || 'en');
      });
      obs.observe(document.documentElement || document.body, { childList: true, subtree: true });
    }catch(e){ /* ignore */ }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
