// Load common AI utilities first
if (!window.commonAILoaded) {
  const script = document.createElement('script');
  script.src = 'components/commonAI.js';
  script.onload = () => { window.commonAILoaded = true; };
  document.head.appendChild(script);
}

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

window.NAVI_AI_PROMPT = window.NAVI_AI_PROMPT || `You are an AI navigation assistant for Yola, Adamawa State, Nigeria.

You use TomTom APIs for routing, distance calculations, and travel time estimation.

IMPORTANT: When a user explicitly mentions TWO place names (e.g., "from Lamido Palace to Jimeta"), the system will automatically:
1. Draw the route on the satellite map
2. Calculate the exact distance in kilometers
3. Calculate the estimated travel time in minutes
4. Display these metrics in the chat after your response

Your role is to provide context and information about these locations and routes.

Key Information You Provide:
- Detailed descriptions of locations
- Best routes and transportation options
- Traffic and safety information
- Local landmarks and directions
- Contact information for transport services

Sample Responses:
- "Sure! I'm showing you the route from [origin] to [destination] on the map. The journey covers [distance] km and should take about [time] minutes by car."
- "Here's information about [location]: [details]. The map shows its exact position."
- "I'll draw the fastest route for you. You can take [transportation option] or drive directly."

When information is unavailable, say: "I don't have that specific information. Please contact local transport authorities."

For queries outside navigation (health, education, community, environment, jobs, agriculture), refer users to appropriate sections.`;


/*  Maps initializations  */


// NEW: Detect two place names in user message with flexible location matching
  // Supports Nigerian LGAs, Adamawa State wards, Yola communities, and landmarks
  // Also includes geographic coordinates for wards
  function extractTwoPlaces(text) {
    // Yola Wards with their approximate coordinates
    const yolaWards = {
      'yola north': { lat: 9.2200, lon: 12.4850, names: ['yola north', 'yolan', 'north yola', 'yola north ward'] },
      'yola south': { lat: 9.2100, lon: 12.4900, names: ['yola south', 'yolas', 'south yola', 'yola south ward'] },
      'jimeta': { lat: 9.2050, lon: 12.5000, names: ['jimeta', 'jimeta ward', 'jimeta town'] },
      'girei': { lat: 9.1950, lon: 12.4750, names: ['girei', 'girei ward', 'gerei'] },
      'mubi': { lat: 10.2640, lon: 13.2698, names: ['mubi', 'mubi ward', 'mubi town'] },
      'numan': { lat: 8.5583, lon: 12.0233, names: ['numan', 'numan ward', 'numan town'] },
      'garoua': { lat: 9.3088, lon: 13.3977, names: ['garoua', 'garoua ward'] },
      'jabbama': { lat: 9.1900, lon: 12.5100, names: ['jabbama', 'jabbama ward', 'jabbama area', 'jabbama plaza'] },
      'lamido': { lat: 9.2180, lon: 12.4820, names: ['lamido', 'lamido palace', 'lamido area', 'lamido ward'] },
      'airport': { lat: 9.2350, lon: 12.4450, names: ['airport', 'yola airport', 'international airport'] },
      'market': { lat: 9.2150, lon: 12.4950, names: ['market', 'yola market', 'main market', 'central market'] },
      'zoo': { lat: 9.1850, lon: 12.4900, names: ['zoo', 'yola zoo', 'zoological park'] },
      'wetlands': { lat: 9.1750, lon: 12.4800, names: ['wetlands', 'yola wetlands', 'swamp'] },
      'gorilla': { lat: 9.1800, lon: 12.4850, names: ['gorilla', 'gorilla park', 'gorilla sanctuary'] },
      'motor park': { lat: 9.2120, lon: 12.4880, names: ['motor park', 'motor station', 'main motor park', 'jambutu motor park'] },
      'palace': { lat: 9.2180, lon: 12.4820, names: ['palace', 'chief palace', 'emir palace'] },
      'government house': { lat: 9.2200, lon: 12.4900, names: ['government house', 'govt house', 'state house', 'admin'] },
      'mosque': { lat: 9.2170, lon: 12.4880, names: ['mosque', 'central mosque', 'main mosque'] }
    };
  
    // First priority: look for explicit "from X to Y" or "between X and Y" patterns
    const fromToMatch = /(?:from|between)\s+([^,\n]+?)\s+(?:to|and)\s+([^,.\n]+)/i.exec(text);
    if (fromToMatch) {
      const places = [fromToMatch[1].trim(), fromToMatch[2].trim()];
      console.log('✓ Detected two places from "from...to" pattern:', places);
      return places;
    }
  
    // Second priority: Match specific wards/locations in the Yola database
    const lowerText = text.toLowerCase();
    let foundPlaces = [];
    
    for (const [wardName, wardData] of Object.entries(yolaWards)) {
      for (const name of wardData.names) {
        if (lowerText.includes(name)) {
          if (!foundPlaces.includes(wardName)) {
            foundPlaces.push(wardName);
          }
          break;
        }
      }
    }
  
    if (foundPlaces.length >= 2) {
      console.log('✓ Detected two wards/places (Location database):', foundPlaces.slice(0, 2));
      return foundPlaces.slice(0, 2);
    }
  
    // Third priority: look for capitalized words that might be place names
    const capitalized = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:Ward|LGA|Community))?/g) || [];
    if (capitalized.length >= 2) {
      const nonPlaceWords = ['I', 'A', 'The', 'Is', 'From', 'To', 'And', 'Between', 'Can', 'Please', 'How', 'What', 'Where', 'Show', 'Draw', 'Route', 'Get', 'Find', 'Take', 'Go', 'Me', 'You', 'He', 'She', 'It', 'We', 'They', 'My', 'Your', 'Do', 'Did'];
      const places = capitalized.filter(word => !nonPlaceWords.includes(word)).slice(0, 2);
      
      if (places.length >= 2) {
        console.log('✓ Detected two places from capitalized words:', places);
        return places;
      }
    }
  
    // Fourth priority: Comprehensive location database for fallback matching
    const allLocations = [
      'yola north', 'yola south', 'jimeta', 'girei', 'mubi', 'numan', 'garoua', 'lamido', 'jabbama',
      'airport', 'market', 'zoo', 'wetlands', 'gorilla', 'palace', 'mosque',
      'government house', 'motor park', 'bank', 'hospital', 'clinic', 'school',
      'university', 'stadium', 'court', 'cinema', 'bridge', 'flyover', 'roundabout', 'junction'
    ];
  
    foundPlaces = [];
    for (const loc of allLocations) {
      if (lowerText.includes(loc)) {
        foundPlaces.push(loc);
      }
    }
  
    if (foundPlaces.length >= 2) {
      console.log('✓ Detected two places from location database:', foundPlaces.slice(0, 2));
      return foundPlaces.slice(0, 2);
    }
  
    // If still not found, try matching any two words that look like place names
    const words = text.split(/\s+/).filter(w => w.length > 2 && /^[A-Z]/.test(w));
    if (words.length >= 2) {
      const places = words.slice(0, 2);
      console.log('✓ Detected two places from text words:', places);
      return places;
    }
  
    console.log('ℹ No two places detected. Try: "from [Ward 1] to [Ward 2]" or mention wards like: Yola North, Jimeta, Girei, Mubi, Numan, etc.');
    return null;
  }
// NEW: Calculate distance and metrics only (no visual route drawing)
async function drawRouteAndCalculateMetrics(origin, destination) {
  try {
    console.log('📍 Calculating route metrics from', origin, 'to', destination);
    
    // Ensure TomTom API key is available
    if (!window.NAVI_MAP_API_KEY && !window.TOMTOM_API_KEY) {
      console.warn('⚠️ TomTom API key not available yet. Attempting to fetch...');
      try {
        const response = await fetch('http://localhost:4000/api/maps-key');
        if (response.ok) {
          const data = await response.json();
          if (data.apiKey) {
            window.NAVI_MAP_API_KEY = data.apiKey;
            window.TOMTOM_API_KEY = data.apiKey;
            console.log('✓ TomTom API key fetched on demand');
          }
        }
      } catch (err) {
        console.error('Failed to fetch TomTom API key:', err);
        return '';
      }
    }
    
    // Calculate distance and time
    const metrics = await window.calculateDistanceAndTime(origin, destination);
    
    if (!metrics) {
      console.error('❌ Failed to calculate metrics for:', origin, 'to', destination);
      return '';
    }
    
    // Return metrics details without drawing on map
    const details = `\n\n📋 Route Details:\n- Distance: ${metrics.distance} km\n- Estimated Travel Time: ${metrics.travelTime} minutes`;
    console.log('✓ Metrics calculated:', details);
    return details;
  } catch (e) {
    console.error('Error calculating metrics:', e);
    return '';
  }
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
            <div id="tomtom-map" style="height: 500px; width: 100%; border: 1px solid #ccc; position: relative;">
              <iframe id="google-maps-iframe" 
                style="width: 100%; height: 100%; border: none; position: absolute; top: 0; left: 0;" 
                frameborder="0" 
                allowfullscreen="" 
                loading="lazy">
              </iframe>
            </div>
          </div>
        </div>
      `;
    }
};

// --- Google Maps Initialization ---
window.initGoogleMaps = function() {
  const mapIframe = document.getElementById('google-maps-iframe');
  if (!mapIframe) {
    if (!window._googleMapsRetryCount) window._googleMapsRetryCount = 0;
    if (window._googleMapsRetryCount < 10) {
      window._googleMapsRetryCount++;
      setTimeout(() => window.initGoogleMaps(), 200);
    }
    return;
  }

  window._googleMapsRetryCount = 0;

  const lat = 9.2182;
  const lng = 12.4818;

  // 'layer=c' adds the Street View (Pegman) layer
  // 't=k' keeps it in Satellite mode
  const googleMapsUrl = `https://maps.google.com/maps?q=${lat},${lng}&z=14&t=k&layer=c&output=embed`;
  
  mapIframe.src = googleMapsUrl;
  mapIframe.style.display = 'block';
  console.log('✓ Pegman layer enabled via layer=c');
};



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
    const apiKey = window.NAVI_MAP_API_KEY || window.TOMTOM_API_KEY;
    if (!apiKey) {
      console.error('❌ TomTom API key not available');
      throw new Error('API key not available');
    }

    console.log('📡 TomTom API: Calculating route from', origin, 'to', destination);
    
    // Convert location names to coordinates if needed
    let startCoords = origin;
    let endCoords = destination;

    // If strings, search for coordinates using TomTom Search API
    if (typeof origin === 'string') {
      console.log('🔍 Searching for origin coordinates:', origin);
      startCoords = await window.searchLocation(origin);
      if (!startCoords) {
        console.error('❌ Could not find coordinates for origin:', origin);
        return null;
      }
    }
    
    if (typeof destination === 'string') {
      console.log('🔍 Searching for destination coordinates:', destination);
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

    console.log('📍 Route coordinates: From', startCoords, 'to', endCoords);
    
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
    
    // Fetch TomTom key for distance/time calculations only (Google Maps for display)
    const tomtomFetch = fetch('http://localhost:4000/api/maps-key').then(r => r.ok ? r.json() : null).catch(() => null);

    Promise.all([tomtomFetch]).then(([tomtomData]) => {
      if (tomtomData && tomtomData.apiKey) {
        window.NAVI_MAP_API_KEY = tomtomData.apiKey;
        window.TOMTOM_API_KEY = tomtomData.apiKey;  // Set for distance/time calculations
        console.log('✓ TomTom API key fetched successfully for distance calculations');
      } else {
        console.error('Failed to fetch TomTom API key - distance calculations will not work');
      }
      
      // Delay Google Maps initialization to ensure DOM is ready
      setTimeout(() => {
        window.initGoogleMaps && window.initGoogleMaps();
        console.log('✓ Google Maps initialized for display');
      }, 100);
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
  let attach = preview.innerHTML;
  let imageData = null;
  if (preview) {
    const img = preview.querySelector('img');
    if (img) imageData = img.src;
    // You can add similar logic for audio/video if needed
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
    <span class='msg-actions' data-msg-id='${mid}'>
      <button class='read-aloud-btn' data-msg-id='${mid}' title='Listen'>🔊</button>
      <button class='copy-btn' data-msg-id='${mid}' title='Copy'>📋</button>
      <button class='delete-msg-btn' data-msg-id='${mid}' title='Delete message'>🗑️</button>
    </span>
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
  let routeMetrics = '';
  try {
    const signal = controller ? controller.signal : (window.naviAbortController ? window.naviAbortController.signal : null);
    const localData = await fetch('Data/NaviInfo/naviinfo.txt', signal ? { signal } : {}).then(r => r.text());
    
    // Find local file links in the txt (format: details/Navi/filename.html)
    const linkRegex = /details\/Navi\/[^\s]+\.html/gim;
    const links = [];
    let match;
    while ((match = linkRegex.exec(localData)) !== null) {
      links.push(match[0]);
    }

    // Fetch all linked file contents in parallel
    let linkedContents = '';
    if (links.length > 0) {
      const fetches = links.map(link => fetch(link, signal ? { signal } : {}).then(r => r.ok ? r.text() : '').catch(() => ''));
      const results = await Promise.all(fetches);
      linkedContents = results.map((content, i) => `\n---\n[${links[i]}]\n${content}\n`).join('');
    }
    
    // Include chat history in the context
    const historyContext = chatHistory.length > 0 
        ? "\n\nRecent conversation history:\n" + chatHistory.map(h => `User: ${h.role === 'user' ? h.content : ''}\nAI: ${h.role === 'assistant' ? h.content : ''}`).filter(Boolean).join('\n\n')
        : "";
    
    // Combine all local data
    const allLocalData = localData + linkedContents + historyContext;
    finalAnswer = await getGeminiAnswer(NAVI_AI_PROMPT + "\n\n" + allLocalData, msg, window.GEMINI_API_KEY, imageData, signal);
    
    // Store in chat history (keep last 10 messages)
    window.addToChatHistory && window.addToChatHistory('navi', 'user', msg);
    
    // NEW: Detect if user mentioned two places and calculate metrics
    const twoPlaces = extractTwoPlaces(msg);
    if (twoPlaces && twoPlaces.length === 2) {
      console.log('🎯 Two places detected:', twoPlaces);
      routeMetrics = await drawRouteAndCalculateMetrics(twoPlaces[0], twoPlaces[1]);
    } else {
      console.log('ℹ Single place or no specific location mentioned - no distance calculation');
    }
    
    // Append route metrics to AI response
    if (routeMetrics) {
      console.log('📊 Adding route metrics to AI response');
      finalAnswer += routeMetrics;
    }

    window.addToChatHistory && window.addToChatHistory('navi', 'assistant', finalAnswer);
  } catch (e) {
      if (e.name === 'AbortError') {
        finalAnswer = "USER ABORTED REQUEST";
      } else {
        console.error("Error fetching local data or Gemini API call:", e);
        finalAnswer = "Sorry, I could not access local information or the AI at this time. Pls check your internet connection!";
      }
  }

  msgGroup.querySelector('.ai-msg-text').innerHTML = formatAIResponse(finalAnswer);
  chat.scrollTop = chat.scrollHeight;

  if (sendBtn) {
    sendBtn.disabled = false;
    sendBtn.classList.remove('sending');
    sendBtn.textContent = 'Send';
  }
  if (stopBtn) stopBtn.style.display = 'none';
  window.naviAbortController = null;
};