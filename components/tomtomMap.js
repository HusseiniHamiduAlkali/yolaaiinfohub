// TomTom Maps integration using Leaflet for map display, route drawing, and distance calculation
// This uses Leaflet with TomTom tiles to avoid CORS and SDK issues
// Usage: Include Leaflet script in HTML: <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
// <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

(function(global) {
    let map = null;
    let routeLayer = null;
    let markers = [];

    global.initTomTomMap = function(containerId, center = [9.2035, 12.4885], zoom = 13) {
        // Get the API key dynamically from window (will be set later by naviinfo.js)
        const apiKey = window.TOMTOM_API_KEY || window.NAVI_MAP_API_KEY || 'HnVUaWiRst64AFqBqoeUgmgq28nCaqND';

        if (!L || !L.map) {
            console.error('Leaflet not loaded. Please include Leaflet script.');
            return null;
        }

        // Initialize Leaflet map
        map = L.map(containerId).setView(center, zoom);

        // Add TomTom satellite tiles with labels (hybrid)
        L.tileLayer(`https://api.tomtom.com/map/1/tile/hybrid/main/{z}/{x}/{y}.png?key=${apiKey}`, {
            attribution: '© TomTom',
            maxZoom: 20
        }).addTo(map);

        // Add zoom control
        L.control.zoom({ position: 'topright' }).addTo(map);

        // Add scale control
        L.control.scale().addTo(map);

        // Add a marker at the center
        L.marker(center).addTo(map).bindPopup('Yola, Adamawa State');

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
            // Get coordinates for origin and destination
            const originCoords = await searchLocation(origin, apiKey);
            const destCoords = await searchLocation(destination, apiKey);

            if (!originCoords || !destCoords) {
                console.error('Could not find coordinates for origin or destination.');
                return null;
            }

            // Add markers
            const originMarker = L.marker([originCoords.lat, originCoords.lon]).addTo(map).bindPopup(origin);
            const destMarker = L.marker([destCoords.lat, destCoords.lon]).addTo(map).bindPopup(destination);
            markers.push(originMarker, destMarker);

            // Calculate route using TomTom Routing API
            const routeUrl = `https://api.tomtom.com/routing/1/calculateRoute/${originCoords.lat},${originCoords.lon}:${destCoords.lat},${destCoords.lon}/json?key=${apiKey}&routeType=fastest&traffic=true&computeTravelTimeFor=all`;
            const response = await fetch(routeUrl);
            const data = await response.json();

            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                const points = route.legs[0].points.map(p => [p.latitude, p.longitude]);
                routeLayer = L.polyline(points, { color: 'blue', weight: 5 }).addTo(map);
                map.fitBounds(routeLayer.getBounds());

                const distance = route.summary.lengthInMeters / 1000; // km
                const time = route.summary.travelTimeInSeconds / 60; // minutes

                console.log(`Route calculated: ${distance} km, ${time} minutes`);
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
