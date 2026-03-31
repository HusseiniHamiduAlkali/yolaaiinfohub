// Ensure navigation API key globals exist (can be set manually for dev)
window.TOMTOM_API_KEY = window.TOMTOM_API_KEY || null;
window.NAVI_MAP_API_KEY = window.NAVI_MAP_API_KEY || null;

// Single source of truth for Yola coordinates
window.YOLA_COORDS = window.YOLA_COORDS || {
  lat: 9.2182,
  lon: 12.4818,
  centerArray: [9.2182, 12.4818],
  places: {
    'yola north': { lat: 9.2230, lon: 12.4850, names: ['yola north', 'yolan', 'north yola', 'yola north ward'] },
    'yola south': { lat: 9.2105, lon: 12.4875, names: ['yola south', 'yolas', 'south yola', 'yola south ward'] },
    'jimeta': { lat: 9.2055, lon: 12.4945, names: ['jimeta', 'jimeta ward', 'jimeta town'] },
    'girei': { lat: 9.2010, lon: 12.4780, names: ['girei', 'girei ward', 'gerei'] },
    'mubi': { lat: 9.2185, lon: 12.4870, names: ['mubi', 'mubi ward', 'mubi town'] },
    'numan': { lat: 9.2150, lon: 12.4720, names: ['numan', 'numan ward', 'numan town'] },
    'garoua': { lat: 9.2195, lon: 12.4930, names: ['garoua', 'garoua ward'] },
    'jabbama': { lat: 9.1905, lon: 12.5060, names: ['jabbama', 'jabbama ward', 'jabbama area', 'jabbama plaza'] },
    'lamido': { lat: 9.2180, lon: 12.4820, names: ['lamido', 'lamido palace', 'lamido area', 'lamido ward'] },
    'airport': { lat: 9.267620, lon: 12.425942, names: ['airport', 'yola airport', 'international airport'] },
    'market': { lat: 9.2155, lon: 12.4950, names: ['market', 'yola market', 'main market', 'central market'] },
    'zoo': { lat: 9.1855, lon: 12.4890, names: ['zoo', 'yola zoo', 'zoological park'] },
    'wetlands': { lat: 9.1755, lon: 12.4810, names: ['wetlands', 'yola wetlands', 'swamp'] },
    'gorilla': { lat: 9.1805, lon: 12.4855, names: ['gorilla', 'gorilla park', 'gorilla sanctuary'] },
    'motor park': { lat: 9.2125, lon: 12.4885, names: ['motor park', 'motor station', 'main motor park', 'jambutu motor park'] },
    'palace': { lat: 9.2180, lon: 12.4820, names: ['palace', 'chief palace', 'emir palace'] },
    'government house': { lat: 9.2205, lon: 12.4885, names: ['government house', 'govt house', 'state house', 'admin'] },
    'mosque': { lat: 9.2175, lon: 12.4875, names: ['mosque', 'central mosque', 'main mosque'] },
    'bank': { lat: 9.2165, lon: 12.4887, names: ['bank'] },
    'hospital': { lat: 9.2145, lon: 12.4865, names: ['hospital'] },
    'clinic': { lat: 9.2135, lon: 12.4875, names: ['clinic'] },
    'school': { lat: 9.2115, lon: 12.4865, names: ['school'] },
    'university': { lat: 9.2290, lon: 12.4990, names: ['university'] },
    'stadium': { lat: 9.2195, lon: 12.4895, names: ['stadium'] },
    'court': { lat: 9.2200, lon: 12.4910, names: ['court'] },
    'cinema': { lat: 9.2095, lon: 12.4820, names: ['cinema'] },
    'bridge': { lat: 9.2005, lon: 12.4810, names: ['bridge'] },
    'flyover': { lat: 9.2025, lon: 12.4830, names: ['flyover'] },
    'roundabout': { lat: 9.2075, lon: 12.4855, names: ['roundabout'] },
    'junction': { lat: 9.2065, lon: 12.4865, names: ['junction'] }
  }
};

// Helper: resolve a place name (or alias) to YOLA_COORDS place data
function resolveYolaPlace(name) {
  if (!name) return null;
  const lower = name.toLowerCase().trim();
  const places = window.YOLA_COORDS && window.YOLA_COORDS.places ? window.YOLA_COORDS.places : {};

  // Direct key match
  if (places[lower]) return places[lower];

  // Search aliases
  for (const [key, data] of Object.entries(places)) {
    if (!data.names) continue;
    for (const alias of data.names) {
      if (alias.toLowerCase() === lower) return data;
    }
  }

  // Partial contains match (fall back)
  for (const [key, data] of Object.entries(places)) {
    if (!data.names) continue;
    for (const alias of data.names) {
      if (lower.includes(alias.toLowerCase())) return data;
    }
  }

  return null;
}

// Helper: check if a place is in Yola (known locations)
function isPlaceInYola(name) {
  if (!name) return false;
  const lower = name.toLowerCase().trim();
  const places = window.YOLA_COORDS && window.YOLA_COORDS.places ? window.YOLA_COORDS.places : {};

  // Check if in YOLA_COORDS
  if (resolveYolaPlace(name)) return true;

  // Check known Yola locations
  const yolaLocations = [
    'yola north', 'yola south', 'jimeta', 'girei', 'mubi', 'numan', 'garoua', 'lamido', 'jabbama',
    'airport', 'market', 'zoo', 'wetlands', 'gorilla', 'palace', 'mosque',
    'government house', 'motor park', 'bank', 'hospital', 'clinic', 'school',
    'university', 'stadium', 'court', 'cinema', 'bridge', 'flyover', 'roundabout', 'junction'
  ];

  return yolaLocations.some(loc => lower.includes(loc) || loc.includes(lower));
}

// Helper: geocode a place using OpenStreetMap Nominatim
async function geocodeWithOSM(place) {
  try {
    const query = encodeURIComponent(`${place}, Yola, Nigeria`);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`;
    const response = await fetch(url);
    const data = await response.json();
    if (data && data.length > 0) {
      const result = data[0];
      return { lat: parseFloat(result.lat), lon: parseFloat(result.lon) };
    }
  } catch (err) {
    console.error('OSM geocoding failed:', err);
  }
  return null;
}

// Make geocodeWithOSM globally available for tomtomMap.js
window.geocodeWithOSM = geocodeWithOSM;

// Load common AI utilities first
if (!window.commonAILoaded) {
  const script = document.createElement('script');
  script.src = 'components/commonAI.js';
  script.onload = () => { window.commonAILoaded = true; };
  document.head.appendChild(script);
}

// Robust navbar loader (fallback if not defined in commonAI)
window.ensureNavbarLoaded = window.ensureNavbarLoaded || function(cb) {
  if (typeof window.renderNavbar === 'function') {
    window.renderNavbar();
    if (cb) cb();
  } else if (window.Navbar && typeof window.Navbar.render === 'function') {
    window.Navbar.render();
    if (cb) cb();
  } else {
    console.warn('Navbar not yet available, deferring render');
    if (cb) cb();
  }
};

/*
// Function to initialize NaviInfo section
window.initNaviInfo = () => {
    const naviSection = document.getElementById('naviinfo-content');
    if (!naviSection) { return; }
    
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
              </div>
            </div>
          </div>

          <div id="map-section">
            <div class="map-controls">
              <button onclick="window.toggleMapView && window.toggleMapView()">Toggle Street View</button>
              <button onclick="window.resetMapCenter && window.resetMapCenter()">Center on Yola</button>
            </div>
            <div id="tomtom-map" style="height: 500px; width: 100%; border: 1px solid #ccc; position: relative; display: flex; align-items: center; justify-content: center;">
              <iframe id="google-maps-iframe" 
                style="width: 100%; height: 100%; border: none; position: absolute; top: 0; left: 0;" 
                frameborder="0" 
                allowfullscreen="" 
                aria-hidden="false" 
                loading="lazy"
                tabindex="0">
              </iframe>
              <div id="street-view-container" 
                style="width: 100%; height: 100%; display: none; position: absolute; top: 0; left: 0;">
              </div>
            </div>
            <div class="map-info"></div>
            <div class="route-info"></div>
          </div>
        </div>
      `;
    }
    // Show satellite availability message
    setTimeout(() => {
      const satInfo = document.getElementById('satellite-info');
      if (satInfo) {
        satInfo.textContent = '';
      }
    }, 2000);
};
*/

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

// Edit this prompt to instruct the AI on how to answer user messages for NaviInfo

window.NAVI_AI_PROMPT = window.NAVI_AI_PROMPT || `You are an AI navigation and directions assistant for Yola, Adamawa State, Nigeria.
Help users find locations, plan routes, and get travel information using TomTom mapping APIs.

### Analysis Capabilities:
- **Image Analysis**: Analyze maps, location photos, street view images
  - Identify locations from photos
  - Provide navigation context based on visual landmarks
  - Suggest nearby facilities and attractions
- **Audio Analysis**: Listen to location inquiries and navigation questions
  - Transcribe destination requests from voice messages
  - Provide turn-by-turn directions via audio format
- **Document Analysis**: Review maps, itineraries, and travel documents
  - Extract destination information from travel plans
  - Provide navigation advice based on schedules

### Navigation Features:
- Route planning and distance calculation
- Travel time estimation and traffic information
- Public and private transportation options
- Landmark identification and location descriptions
- Facility finder (hospitals, hotels, restaurants, etc.)
- Emergency location services

### Automatic System Features:
When user mentions TWO place names (e.g., "from Lamido Palace to Jimeta"):
1. Route automatically drawn on satellite map
2. Distance calculated in kilometers
3. Estimated travel time computed
4. Metrics displayed in chat

DO NOT estimate distances/times yourself - let the system calculate them.

### Response Guidelines:
- For images: Identify locations and provide travel context
- For audio: Transcribe destinations and provide navigation guidance
- Provide detailed descriptions of locations and routes
- Include transportation options and recommendations
- If info unavailable: "I don't have that specific information. Please contact local transport authorities."

### Section Referrals:
- Health → MediInfo | Education → EduInfo | Community → CommunityInfo | Agriculture → AgroInfo | Services → ServiInfo`;


/*  Maps initializations  */



// --- Helper for backend URL and key retrieval ---
// Determine where to fetch API endpoints from. Similar logic used in other
// components (e.g. Gemini calls) so we mirror that behavior here. It allows
// local testing with a separate Node backend on port 4000 as well as
// production builds where the API is co-hosted or proxied.
function getApiBase() {
  if (window.API_BASE) return window.API_BASE;
  try {
    const h = window.location.hostname;
    if (!h || h === 'localhost' || h === '127.0.0.1' || h.startsWith('192.') || h.startsWith('10.') || h === '::1') {
      return 'http://localhost:4000';
    }
  } catch (e) {}
  // empty string means "same origin" which works for Netlify functions
  return '';
}

async function fetchTomTomKeyFromServer() {
  if (window.TOMTOM_API_KEY && !window.TOMTOM_API_KEY.startsWith('AIza')) {
    return window.TOMTOM_API_KEY;
  }

  const base = getApiBase();
  const url = base + '/api/tomtom-key';
  try {
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data && data.apiKey && !data.apiKey.startsWith('AIza')) {
        console.log('✓ TomTom API key retrieved from server');
        window.TOMTOM_API_KEY = data.apiKey; // Cache the key
        return data.apiKey;
      }
    }
  } catch (err) {
    console.warn('fetchTomTomKeyFromServer: failed to fetch', url, err);
  }
  console.error('❌ Failed to fetch TomTom API key. Ensure the server is running and the key is valid.');
  return null;
}

// NEW: Detect places in user message (one or more)
function detectPlaces(text) {
  const yolaWards = window.YOLA_COORDS && window.YOLA_COORDS.places ? window.YOLA_COORDS.places : {};
  const lowerText = text.toLowerCase();
  const foundPlaces = new Set();

  for (const [wardName, wardData] of Object.entries(yolaWards)) {
    for (const name of wardData.names) {
      if (lowerText.includes(name)) {
        foundPlaces.add(wardName);
        break;
      }
    }
  }

  const allLocations = [
    'yola north', 'yola south', 'jimeta', 'girei', 'mubi', 'numan', 'garoua', 'lamido', 'jabbama',
    'airport', 'market', 'zoo', 'wetlands', 'gorilla', 'palace', 'mosque',
    'government house', 'motor park', 'bank', 'hospital', 'clinic', 'school',
    'university', 'stadium', 'court', 'cinema', 'bridge', 'flyover', 'roundabout', 'junction'
  ];

  for (const loc of allLocations) {
    if (lowerText.includes(loc)) {
      // Only add generic spot names if they exist in the YOLA_COORDS known list
      if (resolveYolaPlace(loc)) {
        foundPlaces.add(loc);
      }
    }
  }

  const capitalized = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:Ward|LGA|Community))?/g) || [];
  for (const cap of capitalized) {
    const lowerCap = cap.toLowerCase();
    if (!foundPlaces.has(lowerCap)) {
      foundPlaces.add(lowerCap);
    }
  }

  return Array.from(foundPlaces);
}

function extractPlaces(text) {
  const placesArray = detectPlaces(text).filter(place => isPlaceInYola(place));
  console.log('ℹ Detected Yola places:', placesArray);
  return placesArray;
}
// NEW: Calculate distance and metrics only (no visual route drawing)
async function drawRouteAndCalculateMetrics(origin, destination) {
  try {
    console.log('📍 Calculating route metrics from', origin, 'to', destination);

    if (!window.TOMTOM_API_KEY) {
      console.warn('⚠️ TomTom API key not available. Attempting to fetch...');
      const key = await fetchTomTomKeyFromServer();
      if (!key) {
        console.error('❌ No valid TomTom API key available. Falling back to local database.');
        return calculateMetricsFromLocalDatabase(origin, destination);
      }
    }

    // Use the updated drawTomTomRoute from tomtomMap.js (Leaflet-based)
    const result = await window.drawTomTomRoute(origin, destination);
    if (result) {
      console.log('✅ Route drawn successfully:', result);
      return result;
    } else {
      console.warn('⚠️ Could not draw route. Falling back to local database.');
      return calculateMetricsFromLocalDatabase(origin, destination);
    }
  } catch (err) {
    console.error('❌ Error calculating route metrics:', err);
    console.log('Falling back to local database for calculations.');
    return calculateMetricsFromLocalDatabase(origin, destination);
  }
}

function calculateMetricsFromLocalDatabase(origin, destination) {
  // Prefer resolving via YOLA_COORDS aliases
  const originData = typeof origin === 'string' ? resolveYolaPlace(origin) : origin;
  const destinationData = typeof destination === 'string' ? resolveYolaPlace(destination) : destination;

  if (!originData || !destinationData) {
    console.error('❌ Locations not found in local database:', origin, destination);
    return null;
  }

  const distanceRaw = calculateHaversineDistance(originData, destinationData);
  const distance = Number(distanceRaw.toFixed(1));
  // Estimate travel time using a conservative average speed within town (30 km/h)
  const travelTime = Math.max(1, Math.round((distance / 30) * 60));
  console.log(`📏 Calculated distance from ${origin} to ${destination}: ${distance} km, ETA: ${travelTime} minutes`);
  return { distance, travelTime };
}

function calculateHaversineDistance(coord1, coord2) {
  const R = 6371; // Radius of the Earth in km
  const dLat = toRadians(coord2.lat - coord1.lat);
  const dLon = toRadians(coord2.lon - coord1.lon);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.lat)) *
      Math.cos(toRadians(coord2.lat)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

// Function to initialize NaviInfo section with Google Maps Pegman (Street View) support
window.initNaviInfo = () => {
  const naviSection = document.getElementById('naviinfo-content');
  if (!naviSection) return;

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
            </div>
          </div>
        </div>

        <div id="map-section">
          <div class="map-controls" style="margin-bottom: 8px;">
            <button onclick="window.resetMapCenter && window.resetMapCenter()">Center on Yola</button>
            <span style="margin-left: 1em; color: #888; font-size: 0.95em;">Drag the yellow Pegman for 360° Street View</span>
          </div>
          <div style="height: 500px; width: 100%; border: 1px solid #ccc; position: relative;">
            <iframe
              id="google-maps-pegman"
              style="width: 100%; height: 100%; border: none;"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d126489.0192326256!2d${window.YOLA_COORDS.lon}!3d${window.YOLA_COORDS.lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1053d1b1b1b1b1b1%3A0x1b1b1b1b1b1b1b1b!2sYola%2C%20Nigeria!5e0!3m2!1sen!2sng!4v${Date.now()}&layer=c"
              allowfullscreen=""
              loading="lazy"
              referrerpolicy="no-referrer-when-downgrade"
              aria-label="Google Maps with Pegman Street View"
            ></iframe>
          </div>
        </div>
      </div>
    `;
  }
};

// --- Google Maps Initialization ---
// Helper to find the Google Maps iframe (supports multiple id variants)
function getGoogleMapsIframe() {
  // Try to find an existing iframe by common ids
  let iframe = document.getElementById('google-maps-iframe') || document.getElementById('google-maps-pegman');
  if (iframe) return iframe;

  // If not found, attempt to create one inside the tomtom-map container so
  // centering still works even after the tomtom map was previously initialized.
  const tomtomDiv = document.getElementById('tomtom-map');
  if (!tomtomDiv) return null;

  // Create iframe and append it (hidden by default until used)
  try {
    iframe = document.createElement('iframe');
    iframe.id = 'google-maps-pegman';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.display = 'none';
    iframe.allowFullscreen = true;
    iframe.loading = 'lazy';
    iframe.referrerPolicy = 'no-referrer-when-downgrade';
    tomtomDiv.appendChild(iframe);
    return iframe;
  } catch (e) {
    console.error('❌ Failed to create Google Maps iframe:', e);
    return null;
  }
}

window.initGoogleMaps = function() {
  const mapIframe = getGoogleMapsIframe();
  if (!mapIframe) {
    if (!window._googleMapsRetryCount) window._googleMapsRetryCount = 0;
    if (window._googleMapsRetryCount < 10) {
      window._googleMapsRetryCount++;
      setTimeout(() => window.initGoogleMaps(), 200);
    }
    return;
  }

  window._googleMapsRetryCount = 0;

  const { lat, lon } = window.YOLA_COORDS;

  // 'layer=c' adds the Street View (Pegman) layer, if available
  // 'll' centers the map without adding a marker, which may restore the controls
  const googleMapsUrl = `https://maps.google.com/maps?ll=${lat},${lon}&z=14&t=h&layer=c&output=embed`;
  
  mapIframe.src = googleMapsUrl;
  mapIframe.style.display = 'block';
  console.log('✓ Pegman layer enabled via layer=c');
};

// --- Display Map Errors ---
window.displayMapError = function(message) {
  const mapDiv = document.getElementById('tomtom-map');
  if (!mapDiv) return;
  
  mapDiv.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; height: 100%; background-color: #f8f9fa; border-radius: 8px;">
    <div style="text-align: center; padding: 20px;">
      <div style="font-size: 24px; margin-bottom: 10px;">⚠️</div>
      <p style="color: #666; margin: 0;">${message}</p>
    </div>
  </div>`;
  console.error('Map Error:', message);
};

// --- Google Maps Initialization ---
window.initGoogleMaps = function() {
  const mapIframe = getGoogleMapsIframe();
  if (!mapIframe) {
    if (!window._googleMapsRetryCount) window._googleMapsRetryCount = 0;
    if (window._googleMapsRetryCount < 10) {
      window._googleMapsRetryCount++;
      setTimeout(() => window.initGoogleMaps(), 200);
    }
    return;
  }

  window._googleMapsRetryCount = 0;
  const { lat, lon } = window.YOLA_COORDS;

  // 'layer=c' adds the Street View (Pegman) layer, if available
  // 'll' centers the map without adding a marker, which may restore the controls
  const googleMapsUrl = `https://maps.google.com/maps?ll=${lat},${lon}&z=14&t=h&layer=c&output=embed`;

  mapIframe.src = googleMapsUrl;
  mapIframe.style.display = 'block';
  
  // Hide TomTom map if it's visible
  const tomtomDiv = document.getElementById('tomtom-map');
  if (tomtomDiv) {
    tomtomDiv.style.display = 'none';
  }
  
  // Note: Browser may log "Partitioned cookie/storage access" for Google Maps - this is normal privacy protection
  // The browser partitions storage for third-party contexts to prevent cross-site tracking
  console.log('✓ Google Maps initialized and displayed');
};

// --- Initialize TomTom Maps ---
window.initializeTomTomMap = function() {
  const mapDiv = document.getElementById('tomtom-map');
  if (!mapDiv) {
    console.error('❌ Map container #tomtom-map not found');
    return;
  }

  // Check if already initialized
  if (mapDiv._tomtomInit) {
    console.log('ℹ TomTom map already initialized');
    return;
  }

  // Check if already initializing
  if (window._tomtomInitializing) {
    console.log('ℹ TomTom map initialization in progress');
    return;
  }

  window._tomtomInitializing = true;

  // Function to attempt initialization
  const attemptInit = () => {
    // Ensure Leaflet is loaded
    if (!window.L) {
      console.warn('⚠️ Leaflet not loaded yet, retrying...');
      setTimeout(attemptInit, 200);
      return;
    }

    // Ensure tomtomMap.js is loaded
    if (typeof window.initTomTomMap !== 'function') {
      console.warn('⚠️ TomTom map function not loaded yet, retrying...');
      setTimeout(attemptInit, 200);
      return;
    }

    try {
      // Clear any existing content (like Google Maps iframe)
      mapDiv.innerHTML = '';

      // Initialize map using the updated tomtomMap.js (Leaflet-based)
      const map = window.initTomTomMap('tomtom-map', window.YOLA_COORDS.centerArray, 13, 'satellite');
      if (map) {
        console.log('✅ TomTom map (Leaflet) initialized');
        mapDiv._tomtomInit = true;
        window._tomtomInitializing = false;
      } else {
        console.error('❌ Failed to initialize TomTom map');
        displayMapError('Failed to initialize map. Chat-based navigation will continue.');
        window._tomtomInitializing = false;
      }
    } catch (error) {
      console.error('❌ Error initializing map:', error);
      displayMapError('Error initializing map. Chat-based navigation will continue.');
      window._tomtomInitializing = false;
    }
  };

  attemptInit();
};

// Draw route on TomTom map (now using Leaflet)
window.drawRouteOnTomTomMap = async function(origin, destination) {
  // Use the updated drawTomTomRoute from tomtomMap.js
  return await window.drawTomTomRoute(origin, destination);
};

// Function to center Google Maps on a single location
window.centerGoogleMapsOnLocation = async function(location) {
  try {
    console.log('📍 Centering Google Maps on:', location);
    
    const mapIframe = getGoogleMapsIframe();
    if (!mapIframe) {
      console.error('❌ Google Maps iframe not found');
      return;
    }

    // Search for location coordinates
    // Prefer local YOLA database for quick centering
    let coords = null;
    try {
      const local = resolveYolaPlace && typeof resolveYolaPlace === 'function' ? resolveYolaPlace(location) : null;
      if (local && local.lat && local.lon) {
        coords = { lat: local.lat, lon: local.lon };
      }
    } catch (e) {
      coords = null;
    }
    if (!coords) coords = await window.searchLocation(location);
    if (!coords) {
      console.error('❌ Could not find coordinates for:', location);
      return;
    }

    console.log('✅ Found coordinates:', coords);

    // Update Google Maps iframe to center on location
    const googleMapsUrl = `https://maps.google.com/maps?q=${coords.lat},${coords.lon}&z=15&t=h&layer=c&output=embed`;
    mapIframe.src = googleMapsUrl;
    mapIframe.style.display = 'block';

    // Hide TomTom map if present
    const tomtomDiv = document.getElementById('tomtom-map');
    if (tomtomDiv) tomtomDiv.style.display = 'none';

    console.log('✅ Google Maps centered on location');
  } catch (e) {
    console.error('❌ Error centering map on location:', e);
  }
};

// --- Map Switching Functions ---
async function switchToTomTomMap() {
  console.log('🔄 Switching to TomTom map for route display');
  
  const googleIframe = getGoogleMapsIframe();
  const tomtomDiv = document.getElementById('tomtom-map');

  if (googleIframe) googleIframe.style.display = 'none';
  if (tomtomDiv) {
    tomtomDiv.style.display = 'block';
    // Initialize TomTom map if not already done
    if (!tomtomDiv._tomtomInit) {
      // Prefer satellite tiles for route display
      // Ensure any previous TomTom artifacts are cleared before init
      if (window.clearTomTomMap) try { await window.clearTomTomMap(); } catch(e){}
      window.initializeTomTomMap && window.initializeTomTomMap('satellite');
    }
  }
}

async function switchToGoogleMaps() {
  console.log('🔄 Switching to Google Maps for location display');
  
  const googleIframe = getGoogleMapsIframe();
  const tomtomDiv = document.getElementById('tomtom-map');

  // Clear TomTom map state (remove routes/markers) so Google iframe can be shown reliably
  if (window.clearTomTomMap) {
    try { await window.clearTomTomMap(); } catch (e) { console.warn('clearTomTomMap failed', e); }
  }

  if (tomtomDiv) tomtomDiv.style.display = 'none';
  if (googleIframe) {
    googleIframe.style.display = 'block';
    // Re-initialize Google Maps if needed
    window.initGoogleMaps();
  }
}

// --- Fallback: Leaflet + TomTom tiles ---
function fallbackToLeafletTomTom() {
  const mapDiv = document.getElementById('tomtom-map');
  if (!mapDiv) return;
  if (mapDiv._leafletInit) return; // already done

  // Load Leaflet CSS
  if (!document.getElementById('leaflet-css')) {
    const css = document.createElement('link');
    css.id = 'leaflet-css';
    css.rel = 'stylesheet';
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    css.crossOrigin = '';
    document.head.appendChild(css);
  }

  // Load Leaflet JS if necessary
  if (!window.L) {
    if (document.getElementById('leaflet-js')) return; // already loading
    const s = document.createElement('script');
    s.id = 'leaflet-js';
    s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    s.async = true;
    s.onload = () => initLeafletTomTomMap();
    s.onerror = () => displayMapError('Failed to load Leaflet for fallback.');
    document.head.appendChild(s);
  } else {
    initLeafletTomTomMap();
  }
}

// Search function for locations using TomTom Search API
window.searchLocation = async function(query) {
  const apiKey = window.NAVI_MAP_API_KEY || window.TOMTOM_API_KEY;
  if (!apiKey) {
    console.error('❌ API key not available for location search');
    return null;
  }
  try {
    console.log('🔎 Searching location:', query);
    const url = `https://api.tomtom.com/search/2/search/${encodeURIComponent(query)}.json?key=${apiKey}&countrySet=NG&limit=1`;
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.results && data.results.length > 0) {
      const pos = data.results[0].position;
      console.log('✅ Location found:', query, '→', pos);
      return { lat: pos.lat, lon: pos.lon };
    }
    
    console.warn('⚠️ Location not found in TomTom:', query);
    return null;
  } catch (error) {
    console.error('❌ Error searching location:', query, error);
    return null;
  }
};

// Function to draw route between two points using TomTom Maps SDK - REMOVED (using Google Maps display)
// Distance and travel time are calculated via calculateDistanceAndTime function below

// Function to calculate distance and travel time using TomTom Routing
window.calculateDistanceAndTime = async function(origin, destination) {
  try {
    // ensure we have a key, try fetching from backend if necessary
    let apiKey = window.NAVI_MAP_API_KEY || window.TOMTOM_API_KEY;
    if (!apiKey) {
      apiKey = await fetchTomTomKeyFromServer();
      if (apiKey) {
        window.NAVI_MAP_API_KEY = apiKey;
        window.TOMTOM_API_KEY = apiKey;
        console.log('✓ TomTom API key retrieved inside calculateDistanceAndTime');
      }
    }
    // If both origin and destination resolve to YOLA coordinates, prefer local calculation
    try {
      const originLocal = (typeof origin === 'string') ? resolveYolaPlace(origin) : (origin && origin.lat ? origin : null);
      const destLocal = (typeof destination === 'string') ? resolveYolaPlace(destination) : (destination && destination.lat ? destination : null);
      if (originLocal && destLocal) {
        console.log('ℹ Using local YOLA_COORDS for distance calculation');
        const metrics = calculateMetricsFromLocalDatabase(originLocal, destLocal);
        if (metrics) return metrics;
      }
    } catch (e) {
      console.warn('⚠️ Local YOLA_COORDS calculation failed, falling back to TomTom', e);
    }

    // Fall back to TomTom routing if we have an API key
    if (!apiKey) {
      console.error('❌ TomTom API key not available; cannot call routing API');
      return null;
    }

    console.log('📡 TomTom API: Calculating route from', origin, 'to', destination);

    // Convert location names to coordinates if needed (use searchLocation)
    let startCoords = origin;
    let endCoords = destination;

    if (typeof origin === 'string') {
      startCoords = await window.searchLocation(origin);
      if (!startCoords) {
        console.error('❌ Could not find coordinates for origin:', origin);
        return null;
      }
    }
    if (typeof destination === 'string') {
      endCoords = await window.searchLocation(destination);
      if (!endCoords) {
        console.error('❌ Could not find coordinates for destination:', destination);
        return null;
      }
    }

    if (!startCoords || !endCoords) {
      console.error('❌ Invalid coordinates');
      return null;
    }

    const routeUrl = `https://api.tomtom.com/routing/1/calculateRoute/${startCoords.lat},${startCoords.lon}:${endCoords.lat},${endCoords.lon}/json?key=${apiKey}`;
    console.log('🌐 Fetching from TomTom Routing API...');
    const response = await fetch(routeUrl);
    const data = await response.json();

    if (data.routes && data.routes.length > 0) {
      const distance = (data.routes[0].summary.lengthInMeters / 1000).toFixed(1);
      const travelTime = Math.round(data.routes[0].summary.travelTimeInSeconds / 60);
      console.log('✅ Route calculated - Distance:', distance, 'km, Travel Time:', travelTime, 'minutes');
      return { distance, travelTime };
    }

    console.error('❌ No route found in TomTom response');
    return null;
  } catch (error) {
    console.error('❌ Error calculating distance and time:', error);
    return null;
  }
};

window.naviAbortController = window.naviAbortController || null;

window.renderSection = function() {
  ensureNavbarLoaded();
  if (!document.getElementById('global-css')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'styles/global.css';
    link.id = 'global-css';
    document.head.appendChild(link);
  }
    return fetch('templates/navi.html').then(r => r.text()).then(html => {
    document.getElementById('main-content').innerHTML = html;
    
    // Load chat history AFTER template is inserted
    setTimeout(() => { 
      window.initAndRestoreSectionHistory && window.initAndRestoreSectionHistory('navi', 'navi-chat-messages');
      // Ensure auto-scroll observer is attached for this section
      window.observeChatContainers && window.observeChatContainers();
    }, 50);
    
    // Wire model toggle after template is inserted
    const mt = document.getElementById('model-toggle');
    if (mt) mt.onchange = function() { window.toggleGeminiModel('navi', this.checked); };

    // Add Enter key handler to chat input - ensures attachments and text are sent together
    const naviInput = document.getElementById('navi-chat-input');
    if (naviInput) {
      naviInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          window.sendNaviMessage();
        }
      });
    }
    
    // Fetch TomTom key for distance/time calculations and map initialization.
    // This uses the helper above so it automatically picks the correct base URL.
    // IMPORTANT: We fetch ONLY the TomTom key, NOT the Google Maps key, to avoid
    // using the wrong key for TomTom APIs (which would result in 403 errors).
    const tomtomFetch = fetchTomTomKeyFromServer();

    tomtomFetch.then(key => {
      if (key) {
        window.NAVI_MAP_API_KEY = key;
        window.TOMTOM_API_KEY = key;
        console.log('✓ TomTom API key acquired (server or environment)');
      } else {
        if (!window.TOMTOM_API_KEY || window.TOMTOM_API_KEY.startsWith('AIza')) {
          console.warn('⚠️ TomTom API key not available or is a Google key – maps will not work');
        } else {
          console.log('✓ TomTom API key available from environment');
        }
      }
      // Delay map initialization to ensure DOM is ready - default to Google Maps
      if (!window._googleMapsInitialized && !window._tomtomInitializing) {
        window._googleMapsInitialized = true; // Set flag to prevent multiple calls
        setTimeout(() => {
          window.initGoogleMaps && window.initGoogleMaps();
          console.log('✓ Google Maps initialized for display (default)');
        }, 200);
      }
    });
  }).catch(err => {
    console.error('Failed to load navi template:', err);
    document.getElementById('main-content').innerHTML = '<p>Failed to load content.</p>';
  });
}

// stopNaviResponse is now handled by setupStopButton in commonAI.js
// Common helper for Gemini API call
async function getGeminiAnswer(localData, msg, apiKey, imageData = null, signal = null) {
  try {
    const contents = {
      parts: []
    };
    if (imageData) {
      contents.parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: imageData.split(',')[1]
        }
      });
    }
    const promptGuide = localStorage.getItem('navi_ai_prompt') || NAVI_AI_PROMPT;
    contents.parts.push({
      text: `${promptGuide}\n\n--- LOCAL DATA START ---\n${localData}\n--- LOCAL DATA END ---\n\nUser question: ${msg}`
    });
    const modelVersion = 'gemini-2.5-flash';
    let body = JSON.stringify({ model: modelVersion, contents: [contents] });
    const url = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? (window.API_BASE || 'http://localhost:4000') + '/api/gemini'
      : '/api/gemini';
    
    const fetchOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    };
    if (signal) {
      fetchOptions.signal = signal;
    }

    let response = await fetch(url, fetchOptions);
    
    let data = await response.json();
    return (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) ? data.candidates[0].content.parts[0].text : "Sorry, I couldn't get a response from the AI.";
  } catch (err) {
    if (err.name === 'AbortError') {
      throw err; // Re-throw abort errors to be handled by caller
    }
    throw new Error("Failed to get response from AI service");
  }
}
window.sendNaviMessage = async function(faqText = '') {
  const input = document.getElementById('navi-chat-input');
  const chat = document.getElementById('navi-chat-messages');
  const preview = document.getElementById('navi-chat-preview');
  const sendBtn = document.querySelector('#navi-chat-input + .send-button-group .send-button');
  const stopBtn = document.querySelector('#navi-chat-input + .send-button-group .stop-button');

  // Always extract attachment from preview before clearing
  let msg = faqText || input.value.trim();
  let attach = '';
  const container = preview.querySelector('.preview-container');
  if (container) {
    const clone = container.cloneNode(true);
    const btn = clone.querySelector('.remove-btn');
    if (btn) btn.remove();
    attach = clone.outerHTML;
  } else {
    attach = preview.innerHTML;
  }
  let mediaData = null;
  if (preview) {
    const container = preview.querySelector('.preview-container');
    
    if (container) {
      // Check if container has stored file data (for non-visual files)
      const fileData = container.getAttribute('data-file-data');
      const fileMime = container.getAttribute('data-file-mime');
      
      if (fileData && fileMime) {
        mediaData = {
          dataUrl: fileData,
          mimeType: fileMime,
          fileName: container.getAttribute('data-file-name')
        };
      } else {
        // Fallback to checking for image/audio/video/iframe elements
        const img = container.querySelector('img');
        const audio = container.querySelector('audio');
        const video = container.querySelector('video');
        const iframe = container.querySelector('iframe');
        if (img && img.src) mediaData = img.src;
        else if (audio && audio.src) mediaData = audio.src;
        else if (video && video.src) mediaData = video.src;
        else if (iframe && iframe.src) mediaData = iframe.src;
      }
    }
  }

  const attachments = window.getMessageAttachmentsFromPreview('navi', preview) || [];
  if (attachments.length > 0) {
    const attDesc = attachments.map(att => `${att.name || 'file'} (${att.type || 'unknown'})`).join(', ');
    msg = msg ? `${msg}\n\nAttached files: ${attDesc}` : `Attached files: ${attDesc}`;
  }

  if (!msg && !attach) return;

  let controller = null;
  if (sendBtn && typeof window.setupStopButton === 'function') {
    // Setup stop button with commonAI utility (creates AbortController) and capture controller
    controller = window.setupStopButton({ sendBtn, section: 'navi' });
  }

  const msgGroup = document.createElement('div');
  msgGroup.className = 'chat-message-group';
  // generate a temporary message id now so we can reuse for actions
  const mid = Date.now() + '_' + Math.random().toString(36).substr(2,9);
  msgGroup.setAttribute('data-msg-id', mid);
  msgGroup.innerHTML = `
    <div class='user-msg' data-msg-id='${mid}'>${msg}${attach ? "<br>" + attach : ""}</div>
    <div class='ai-msg' data-msg-id='${mid}'><span class='ai-msg-text'>Navi AI typing...</span></div>
  `;
  chat.appendChild(msgGroup);
  if (typeof window.clearPreviewAndRemoveBtn === 'function') {
    window.clearPreviewAndRemoveBtn(preview);
  } else {
    preview.innerHTML = '';
  }
  if (!faqText) input.value = '';

  // Load existing chat history using commonAI.js
  window.initChatHistory && window.initChatHistory('navi', 10);
  let chatHistory = window.getChatHistory ? window.getChatHistory('navi') : [];

  let finalAnswer = "";
  try {
    const signal = controller ? controller.signal : (window.naviAbortController ? window.naviAbortController.signal : null);

    // Get current language from i18n or localStorage
    const currentLang = (window.i18n && window.i18n.language) || localStorage.getItem('language') || 'En';
    const langCode = currentLang.substring(0, 2).toUpperCase(); // Extract first 2 letters for directory name
    const langDirCode = langCode === 'EN' ? 'En' : langCode === 'AR' ? 'Ar' : langCode === 'FR' ? 'Fr' : 
                        langCode === 'FU' ? 'Fu' : langCode === 'HA' ? 'Ha' : langCode === 'IG' ? 'Ig' : 
                        langCode === 'PI' ? 'Pi' : langCode === 'YO' ? 'Yo' : 'En'; // Default to English

    // List of all available language directories
    const availableLangs = ['En', 'Ar', 'Fr', 'Fu', 'Ha', 'Ig', 'Pi', 'Yo'];
    
    // Prioritize current language, then fall back to English if current not available
    const langDirsToLoad = availableLangs.includes(langDirCode) ? [langDirCode, 'En'] : ['En'];
    
    // Remove duplicates
    const uniqueLangDirs = [...new Set(langDirsToLoad)];

    // Define all known HTML files in details/Navi
    const htmlFileNames = [
      'access-bank.html', 'adamawa-sunshine-motor.html', 'agga-islamic-center.html', 'alibaba-mosque.html', 
      'aun-hotel.html', 'aun-jabbama-restaurant.html', 'beast-fitness.html', 'catholic-secreteriat.html', 
      'chicken-cottage-yola.html', 'city-green-hotel.html', 'dantshoho-hotel.html', 'duragi-hotels.html', 
      'eyn.html', 'f-fitness.html', 'fce-footbal-pitch.html', 'fidelity-bank.html', 
      'fresh-air-transit.html', 'gauni-sports-arena.html', 'golden-alpihne-hotels.html', 'gorilla-park.html', 
      'gt-bank.html', 'hajja-ammi-mosque.html', 'icecream-planet.html', 'items7-restaurant.html', 
      'jabbama-plaza.html', 'jambutu-flyover.html', 'jamubutu-motor-park.html', 'jimeta-market.html', 
      'jippujam.html', 'jumia-pickup-shop.html', 'keke-napep.html', 'lccn.html', 
      'madugu-rockview-hotel.html', 'mamma-chare-hotel.html', 'marwa-shawarma-grills.html', 'mau-sports-center.html', 
      'mauth-mosque.html', 'mevish-cafe.html', 'modibbo-adama-central-mosque.html', 'modibbo-zailani-mosque.html', 
      'muna-hotel.html', 'oasis-bakery.html', 'peace-park.html', 'police-roundabout-flyover.html', 
      'roundabout-maishanu.html', 'sanhusein-mall.html', 'sauki-motor-park.html', 'stanbic-ibtc-bank.html', 
      'sterling-bank.html', 'top10-plaza.html', 'uptown-exclusive-spot.html', 'vortex-hotels.html', 
      'welcome-to-yola.html', 'wetlands-park.html', 'yahuza.html', 'yakubu-plaza.html', 
      'yola-airport.html', 'yola-market.html', 'yola-polo-ground.html', 'yola-underpass.html', 
      'yola-zoo.html', 'zenith-bank.html'
    ];

    // Fetch HTML content from language directories
    const allHtmlPromises = [];
    for (const langDir of uniqueLangDirs) {
      for (const fileName of htmlFileNames) {
        const filePath = `details/Navi/${langDir}/${fileName}`;
        allHtmlPromises.push(
          fetch(filePath, signal ? { signal } : {})
            .then(res => res.ok ? res.text().then(text => `\n--- ${fileName} (${langDir}) ---\n${text}`) : '')
            .catch(() => '')
        );
      }
    }

    const allLocalData = (await Promise.all(allHtmlPromises)).filter(content => content.length > 0).join('\n');
    
    // Include chat history in the context
    const historyContext = chatHistory.length > 0 
        ? "\n\nRecent conversation history:\n" + chatHistory.map(h => `User: ${h.role === 'user' ? h.content : ''}\nAI: ${h.role === 'assistant' ? h.content : ''}`).filter(Boolean).join('\n\n')
        : "";
    
    // Combine all local data
    const allLocalDataWithHistory = allLocalData + historyContext;

    // Try to get an AI response but do NOT bail out on failure — routing must continue.
    let aiText = '';
    try {
      aiText = await window.callGeminiAI(allLocalDataWithHistory, msg, window.GEMINI_API_KEY, mediaData, signal, 'navi', attachments);
    } catch (aiErr) {
      if (aiErr && (aiErr.name === 'AbortError' || aiErr.message === 'AbortError')) {
        aiText = "Request cancelled.";
      } else if (typeof window.friendlyAIErrorMessage === 'function') {
        aiText = window.friendlyAIErrorMessage(aiErr);
      } else {
        aiText = "The AI is currently unavailable. Please try again later.";
      }
      // Log but continue to run routing and metrics below
      console.warn('Gemini AI unavailable for navi section, continuing with route calculations:', aiErr);
    }

    // Start the finalAnswer with whatever AI text (or friendly fallback) we have
    finalAnswer = aiText;

    // Store user message in chat history (keep last 10 messages)
    window.addToChatHistory && window.addToChatHistory('navi', 'user', msg);

    // NEW: Detect places in user message and switch maps accordingly
    const allPlaces = detectPlaces(msg);
    const yolaPlaces = allPlaces.filter(place => isPlaceInYola(place));
    const nonYolaPlaces = allPlaces.filter(place => !isPlaceInYola(place));
    let routeDrawn = false;

    if (nonYolaPlaces.length > 0) {
      const nonYolaText = nonYolaPlaces.map(p => `"${p}"`).join(', ');
      finalAnswer += `\n\n⚠️ The mentioned place(s) ${nonYolaText} are not recognized as Yola locations. The map display for these places is disabled.`;
      console.log('⚠️ Non-Yola places detected:', nonYolaPlaces);
    }

    if (yolaPlaces.length >= 2) {
      console.log('🎯 Two or more Yola places detected:', yolaPlaces);
      await switchToTomTomMap();
      const route = await window.drawTomTomRoute(yolaPlaces[0], yolaPlaces[1]);
      if (route && typeof route.distance !== 'undefined' && typeof route.time !== 'undefined') {
        routeDrawn = true;
        const mapInstruction = `\n\n📍 **Route Details (TomTom):**\n- **Distance:** ${route.distance.toFixed ? route.distance.toFixed(1) : route.distance} km\n- **Estimated Travel Time:** ${Math.round(route.time)} minutes\n\n👇 **Scroll down to see the map with the route drawn between ${yolaPlaces[0]} and ${yolaPlaces[1]}**`;
        finalAnswer += mapInstruction;
        console.log('✅ TomTom route metrics added to response');
      } else {
        console.log('⚠️ TomTom route unavailable; not adding distance/time details from Gemini.');
        finalAnswer += '\n\n⚠️ TomTom routing unavailable right now; no distance/time details can be shown.';
      }
    } else if (yolaPlaces.length === 1 && nonYolaPlaces.length === 0) {
      console.log('📍 Single Yola place detected:', yolaPlaces[0]);
      await switchToGoogleMaps();
      await window.centerGoogleMapsOnLocation(yolaPlaces[0]);
      const mapInstruction = `\n\n📍 **Location Details:**\nI've centered the map on **${yolaPlaces[0]}**. Scroll down to see the location and its details on the map.`;
      finalAnswer += mapInstruction;
      console.log('✅ Google Maps centered on location');
    } else if (yolaPlaces.length === 0 && nonYolaPlaces.length === 0) {
      console.log('ℹ No specific places detected in message');
      // Keep current map (default to Google Maps)
    } else {
      console.log('ℹ Mixed Yola and non-Yola place input; map actions limited due to non-Yola constraints.');
      if (yolaPlaces.length === 1) {
        await switchToGoogleMaps();
        await window.centerGoogleMapsOnLocation(yolaPlaces[0]);
        const mapInstruction = `\n\n📍 **Location Details:**\nI've centered the map on **${yolaPlaces[0]}**. Scroll down to see the location and its details on the map.`;
        finalAnswer += mapInstruction;
      }
    }

    if (yolaPlaces.length > 0 && yolaPlaces.length < 2) {
      finalAnswer += '\n\n⚠️ Route drawing requires at least two valid Yola places. Provide a second Yola place to view route guidance.';
      console.log('⚠️ Not enough Yola places for route drawing');
    }

    if (yolaPlaces.length >= 2 && !routeDrawn) {
      finalAnswer += '\n\n⚠️ No route could be drawn for the detected Yola places, either due to map service issue or mismatch in geocoding. Please rephrase or try again later.';
      console.log('⚠️ Yola route not drawn despite two Yola places');
    }

    if (yolaPlaces.length === 0 && nonYolaPlaces.length > 0) {
      finalAnswer += '\n\nℹ️ Since no valid Yola place was available, map routing is not shown.';
      console.log('ℹ️ All detected places are non-Yola; map routing disabled');
    }

    window.addToChatHistory && window.addToChatHistory('navi', 'assistant', finalAnswer);
  } catch (e) {
      if (e && (e.name === 'AbortError' || e.message === 'AbortError')) {
        finalAnswer = "Request cancelled.";
      } else if (typeof window.friendlyAIErrorMessage === 'function') {
        finalAnswer = window.friendlyAIErrorMessage(e);
      } else {
        console.error("Error fetching local data or Gemini API call:", e);
        finalAnswer = "The AI is currently unavailable. Please try again later.";
      }
  }

  msgGroup.querySelector('.ai-msg-text').innerHTML = formatAIResponse(finalAnswer);
  if (typeof window.addActionsToMsgGroup === 'function') {
    window.addActionsToMsgGroup(msgGroup, 'navi', 'navi-chat-messages');
  }
  chat.scrollTop = chat.scrollHeight;

  if (sendBtn) {
    sendBtn.disabled = false;
    sendBtn.classList.remove('sending');
    sendBtn.textContent = 'Send';
  }
  if (stopBtn) stopBtn.style.display = 'none';
  window.naviAbortController = null;
};