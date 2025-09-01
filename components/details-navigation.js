// Handles saving source section + scroll when clicking Learn More links and restores when returning.
(function(){
    function saveLastPosition(){
        try{
            const lastSection = localStorage.getItem('currentSection') || '';
            sessionStorage.setItem('lastSection', lastSection);
            sessionStorage.setItem('lastScroll', String(window.scrollY || window.pageYOffset || 0));
        }catch(e){ /* ignore */ }
    }

    // Also save when currentSection changes in localStorage (navbar interactions)
    window.addEventListener && window.addEventListener('storage', function(e){
        if(e.key === 'currentSection'){
            try{
                sessionStorage.setItem('lastSection', e.newValue || '');
                sessionStorage.setItem('lastScroll', String(window.scrollY || window.pageYOffset || 0));
            }catch(err){}
        }
    });

    function handleClick(e){
        const a = e.target.closest && e.target.closest('a');
        if(!a) return;
        const href = a.getAttribute('href') || '';

        // When clicking a link that navigates to a details page, save current section + scroll
        if(href.includes('/details/') || href.includes('../details/') || href.match(/details\//)){
            saveLastPosition();
            return; // allow navigation
        }

        // If the clicked element is a back-button on a details page, override default to restore
        if(a.classList && a.classList.contains('back-button')){
            e.preventDefault();
            const lastSection = sessionStorage.getItem('lastSection');
            const lastScroll = sessionStorage.getItem('lastScroll');
            // If we have a lastSection, navigate to index and let restore logic run there
            if(lastSection){
                // Use a query param to indicate restore (optional)
                // Keep sessionStorage values so the index page can pick them up
                window.location.href = '/index.html';
            } else {
                // Fallback to history
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
