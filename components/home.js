// Load common AI utilities first
if (!window.commonAILoaded) {
  const script = document.createElement('script');
  script.src = 'components/commonAI.js';
  script.onload = () => { window.commonAILoaded = true; };
  document.head.appendChild(script);
}

// Robust navbar loader
function ensureNavbarLoaded(cb) {
  // Don't re-render if already rendered, just ensure it exists
  if (document.querySelector('.navbar')) {
    if (cb) cb();
    return;
  }
  // If navbar hasn't loaded yet, don't force it here - it will be rendered by index.html
  if (cb) cb();
}
window.renderSection = function() {
  ensureNavbarLoaded();
  if (!document.getElementById('global-css')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'styles/global.css';
    link.id = 'global-css';
    document.head.appendChild(link);
  }
  
  return fetch('templates/home.html').then(r => r.text()).then(html => {
    document.getElementById('main-content').innerHTML = html;
    
  }).catch(err => {
    console.error('Failed to load home template:', err);
    document.getElementById('main-content').innerHTML = '<p>Failed to load content.</p>';
  });

};
