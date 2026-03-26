// Save section + scroll before navigating to a details page so the details back-button
// can return to the same section and scroll position.
(function(){
  function getCurrentSection(){
    // Prefer an in-memory value set by highlightActiveNav or loadSection
    if(window.currentSection) return window.currentSection;
    // Fallback: look for a body class like 'home-section' or 'eduinfo-section'
    if(document && document.body && document.body.classList.length){
      for(const c of Array.from(document.body.classList)){
        if(c && c.endsWith('-section')) return c.replace(/-section$/,'');
      }
    }
    // Finally infer from URL path
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
      // store both values to support different scrolling containers
      sessionStorage.setItem('lastSection', section);
      sessionStorage.setItem('lastScrollMain', String(mainScroll));
      sessionStorage.setItem('lastScrollWindow', String(windowScroll));
      // legacy key for older restore code
      sessionStorage.setItem('lastScroll', String(mainScroll || windowScroll || 0));
      // also store a timestamp for debugging/validation
      sessionStorage.setItem('lastSectionTs', String(Date.now()));
      return { section, mainScroll, windowScroll };
    }catch(e){ console.warn('savePosition failed', e); return null; }
  }

  // Intercept clicks on links that navigate to details pages
  document.addEventListener('click', function(e){
    try{
      const a = e.target.closest && e.target.closest('a');
      if(!a || !a.getAttribute) return;
      const href = a.getAttribute('href') || '';
      // Only intercept relative links containing 'details/' (works for templates like details/Servi/xxx.html)
      if(href.indexOf('details/') === -1) return;
      // If the link opens in a new tab, let it be
      if(a.target && a.target.toLowerCase() === '_blank') return;

      // Prevent default navigation until we save
      e.preventDefault();
      const saved = savePosition();
      // Small delay to ensure storage flush, then navigate
      setTimeout(()=>{
        // Use the href as-is (relative links will work)
        window.location.href = a.href || href;
      }, 10);
    }catch(err){ console.warn('details-nav handler error', err); }
  }, true);

  // Also save position if user right-clicks 'open in new tab' isn't detectable; we can
  // attempt to save on beforeunload as a best-effort fallback (non-invasive)
  window.addEventListener('beforeunload', function(){
    try{ savePosition(); }catch(e){}
  });

  // Expose a manual method for other scripts to call if needed
  window.saveLastSectionPosition = savePosition;
})();
// Handles saving source section + scroll when clicking Learn More links and restores when returning.
(function(){
    function saveLastPosition(){
        try{
            const lastSection = window.currentSection || '';
            sessionStorage.setItem('lastSection', lastSection);
            sessionStorage.setItem('lastScroll', String(window.scrollY || window.pageYOffset || 0));
            console.log('Saved position:', {lastSection, scroll: sessionStorage.getItem('lastScroll')});
        }catch(e){ /* ignore */ }
    }

    // storage event listener not needed now that we don't cache the section

    function handleClick(e){
        const a = e.target.closest && e.target.closest('a');
        if(!a) return;
        const href = a.getAttribute('href') || '';

        // When clicking a link that navigates to a details page, save current section + scroll
        if(href.includes('/details/') || href.includes('../details/') || href.match(/details\//)){
            console.log('Detected details link, saving position');
            saveLastPosition();
            return; // allow navigation
        }

        // If the clicked element is a back-button on a details page, override default to restore
        if(a.classList && a.classList.contains('back-button')){
            e.preventDefault();
            const lastSection = sessionStorage.getItem('lastSection');
            const lastScroll = sessionStorage.getItem('lastScroll');
            console.log('Back button clicked. Saved values:', {lastSection, lastScroll});
            
            // If we have a lastSection, navigate to index and let restore logic run there
            if(lastSection){
                // Use relative path to index.html to work from any details page subdirectory
                // Keep sessionStorage values so the index page can pick them up
                const pathDepth = (window.location.pathname.match(/\//g) || []).length;
                // Details pages are at /details/[category]/ so we need to go up 2 levels typically
                // But we calculate based on how many slashes after 'details' appear in the path
                const detailsMatch = window.location.pathname.match(/details\/([^/]+)\//);
                const depth = detailsMatch ? 2 : 1; // details/Category/file.html = 2 levels up
                const relativePath = '../'.repeat(depth) + 'index.html';
                console.log('Back button: navigating to', relativePath, 'from', window.location.pathname);
                window.location.href = relativePath;
            } else {
                // Fallback to history
                console.log('No saved section, using history.back()');
                history.back();
            }
        }
    }

    function tryRestoreOnIndex(){
        // Intentionally left blank: index.html handles restoration to avoid races.
        return;
    }

    if(typeof window !== 'undefined'){
        document.addEventListener('click', handleClick, {capture:true});
        window.addEventListener('DOMContentLoaded', tryRestoreOnIndex);
    }
})();
