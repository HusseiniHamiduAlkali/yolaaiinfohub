// Theme switcher: supports 'light', 'dark', 'colorful'
(function(){
    const COLORFUL_FOLDER = 'colorful theme';

    function setTheme(theme){
        if(!theme) theme = 'light';
        localStorage.setItem('theme', theme);
        applyTheme(theme);
        // notify other scripts
        document.documentElement.setAttribute('data-theme', theme);
    }

    function getTheme(){
        return localStorage.getItem('theme') || 'colorful';
    }

    function applyTheme(theme){
        const body = document.body || document.getElementsByTagName('body')[0];

        // handle dark mode class
        if(theme === 'dark'){
            body.classList.add('dark-mode');
        } else {
            body.classList.remove('dark-mode');
        }

        // swap stylesheet links for colorful theme
        const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
        links.forEach(link => {
            const href = link.getAttribute('href');
            if(!href) return;
            // skip the dark-mode.css file
            if(href.indexOf('dark-mode.css') !== -1) return;

            // store original href
            if(!link.dataset.originalHref) link.dataset.originalHref = href;

            if(theme === 'colorful'){
                // set to colorful folder path if a counterpart exists (assumes same filename)
                const original = link.dataset.originalHref;
                // replace 'styles/' with 'styles/colorful theme/' in a robust way
                if(original.match(/styles\//)){
                    const colourful = original.replace(/styles\//, `styles/${COLORFUL_FOLDER}/`);
                    link.setAttribute('href', colourful);
                } else {
                    // for unexpected paths, leave as-is
                }
            } else {
                // restore original
                link.setAttribute('href', link.dataset.originalHref);
            }
        });
    }

    // expose API
    window.setTheme = setTheme;
    window.getTheme = getTheme;
    window.applyTheme = applyTheme;

    // apply immediately to reduce flash-of-unstyled-content (FOUC)
    try { applyTheme(getTheme()); } catch(e) { /* ignore if links not parsed yet */ }
    if(document.readyState === 'loading'){
        document.addEventListener('DOMContentLoaded', () => applyTheme(getTheme()));
    } else {
        applyTheme(getTheme());
    }
})();
