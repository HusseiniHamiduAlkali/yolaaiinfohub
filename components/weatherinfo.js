// Weather Info Component - Loads Atmospheric Conditions from atmospheric-conditions.html
window.renderSection = async function() {
  const mainContent = document.getElementById('main-content');
  
  try {
    // Ensure the weather initialization script is loaded
    if (typeof window.initAetherflowDashboard !== 'function') {
      // Load the weatherinfo initialization script if not already loaded
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'components/weatherinfo.js.js?t=' + Date.now();
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
    
    // Fetch the atmospheric-conditions.html file
    const response = await fetch('Other_features/atmospheric-conditions.html');
    
    if (!response.ok) {
      throw new Error(`Failed to load atmospheric conditions: ${response.status}`);
    }
    
    const htmlContent = await response.text();
    
    // Parse the HTML to extract only the body content
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const bodyContent = doc.body.innerHTML;
    
    // Set the main content
    mainContent.innerHTML = bodyContent;
    
    // Initialize the weather dashboard after content is loaded
    // Give the DOM a moment to settle before initialization
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (typeof window.initAetherflowDashboard === 'function') {
      await window.initAetherflowDashboard();
    }
    
    return Promise.resolve();
    
  } catch (error) {
    console.error('Error loading weather section:', error);
    mainContent.innerHTML = `
      <div class="section-eco" style="padding: 20px;">
        <h2>Weather & Atmospheric Conditions</h2>
        <p>Unable to load weather data. Please try again later.</p>
      </div>
    `;
    return Promise.resolve();
  }
};
