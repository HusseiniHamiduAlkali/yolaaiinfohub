
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
        
          // Load Maps API
      const mapDiv = document.querySelector('#map');
      if (mapDiv) {
        mapDiv.innerHTML = '<div style="text-align:center;padding:2em;color:#666;">Loading map...</div>';
      }
      
      // Load the Maps API script if not already present
      if (!document.getElementById('google-maps-api')) {
        const script = document.createElement('script');
        script.id = 'google-maps-api';
        script.src = 'https://maps.googleapis.com/maps/api/js?libraries=geometry,places&callback=initMap';
        script.async = true;
        script.defer = true;
        script.onerror = () => {
          console.log('Failed to load Google Maps API, trying keyless version...');
          // Fallback to keyless version
          const keylessScript = document.createElement('script');
          keylessScript.src = 'https://cdn.jsdelivr.net/gh/somanchiu/Keyless-Google-Maps-API@v7.0/mapsJavaScriptAPI.js';
          keylessScript.id = 'keyless-maps-api';
          keylessScript.async = true;
          keylessScript.onload = () => {
            if (window.google && window.google.maps) {
              window.initMap();
            }
          };
          document.head.appendChild(keylessScript);
        };
        document.head.appendChild(script);
      } else if (window.google && window.google.maps) {
        // If API is already loaded, initialize the map
        window.initMap();
      }
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

For non-navigation queries about health, education, community, environment, jobs, or agriculture, refer users to MediInfo, EduInfo, CommunityInfo, EcoInfo, JobsConnect, or AgroInfo respectively.`;

// Initialize Google Maps instance
window.initMap = function() {
    console.log('Initializing map...');
    const mapDiv = document.getElementById('navi-map');
    if (!mapDiv) {
        console.error('Map container not found');
        return;
    }

    try {
        // Show loading state
        mapDiv.innerHTML = '<div style="text-align:center;padding:2em;color:#666;">Initializing map...</div>';

        // Wait for Maps API to be ready
        if (!window.google || !window.google.maps) {
            setTimeout(window.initMap, 1000);
            return;
        }

        // Clear loading message
        mapDiv.innerHTML = '';

        // Create the map centered on Yola
        window.map = new google.maps.Map(mapDiv, {
            center: { lat: 9.2182, lng: 12.4818 },
            zoom: 13,
            mapTypeId: 'hybrid',
            mapTypeControl: true,
            mapTypeControlOptions: {
                style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
                position: google.maps.ControlPosition.TOP_RIGHT
            },
            fullscreenControl: true,
            streetViewControl: true,
            zoomControl: true,
            gestureHandling: 'cooperative',
            styles: [
                {
                    featureType: 'poi',
                    elementType: 'labels',
                    stylers: [{ visibility: 'on' }]
                },
                {
                    featureType: 'transit',
                    elementType: 'labels',
                    stylers: [{ visibility: 'on' }]
                }
            ]
        });

        // Initialize directions and markers
        window.markers = [];
        
        if (typeof window.initMapDirections === 'function') {
            window.initMapDirections();
        } else {
            console.error('MapDirections not loaded');
        }
        
        console.log('Map initialized successfully');
    } catch (error) {
        console.error('Error initializing map:', error);
    }
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

// Function to draw route between two points using Google Maps
// This function has been moved to mapDirections.js for better organization and reliability

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
  }).catch(err => {
    console.error('Failed to load home template:', err);
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
  
  // Extract image data if present in preview
  let imageData = null;
  if (preview) {
    const previewImg = preview.querySelector('img');
    if (previewImg) {
      imageData = previewImg.src;
      msg = (msg || '') + "\nPlease analyze this image and provide relevant navigation information, identify landmarks, or suggest similar places to visit.";
    }
  }
  let msg = faqText || input.value.trim();
  let attach = preview.innerHTML;
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

  // Load existing chat history
  let chatHistory = JSON.parse(localStorage.getItem('navi_chat_history') || '[]');

  let finalAnswer = "";
  let directionsDrawn = false;
  try {
    const localData = await fetch('Data/NaviInfo/naviinfo.txt').then(r => r.text());
    
    // Include chat history in the context
    const historyContext = chatHistory.length > 0 
        ? "\n\nRecent conversation history:\n" + chatHistory.map(h => `User: ${h.user}\nAI: ${h.ai}`).join('\n\n')
        : "";
        
    finalAnswer = await getGeminiAnswer(NAVI_AI_PROMPT + "\n\n" + localData + historyContext, msg, window.GEMINI_API_KEY, imageData);
    
    // Store in chat history (keep last 5 messages)
    chatHistory.push({ user: msg, ai: finalAnswer });
    if (chatHistory.length > 5) chatHistory = chatHistory.slice(-5);
    localStorage.setItem('navi_chat_history', JSON.stringify(chatHistory));
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
    sendBtn.querySelector('.send-text').textContent = 'Send';
  }
  if (stopBtn) stopBtn.style.display = 'none';
  window.naviAbortController = null;
}};