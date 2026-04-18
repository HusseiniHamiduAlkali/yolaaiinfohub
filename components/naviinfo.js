// Ensure navigation API key globals exist (can be set manually for dev)
window.TOMTOM_API_KEY = window.TOMTOM_API_KEY || null;
window.NAVI_MAP_API_KEY = window.NAVI_MAP_API_KEY || null;

// Single source of truth for Yola coordinates
window.YOLA_COORDS = window.YOLA_COORDS || {
  lat: 9.2182,
  lon: 12.4818,
  centerArray: [9.2182, 12.4818],
  places: {
    // Core Districts & Wards
    'yola north': { lat: 9.2230, lon: 12.4850, names: ['yola north', 'yolan', 'north yola', 'yola north ward'] },
    'yola south': { lat: 9.2105, lon: 12.4875, names: ['yola south', 'yolas', 'south yola', 'yola south ward'] },
    'jimeta': { lat: 9.2055, lon: 12.4945, names: ['jimeta', 'jimeta ward', 'jimeta town', 'jimeta area'] },
    'girei': { lat: 9.2010, lon: 12.4780, names: ['girei', 'girei ward', 'gerei', 'girei district'] },
    'mubi': { lat: 9.2185, lon: 12.4870, names: ['mubi', 'mubi ward', 'mubi town', 'mubi market'] },
    'numan': { lat: 9.2150, lon: 12.4720, names: ['numan', 'numan ward', 'numan town', 'numan area'] },
    'garoua': { lat: 9.2195, lon: 12.4930, names: ['garoua', 'garoua ward', 'garoua street'] },
    'jabbama': { lat: 9.1905, lon: 12.5060, names: ['jabbama', 'jabbama ward', 'jabbama area', 'jabbama plaza', 'jabbama market'] },
    'lamido': { lat: 9.2180, lon: 12.4820, names: ['lamido', 'lamido palace', 'lamido area', 'lamido ward', 'lamido street'] },

    // Transportation & Terminals
    'airport': { lat: 9.267620, lon: 12.425942, names: ['airport', 'yola airport', 'international airport', 'aviation', 'flight'] },
    'motor park': { lat: 9.2125, lon: 12.4885, names: ['motor park', 'motor station', 'main motor park', 'jambutu motor park', 'bus station', 'transport hub'] },
    'jambutu motor park': { lat: 9.2125, lon: 12.4885, names: ['jambutu motor park', 'jambutu', 'jambutu station'] },
    'bridge': { lat: 9.2005, lon: 12.4810, names: ['bridge', 'main bridge', 'road bridge', 'mayindin bridge'] },
    'flyover': { lat: 9.2025, lon: 12.4830, names: ['flyover', 'main flyover', 'elevated road'] },

    // Markets & Commercial
    'market': { lat: 9.2155, lon: 12.4950, names: ['market', 'yola market', 'main market', 'central market', 'market square'] },
    'jimeta market': { lat: 9.2045, lon: 12.4960, names: ['jimeta market', 'jimeta main market', 'jimeta shopping'] },
    'kasuwan gida': { lat: 9.2165, lon: 12.4920, names: ['kasuwan gida', 'kasuwan gida market', 'traditional market'] },
    'yola shopping center': { lat: 9.2175, lon: 12.4895, names: ['shopping center', 'yola shopping center', 'mall', 'retail center'] },
    'main street': { lat: 9.2185, lon: 12.4915, names: ['main street', 'yola main street', 'primary street', 'high street'] },

    // Government & Administrative
    'government house': { lat: 9.2205, lon: 12.4885, names: ['government house', 'govt house', 'state house', 'admin', 'governor house'] },
    'secretariat': { lat: 9.2210, lon: 12.4900, names: ['secretariat', 'state secretariat', 'administration secretariat'] },
    'state assembly': { lat: 9.2215, lon: 12.4920, names: ['state assembly', 'legislature', 'parliament house'] },
    'palace': { lat: 9.2180, lon: 12.4820, names: ['palace', 'chief palace', 'emir palace', 'royal palace', 'emir residence'] },
    'court': { lat: 9.2200, lon: 12.4910, names: ['court', 'high court', 'law court', 'justice center', 'magistrate court'] },

    // Religious Sites
    'mosque': { lat: 9.2175, lon: 12.4875, names: ['mosque', 'central mosque', 'main mosque', 'friday mosque', 'juma\'a mosque'] },
    'central mosque': { lat: 9.2175, lon: 12.4875, names: ['central mosque', 'main mosque'] },
    'church': { lat: 9.2140, lon: 12.4870, names: ['church', 'main church', 'central church', 'protestant church'] },

    // Healthcare
    'hospital': { lat: 9.2145, lon: 12.4865, names: ['hospital', 'general hospital', 'main hospital', 'federal medical center', 'fmc'] },
    'clinic': { lat: 9.2135, lon: 12.4875, names: ['clinic', 'health clinic', 'primary health center', 'phc'] },
    'federal medical center': { lat: 9.2150, lon: 12.4860, names: ['federal medical center', 'fmc', 'fmc yola'] },
    'specialists clinic': { lat: 9.2128, lon: 12.4880, names: ['specialists clinic', 'specialist hospital'] },

    // Education
    'university': { lat: 9.2290, lon: 12.4990, names: ['university', 'adamawa state university', 'asu', 'campus'] },
    'asu campus': { lat: 9.2290, lon: 12.4990, names: ['asu campus', 'adamawa state university campus'] },
    'polytechnic': { lat: 9.2240, lon: 12.5010, names: ['polytechnic', 'federal polytechnic', 'polytechnic yola'] },
    'school': { lat: 9.2115, lon: 12.4865, names: ['school', 'secondary school', 'primary school', 'grammar school'] },
    'government secondary school': { lat: 9.2110, lon: 12.4855, names: ['government secondary school', 'gss', 'secondary school'] },
    'nursery school': { lat: 9.2120, lon: 12.4875, names: ['nursery school', 'primary school', 'kindergarten'] },

    // Sports & Recreation
    'stadium': { lat: 9.2195, lon: 12.4895, names: ['stadium', 'main stadium', 'sports stadium', 'yola stadium', 'sports complex'] },
    'sports center': { lat: 9.2190, lon: 12.4900, names: ['sports center', 'recreation center', 'leisure center'] },
    'zoo': { lat: 9.1855, lon: 12.4890, names: ['zoo', 'yola zoo', 'zoological park', 'wildlife park', 'animal park'] },
    'wetlands': { lat: 9.1755, lon: 12.4810, names: ['wetlands', 'yola wetlands', 'swamp', 'nature reserve', 'marsh'] },
    'gorilla': { lat: 9.1805, lon: 12.4855, names: ['gorilla', 'gorilla park', 'gorilla sanctuary', 'wildlife sanctuary'] },

    // Banking & Finance
    'bank': { lat: 9.2165, lon: 12.4887, names: ['bank', 'central bank', 'commercial bank', 'main bank'] },
    'gtb': { lat: 9.2160, lon: 12.4895, names: ['gtb', 'guaranty trust bank', 'gtb branch'] },
    'zenith bank': { lat: 9.2170, lon: 12.4880, names: ['zenith bank', 'zenith', 'ub'] },
    'first bank': { lat: 9.2155, lon: 12.4890, names: ['first bank', 'first bank yola'] },
    'access bank': { lat: 9.2175, lon: 12.4885, names: ['access bank', 'access', 'access yola'] },

    // Entertainment & Dining
    'cinema': { lat: 9.2095, lon: 12.4820, names: ['cinema', 'movie theater', 'cinema hall', 'film house'] },
    'restaurant': { lat: 9.2155, lon: 12.4905, names: ['restaurant', 'main restaurant', 'eating place', 'food court'] },
    'hotel': { lat: 9.2180, lon: 12.4925, names: ['hotel', 'accommodation', 'hospitality'] },
    'guest house': { lat: 9.2190, lon: 12.4915, names: ['guest house', 'lodge', 'guest accommodation'] },

    // Landmarks & General
    'roundabout': { lat: 9.2075, lon: 12.4855, names: ['roundabout', 'traffic roundabout', 'main roundabout', 'rotunda'] },
    'junction': { lat: 9.2065, lon: 12.4865, names: ['junction', 'main junction', 'crossroads', 'intersection'] },
    'garden': { lat: 9.2140, lon: 12.4920, names: ['garden', 'public garden', 'botanical garden', 'park'] },
    'public park': { lat: 9.2135, lon: 12.4925, names: ['public park', 'city park', 'recreation park'] },

    // Water & Services
    'water station': { lat: 9.2120, lon: 12.4890, names: ['water station', 'water supply', 'water office'] },
    'electricity office': { lat: 9.2110, lon: 12.4900, names: ['electricity office', 'power office', 'nepa office'] },
    'post office': { lat: 9.2145, lon: 12.4930, names: ['post office', 'postal service', 'mail center'] },

    // Street Names & Areas
    'saminu road': { lat: 9.2140, lon: 12.4870, names: ['saminu road', 'saminu street', 'saminu area'] },
    'muhammadu buhari way': { lat: 9.2175, lon: 12.4895, names: ['muhammadu buhari way', 'buhari way', 'main boulevard'] },
    'murtala avenue': { lat: 9.2150, lon: 12.4920, names: ['murtala avenue', 'murtala street'] },
    'adekunle fajuyi road': { lat: 9.2130, lon: 12.4860, names: ['adekunle fajuyi road', 'fajuyi road', 'fajuyi street'] },
    'adama street': { lat: 9.2155, lon: 12.4875, names: ['adama street', 'adama road', 'adama area'] },

    // Industry & Sectors
    'industrial area': { lat: 9.1970, lon: 12.5040, names: ['industrial area', 'industrial zone', 'manufacturing area'] },
    'business district': { lat: 9.2160, lon: 12.4900, names: ['business district', 'commercial district', 'cbd'] },
    'tech hub': { lat: 9.2185, lon: 12.4910, names: ['tech hub', 'it center', 'digital center'] },

    // Additional Neighborhoods
    'buba area': { lat: 9.2220, lon: 12.4920, names: ['buba area', 'buba', 'buba neighborhood'] },
    'siti area': { lat: 9.2105, lon: 12.4920, names: ['siti area', 'siti', 'siti neighborhood'] },
    'yantama area': { lat: 9.2160, lon: 12.4750, names: ['yantama area', 'yantama', 'yantama community'] },
    'ribadu area': { lat: 9.2240, lon: 12.4880, names: ['ribadu area', 'ribadu', 'ribadu neighborhood'] },
    'ngurore area': { lat: 9.2195, lon: 12.4810, names: ['ngurore area', 'ngurore', 'ngurore community'] },
    'chiroma street': { lat: 9.2160, lon: 12.4895, names: ['chiroma street', 'chiroma road', 'chiroma way', 'chiroma area'] },

    // Yola Environs & Surrounding Areas (recently added)
    'damare': { lat: 9.1520, lon: 12.5980, names: ['damare', 'damare town', 'damare village', 'damare area'] },
    'modire': { lat: 9.1750, lon: 12.6120, names: ['modire', 'modire town', 'modire village', 'modire area'] },
    'nasarawo': { lat: 9.1880, lon: 12.5680, names: ['nasarawo', 'nasarawa', 'nasarawo town', 'nasarawo area'] },
    'karewa': { lat: 9.2445, lon: 12.4498, names: ['karewa', 'karewa ward', 'karewa village', 'karewa area'] },
    'alkali joda': { lat: 9.2290, lon: 12.4650, names: ['alkali joda', 'alkali joda road', 'alkali joda area'] },
    'abuja road': { lat: 9.1820, lon: 12.5315, names: ['abuja road', 'abuja way', 'abuja street', 'road to abuja'] },
    'bekaji': { lat: 9.2100, lon: 12.5450, names: ['bekaji', 'bekaji ward', 'bekaji village', 'bekaji area'] },
    'luggere': { lat: 9.2350, lon: 12.5200, names: ['luggere', 'luggere ward', 'luggere village', 'luggere area'] },
    'mubi road': { lat: 9.2100, lon: 12.4500, names: ['mubi road', 'mubi way', 'road to mubi', 'mubi highway'] },
    'gombe road': { lat: 9.2200, lon: 12.5500, names: ['gombe road', 'gombe way', 'road to gombe', 'gombe highway'] },
    'adamawa state university gate': { lat: 9.2350, lon: 12.5050, names: ['asu gate', 'university gate', 'adamawa state university gate', 'campus gate'] },
    'federal polytechnic gate': { lat: 9.2250, lon: 12.5100, names: ['poly gate', 'polytechnic gate', 'federal polytechnic gate'] },
    'jummai market': { lat: 9.2280, lon: 12.5020, names: ['jummai market', 'jummai', 'jummai area'] },
    'sunrise market': { lat: 9.2150, lon: 12.4750, names: ['sunrise market', 'sunrise', 'sunrise shopping area'] },
    'mayo-belwa road': { lat: 9.1950, lon: 12.6100, names: ['mayo-belwa road', 'mayo belwa', 'mayo-belwa way'] },
    'toungo road': { lat: 9.1650, lon: 12.5850, names: ['toungo road', 'toungo way', 'road to toungo'] },
    'song road': { lat: 9.2300, lon: 12.3850, names: ['song road', 'song way', 'road to song'] },
    'chikaji': { lat: 9.2180, lon: 12.5450, names: ['chikaji', 'chikaji area', 'chikaji ward', 'chikaji district'] },
    'ramat': { lat: 9.2095, lon: 12.4750, names: ['ramat', 'ramat area', 'ramat ward'] },
    'michika': { lat: 9.3200, lon: 12.3900, names: ['michika', 'michika town', 'michika road', 'michika way'] },
    'garey': { lat: 9.1900, lon: 12.6300, names: ['garey', 'garey town', 'garey area', 'garey ward'] },
    'demsa': { lat: 9.1200, lon: 12.7500, names: ['demsa', 'demsa town', 'demsa area', 'demsa lga'] },
    'shelleng': { lat: 9.0800, lon: 12.5800, names: ['shelleng', 'shelleng town', 'shelleng area'] },
    'lagdo': { lat: 8.9500, lon: 12.5000, names: ['lagdo', 'lagdo town', 'lagdo dam', 'lagdo area'] },
    'chiroma street': { lat: 9.2165, lon: 12.4880, names: ['chiroma street', 'chiroma road', 'chiroma way', 'chiroma area'] }
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

  // Check known Yola locations (all places from YOLA_COORDS)
  const yolaLocations = [
    // Core Districts
    'yola north', 'yola south', 'jimeta', 'girei', 'mubi', 'numan', 'garoua', 'lamido', 'jabbama',
    // Transportation
    'airport', 'motor park', 'jambutu motor park', 'bridge', 'flyover',
    // Markets & Commercial
    'market', 'jimeta market', 'kasuwan gida', 'shopping center', 'main street',
    // Government & Administrative
    'government house', 'secretariat', 'state assembly', 'palace', 'court',
    // Religious Sites
    'mosque', 'central mosque', 'church',
    // Healthcare
    'hospital', 'clinic', 'federal medical center', 'fmc', 'specialists clinic',
    // Education
    'university', 'asu', 'campus', 'polytechnic', 'school', 'government secondary school', 'gss', 'nursery school',
    // Sports & Recreation
    'stadium', 'sports center', 'zoo', 'wetlands', 'gorilla', 'wildlife park',
    // Banking & Finance
    'bank', 'gtb', 'zenith bank', 'first bank', 'access bank',
    // Entertainment & Dining
    'cinema', 'restaurant', 'hotel', 'guest house',
    // Landmarks
    'roundabout', 'junction', 'garden', 'public park',
    // Water & Services
    'water station', 'electricity office', 'post office',
    // Street Names & Areas
    'saminu road', 'muhammadu buhari way', 'murtala avenue', 'adekunle fajuyi road', 'adama street',
    // Industry
    'industrial area', 'business district', 'tech hub',
    // Neighborhoods
    'buba area', 'siti area', 'yantama area', 'ribadu area', 'ngurore area',
    // Yola Environs & Surrounding Areas (recently added for better coverage)
    'damare', 'modire', 'nasarawo', 'karewa', 'alkali joda', 'abuja road', 'bekaji', 'luggere',
    'mubi road', 'gombe road', 'asu gate', 'university gate', 'poly gate', 'polytechnic gate',
    'jummai market', 'sunrise market', 'mayo-belwa road', 'mayo belwa', 'toungo road', 'song road',
    'chikaji', 'ramat', 'michika', 'garey', 'demsa', 'shelleng', 'lagdo', 'chiroma street'
  ];

  return yolaLocations.some(loc => lower.includes(loc) || loc.includes(lower));
}

// Enhanced multi-service geocoding with automatic fallbacks
// Services in priority order: Nominatim (OpenStreetMap) → LocationIQ (if API key) → Mapbox (if API key)
async function geocodeWithMultipleServices(place) {
  try {
    // Try OpenStreetMap Nominatim first (free, no API key needed)
    console.log(`🌍 Geocoding "${place}" - Trying OpenStreetMap Nominatim...`);
    const osmResult = await geocodeWithNominatim(place);
    if (osmResult) {
      console.log(`✅ Geocoded with OpenStreetMap: ${place}`, osmResult);
      return osmResult;
    }

    // Try LocationIQ if API key is available (free tier available)
    const locationIqKey = window.LOCATIONIQ_API_KEY || localStorage.getItem('LOCATIONIQ_API_KEY');
    if (locationIqKey) {
      console.log(`🌍 Trying LocationIQ with API key...`);
      const locationIqResult = await geocodeWithLocationIQ(place, locationIqKey);
      if (locationIqResult) {
        console.log(`✅ Geocoded with LocationIQ: ${place}`, locationIqResult);
        return locationIqResult;
      }
    }

    // Try Mapbox if API key is available
    const mapboxKey = window.MAPBOX_API_KEY || localStorage.getItem('MAPBOX_API_KEY');
    if (mapboxKey) {
      console.log(`🌍 Trying Mapbox with API key...`);
      const mapboxResult = await geocodeWithMapbox(place, mapboxKey);
      if (mapboxResult) {
        console.log(`✅ Geocoded with Mapbox: ${place}`, mapboxResult);
        return mapboxResult;
      }
    }

    console.warn(`⚠️ Could not geocode "${place}" with any service`);
    return null;
  } catch (err) {
    console.error('❌ Multi-service geocoding error:', err);
    return null;
  }
}

// OpenStreetMap Nominatim (FREE - No API key required)
async function geocodeWithNominatim(place) {
  try {
    const query = encodeURIComponent(`${place}, Yola, Adamawa, Nigeria`);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1&countrycodes=ng`;
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      timeout: 5000
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (data && data.length > 0) {
      const result = data[0];
      return { lat: parseFloat(result.lat), lon: parseFloat(result.lon), service: 'nominatim' };
    }
  } catch (err) {
    console.warn('Nominatim geocoding failed:', err.message);
  }
  return null;
}

// LocationIQ Geocoding (FREE tier available, optional API key for better performance)
async function geocodeWithLocationIQ(place, apiKey) {
  try {
    if (!apiKey) return null;
    const query = encodeURIComponent(`${place}, Yola, Nigeria`);
    const url = `https://us1.locationiq.com/v1/search?key=${apiKey}&q=${query}&format=json&limit=1&countrycodes=ng`;
    const response = await fetch(url, { timeout: 5000 });
    if (!response.ok) return null;
    const data = await response.json();
    if (data && data.length > 0) {
      const result = data[0];
      return { lat: parseFloat(result.lat), lon: parseFloat(result.lon), service: 'locationiq' };
    }
  } catch (err) {
    console.warn('LocationIQ geocoding failed:', err.message);
  }
  return null;
}

// Mapbox Geocoding (requires API key, but high accuracy and fast)
async function geocodeWithMapbox(place, apiKey) {
  try {
    if (!apiKey) return null;
    const query = encodeURIComponent(`${place}, Yola, Nigeria`);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${apiKey}&country=NG&limit=1`;
    const response = await fetch(url, { timeout: 5000 });
    if (!response.ok) return null;
    const data = await response.json();
    if (data && data.features && data.features.length > 0) {
      const coords = data.features[0].geometry.coordinates;
      return { lat: coords[1], lon: coords[0], service: 'mapbox' };
    }
  } catch (err) {
    console.warn('Mapbox geocoding failed:', err.message);
  }
  return null;
}

// Legacy OSM function for backward compatibility
async function geocodeWithOSM(place) {
  return geocodeWithNominatim(place);
}

// Primary geocoding function (uses multi-service approach)
window.geocodePlace = geocodeWithMultipleServices;

// Make functions globally available for tomtomMap.js
window.geocodeWithOSM = geocodeWithOSM;
window.geocodeWithNominatim = geocodeWithNominatim;
window.geocodeWithMultipleServices = geocodeWithMultipleServices;

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

// NEW: Detect places in user message (one or more) - detects ALL place names intelligently
function detectPlaces(text) {
  const yolaWards = window.YOLA_COORDS && window.YOLA_COORDS.places ? window.YOLA_COORDS.places : {};
  const lowerText = text.toLowerCase();
  const foundPlaces = new Set();

  // 1. Extract ALL capitalized phrases FIRST (multi-word takes priority)
  // This ensures places like "Lamido Palace" are treated as one place, not split into "Lamido" + "Palace"
  const capitalized = text.match(/\b(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*|[A-Z]+(?:\s+[A-Z]+)*)(?:\s+(?:Ward|LGA|Community))?/g) || [];
  const multiWordPhrases = new Set();
  
  // Process matched phrases
  for (const phrase of capitalized) {
    // Split by "TO" or "to" to handle "KAREWA TO DAMARE" as two separate places
    const places = phrase.split(/\s+(?:TO|to)\s+/);
    for (const place of places) {
      const cleaned = place.replace(/\s+(?:Ward|LGA|Community)$/, '').trim();
      if (cleaned.length > 0) {
        const lowerPlace = cleaned.toLowerCase();
        foundPlaces.add(lowerPlace);
        // Track multi-word phrases to avoid adding their components
        if (cleaned.includes(' ')) {
          multiWordPhrases.add(lowerPlace);
        }
      }
    }
  }

  // 2. Match against YOLA_COORDS names (high confidence) - but skip components of multi-word phrases
  for (const [wardName, wardData] of Object.entries(yolaWards)) {
    for (const name of wardData.names) {
      if (lowerText.includes(name)) {
        const lowerName = name.toLowerCase();
        // Only add if not a component of a multi-word phrase we already found
        let isComponent = false;
        for (const phrase of multiWordPhrases) {
          if (phrase.includes(lowerName) && lowerName !== phrase) {
            isComponent = true;
            break;
          }
        }
        if (!isComponent) {
          foundPlaces.add(wardName);
        }
        break;
      }
    }
  }

  // 3. Match hardcoded common locations - but skip components of multi-word phrases
  const allLocations = [
    'yola north', 'yola south', 'jimeta', 'girei', 'mubi', 'numan', 'garoua', 'lamido', 'jabbama',
    'airport', 'market', 'zoo', 'wetlands', 'gorilla', 'palace', 'mosque',
    'government house', 'motor park', 'bank', 'hospital', 'clinic', 'school',
    'university', 'stadium', 'court', 'cinema', 'bridge', 'flyover', 'roundabout', 'junction'
  ];

  for (const loc of allLocations) {
    if (lowerText.includes(loc)) {
      // Skip if this is a component of a multi-word phrase already found
      let isComponent = false;
      for (const phrase of multiWordPhrases) {
        if (phrase.includes(loc) && loc !== phrase) {
          isComponent = true;
          break;
        }
      }
      if (!isComponent && resolveYolaPlace(loc)) {
        foundPlaces.add(loc);
      }
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
    let geocodedPlaces = [...yolaPlaces]; // Start with Yola places

    // Attempt to geocode non-Yola places
    if (nonYolaPlaces.length > 0) {
      console.log('🔍 Attempting to geocode non-Yola places:', nonYolaPlaces);
      for (const place of nonYolaPlaces) {
        try {
          const coords = await window.geocodeWithMultipleServices(place);
          if (coords) {
            console.log(`✅ Successfully geocoded "${place}":`, coords);
            geocodedPlaces.push(place);
          } else {
            console.log(`❌ Failed to geocode "${place}"`);
          }
        } catch (err) {
          console.warn(`⚠️ Geocoding error for "${place}":`, err.message);
        }
      }
    }

    // Use geocodedPlaces for routing (mix of Yola and geocoded places)
    // Use ONLY the first 2 unique places to avoid routing to duplicates
    const uniquePlaces = [...new Set(geocodedPlaces)];
    if (uniquePlaces.length >= 2) {
      console.log('🎯 Two or more places available (Yola + geocoded):', uniquePlaces);
      await switchToTomTomMap();
      const route = await window.drawTomTomRoute(uniquePlaces[0], uniquePlaces[1]);
      if (route && typeof route.distance !== 'undefined' && typeof route.time !== 'undefined') {
        routeDrawn = true;
        const mapInstruction = `\n\n📍 **Route Details (TomTom):**\n- **Distance:** ${route.distance.toFixed ? route.distance.toFixed(1) : route.distance} km\n- **Estimated Travel Time:** ${Math.round(route.time)} minutes\n\n👇 **Scroll down to see the map with the route drawn between ${uniquePlaces[0]} and ${uniquePlaces[1]}**`;
        finalAnswer += mapInstruction;
        console.log('✅ TomTom route metrics added to response');
      } else {
        console.log('⚠️ TomTom route unavailable; not adding distance/time details from Gemini.');
        finalAnswer += '\n\n⚠️ TomTom routing unavailable right now; no distance/time details can be shown.';
      }
    } else if (geocodedPlaces.length === 1) {
      console.log('📍 Single place detected:', geocodedPlaces[0]);
      await switchToGoogleMaps();
      await window.centerGoogleMapsOnLocation(geocodedPlaces[0]);
      const mapInstruction = `\n\n📍 **Location Details:**\nI've centered the map on **${geocodedPlaces[0]}**. Scroll down to see the location and its details on the map.`;
      finalAnswer += mapInstruction;
      console.log('✅ Google Maps centered on location');
    } else if (geocodedPlaces.length === 0) {
      console.log('ℹ No specific places detected or geocoded in message');
      // Keep current map (default to Google Maps)
    }

    if (nonYolaPlaces.length > 0 && geocodedPlaces.length < allPlaces.length) {
      const failedPlaces = nonYolaPlaces.filter(p => !geocodedPlaces.includes(p));
      if (failedPlaces.length > 0) {
        const failedText = failedPlaces.map(p => `"${p}"`).join(', ');
        finalAnswer += `\n\n⚠️ Could not locate ${failedText}. These places were not found in the Yola database or through geocoding services. Try using different place names.`;
        console.log('⚠️ Failed to geocode places:', failedPlaces);
      }
    }

    if (geocodedPlaces.length > 0 && geocodedPlaces.length < 2) {
      finalAnswer += '\n\n⚠️ Route drawing requires at least two places. Provide a second location to view route guidance.';
      console.log('⚠️ Not enough places for route drawing (need 2, got ' + geocodedPlaces.length + ')');
    }

    if (geocodedPlaces.length >= 2 && !routeDrawn) {
      finalAnswer += '\n\n⚠️ No route could be drawn for the detected places, either due to map service issue or mismatch in geocoding. Please rephrase or try again later.';
      console.log('⚠️ Route not drawn despite two places being available');
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