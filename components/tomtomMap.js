// TomTom Maps integration using Leaflet for map display, route drawing, and distance calculation
// This uses Leaflet with TomTom tiles to avoid CORS and SDK issues
// Usage: Include Leaflet script in HTML: <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
// <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

(function(global) {
    let map = null;
    let routeLayer = null;
    let markers = []; // general markers (Yola places + origin/dest)
    let poiMarkers = []; // dynamic POI markers from TomTom

    // Allow external callers to clear map state (remove routes/markers and destroy the map)
    global.clearTomTomMap = async function() {
        try {
            if (routeLayer && map && map.removeLayer) {
                try { map.removeLayer(routeLayer); } catch(e){}
                routeLayer = null;
            }
            if (markers && markers.length && map && map.removeLayer) {
                markers.forEach(m => { try { map.removeLayer(m); } catch(e){} });
            }
            markers = [];
            if (poiMarkers && poiMarkers.length && map && map.removeLayer) {
                poiMarkers.forEach(m => { try { map.removeLayer(m); } catch(e){} });
            }
            poiMarkers = [];
            if (map && map.remove) {
                try { map.remove(); } catch(e) { console.warn('map.remove failed', e); }
            }
            map = null;
            // Clear the DOM init flag if present so map can be reinitialized
            const tomtomDiv = document.getElementById('tomtom-map');
            if (tomtomDiv && tomtomDiv._tomtomInit) tomtomDiv._tomtomInit = false;
            console.log('✓ TomTom map cleared');
            return true;
        } catch (err) {
            console.error('❌ clearTomTomMap error', err);
            return false;
        }
    };

    // Add markers for all places defined in window.YOLA_COORDS.places
    global.showYolaPlacesMarkers = function() {
        try {
            if (!map) return false;
            // remove previous markers
            if (markers && markers.length) {
                markers.forEach(m => { try { map.removeLayer(m); } catch(e){} });
            }
            markers = [];

            const places = window.YOLA_COORDS && window.YOLA_COORDS.places ? window.YOLA_COORDS.places : {};
            for (const [key, data] of Object.entries(places)) {
                if (!data || typeof data.lat !== 'number' || typeof data.lon !== 'number') continue;
                try {
                    const m = L.marker([data.lat, data.lon], { title: key });
                    m.addTo(map);
                    // Show a permanent label when zoomed in, otherwise show on hover
                    const permanentLabel = (map && typeof map.getZoom === 'function' && map.getZoom() >= 15);
                    m.bindTooltip(`<strong>${key}</strong>`, { permanent: permanentLabel, direction: 'right', className: 'yola-label' });
                    // Also keep a popup with more info
                    m.bindPopup(`<strong>${key}</strong><br/>${(data.names && data.names[0]) || ''}`);
                    markers.push(m);
                } catch (e) {
                    console.warn('Failed to add marker for', key, e);
                }
            }
            // Toggle permanent tooltips on zoom change for readability
            try {
                map.off('zoomend', map._yolaTooltipHandler);
            } catch(e){}
            map._yolaTooltipHandler = function() {
                const showPermanent = map.getZoom() >= 15;
                markers.forEach(m => {
                    try {
                        const tt = m.getTooltip();
                        if (tt) tt.options.permanent = showPermanent;
                        if (showPermanent) m.openTooltip(); else m.closeTooltip();
                    } catch(e){}
                });
            };
            map.on('zoomend', map._yolaTooltipHandler);
            return true;
        } catch (err) {
            console.error('showYolaPlacesMarkers error', err);
            return false;
        }
    };

    // Clear POI markers
    function clearPOIMarkers() {
        if (!poiMarkers || poiMarkers.length === 0) return;
        poiMarkers.forEach(m => { try { map.removeLayer(m); } catch(e){} });
        poiMarkers = [];
    }

    // Debounce helper
    function debounce(fn, wait) {
        let t = null;
        return function(...args) {
            if (t) clearTimeout(t);
            t = setTimeout(() => { t = null; fn.apply(this, args); }, wait);
        };
    }

    // Fetch nearby POIs from TomTom and add markers with names
    global.showNearbyPOIs = async function(radiusMeters = 2000, limit = 30) {
        try {
            if (!map) return false;
            const center = map.getCenter();
            const apiKey = window.NAVI_MAP_API_KEY || window.TOMTOM_API_KEY;
            if (!apiKey) return false;

            // Clear existing POI markers
            clearPOIMarkers();

            const url = `https://api.tomtom.com/search/2/nearbySearch/${center.lat},${center.lng}.json?key=${apiKey}&radius=${radiusMeters}&limit=${limit}`;
            const res = await fetch(url);
            if (!res.ok) return false;
            const data = await res.json();
            if (!data.results || data.results.length === 0) return false;

            for (const r of data.results) {
                try {
                    const pos = r.position || r.poi && r.poi.position;
                    const name = (r.poi && r.poi.name) || r.address && r.address.freeformAddress || r.address && r.address.municipality || r.type || 'Place';
                    if (!pos || typeof pos.lat !== 'number' || typeof pos.lon !== 'number') continue;
                    const m = L.marker([pos.lat, pos.lon], { title: name });
                    m.addTo(map);
                    // Show tooltip on hover; if zoomed in, show permanent small label
                    const permanentPOI = map && map.getZoom && map.getZoom() >= 16;
                    m.bindTooltip(`${name}`, { permanent: !!permanentPOI, direction: 'top', className: 'poi-label' });
                    m.bindPopup(`<strong>${name}</strong><br/>${r.poi && r.poi.categorySet ? r.poi.categorySet.join(', ') : ''}`);
                    poiMarkers.push(m);
                } catch (e) { /* ignore individual POI errors */ }
            }
            return true;
        } catch (err) {
            console.error('showNearbyPOIs error', err);
            return false;
        }
    };

    global.initTomTomMap = function(containerId, center = [9.2035, 12.4885], zoom = 13, tileType = 'streets') {
        // Get the API key dynamically from window (will be set later by naviinfo.js)
        const apiKey = window.TOMTOM_API_KEY || window.NAVI_MAP_API_KEY || 'HnVUaWiRst64AFqBqoeUgmgq28nCaqND';

        if (!L || !L.map) {
            console.error('Leaflet not loaded. Please include Leaflet script.');
            return null;
        }

        // Initialize Leaflet map (remove existing map if present)
        if (map && map.remove) {
            try { map.remove(); } catch (e) { /* ignore */ }
            map = null;
        }
        map = L.map(containerId, {preferCanvas: true}).setView(center, zoom);

        // Prepare base layers and overlays (satellite + streets + labels overlay)
        const streets = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors', maxZoom: 19, crossOrigin: 'anonymous' });
        const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: 'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community', maxZoom: 19 });

        // Labels overlay (using OSM tiles as a lightweight label/streets overlay)
        const labelsOverlay = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '', maxZoom: 19, opacity: 0.75 });

        // Default to satellite mode as before, without layer controls
        satellite.addTo(map);
        // Do not add labels overlay to avoid obscuring the route

        // Add zoom control
        L.control.zoom({ position: 'topright' }).addTo(map);

        // Add scale control
        L.control.scale().addTo(map);


        // Add a marker at the center
        L.marker(center).addTo(map).bindPopup('Yola, Adamawa State');

        // Show markers for all known Yola places (makes map look like ordinary map)
        if (typeof global.showYolaPlacesMarkers === 'function') {
            try { global.showYolaPlacesMarkers(); } catch (e) { console.warn('showYolaPlacesMarkers failed', e); }
        }

        // Inject simple styles for labels if not present
        try {
            if (!document.getElementById('tomtom-map-label-styles')) {
                const s = document.createElement('style');
                s.id = 'tomtom-map-label-styles';
                s.innerHTML = `
                .yola-label { background: rgba(255,255,255,0.9); padding: 2px 6px; border-radius: 3px; font-size: 13px; color: #222; box-shadow: 0 1px 2px rgba(0,0,0,0.2); }
                .poi-label { background: rgba(255,255,255,0.95); padding: 1px 5px; border-radius: 3px; font-size: 12px; color: #222; box-shadow: 0 1px 2px rgba(0,0,0,0.12); }
                `;
                document.head.appendChild(s);
            }
        } catch (e) { /* ignore */ }

        // Fetch and show nearby POIs (TomTom) and refresh on moveend
        try {
            if (typeof global.showNearbyPOIs === 'function') {
                // Initial load
                global.showNearbyPOIs();
                // Debounced refresh on pan/zoom
                map.on('moveend', debounce(() => { try { global.showNearbyPOIs(); } catch(e){} }, 900));
            }
        } catch (e) { console.warn('POI initialization failed', e); }

        console.log('✓ TomTom map (Leaflet) initialized with center:', center);
        return map;
    };

    global.drawTomTomRoute = async function(origin, destination) {
        const apiKey = window.TOMTOM_API_KEY || window.NAVI_MAP_API_KEY || 'HnVUaWiRst64AFqBqoeUgmgq28nCaqND';

        if (!map) {
            console.error('Map not initialized.');
            return null;
        }

        // Remove previous route
        if (routeLayer) {
            map.removeLayer(routeLayer);
        }
        markers.forEach(m => map.removeLayer(m));
        markers = [];

        try {
            // Attempt to resolve origin/destination from local YOLA database first
            let originCoords = null;
            let destCoords = null;

            try {
                if (typeof origin === 'object' && origin.lat) {
                    originCoords = { lat: origin.lat, lon: origin.lon || origin.lng || origin.longitude };
                } else if (typeof window.resolveYolaPlace === 'function') {
                    const o = window.resolveYolaPlace(origin);
                    if (o) originCoords = { lat: o.lat, lon: o.lon };
                }
            } catch (e) {
                originCoords = null;
            }

            try {
                if (typeof destination === 'object' && destination.lat) {
                    destCoords = { lat: destination.lat, lon: destination.lon || destination.lng || destination.longitude };
                } else if (typeof window.resolveYolaPlace === 'function') {
                    const d = window.resolveYolaPlace(destination);
                    if (d) destCoords = { lat: d.lat, lon: d.lon };
                }
            } catch (e) {
                destCoords = null;
            }

            // If local resolution failed for either endpoint, fall back to TomTom search
            if (!originCoords) originCoords = await searchLocation(origin, apiKey);
            if (!destCoords) destCoords = await searchLocation(destination, apiKey);

            if (!originCoords || !destCoords) {
                console.error('Could not find coordinates for origin or destination.');
                return null;
            }

            // Add markers
            const originMarker = L.marker([originCoords.lat, originCoords.lon]).addTo(map).bindPopup(typeof origin === 'string' ? origin : (origin.name || 'Origin'));
            const destMarker = L.marker([destCoords.lat, destCoords.lon]).addTo(map).bindPopup(typeof destination === 'string' ? destination : (destination.name || 'Destination'));
            markers.push(originMarker, destMarker);

            // Calculate route using TomTom Routing API
            const routeUrl = `https://api.tomtom.com/routing/1/calculateRoute/${originCoords.lat},${originCoords.lon}:${destCoords.lat},${destCoords.lon}/json?key=${apiKey}&routeType=fastest&traffic=true&computeTravelTimeFor=all`;
            const response = await fetch(routeUrl);
            const data = await response.json();

            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                const points = route.legs[0].points.map(p => [p.latitude, p.longitude]);
                // Ensure any previous route layer is removed
                if (routeLayer && map && map.removeLayer) try { map.removeLayer(routeLayer); } catch (e) {}
                routeLayer = L.polyline(points, { color: 'blue', weight: 6, opacity: 1.0 }).addTo(map);

                // Invalidate size to avoid rendering issues when container was hidden
                try { map.invalidateSize(); } catch(e) {}

                // Fit bounds with padding; do it after a short timeout to ensure tile layer rendered
                try {
                    setTimeout(() => {
                        try {
                            map.fitBounds(routeLayer.getBounds(), { padding: [40, 40] });
                        } catch (e) { console.warn('fitBounds failed', e); }
                        try { map.invalidateSize(); } catch(e) {}
                    }, 120);
                } catch (e) {}

                const distance = route.summary.lengthInMeters / 1000; // km
                const time = route.summary.travelTimeInSeconds / 60; // minutes

                console.log(`Route calculated: ${distance} km, ${time} minutes`);
                // Also show all Yola place markers so map looks like an ordinary map
                if (typeof global.showYolaPlacesMarkers === 'function') {
                    try { global.showYolaPlacesMarkers(); } catch (e) { /* ignore */ }
                }

                return { distance, time };
            } else {
                console.error('No route found.');
                return null;
            }
        } catch (error) {
            console.error('Error drawing route:', error);
            return null;
        }
    };

    async function searchLocation(query, apiKey) {
        const url = `https://api.tomtom.com/search/2/search/${encodeURIComponent(query)}.json?key=${apiKey}&countrySet=NG&limit=1&typeahead=true`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data.results && data.results.length > 0) {
                return data.results[0].position;
            }
        } catch (error) {
            console.error('Error searching location:', error);
        }
        return null;
    }

    // Expose map globally
    global.getTomTomMap = function() {
        return map;
    };
})(window);
