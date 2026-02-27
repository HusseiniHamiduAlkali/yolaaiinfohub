// TomTom Maps integration for map display, route drawing, and distance calculation
// This script replaces Google Maps/Leaflet/OpenLayers with TomTom Maps
// Usage: Include this script in your HTML after loading the TomTom Maps SDK

// Example usage:
// <script src="https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/6.22.0/maps/maps-web.min.js"></script>
// <script src="components/tomtomMap.js"></script>

(function(global) {
    let map = null;
    let routeLayer = null;
    let markers = [];

    global.initTomTomMap = function(containerId, center = [12.4885, 9.2035], zoom = 13) {
        // Get the API key dynamically from window (will be set later by naviinfo.js)
        const apiKey = window.TOMTOM_API_KEY || window.NAVI_MAP_API_KEY || 'YOUR_TOMTOM_API_KEY';
        
        if (!tt || !tt.map) {
            console.error('TomTom Maps SDK not loaded.');
            return;
        }
        map = tt.map({
            key: apiKey,
            container: containerId,
            center: center,
            zoom: zoom
        });
        map.addControl(new tt.FullscreenControl());
        map.addControl(new tt.NavigationControl());
        console.log('✓ TomTom map initialized with center:', center);
        return map;
    };
        global.initTomTomMap = function(containerId, center = [12.4885, 9.2035], zoom = 13, opts = {}) {
            // Get the API key dynamically from window (will be set later by naviinfo.js)
            const apiKey = window.TOMTOM_API_KEY || window.NAVI_MAP_API_KEY || 'YOUR_TOMTOM_API_KEY';

            if (!tt || !tt.map) {
                console.error('TomTom Maps SDK not loaded.');
                return null;
            }

            // Use a stable TomTom vector style by default; satellite tiles are added as a raster overlay after load
            const styleUrl = opts.style || 'tomtom://vector/1/basic-main';

            const mapOptions = {
                key: apiKey,
                container: containerId,
                center: center,
                zoom: zoom,
                pitch: opts.pitch || 0,
                preserveDrawingBuffer: false
            };
            // Only set style if explicitly provided (avoid tomtom:// scheme requests by default)
            if (opts.style) mapOptions.style = opts.style;
            map = tt.map(mapOptions);

            map.addControl(new tt.FullscreenControl());
            map.addControl(new tt.NavigationControl());

            // Add a simple zoom-to-3D button (sets pitch) and pegman control
            const ThreeDControl = function() {};
            ThreeDControl.prototype.onAdd = function(mapInstance) {
                this._map = mapInstance;
                const btn = document.createElement('button');
                btn.className = 'tt-control-btn tt-3d-btn';
                btn.title = 'Toggle 3D Buildings';
                btn.innerHTML = '3D';
                btn.onclick = () => {
                    const current = this._map.getPitch();
                    this._map.easeTo({ pitch: current > 0 ? 0 : 60, duration: 600 });
                };
                const container = document.createElement('div');
                container.className = 'tt-control tt-3d-control';
                container.appendChild(btn);
                return container;
            };
            ThreeDControl.prototype.onRemove = function() {};

            // Pegman control: user clicks pegman, then clicks map to open Street View (Google) for that point
            const PegmanControl = function() { this.active = false; };
            PegmanControl.prototype.onAdd = function(mapInstance) {
                this._map = mapInstance;
                const btn = document.createElement('button');
                btn.className = 'tt-control-btn tt-pegman-btn';
                btn.title = 'Pegman (Street View)';
                btn.innerHTML = '🧍';

                const container = document.createElement('div');
                container.className = 'tt-control tt-pegman-control';
                container.appendChild(btn);

                btn.onclick = (e) => {
                    e.preventDefault();
                    this.active = !this.active;
                    btn.style.background = this.active ? '#3182ce' : '';
                    this._map.getCanvas().style.cursor = this.active ? 'crosshair' : '';
                    if (this.active) {
                        const clickHandler = async (ev) => {
                            const lngLat = ev.lngLat || (ev && ev.lngLat) || (ev && ev.point && this._map.unproject(ev.point));
                            if (!lngLat) return;
                            const lat = lngLat.lat || (lngLat.lat === 0 ? 0 : null);
                            const lon = lngLat.lng || (lngLat.lng === 0 ? 0 : null);
                            // Open Google Street View in a new tab at the clicked location
                            const url = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lon}`;
                            window.open(url, '_blank');
                            this.active = false;
                            btn.style.background = '';
                            this._map.getCanvas().style.cursor = '';
                            this._map.off('click', clickHandler);
                        };
                        this._map.on('click', clickHandler);
                    } else {
                        this._map.getCanvas().style.cursor = '';
                        this._map.off('click');
                    }
                };

                return container;
            };
            PegmanControl.prototype.onRemove = function() {};

            map.addControl(new ThreeDControl(), 'top-left');
            map.addControl(new PegmanControl(), 'top-left');

            // Satellite toggle control (hidden by default until user enables)
            const SatelliteToggleControl = function() { this.on = false; };
            SatelliteToggleControl.prototype.onAdd = function(mapInstance) {
                this._map = mapInstance;
                const btn = document.createElement('button');
                btn.className = 'tt-control-btn tt-sat-btn';
                btn.title = 'Toggle Satellite View';
                btn.innerHTML = '🛰️';
                const container = document.createElement('div');
                container.className = 'tt-control tt-sat-control';
                container.appendChild(btn);

                btn.onclick = async (e) => {
                    e.preventDefault();
                    // If satellite availability was previously determined and false, inform user
                    if (window.tomtomSatelliteAvailable === false) {
                        alert('Satellite tiles are unavailable for this API key or region.');
                        return;
                    }
                    // If satellite availability is unknown, rely on the flag set during load
                    const satLayer = this._map.getLayer('satellite-tiles-layer');
                    const labelsLayer = this._map.getLayer('labels-tiles-layer');

                    if (!satLayer || !labelsLayer) {
                        if (window.tomtomSatelliteAvailable) {
                            // Layers should be present (added on load); if not, warn
                            alert('Satellite layers pending; try again shortly.');
                        } else {
                            alert('Satellite tiles are unavailable for this API key or region.');
                        }
                        return;
                    }

                    // Toggle visibility
                    const vis = this._map.getLayoutProperty('satellite-tiles-layer', 'visibility') || 'none';
                    const next = vis === 'visible' ? 'none' : 'visible';
                    this._map.setLayoutProperty('satellite-tiles-layer', 'visibility', next);
                    this._map.setLayoutProperty('labels-tiles-layer', 'visibility', next);
                    btn.style.background = next === 'visible' ? '#3182ce' : '';
                };

                return container;
            };
            SatelliteToggleControl.prototype.onRemove = function() {};

            map.addControl(new SatelliteToggleControl(), 'top-left');

            // Add satellite and labels layers after the base style has finished loading
            // First test a sample satellite tile URL; if the provider returns an error
            // (e.g. HTTP 400), skip adding satellite tiles to avoid continual console errors.
            map.on('load', async () => {
                try {
                    // helper to convert lon/lat to tile x/y for a zoom
                    const lonLatToTile = (lon, lat, z) => {
                        const rad = lat * Math.PI / 180;
                        const n = Math.pow(2, z);
                        const x = Math.floor((lon + 180) / 360 * n);
                        const y = Math.floor((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2 * n);
                        return { x, y };
                    };
                    const testZ = Math.min(14, Math.max(10, Math.round(zoom || 13)));
                    const centerLon = (center && center[0]) || 12.4885;
                    const centerLat = (center && center[1]) || 9.2035;
                    const t = lonLatToTile(centerLon, centerLat, testZ);
                    const sampleUrl = `https://api.tomtom.com/map/1/tile/satellite/main/${testZ}/${t.x}/${t.y}.jpg?key=${apiKey}`;

                    let satelliteAvailable = false;
                    try {
                        const resp = await fetch(sampleUrl, { method: 'GET' });
                        satelliteAvailable = resp && resp.status === 200;
                    } catch (err) {
                        satelliteAvailable = false;
                    }

                    if (!satelliteAvailable) {
                        window.tomtomSatelliteAvailable = false;
                        console.warn('Satellite tiles unavailable for this API key or region; skipping satellite overlay.');
                        return;
                    }

                    // If satellite is available, add raster sources and layers
                    const tileTemplate = `https://api.tomtom.com/map/1/tile/satellite/main/{z}/{x}/{y}.jpg?key=${apiKey}`;
                    if (!map.getSource('satellite-tiles')) {
                        map.addSource('satellite-tiles', {
                            type: 'raster',
                            tiles: [tileTemplate],
                            tileSize: 256
                        });
                        map.addLayer({
                            id: 'satellite-tiles-layer',
                            type: 'raster',
                            source: 'satellite-tiles',
                            layout: { visibility: 'none' },
                            paint: { 'raster-opacity': 1 }
                        }, null);
                        const labelsTemplate = `https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key=${apiKey}`;
                        map.addSource('labels-tiles', {
                            type: 'raster',
                            tiles: [labelsTemplate],
                            tileSize: 256
                        });
                        map.addLayer({
                            id: 'labels-tiles-layer',
                            type: 'raster',
                            source: 'labels-tiles',
                            layout: { visibility: 'none' },
                            paint: { 'raster-opacity': 0.9 }
                        }, 'satellite-tiles-layer');
                    }
                    window.tomtomSatelliteAvailable = true;
                    // expose map globally so other modules can use it immediately
                    window.tomtomMap = map;
                    console.log('✓ Satellite and label layers added (on load)');
                } catch (e) {
                    console.warn('Could not add satellite tiles layer after load:', e);
                    window.tomtomSatelliteAvailable = false;
                }
            });

            // expose map globally so other modules can use it immediately
            window.tomtomMap = map;
            console.log('✓ TomTom map initialized with center:', center, 'style:', styleUrl);
            return map;
        };

    global.drawTomTomRoute = async function(origin, destination) {
        const apiKey = window.TOMTOM_API_KEY || window.NAVI_MAP_API_KEY || 'YOUR_TOMTOM_API_KEY';
        
        if (!map) {
            console.error('TomTom map not initialized.');
            return;
        }
        // Remove previous route
        if (routeLayer) {
            map.removeLayer(routeLayer);
            map.removeSource('route');
            routeLayer = null;
        }
        // Remove previous markers
        markers.forEach(m => m.remove());
        markers = [];

        // Geocode origin and destination
        const geocode = async (query) => {
            const url = `https://api.tomtom.com/search/2/geocode/${encodeURIComponent(query)}.JSON?key=${apiKey}`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.results && data.results[0]) {
                return data.results[0].position;
            }
            throw new Error('Location not found: ' + query);
        };
        let originPos, destPos;
        try {
            originPos = await geocode(origin);
            destPos = await geocode(destination);
        } catch (e) {
            alert(e.message);
            return;
        }
        // Add markers
        markers.push(new tt.Marker().setLngLat([originPos.lon, originPos.lat]).addTo(map));
        markers.push(new tt.Marker().setLngLat([destPos.lon, destPos.lat]).addTo(map));

        // Get route
        const routeUrl = `https://api.tomtom.com/routing/1/calculateRoute/${originPos.lat},${originPos.lon}:${destPos.lat},${destPos.lon}/json?key=${apiKey}&travelMode=car`;
        const routeRes = await fetch(routeUrl);
        const routeData = await routeRes.json();
        if (!routeData.routes || !routeData.routes[0]) {
            alert('No route found.');
            return;
        }
        const points = routeData.routes[0].legs[0].points.map(pt => [pt.longitude, pt.latitude]);
        // Draw route
        map.addSource('route', {
            type: 'geojson',
            data: {
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: points
                }
            }
        });
        routeLayer = 'route';
        map.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            paint: {
                'line-color': '#0076ff',
                'line-width': 5
            }
        });
        // Fit map to route
        const bounds = new tt.LngLatBounds();
        points.forEach(pt => bounds.extend(pt));
        map.fitBounds(bounds, { padding: 50 });

        // Show distance and duration
        const summary = routeData.routes[0].summary;
        const distanceKm = (summary.lengthInMeters / 1000).toFixed(2);
        const durationMin = Math.round(summary.travelTimeInSeconds / 60);
        const infoPanel = document.querySelector('.route-info');
        if (infoPanel) {
            infoPanel.innerHTML = `<div class="route-summary">
                <h4>Route Information</h4>
                <p><strong>From:</strong> ${origin}</p>
                <p><strong>To:</strong> ${destination}</p>
                <p><strong>Distance:</strong> ${distanceKm} km</p>
                <p><strong>Estimated time:</strong> ${durationMin} min</p>
            </div>`;
        }
    };
})(window);
