/*
  Client-side loader for local `details/<Section>/En` files.
  - Expects a JSON manifest at `details/En/manifest.json` containing an array of relative file paths.
  - Prefetches listed files and stores their text in `window.localDetailsIndex` as { '<path>': '<text>' }.
  - Exposes helper `window.getLocalDetailsForSection(section, langFolder)` which returns concatenated text for that section.
*/
(function(){
  window.localDetailsIndex = window.localDetailsIndex || {};
  window.getLocalDetailsForSection = function(section, langFolder = 'En'){
    if (!window.localDetailsIndex || Object.keys(window.localDetailsIndex).length === 0) return '';
    const base = `details/${section}/${langFolder}/`;
    let out = '';
    for (const p of Object.keys(window.localDetailsIndex)){
      if (p.indexOf(base) === 0){
        out += '\n' + window.localDetailsIndex[p];
      }
    }
    return out;
  };

  async function loadManifest(){
    try{
      const res = await fetch('details/En/manifest.json', {cache: 'no-cache'});
      if (!res.ok) return;
      const list = await res.json();
      if (!Array.isArray(list)) return;
      // fetch each file (in parallel)
      await Promise.all(list.map(async (rel) => {
        try{
          const resp = await fetch(rel, {cache: 'no-cache'});
          if (resp && resp.ok){
            const txt = await resp.text();
            // normalize path (remove leading ./)
            const key = rel.replace(/^\.\//, '');
            window.localDetailsIndex[key] = txt;
          }
        }catch(e){/* ignore single failures */}
      }));
    }catch(e){
      // manifest not present or network error
    }
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', loadManifest);
  } else {
    loadManifest();
  }
})();
