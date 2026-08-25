// Theme switcher: supports 'light', 'dark', 'colorful'
(function(){
/*    const COLORFUL_FOLDER = 'colorful-theme';
    // Files that exist in colorful theme folder (whitelist)
    const COLORFUL_FILES = {
        'global.css': true,
        'navbar.css': true,
        'home.css': true,
        'settings.css': true,
        'eduinfo.css': true,
        'agroinfo.css': true,
        'mediinfo.css': true,
        'naviinfo.css': true,
        'ecoinfo.css': true,
        'serviinfo.css': true,
        'communityinfo.css': true,
        'aboutinfo.css': true,
        'tomtom-controls-fallback.css': true,
        'voice-call.css': true
    };
*/
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
            // skip the dark-mode.css file and external URLs
            if(href.indexOf('dark-mode.css') !== -1 || href.indexOf('http') === 0) return;

            // store original href
            if(!link.dataset.originalHref) link.dataset.originalHref = href;
/*
            if(theme === 'colorful'){
                const original = link.dataset.originalHref;
                // only swap if the file exists in colorful theme folder
                if(original.match(/styles\//)){
                    // extract filename
                    const filename = original.split('/').pop();
                    // check if file exists in colorful theme
                    if(COLORFUL_FILES[filename]){
                        const colourful = original.replace(/styles\//, `styles/${COLORFUL_FOLDER}/`);
                        link.setAttribute('href', colourful);
                    } else {
                        // file doesn't exist in colorful theme, keep original
                        link.setAttribute('href', original);
                    }
                } else {
                    // for unexpected paths, leave as-is
                    link.setAttribute('href', original);
                }  
            } */else {
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
