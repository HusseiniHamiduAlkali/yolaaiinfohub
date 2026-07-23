// Load common AI utilities first
if (!window.commonAILoaded) {
  const script = document.createElement('script');
  script.src = 'components/commonAI.js';
  script.onload = () => { window.commonAILoaded = true; };
  document.head.appendChild(script);
}

window.renderSection = function() {
  if (typeof ensureNavbarLoaded === 'function') {
    try { ensureNavbarLoaded(); } catch (e) { console.warn('ensureNavbarLoaded() threw:', e); }
  } else {
    console.warn('ensureNavbarLoaded is not defined; continuing without it.');
  }
  if (!document.getElementById('global-css')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'styles/global.css';
    link.id = 'global-css';
    document.head.appendChild(link);
  }
  
  return fetch('templates/servi.html').then(r => r.text()).then(html => {
    document.getElementById('main-content').innerHTML = html;
    
      // Scroll reveal for service cards in the servi template
      if ('IntersectionObserver' in window) {
        const revealCards = document.querySelectorAll('.section4');
        let lastScrollY = window.scrollY || document.documentElement.scrollTop || 0;
        let scrollDirection = 'down';

        window.addEventListener('scroll', () => {
          const currentY = window.scrollY || document.documentElement.scrollTop || 0;
          if (currentY > lastScrollY) {
            scrollDirection = 'down';
          } else if (currentY < lastScrollY) {
            scrollDirection = 'up';
          }
          lastScrollY = currentY;
        }, { passive: true });

        if (revealCards.length) {
          const cardObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
              if (entry.isIntersecting) {
                entry.target.classList.remove('hiding');
                entry.target.classList.add('showing');
                if (scrollDirection === 'up') {
                  entry.target.classList.add('instant');
                  requestAnimationFrame(() => entry.target.classList.remove('instant'));
                }
              } else if (scrollDirection === 'down') {
                entry.target.classList.add('hiding');
                entry.target.classList.remove('showing');
              }
            });
          }, { threshold: 0.2 });
          revealCards.forEach(card => cardObserver.observe(card));
        }
      }
  }).catch(err => {
    console.error('Failed to load servi template:', err);
    document.getElementById('main-content').innerHTML = '<p>Failed to load content.</p>';
  });
};

