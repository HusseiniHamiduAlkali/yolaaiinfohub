// Load common AI utilities first
if (!window.commonAILoaded) {
  const script = document.createElement('script');
  script.src = 'components/commonAI.js';
  script.onload = () => { window.commonAILoaded = true; };
  document.head.appendChild(script);
}

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
                    <div id="tomtom-map" style="height: 500px; width: 100%; border: 1px solid #ccc;"></div>
                    <div class="map-controls">
                        <button onclick="window.tomtomMap && window.tomtomMap.getZoom && window.tomtomMap.setZoom(window.tomtomMap.getZoom() + 1)">Zoom In</button>
                        <button onclick="window.tomtomMap && window.tomtomMap.getZoom && window.tomtomMap.setZoom(window.tomtomMap.getZoom() - 1)">Zoom Out</button>
                        <button onclick="window.tomtomMap && window.tomtomMap.setCenter && window.tomtomMap.setCenter({lat: 9.2182, lng: 12.4818})">Center on Yola</button>
                    </div>
                    <div class="map-info"></div>
                    <div class="route-info"></div>
                </div>
            </div>
        `;
    }
};

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
window.NAVI_AI_PROMPT = window.NAVI_AI_PROMPT || `You are an AI navigation assistant for Yola, Adamawa State, Nigeria.
Help users with navigation, directions, and transportation in Yola.

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

For  queries about health, education, community, environment, jobs, or agriculture, refer users to MediInfo, EduInfo, CommunityInfo, EcoInfo, JobsConnect, or AgroInfo respectively.`;

// Load TomTom Maps SDK (try local vendor -> CDN -> (optional) Leaflet fallback)
function displayMapError(msg) {
  const mapDiv = document.getElementById('tomtom-map');
  if (mapDiv) mapDiv.innerHTML = '<div style="color:red; padding:20px;">TomTom SDK load error: ' + msg + '</div>';
}

function loadTomTomSDK() {
  // You can disable the Leaflet fallback by setting: window.ENABLE_LEAFLET_FALLBACK = false;
  const localCss = '/vendor/tomtom/maps.css';
  const localJs = '/vendor/tomtom/maps-web.min.js';
  const cdnCss = 'https://cdn.jsdelivr.net/npm/@tomtom-international/web-sdk-maps@6.22.0/dist/maps.css';
  const cdnJs = 'https://cdn.jsdelivr.net/npm/@tomtom-international/web-sdk-maps@6.22.0/dist/maps-web.min.js';

  let cssLoaded = false;
  let jsLoaded = false;

  const tryLeafletFallback = () => {
    if (window.ENABLE_LEAFLET_FALLBACK === false) {
      displayMapError('TomTom engine failed to load and Leaflet fallback is disabled.');
      return;
    }
    fallbackToLeafletTomTom();
  };

  const loadCss = (href, onSuccess, onError) => {
    if (document.getElementById('tomtom-css') && document.getElementById('tomtom-css').href === href) {
      onSuccess && onSuccess();
      return;
    }
    const css = document.createElement('link');
    css.id = 'tomtom-css';
    css.rel = 'stylesheet';
    css.href = href;
    css.crossOrigin = 'anonymous';
    css.onload = () => { console.log('TomTom CSS loaded from', href); cssLoaded = true; onSuccess && onSuccess(); };
    css.onerror = () => { console.warn('Failed to load TomTom CSS from', href); onError && onError(); };
    document.head.appendChild(css);
  };

  const loadJs = (src, onSuccess, onError) => {
    if (window.tt && typeof window.tt.map === 'function') {
      onSuccess && onSuccess();
      return;
    }
    if (document.getElementById('tomtom-sdk') && document.getElementById('tomtom-sdk').src === src) return;
    const script = document.createElement('script');
    script.id = 'tomtom-sdk';
    script.src = src;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = () => { console.log('TomTom SDK script loaded from', src); window._tomtomSdkLoaded = true; onSuccess && onSuccess(); };
    script.onerror = () => { console.warn('TomTom SDK script failed from', src); onError && onError(); };
    document.head.appendChild(script);
  };

  // Try local CSS first, then CDN
  loadCss(localCss, null, () => {
    console.log('Local TomTom CSS not available, trying CDN...');
    loadCss(cdnCss, null, () => {
      console.error('TomTom CSS failed to load from both local and CDN');
      if (window.ENABLE_LEAFLET_FALLBACK === false) {
         displayMapError('TomTom styles failed to load and fallback disabled.');
      } else {
         displayMapError('TomTom styles failed to load; falling back to tiles.');
         tryLeafletFallback();
      }
    });
  });

  // Try local JS first, then CDN
  loadJs(localJs, () => {
    console.log('TomTom SDK loaded from local vendor.');
  }, () => {
    console.log('Local TomTom SDK failed, trying CDN...');
    loadJs(cdnJs, () => {
      console.log('TomTom SDK loaded from CDN.');
    }, () => {
      console.error('Failed to load TomTom SDK from both local and CDN');
      displayMapError('Failed to load TomTom SDK (local & CDN blocked). To serve a local copy, run: npm install @tomtom-international/web-sdk-maps and restart the server.');
      tryLeafletFallback();
    });
  });
}

// Initialize TomTom Map with native SDK
window.initTomTomMap = function() {
  console.log('Loading TomTom Maps SDK...');
  loadTomTomSDK();

  const start = Date.now();
  const maxWait = 12000; // 12s

  const checkReady = () => {
    // If SDK object exists, proceed
    if (window.tt && typeof window.tt.map === 'function') {
      console.log('TomTom SDK available');
      // Wait for DOM and then initialize
      const checkDOM = setInterval(() => {
        const mapDiv = document.getElementById('tomtom-map');
        if (mapDiv) {
          clearInterval(checkDOM);
          initializeTomTomNativeMap();
        }
      }, 100);
      setTimeout(() => clearInterval(checkDOM), 5000);
      return;
    }

    // If script onload flag set but SDK still missing, show error
    if (window._tomtomSdkLoaded && !(window.tt && typeof window.tt.map === 'function')) {
      console.error('TomTom SDK loaded but global `tt` is missing');
      displayMapError('Map engine loaded but failed to initialize.');
      return;
    }

    // Timeout
    if (Date.now() - start > maxWait) {
      console.error('Timed out waiting for TomTom SDK');
      displayMapError('Timed out loading map engine (CDN blocked or offline).');
      return;
    }

    // Retry
    setTimeout(checkReady, 200);
  };

  checkReady();
};

function initializeTomTomNativeMap() {
  const mapDiv = document.getElementById('tomtom-map');
  if (!mapDiv) {
    console.error('Map container not found');
    return;
  }

  const apiKey = window.NAVI_MAP_API_KEY;
  if (!apiKey) {
    mapDiv.innerHTML = '<div style="color:red;">TomTom API key not loaded.</div>';
    return;
  }

  // If fallback already initialized, skip native init
  if (mapDiv._leafletInit) {
    console.warn('Map already initialized with fallback tiles, skipping native SDK init.');
    return;
  }

  try {
    // Initialize TomTom map
    window.tomtomMap = window.tt.map({
      key: apiKey,
      container: 'tomtom-map',
      center: [12.4818, 9.2182], // Yola - [lon, lat]
      zoom: 13,
      style: 'https://api.tomtom.com/style/1/style/20.0.0-*?key=' + apiKey
    });

    // Add basic controls
    window.tomtomMap.addControl(new window.tt.FullscreenControl());
    window.tomtomMap.addControl(new window.tt.NavigationControl());
    window.tomtomMap.addControl(new window.tt.ZoomControl());

    console.log('✓ TomTom map initialized successfully');
  } catch (error) {
    console.error('Error initializing TomTom map:', error);
    // If SDK init fails, fallback to tiles
    displayMapError('Native TomTom SDK init failed; falling back to tile map.');
    fallbackToLeafletTomTom();
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

function initLeafletTomTomMap() {
  const mapDiv = document.getElementById('tomtom-map');
  if (!mapDiv) return;
  try {
    window.leafletMap = window.L.map('tomtom-map').setView([9.2182, 12.4818], 13);
    window.L.tileLayer(`https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key=${window.NAVI_MAP_API_KEY}`, {
      attribution: '© TomTom',
      maxZoom: 18
    }).addTo(window.leafletMap);
    mapDiv._leafletInit = true;
    console.log('✓ Fallback TomTom tiles displayed via Leaflet');
  } catch (e) {
    console.error('Fallback Leaflet init error', e);
    displayMapError('Failed to initialize fallback tile map: ' + e.message);
  }
}

// Search function for locations using TomTom Search API
window.searchLocation = async function(query) {
  const apiKey = window.NAVI_MAP_API_KEY;
  if (!apiKey) {
    console.error('API key not available');
    return null;
  }
  try {
    const url = `https://api.tomtom.com/search/2/search/${encodeURIComponent(query)}.json?key=${apiKey}&countrySet=NG&limit=1`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      const pos = data.results[0].position;
      return { lat: pos.lat, lon: pos.lon };
    }
    return null;
  } catch (error) {
    console.error('Error searching location:', error);
    return null;
  }
};

// Function to draw route between two points using TomTom Routing
window.drawRoute = async function(origin, destination) {
  try {
    const apiKey = window.NAVI_MAP_API_KEY;
    if (!apiKey) throw new Error('API key not available');
    if (!window.tomtomMap) throw new Error('Map not initialized');

    // Convert location names to coordinates if needed
    let startCoords = origin;
    let endCoords = destination;

    if (typeof origin === 'string') {
      startCoords = await window.searchLocation(origin);
    }
    if (typeof destination === 'string') {
      endCoords = await window.searchLocation(destination);
    }

    if (!startCoords || !endCoords) {
      console.error('Could not find coordinates for route');
      return false;
    }

    // Get route from TomTom Routing API
    const routeUrl = `https://api.tomtom.com/routing/1/calculateRoute/${startCoords.lat},${startCoords.lon}:${endCoords.lat},${endCoords.lon}/json?key=${apiKey}`;
    const response = await fetch(routeUrl);
    const routeData = await response.json();

    if (routeData.routes && routeData.routes.length > 0) {
      // Extract points and convert to [lon, lat] format for TomTom
      const points = routeData.routes[0].legs[0].points.map(p => [p.longitude, p.latitude]);

      // Remove old route if exists
      if (window.routeLine) {
        window.tomtomMap.removeLayer(window.routeLine);
      }

      // Add route as a GeoJSON line
      window.tomtomMap.addLayer({
        id: 'route-line',
        type: 'line',
        source: {
          dataType: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: points
            }
          }
        },
        paint: {
          'line-color': '#007bff',
          'line-width': 8
        }
      }, 'poi');

      // Store route for removal later
      window.routeLine = true;

      // Fit bounds to show route
      const bounds = points.reduce(
        (bounds, coord) => [
          [Math.min(bounds[0][0], coord[0]), Math.min(bounds[0][1], coord[1])],
          [Math.max(bounds[1][0], coord[0]), Math.max(bounds[1][1], coord[1])]
        ],
        [[points[0][0], points[0][1]], [points[0][0], points[0][1]]]
      );

      window.tomtomMap.fitBounds(bounds, { padding: 40 });

      console.log('✓ Route drawn successfully');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error drawing route:', error);
    return false;
  }
};

// Function to calculate distance and travel time using TomTom Routing
window.calculateDistanceAndTime = async function(origin, destination) {
  try {
    const apiKey = window.NAVI_MAP_API_KEY;
    if (!apiKey) throw new Error('API key not available');

    // Convert location names to coordinates if needed
    let startCoords = origin;
    let endCoords = destination;

    if (typeof origin === 'string') {
      startCoords = await window.searchLocation(origin);
    }
    if (typeof destination === 'string') {
      endCoords = await window.searchLocation(destination);
    }

    if (!startCoords || !endCoords) {
      return null;
    }

    const routeUrl = `https://api.tomtom.com/routing/1/calculateRoute/${startCoords.lat},${startCoords.lon}:${endCoords.lat},${endCoords.lon}/json?key=${apiKey}`;
    const response = await fetch(routeUrl);
    const data = await response.json();

    if (data.routes && data.routes.length > 0) {
      const distance = (data.routes[0].summary.lengthInMeters / 1000).toFixed(1);
      const travelTime = Math.round(data.routes[0].summary.travelTimeInSeconds / 60);
      return { distance, travelTime };
    }
    return null;
  } catch (error) {
    console.error('Error calculating distance and time:', error);
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
  fetch('templates/navi.html').then(r => r.text()).then(html => {
    document.getElementById('main-content').innerHTML = html;
    // Wire model toggle after template is inserted
    const mt = document.getElementById('model-toggle');
    if (mt) mt.onchange = function() { window.toggleGeminiModel('navi', this.checked); };
    
    // Get API key first, THEN initialize map
    fetch('http://localhost:4000/api/maps-key')
      .then(r => {
        if (!r.ok) throw new Error('Failed to fetch API key: ' + r.status);
        return r.json();
      })
      .then(data => {
        if (!data.apiKey) throw new Error('No API key in response');
        console.log('✓ API key fetched successfully');
        window.NAVI_MAP_API_KEY = data.apiKey;
        // NOW initialize the TomTom map
        window.initTomTomMap();
      })
      .catch(err => {
        console.error('✗ Failed to fetch API key:', err);
        const mapDiv = document.getElementById('tomtom-map');
        if (mapDiv) {
          mapDiv.innerHTML = '<div style="color:red; padding: 20px;">Failed to load map API key: ' + err.message + '</div>';
        }
      });
  }).catch(err => {
    console.error('Failed to load navi template:', err);
    document.getElementById('main-content').innerHTML = '<p>Failed to load content.</p>';
  });
}

window.stopNaviResponse = function() {
  if (window.naviAbortController) {
    window.naviAbortController.abort();
    window.naviAbortController = null;
  }
  const sendBtn = document.querySelector('.send-button');
  if (sendBtn) {
    sendBtn.classList.remove('sending');
    sendBtn.textContent = 'Send';
    sendBtn.style.backgroundColor = '';
  }
};

window.sendNaviMessage = async function(faqText = '') {
  const input = document.getElementById('navi-chat-input');
  const chat = document.getElementById('navi-chat-messages');
  const preview = document.getElementById('navi-chat-preview');
  const sendBtn = document.querySelector('.send-button');
  const stopBtn = document.querySelector('.stop-button');

  // Always extract attachment from preview before clearing
  let msg = faqText || input.value.trim();
  let attach = preview.innerHTML;
  let imageData = null;
  if (preview) {
    const img = preview.querySelector('img');
    if (img) imageData = img.src;
    // You can add similar logic for audio/video if needed
  }
  if (!msg && !attach) return;

  if (window.naviAbortController) {
    window.naviAbortController.abort();
  }
  window.naviAbortController = new AbortController();

  if (sendBtn) {
    sendBtn.classList.add('sending');
    sendBtn.textContent = 'Stop';
    sendBtn.style.backgroundColor = '#ff4444';

    // Add click handler to stop response
    const stopHandler = () => {
      const stopHandler = (e) => {
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
        if (window.naviAbortController) {
          window.naviAbortController.abort();
          window.naviAbortController = null;
        }
        sendBtn.removeEventListener('click', stopHandler);
        sendBtn.classList.remove('sending');
        sendBtn.textContent = 'Send';
        sendBtn.style.backgroundColor = '';
      };
      sendBtn.addEventListener('click', stopHandler);
  }

  const msgGroup = document.createElement('div');
  msgGroup.className = 'chat-message-group';
  msgGroup.innerHTML = `
    <div class='user-msg'>${msg}${attach ? "<br>" + attach : ""}</div>
    <div class='ai-msg'><span class='ai-msg-text'>Navi AI typing...</span></div>
  `;
  chat.appendChild(msgGroup);
  preview.innerHTML = '';
  if (!faqText) input.value = '';

  // Load existing chat history using commonAI.js
  window.initChatHistory && window.initChatHistory('navi', 10);
  let chatHistory = window.getChatHistory ? window.getChatHistory('navi') : [];

  let finalAnswer = "";
  let directionsDrawn = false;
  try {
    const localData = await fetch('Data/NaviInfo/naviinfo.txt').then(r => r.text());
    // Include chat history in the context
    const historyContext = chatHistory.length > 0 
        ? "\n\nRecent conversation history:\n" + chatHistory.map(h => `User: ${h.role === 'user' ? h.content : ''}\nAI: ${h.role === 'assistant' ? h.content : ''}`).filter(Boolean).join('\n\n')
        : "";
    finalAnswer = await getGeminiAnswer(NAVI_AI_PROMPT + "\n\n" + localData + historyContext, msg, window.GEMINI_API_KEY, imageData);
    // Store in chat history (keep last 10 messages)
    window.addToChatHistory && window.addToChatHistory('navi', 'user', msg);
    window.addToChatHistory && window.addToChatHistory('navi', 'assistant', finalAnswer);
    // Try to extract directions from the AI response or user message
    // Example: "Directions from [origin] to [destination]"
    const dirMatch = /(?:directions|route|how\s+to\s+get)\s+from\s+([^\n]+?)\s+to\s+([^\n.]+)[\n.]/i.exec(msg + ' ' + finalAnswer);
    if (dirMatch) {
      const origin = dirMatch[1].trim();
      const destination = dirMatch[2].trim();
      try {
        directionsDrawn = await window.drawRoute(origin, destination);
      } catch (e) {
        console.error("Failed to draw route:", e);
      }
    }
  } catch (e) {
      if (e.name === 'AbortError' || e.message === 'AbortError') {
        finalAnswer = "USER ABORTED REQUEST";
      } else {
        console.error("Error fetching local data or Gemini API call:", e);
        finalAnswer = "Sorry, I could not access local information or the AI at this time. Pls check your internet connection!";
      }
  }

  msgGroup.querySelector('.ai-msg-text').innerHTML = formatAIResponse(finalAnswer) + (directionsDrawn ? '<br><span style="color:#3182ce">Directions drawn on map.</span>' : '');
  chat.scrollTop = chat.scrollHeight;

  if (sendBtn) {
    sendBtn.disabled = false;
    sendBtn.classList.remove('sending');
    sendBtn.textContent = 'Send';
  }
  if (stopBtn) stopBtn.style.display = 'none';
  window.naviAbortController = null;
}};