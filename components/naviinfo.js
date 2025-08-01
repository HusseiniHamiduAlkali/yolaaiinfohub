
window.GEMINI_API_KEY = "AIzaSyAZ9TgevsUjCvczgJ31FHSUI1yZ25olZ9U";

// Function to initialize the NaviInfo section
window.initNaviInfo = async function() {
    const naviSection = document.getElementById('naviinfo-content');
    if (!naviSection) return;

    // Create section content if it doesn't exist
    if (!naviSection.querySelector('.section-content')) {
        naviSection.innerHTML = `
            <div class="section-content">
                <h1>Navigation Information</h1>
                <p>Get directions, distances, and transportation information for Yola, Adamawa State.</p>
                
                <div class="chat-container">
                    <div class="chat-header">
                        <div class="model-switch">
                            <span class="model-label">Using Gemini 1.5</span>
                            <label class="switch">
                                <input type="checkbox" onchange="window.toggleGeminiModel('naviinfo', this.checked)">
                                <span class="slider round"></span>
                            </label>
                        </div>
                    </div>
                    <div id="chat-output" class="chat-messages"></div>
                    <div class="chat-input-area">
                        <input type="text" id="user-input" placeholder="Ask for directions, locations, or transport info...">
                        <button onclick="sendMessage('naviinfo')">Send</button>
                    </div>
                </div>

                <div id="map-section">
                    <div id="map"></div>
                    <div class="map-controls">
                        <button onclick="window.map.setZoom(window.map.getZoom() + 1)">Zoom In</button>
                        <button onclick="window.map.setZoom(window.map.getZoom() - 1)">Zoom Out</button>
                        <button onclick="window.map.setCenter([9.2182, 12.4818])">Center on Yola</button>
                    </div>
                    <div class="map-info"></div>
                    <div class="route-info"></div>
                </div>
            </div>
        `;

        // Load leaflet resources
        if (!document.querySelector('link[href*="leaflet.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet/dist/leaflet.css';
            document.head.appendChild(link);
        }

        // Load Leaflet Routing Machine CSS
        if (!document.querySelector('link[href*="leaflet-routing-machine.css"]')) {
            const routingLink = document.createElement('link');
            routingLink.rel = 'stylesheet';
            routingLink.href = 'https://unpkg.com/leaflet-routing-machine/dist/leaflet-routing-machine.css';
            document.head.appendChild(routingLink);
        }

        // Load JS if not already loaded
        await loadScripts();
        initMap();
    }
};

// Function to initialize NaviInfo section
window.initNaviInfo = () => {
    const naviSection = document.getElementById('naviinfo-content');
    if (!naviSection) return;
    
    // Create section content if it doesn't exist
    if (!naviSection.querySelector('.section-content')) {
        naviSection.innerHTML = `
            <div class="section-content">
                <h1>Navigation Information</h1>
                <p>Get directions, distances, and transportation information for Yola, Adamawa State.</p>
                
                <div id="naviinfo-chat-container" class="chat-container">
                    <div id="naviinfo-chat-messages" class="chat-messages"></div>
                    <div id="naviinfo-chat-preview"></div>
                    <div class="chat-input-area">
                        <input type="text" id="naviinfo-chat-input" placeholder="Ask for directions, locations, or transport info...">
                        <div class="send-button-group">
                            <button type="submit" class="send-button" onclick="sendMessage('naviinfo')">Send</button>
                            <button type="button" class="stop-button" style="display: none;">Stop</button>
                        </div>
                    </div>
                </div>

                <div id="map-section">
                    <div id="map"></div>
                    <div class="map-controls">
                        <button onclick="window.map.setZoom(window.map.getZoom() + 1)">Zoom In</button>
                        <button onclick="window.map.setZoom(window.map.getZoom() - 1)">Zoom Out</button>
                        <button onclick="window.map.setCenter({lat: 9.2182, lng: 12.4818})">Center on Yola</button>
                    </div>
                    <div class="map-info"></div>
                    <div class="route-info"></div>
                </div>
            </div>
        `;
        
        // Once content is added, load the maps API
        loadGoogleMapsAPI();
    }
};

// Gemini model preference
window.useGemini25 = window.useGemini25 || false;

// Register the section initialization
if (typeof window.registerSectionInit === 'function' && typeof window.initNaviInfo === 'function') {
    window.registerSectionInit('naviinfo', window.initNaviInfo);
} else {
    // If registration function isn't available yet, wait for it
    window.addEventListener('load', () => {
        if (typeof window.registerSectionInit === 'function' && typeof window.initNaviInfo === 'function') {
            window.registerSectionInit('naviinfo', window.initNaviInfo);
        }
    });
}

window.toggleGeminiModel = function(section, useGemini25) {
    window.useGemini25 = useGemini25;
    const label = document.querySelector('.model-label');
    if (label) {
        label.textContent = useGemini25 ? 'Using Gemini 2.5' : 'Using Gemini 1.5';
    }
    // Store preference
    localStorage.setItem('gemini_model_preference', useGemini25 ? '2.5' : '1.5');
};

// Initialize model preference from storage
if (typeof window.useGemini25 === 'undefined') {
    const storedPreference = localStorage.getItem('gemini_model_preference');
    window.useGemini25 = storedPreference === '2.5';
}

// Global text-to-speech variables and functions
window.currentSpeech = window.currentSpeech || null;

window.stopSpeaking = window.stopSpeaking || function() {
  if (window.currentSpeech) {
    speechSynthesis.cancel();
    window.currentSpeech = null;
  }
};

window.speakText = window.speakText || function(text) {
  window.stopSpeaking();
  
  // Remove HTML tags and convert breaks to spaces
  const cleanText = text.replace(/<[^>]*>/g, '').replace(/<br>/g, ' ');
  
  const utterance = new SpeechSynthesisUtterance(cleanText);
  
  // Set preferred voice (try to use a clear English voice if available)
  const voices = speechSynthesis.getVoices();
  const preferredVoice = voices.find(voice => 
    voice.name.includes('Google') || voice.name.includes('Microsoft') || 
    voice.name.includes('English')
  );
  if (preferredVoice) utterance.voice = preferredVoice;
  
  // Adjust speech parameters for better clarity
  utterance.rate = 1.0;  // Normal speed
  utterance.pitch = 1.0; // Normal pitch
  utterance.volume = 1.0; // Full volume
  
  window.currentSpeech = utterance;
  
  // Visual feedback while speaking
  const speakButton = document.querySelector('.read-aloud-btn');
  if (speakButton) {
    speakButton.style.backgroundColor = '#e2e8f0';
    speakButton.style.transform = 'scale(1.1)';
  }
  
  utterance.onend = () => {
    window.currentSpeech = null;
    if (speakButton) {
      speakButton.style.backgroundColor = '';
      speakButton.style.transform = '';
    }
  };
  
  speechSynthesis.speak(utterance);
};

// Edit this prompt to instruct the AI on how to answer user messages for NaviInfo
window.NAVI_AI_PROMPT = window.NAVI_AI_PROMPT || `You are an AI navigation assistant for Yola, Adamawa State, Nigeria.
Respond to greetings politely, and help users with navigation, directions, and transportation in Yola.

Key Capabilities:
1. You can show locations on the map using the showLocation() function
2. You can draw routes between points using the drawRoute() function
3. You can calculate distances using the calculateDistance() function
4. You can display travel time estimates using the estimateTravelTime() function

When users ask for:
- Locations: Use showLocation() to display it on the map
- Directions: Use drawRoute() to show the path
- Distances: Use calculateDistance() to compute and share the distance
- Travel time: Use estimateTravelTime() to provide estimates

Sample responses:
- For locations: "Let me show you that on the map" followed by showLocation()
- For directions: "I'll draw the route for you" followed by drawRoute()
- For distances: "The distance is [result from calculateDistance()]"
- For travel times: "Estimated travel time is [result from estimateTravelTime()]"

If information is not available, say: "Sorry, I do not have that specific information in my local database. Please contact a local transport authority for further help."

For non-navigation queries about health, education, community, environment, jobs, or agriculture, refer users to MediInfo, EduInfo, CommunityInfo, EcoInfo, JobsConnect, or AgroInfo respectively.`;

// Function to load required scripts
async function loadScripts() {
    const scripts = [
        'https://unpkg.com/leaflet/dist/leaflet.js',
        'https://unpkg.com/leaflet-routing-machine/dist/leaflet-routing-machine.js'
    ];

    for (const src of scripts) {
        if (!document.querySelector(`script[src="${src}"]`)) {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = src;
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }
    }
}

// Initialize Leaflet map
window.initMap = function() {
    const mapDiv = document.getElementById('map');
    if (!mapDiv || !window.L) return;

    // Create the map centered on Yola
    window.map = L.map('map').setView([9.2182, 12.4818], 13);

    // Add satellite layer (ESRI World Imagery)
    window.satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 18
    }).addTo(window.map);

    // Add OpenStreetMap layer for labels and roads
    window.osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18
    });

    // Add layer control
    L.control.layers({
        "Satellite": window.satelliteLayer,
        "Streets": window.osmLayer
    }).addTo(window.map);

    // Initialize route control for directions
    window.routeControl = L.Routing.control({
        waypoints: [],
        router: L.Routing.osrm({
            serviceUrl: 'https://router.project-osrm.org/route/v1'
        }),
        lineOptions: {
            styles: [{color: '#0066CC', weight: 4}]
        },
        show: false,
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoutes: true
    }).addTo(window.map);

    // Initialize markers array
    window.markers = [];
};

// Function to show location on map
window.showLocation = async function(locationName) {
    if (!window.map) return;
    
    // Add "Yola" to the search if not present
    if (!locationName.toLowerCase().includes('yola')) {
        locationName += ' Yola, Nigeria';
    }

    try {
        // Use OpenStreetMap Nominatim for geocoding
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}`);
        const data = await response.json();

        if (data && data[0]) {
            // Clear previous markers
            window.markers.forEach(marker => window.map.removeLayer(marker));
            window.markers = [];

            // Add new marker
            const marker = L.marker([data[0].lat, data[0].lon], {
                title: locationName
            }).addTo(window.map);
            window.markers.push(marker);

            // Center map on location
            window.map.setView([data[0].lat, data[0].lon], 15);
            
            // Show the map section
            const mapSection = document.getElementById('map-section');
            if (mapSection) {
                mapSection.style.display = 'block';
                mapSection.scrollIntoView({ behavior: 'smooth' });
            }

            return true;
        }
        return false;
    } catch (error) {
        console.error('Geocoding failed:', error);
        return false;
    }
};

// Function to draw route between two points
window.drawRoute = async function(origin, destination) {
    if (!window.map || !window.routeControl) return;
    
    try {
        // Add "Yola" to searches if not present
        if (!origin.toLowerCase().includes('yola')) origin += ' Yola, Nigeria';
        if (!destination.toLowerCase().includes('yola')) destination += ' Yola, Nigeria';

        // Geocode both points
        const [originData, destData] = await Promise.all([
            fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(origin)}`).then(r => r.json()),
            fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destination)}`).then(r => r.json())
        ]);

        if (originData[0] && destData[0]) {
            // Set waypoints and display route
            window.routeControl.setWaypoints([
                L.latLng(originData[0].lat, originData[0].lon),
                L.latLng(destData[0].lat, destData[0].lon)
            ]);

            // Show the map section
            const mapSection = document.getElementById('map-section');
            if (mapSection) {
                mapSection.style.display = 'block';
                mapSection.scrollIntoView({ behavior: 'smooth' });
            }
            
            return true;
        }
        return false;
    } catch (error) {
        console.error('Routing failed:', error);
        return false;
    }
};

// Function to calculate distance between points
window.calculateDistance = async function(origin, destination) {
    if (!window.map) {
        throw new Error('Map not initialized');
    }

    try {
        // Add "Yola" to searches if not present
        if (!origin.toLowerCase().includes('yola')) origin += ' Yola, Nigeria';
        if (!destination.toLowerCase().includes('yola')) destination += ' Yola, Nigeria';

        // Geocode both points
        const [originData, destData] = await Promise.all([
            fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(origin)}`).then(r => r.json()),
            fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destination)}`).then(r => r.json())
        ]);

        if (originData[0] && destData[0]) {
            const route = await fetch(`https://router.project-osrm.org/route/v1/driving/${originData[0].lon},${originData[0].lat};${destData[0].lon},${destData[0].lat}?overview=false`).then(r => r.json());
            
            if (route.routes && route.routes[0]) {
                const distanceKm = (route.routes[0].distance / 1000).toFixed(1);
                return `${distanceKm} km`;
            }
        }
        throw new Error('Could not calculate distance');
    } catch (error) {
        console.error('Distance calculation failed:', error);
        throw error;
    }
};

// Function to estimate travel time
window.estimateTravelTime = async function(origin, destination) {
    if (!window.map) {
        throw new Error('Map not initialized');
    }

    try {
        // Add "Yola" to searches if not present
        if (!origin.toLowerCase().includes('yola')) origin += ' Yola, Nigeria';
        if (!destination.toLowerCase().includes('yola')) destination += ' Yola, Nigeria';

        // Geocode both points
        const [originData, destData] = await Promise.all([
            fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(origin)}`).then(r => r.json()),
            fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destination)}`).then(r => r.json())
        ]);

        if (originData[0] && destData[0]) {
            const route = await fetch(`https://router.project-osrm.org/route/v1/driving/${originData[0].lon},${originData[0].lat};${destData[0].lon},${destData[0].lat}?overview=false`).then(r => r.json());
            
            if (route.routes && route.routes[0]) {
                const minutes = Math.round(route.routes[0].duration / 60);
                if (minutes < 60) {
                    return `${minutes} minutes`;
                } else {
                    const hours = Math.floor(minutes / 60);
                    const remainingMinutes = minutes % 60;
                    return `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
                }
            }
        }
        throw new Error('Could not estimate travel time');
    } catch (error) {
        console.error('Travel time estimation failed:', error);
        throw error;
    }
};

window.naviAbortController = window.naviAbortController || null;

// Robust navbar loader
function ensureNavbarLoaded(cb) {
  if (typeof window.renderNavbar === 'function') {
    window.renderNavbar();
    if (cb) cb();
  } else {
    if (!document.getElementById('navbar-js')) {
      const script = document.createElement('script');
      script.src = 'components/navbar.js';
      script.id = 'navbar-js';
      script.onload = function() {
        if (typeof window.renderNavbar === 'function') window.renderNavbar();
        if (cb) cb();
      };
      document.body.appendChild(script);
    } else {
      let tries = 0;
      (function waitForNavbar() {
        if (typeof window.renderNavbar === 'function') {
          window.renderNavbar();
          if (cb) cb();
        } else if (tries < 30) {
          tries++;
          setTimeout(waitForNavbar, 100);
        }
      })();
    }
  }
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
  document.getElementById('main-content').innerHTML = `
    <section class="info-section">
      <h2>NaviInfo - Navigation Help</h2>
      <p>Ask for directions, locations, or transportation information in Yola.</p>
      <div class="chat-container">
        <div class="chat-header">
          <span>NaviInfo AI Chat</span>
          <div class="model-switch">
            <label class="switch">
              <input type="checkbox" id="model-toggle" onchange="window.toggleGeminiModel('navi', this.checked)">
              <span class="slider round"></span>
            </label>
            <span class="model-label">Using Gemini 1.5</span>
          </div>
        </div>
        <div class="chat-messages" id="navi-chat-messages"></div>
        <form class="chat-input-area" onsubmit="event.preventDefault(); window.sendNaviMessage();">
          <div id="navi-chat-preview" class="chat-preview"></div>
          <input type="text" id="navi-chat-input" placeholder="Ask about navigation..." required />
          <div class="send-button-group">
            <button type="submit" class="send-button">
              <span class="send-text">Send</span>
              <span class="spinner"></span>
            </button>
            <button type="button" class="stop-button" style="display:none" onclick="window.stopNaviResponse()">Stop</button>
          </div>
        </form>
        <div class="input-options">
          <button type="button" onclick="window.captureImage('navi')" title="Capture Image"><span>📷</span></button>
          <button type="button" onclick="window.recordAudio('navi')" title="Record Audio"><span>🎤</span></button>
          <label class="file-upload-btn" title="Upload File">
            <span>📁</span>
            <input type="file" style="display:none" onchange="window.uploadFile(event, 'navi')" />
          </label>
        </div>
        <div class="faq-list">
        <h3>NaviInfo FAQs</h3>
        <ul>
          <li><a class="faq-link" onclick="window.sendNaviMessage('How do I get to the Yola International Airport?')">How do I get to the Yola International Airport?</a></li>
          <li><a class="faq-link" onclick="window.sendNaviMessage('What are the public transportation options?')">What are the public transportation options?</a></li>
          <li><a class="faq-link" onclick="window.sendNaviMessage('Find directions to the nearest police station.')">Find directions to the nearest police station.</a></li>
          <li><a class="faq-link" onclick="window.sendNaviMessage('Is there a reliable taxi service?')">Is there a reliable taxi service?</a></li>
          <li><a class="faq-link" onclick="window.sendNaviMessage('Where is the main market in Yola?')">Where is the main market in Yola?</a></li>
          <li><a class="faq-link" onclick="window.sendNaviMessage('Traffic updates in Yola')">Traffic updates in Yola</a></li>
        </ul>
      </div>
      </div>
      
      <div class="section-extra">
        <h2>Yola Map</h2>
        <div id="navi-map" class="navi-map-styled"></div>
      </div>

      <div class="section2">
        <h2>Places of Attraction in Yola</h2>
        
        <div class="section3">
          <h3 class="section3-title">Parks and Recreation</h3>
          <div class="section4-container">
          
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/wetlands.jpeg" alt="Wetlands Park">
              </div>
              <h3>Wetlands Park and gardens</h3>
              <p>Popular urban park with gardens, events space, and recreational facilities.</p>
              <a href="details/central-park.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/gorilla3.jpeg" alt="Gorilla Park">
              </div>
              <h3>Gorilla Park</h3>
              <p>A beautiful recreational park with green spaces, walking trails, and children's play areas.</p>
              <a href="details/peace-park.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/NaviInfo/riverside-park.jpg" alt="Riverside Park">
              </div>
              <h3>Riverside Park</h3>
              <p>Scenic park along the Benue River offering beautiful views and picnic spots.</p>
              <a href="details/riverside-park.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/zoo.jpeg" alt="Yola Zoo">
              </div>
              <h3>Yola Zoo</h3>
              <p>.</p>
              <a href="details/zoo.html">Learn more →</a>
            </div>

          </div>
        </div>

        <div class="section3">
          <h3 class="section3-title">Markets and Shopping complexes</h3>
          <div class="section4-container">
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/jimetamarket.jpg" alt="Jimeta Modern Market">
              </div>
              <h3>Jimeta Modern Market</h3>
              <p>Large commercial center offering a wide range of goods and services.</p>
              <a href="details/jimeta-market.html">Learn more →</a>
            </div>
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/yolamarket2.jpg" alt="Yola Old Market">
              </div>
              <h3>Yola Old Market</h3>
              <p>Historic market known for traditional goods and local crafts.</p>
              <a href="details/yola-market.html">Learn more →</a>
            </div>
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/sanhusein.jpg" alt="Upper Market">
              </div>
              <h3>SanHusein Shopping Mall</h3>
              <p>Popular shopping destination for textile and household items.</p>
              <a href="details/sanhusein-mall.html">Learn more →</a>
            </div>
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/jabbama.jpg" alt="Upper Market">
              </div>
              <h3>Jabbama Shopping Plaza</h3>
              <p>Popular shopping destination for electronic products and household items.</p>
              <a href="details/jabbama-plaza.html">Learn more →</a>
            </div>
            
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/yakubu.jpeg" alt="Upper Market">
              </div>
              <h3>Yakubu Shopping Plaza</h3>
              <p>Popular shopping destination for drinks and provisions.</p>
              <a href="details/shopping.html">Learn more →</a>
            </div>
          </div>
        </div>

        <div class="section3">
          <h3 class="section3-title">Hotels</h3>

          <div class="section4-container">
            
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/muna.jpg" alt="Muna Hotel">
              </div>
              <h3>Muna Hotel</h3>
              <p>Luxury hotel offering comfortable accommodations and modern amenities.</p>
              <a href="details/muna-hotel.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/citygreenhotel.png" alt="City  Green">
              </div>
              <h3>City Green Hotels</h3>
              <p>Premium hotel with conference facilities and restaurant services.</p>
              <a href="details/city-green-hotel.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/dantsoho.jpg" alt="Royal Hotels">
              </div>
              <h3>Dantshoho Hotels</h3>
              <p>Family-friendly hotel with excellent services and central location.</p>
              <a href="details/dantshoho-hotel.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/aunhotel2.jpg" alt="AUN Hotel">
              </div>
              <h3>AUN Hotel</h3>
              <p>Luxury hotel offering comfortable accommodations and modern amenities.</p>
              <a href="details/hotel.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/aunhotel.jpeg" alt="AUN restaurant">
              </div>
              <h3>AUN Hotel - Jabbama Restaurant</h3>
              <p></p>
              <a href="details/restaurant.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/items7.jpeg" alt="Items7 restaurant">
              </div>
              <h3>Items7 restaurant</h3>
              <p>.</p>
              <a href="details/restaurant.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/mevish.jpeg" alt="Mevish Cafe">
              </div>
              <h3>Mevish Cafe</h3>
              <p>.</p>
              <a href="details/restaurant.html">Learn more →</a>
            </div>
            
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/chickencottage.png" alt="Chicken cottage Yola">
              </div>
              <h3>Chicken cottage Yola</h3>
              <p>.</p>
              <a href="details/restaurant.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/uptownspot.png" alt="Uptown Yola">
              </div>
              <h3>Uptown Exclusive Spot Yola.</h3>
              <p>.</p>
              <a href="details/restaurant.html">Learn more →</a>
            </div>
            
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/oasis.jpg" alt="OASIS Yola">
              </div>
              <h3>OASIS Bakery, Yola.</h3>
              <p>.</p>
              <a href="details/restaurant.html">Learn more →</a>
            </div>
             
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/marwa.jpg" alt="Marwa grills Yola">
              </div>
              <h3>Marwa shawarma & grills, Yola.</h3>
              <p>.</p>
              <a href="details/restaurant.html">Learn more →</a>
            </div>
             
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/yahuza.png" alt="OASIS Yola">
              </div>
              <h3>Yahuza Suya Spot, Yola.</h3>
              <p>.</p>
              <a href="details/restaurant.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/yahuza.png" alt="OASIS Yola">
              </div>
              <h3>Yahuza Suya Spot, Yola.</h3>
              <p>.</p>
              <a href="details/restaurant.html">Learn more →</a>
            </div>


          </div>
        </div>

        <div class="section3">
          <h3 class="section3-title">Religious Centers</h3>
        <div class="section4-container">
          
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/macm2.jpg" alt="Modibbo Adama Central Mosque, Yola">
              </div>
              <h3>Modibbo Adama Central Mosque, Yola</h3>
              <p>A very large and historic mosque of the Lamido palace.</p>
              <a href="details/macm.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/modibbozailani.png" alt="Gorilla Park">
              </div>
              <h3>Modibbo Zailani Mosque, Yola</h3>
              <p>.</p>
              <a href="details/peace-park.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/agga.jpeg" alt="Riverside Park">
              </div>
              <h3>Agga Islamic Center, Yola</h3>
              <p></p>
              <a href="details/riverside-park.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/mauthmasjid.png" alt="Central Park">
              </div>
              <h3>MAUTH Jumma'at Mosque, Yola.</h3>
              <p>Popular urban park with gardens, events space, and recreational facilities.</p>
              <a href="details/central-park.html">Learn more →</a>
            </div>
            
          </div>
        </div>

        <div class="section3">
          <h3 class="section3-title">Banks</h3>

          <div class="section4-container">

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/gtgate.jpg" alt="GT Bank">
              </div>
              <h3>Guarantee Trust (GT) Bank, Yola</h3>
              <p>Financial institution known for its reliable services.</p>
              <a href="details/gt-bank.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/zenithlogo.png" alt="Zenith Bank">
              </div>
              <h3>Zenith Bank</h3>
              <p></p>
              <a href="details/zenith-bank.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/fidelity2.jpg" alt="Fidelity Bank">
              </div>
              <h3>Fidelity Bank</h3>
              <p></p>
              <a href="details/fidelity-bank.html">Learn more →</a>
            </div>
            
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/stanbic.jpg" alt="Stanbic IBTC">
              </div>
              <h3>Stanbic IBTC</h3>
              <p></p>
              <a href="details/banks.html">Learn more →</a>
            </div>

          </div>
        </div>


        <div class="section3">
        
        <h3 class="section3-title">Community Centers</h3>
        
          <div class="section4">
            <div class="img-placeholder">
              <img src="Data/Images/ribadusquare.jpg" alt="Cultural Center">
            </div>
            <h3>Mahmudu Ribadu Square, Yola</h3>
            <p>Venue for cultural events, exhibitions, and traditional performances.</p>
            <a href="details/ribadu-square.html">Learn more →</a>
          </div>

          <div class="section4-container">
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/community/culturalcenter.jpg" alt="Cultural Center">
              </div>
              <h3>Yola Cultural Center</h3>
              <p>Promoting local arts, culture, and traditional events.</p>
              <a href="details/culturalcenter.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/community/sportscenter.jpg" alt="Sports Complex">
              </div>
              <h3>Yola Sports Complex</h3>
              <p>Sports facilities and youth development programs.</p>
              <a href="details/sportscomplex.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/library.jpg" alt="Public Library">
              </div>
              <h3>Yola Public Library</h3>
              <p>Public library and educational resource center.</p>
              <a href="details/library.html">Learn more →</a>
            </div>

          </div>
        </div>

        <div class="section3">
        <h3 class="section3-title">Iconic Structures in Yola</h3>
          
          <div class="section4-container">
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/jippujam2.jpeg" alt="jippujam">
              </div>
              <h3>Jabbama Jippu Jam (Yola Toll Gate)</h3>
              <p></p>
              <a href="details/jippujam.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/flyover.jpg" alt="Police roundabout">
              </div>
              <h3>Police Roundabout Flyover, Jimeta Yola. </h3>
              <p>.</p>
              <a href="details/flyover.html">Learn more →</a>
            </div>

            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/welcometoyola.jpeg" alt="welcome to yola">
              </div>
              <h3>Yola main entrance gate</h3>
              <p></p>
              <a href="details/roundabout.html">Learn more →</a>
            </div>
            
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/welcometoyola.jpeg" alt="welcome to yola">
              </div>
              <h3>Yola main entrance gate</h3>
              <p></p>
              <a href="details/roundabout.html">Learn more →</a>
            </div>
            
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/welcometoyola.jpeg" alt="welcome to yola">
              </div>
              <h3>Yola main entrance gate</h3>
              <p></p>
              <a href="details/roundabout.html">Learn more →</a>
            </div>

          </div>
        </div>

        <div class="section3">
          <h3 class="section3-title">Other Places of Interest</h3>
        
          <div class="section4-container">
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/palace2.jpg" alt="Lamido Palace">
              </div>
              <h3>Lamido Palace</h3>
              <p>Historic palace showcasing traditional architecture and cultural heritage.</p>
              <a href="details/lamido-palace.html">Learn more →</a>
            </div>
    
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/airport.jpg" alt="Airport">
              </div>
              <h3>Lamido Aliyu Musdafa Int'l Airport, Yola.</h3>
              <p>An international airport with many airlines offering trips to any destinations.</p>
              <a href="details/yola-airport.html">Learn more →</a>
            </div>
            
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/polologo.jpg" alt="Polo Ground">
              </div>
              <h3>Yola Polo ground</h3>
              <p>Venue for polo and horse racing performances.</p>
              <a href="details/polo-ground.html">Learn more →</a>
            </div>
            
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/polologo.jpg" alt="Polo Ground">
              </div>
              <h3>Yola Polo ground</h3>
              <p>Venue for polo and horse racing performances.</p>
              <a href="details/polo-ground.html">Learn more →</a>
            </div>
            
            <div class="section4">
              <div class="img-placeholder">
                <img src="Data/Images/polologo.jpg" alt="Polo Ground">
              </div>
              <h3>Yola Polo ground</h3>
              <p>Venue for polo and horse racing performances.</p>
              <a href="details/polo-ground.html">Learn more →</a>
            </div>
          </div>


        

        </div>
      </div>
    </section>
  `;
  // Load keyless Google Maps script if not already loaded
  let mapLoaded = false;
  const mapDiv = document.getElementById('navi-map');
  mapDiv.innerHTML = '<div style="color:#aaa;text-align:center;padding:2em 0;">Loading map...</div>';
  function tryInitMap(attempts = 0) {
    if (window.google && window.google.maps) {
      mapLoaded = true;
      mapDiv.innerHTML = '';
      window.initNaviMapInstance();
    } else if (attempts < 30) {
      setTimeout(() => tryInitMap(attempts + 1), 200);
    } else {
      // Show error if map fails to load
      if (mapDiv && !mapLoaded) {
        mapDiv.innerHTML = '<div style="color:#e53e3e;text-align:center;padding:2em 0;">Map could not be loaded. Please check your internet connection or try again later.</div>';
      }
    }
  }
  if (!window.google || !window.google.maps) {
    if (!document.getElementById('keyless-gmaps')) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/gh/somanchiu/Keyless-Google-Maps-API@v7.0/mapsJavaScriptAPI.js';
      script.async = true;
      script.id = 'keyless-gmaps';
      document.body.appendChild(script);
    }
    tryInitMap();
  } else {
    mapDiv.innerHTML = '';
    window.initNaviMapInstance();
  }
};

// Google Maps instance and directions logic
window.initNaviMapInstance = function() {
  const yola = { lat: 9.2035, lng: 12.4954 };
  const mapDiv = document.getElementById('navi-map');
  window.naviMap = new google.maps.Map(mapDiv, {
    center: yola,
    zoom: 13,
    mapTypeId: 'hybrid' // hybrid = satellite + labels
  });
  window.naviMarker = new google.maps.Marker({ position: yola, map: window.naviMap, title: 'Yola' });
  window.naviDirectionsRenderer = new google.maps.DirectionsRenderer({ map: window.naviMap });
  window.naviDirectionsService = new google.maps.DirectionsService();
};

// Common helper for Gemini API call
async function getGeminiAnswer(localData, msg, apiKey, imageData = null) {
  try {
    const contents = {
      parts: []
    };

    if (imageData) {
      contents.parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: imageData.split(',')[1] // Remove data URL prefix
        }
      });
    }

    // Use the editable prompt from localStorage or fallback
    const promptGuide = localStorage.getItem('navi_ai_prompt') || NAVI_AI_PROMPT;
    contents.parts.push({
      text: `${promptGuide}\n\n--- LOCAL DATA START ---\n${localData}\n--- LOCAL DATA END ---\n\nUser question: ${msg}`
    });

    // Choose model based on user preference and image presence
    const modelVersion = imageData ? 'gemini-pro-vision' : 
                        (window.useGemini25 ? 'gemini-2.5-flash' : 'gemini-1.5-flash');
    
    let url = `https://generativelanguage.googleapis.com/v1/models/${modelVersion}:generateContent?key=${apiKey}`;
    let body = JSON.stringify({ contents: [contents] });
    
    let res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    let data = await res.json();
    
    // If 2.5 fails, fallback to 1.5
    if (data.error && window.useGemini25 && !imageData) {
      console.log('Falling back to Gemini 1.5');
      url = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=' + apiKey;
      res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
      data = await res.json();
    }
    return (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts.length > 0) ?
      data.candidates[0].content.parts[0].text : "No answer from AI.";
  } catch (error) {
    console.error("Gemini API error:", error);
    return "Sorry, I'm having trouble connecting to the AI at the moment.";
  }
}

// Common function to format AI responses
function formatAIResponse(text) {
  let formatted = text
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '<b>$1</b>') // Bold
    .replace(/\n/g, '<br>'); // Line breaks
  
  return `
    <div class="ai-response">
      ${formatted}
      <button onclick="window.speakText(this.parentElement.textContent)" class="read-aloud-btn" title="Listen to Response">
        🔊 Listen
      </button>
      <style>
        .read-aloud-btn {
          background: transparent;
          border: 1px solid #cbd5e0;
          border-radius: 6px;
          padding: 4px 8px;
          margin-top: 8px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.9em;
        }
        .read-aloud-btn:hover {
          background: #e2e8f0;
          transform: translateY(-1px);
        }
      </style>
    </div>
  `;
}

// Common image capture function
window.captureImage = function(section) {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="camera-modal">
      <video id="camera-feed" autoplay playsinline></video>
      <button id="snap-btn">Capture Photo</button>
      <button id="close-camera">Close</button>
    </div>
  `;
  document.body.appendChild(overlay);

  const video = document.getElementById('camera-feed');
  const snapBtn = document.getElementById('snap-btn');
  const closeBtn = document.getElementById('close-camera');
  let stream;

  navigator.mediaDevices.getUserMedia({ video: true })
    .then(s => {
      stream = s;
      video.srcObject = stream;
    })
    .catch(err => {
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Please ensure you have a camera and have granted permission.");
      overlay.remove();
    });

  snapBtn.onclick = () => {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageDataURL = canvas.toDataURL('image/png');
    document.getElementById(section + '-chat-preview').innerHTML = `<img src='${imageDataURL}' style='max-width:120px;max-height:80px;border-radius:8px;margin:4px 0;' alt='Captured Image' />`;
    overlay.remove();
    if (stream) stream.getTracks().forEach(t => t.stop());
  };

  closeBtn.onclick = () => {
    overlay.remove();
    if (stream) stream.getTracks().forEach(t => t.stop());
  };
};

// Common audio recording function
window.recordAudio = function(section) {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="audio-modal">
      <p>Recording...</p>
      <button id="stop-recording">Stop Recording</button>
      <button id="close-audio">Close</button>
    </div>
  `;
  document.body.appendChild(overlay);

  const stopBtn = document.getElementById('stop-recording');
  const closeBtn = document.getElementById('close-audio');
  let mediaRecorder;
  let audioChunks = [];
  let stream;

  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(s => {
      stream = s;
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = e => {
        audioChunks.push(e.data);
      };
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const audioURL = URL.createObjectURL(audioBlob);
        document.getElementById(section + '-chat-preview').innerHTML = `<audio src='${audioURL}' controls style='max-width:120px;vertical-align:middle;margin:4px 0;'></audio>`;
        overlay.remove();
        if (stream) stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorder.start();
    })
    .catch(err => {
      console.error("Error accessing audio:", err);
      alert("Could not access microphone. Please ensure you have a microphone and have granted permission.");
      overlay.remove();
    });

  stopBtn.onclick = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    if (stream) stream.getTracks().forEach(t => t.stop());
    overlay.remove();
  };
  closeBtn.onclick = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    if (stream) stream.getTracks().forEach(t => t.stop());
    overlay.remove();
  };
};

// Common file upload function
window.uploadFile = function(e, section) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    const preview = document.getElementById(section + '-chat-preview');
    let html = '';
    if (file.type.startsWith('image/')) {
      html = `<img src='${ev.target.result}' style='max-width:120px;max-height:80px;border-radius:8px;margin:4px 0;' alt='Uploaded Image' />`;
    } else if (file.type.startsWith('audio/')) {
      html = `<audio src='${ev.target.result}' controls style='max-width:120px;vertical-align:middle;margin:4px 0;'></audio>`;
    } else if (file.type.startsWith('video/')) {
      html = `<video src='${ev.target.result}' controls style='max-width:120px;max-height:80px;border-radius:8px;margin:4px 0;'></video>`;
    } else if (file.type === 'application/pdf') {
      html = `<iframe src='${ev.target.result}' style='width:120px;height:80px;border-radius:8px;margin:4px 0;'></iframe><p style='font-size:10px;margin:0;'>${file.name}</p>`;
    } else {
      html = `<p style='font-size:12px;margin:4px 0;'>${file.name}</p>`;
    }
    preview.innerHTML = html;
  };
  reader.readAsDataURL(file);
};

window.stopNaviResponse = function() {
  if (naviAbortController) {
    naviAbortController.abort();
    naviAbortController = null;
  }
  const sendBtn = document.querySelector('.send-button');
  const stopBtn = document.querySelector('.stop-button');
  if (sendBtn) {
    sendBtn.classList.remove('sending');
    sendBtn.querySelector('.send-text').textContent = 'Send';
    sendBtn.disabled = false;
  }
  if (stopBtn) stopBtn.style.display = 'none';
};

window.sendNaviMessage = async function(faqText = '') {
  const input = document.getElementById('navi-chat-input');
  const chat = document.getElementById('navi-chat-messages');
  const preview = document.getElementById('navi-chat-preview');
  const sendBtn = document.querySelector('.send-button');
  const stopBtn = document.querySelector('.stop-button');
  
  // Extract image data if present in preview
  let imageData = null;
  const previewImg = preview.querySelector('img');
  if (previewImg) {
    imageData = previewImg.src;
    msg = (msg || '') + "\nPlease analyze this image and provide relevant navigation information, identify landmarks, or suggest similar places to visit.";
  
  let msg = faqText || input.value.trim();
  let attach = preview.innerHTML;
  if (!msg && !attach) return;

  if (window.naviAbortController) {
    window.naviAbortController.abort();
  }
  window.naviAbortController = new AbortController();

  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.classList.add('sending');
    sendBtn.querySelector('.send-text').textContent = '';
  }
  if (stopBtn) stopBtn.style.display = 'inline-flex';

  const msgGroup = document.createElement('div');
  msgGroup.className = 'chat-message-group';
  msgGroup.innerHTML = `
    <div class='user-msg'>${msg}${attach ? "<br>" + attach : ""}</div>
    <div class='ai-msg'><span class='ai-msg-text'>...</span></div>
  `;
  chat.appendChild(msgGroup);
  preview.innerHTML = '';
  if (!faqText) input.value = '';

  let finalAnswer = "";
  let directionsDrawn = false;
  try {
    const localData = await fetch('Data/NaviInfo/naviinfo.txt').then(r => r.text());
    finalAnswer = await getGeminiAnswer(NAVI_AI_PROMPT + "\n\n" + localData, msg, window.GEMINI_API_KEY, imageData);
    // Try to extract directions from the AI response
    // Example: "Directions from [origin] to [destination]"
    const dirMatch = /directions from ([^\n]+?) to ([^\n.]+)[\n.]/i.exec(msg + ' ' + finalAnswer);
    if (dirMatch && window.naviDirectionsService && window.naviDirectionsRenderer) {
      const origin = dirMatch[1].trim();
      const destination = dirMatch[2].trim();
      window.naviDirectionsService.route({
        origin,
        destination,
        travelMode: 'DRIVING'
      }, function(result, status) {
        if (status === 'OK') {
          window.naviDirectionsRenderer.setDirections(result);
          directionsDrawn = true;
        }
      });
    }
  } catch (e) {
    console.error("Error fetching local data or Gemini API call:", e);
    finalAnswer = "Sorry, I could not access local information or the AI at this time.";
  }

  msgGroup.querySelector('.ai-msg-text').innerHTML = formatAIResponse(finalAnswer) + (directionsDrawn ? '<br><span style="color:#3182ce">Directions drawn on map.</span>' : '');
  chat.scrollTop = chat.scrollHeight;

  if (sendBtn) {
    sendBtn.disabled = false;
    sendBtn.classList.remove('sending');
    sendBtn.querySelector('.send-text').textContent = 'Send';
  }
  if (stopBtn) stopBtn.style.display = 'none';
  window.naviAbortController = null;
};};
