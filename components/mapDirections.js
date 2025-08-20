// Map directions handling
(function(global) {
    let directionsService = null;
    let directionsRenderer = null;

    global.initMapDirections = function() {
        if (!window.google || !window.google.maps) {
            console.error('Google Maps not loaded, retrying in 1 second...');
            setTimeout(global.initMapDirections, 1000);
            return;
        }
        
        try {
            window.directionsService = new google.maps.DirectionsService();
            window.directionsRenderer = new google.maps.DirectionsRenderer({
                map: window.map,
                panel: document.querySelector('.route-info')
            });
            console.log('Map directions initialized successfully');
        } catch (error) {
            console.error('Error initializing directions:', error);
            setTimeout(global.initMapDirections, 1000); // Retry on error
        }
    };

    // Function to draw route between two points
    global.drawRoute = async function(origin, destination) {
    if (!window.map || !window.directionsService || !window.directionsRenderer) {
        console.error("Map services not initialized");
        throw new Error("Navigation services are not ready yet. Please try again in a moment.");
    }
    
    try {
        // Add "Yola" to searches if not present
        if (!origin.toLowerCase().includes('yola')) origin += ' Yola, Nigeria';
        if (!destination.toLowerCase().includes('yola')) destination += ' Yola, Nigeria';

        const request = {
            origin: origin,
            destination: destination,
            travelMode: google.maps.TravelMode.DRIVING,
            region: 'NG' // Set region to Nigeria for better results
        };

        // Create a timeout promise
        const timeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timed out')), 20000));

        // Create the directions promise
        const directionsPromise = new Promise((resolve, reject) => {
            window.directionsService.route(request, (result, status) => {
                if (status === 'OK') {
                    resolve(result);
                } else {
                    reject(new Error(`Directions request failed: ${status}`));
                }
            });
        });

        // Race between the timeout and the directions request
        const result = await Promise.race([directionsPromise, timeout]);
        
        // Clear any previous routes
        window.directionsRenderer.setMap(null);
        window.directionsRenderer.setMap(window.map);
        
        // Set the new directions
        window.directionsRenderer.setDirections(result);
        
        // Center the map on the route
        const bounds = new google.maps.LatLngBounds();
        const route = result.routes[0];
        route.legs.forEach((leg) => {
            leg.steps.forEach((step) => {
                bounds.extend(step.start_location);
                bounds.extend(step.end_location);
            });
        });
        window.map.fitBounds(bounds);

        // Update route info panel
        const routeInfo = document.querySelector('.route-info');
        if (routeInfo) {
            let duration = route.legs[0].duration.text;
            let distance = route.legs[0].distance.text;
            routeInfo.innerHTML = `
                <div class="route-summary">
                    <h4>Route Information</h4>
                    <p><strong>From:</strong> ${origin}</p>
                    <p><strong>To:</strong> ${destination}</p>
                    <p><strong>Distance:</strong> ${distance}</p>
                    <p><strong>Estimated time:</strong> ${duration}</p>
                </div>
                <div class="route-steps">
                    <h4>Step by Step Directions</h4>
                    ${route.legs[0].steps.map(step => `
                        <div class="route-step">
                            <span class="step-icon">➜</span>
                            <span class="step-text">${step.instructions}</span>
                            <span class="step-distance">(${step.distance.text})</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        return true;
    } catch (error) {
        console.error("Routing failed:", error);
        
        // Try to show approximate route with markers if directions fail
        try {
            // Clear any previous routes/markers
            window.directionsRenderer.setMap(null);
            
            // Create geocoder if needed
            const geocoder = new google.maps.Geocoder();
            
            // Geocode both locations
            const [originResult, destResult] = await Promise.all([
                new Promise((resolve) => geocoder.geocode({
                    address: origin,
                    region: 'NG'
                }, (results, status) => resolve(status === 'OK' ? results[0].geometry.location : null))),
                new Promise((resolve) => geocoder.geocode({
                    address: destination,
                    region: 'NG'
                }, (results, status) => resolve(status === 'OK' ? results[0].geometry.location : null)))
            ]);

            if (originResult && destResult) {
                // Remove existing markers
                if (window.markers) {
                    window.markers.forEach(marker => marker.setMap(null));
                }
                window.markers = [];
                
                // Create new markers
                const startMarker = new google.maps.Marker({
                    position: originResult,
                    map: window.map,
                    title: 'Start',
                    label: 'A'
                });
                window.markers.push(startMarker);
                
                const endMarker = new google.maps.Marker({
                    position: destResult,
                    map: window.map,
                    title: 'End',
                    label: 'B'
                });
                window.markers.push(endMarker);

                // Draw a straight line between points
                const line = new google.maps.Polyline({
                    path: [originResult, destResult],
                    geodesic: true,
                    strokeColor: '#FF0000',
                    strokeOpacity: 0.5,
                    strokeWeight: 2,
                    map: window.map
                });
                window.markers.push(line);

                // Fit bounds to show both points
                const bounds = new google.maps.LatLngBounds();
                bounds.extend(originResult);
                bounds.extend(destResult);
                window.map.fitBounds(bounds);

                // Calculate approximate straight-line distance
                const distance = google.maps.geometry.spherical.computeDistanceBetween(originResult, destResult);
                const distanceKm = (distance / 1000).toFixed(1);
                
                // Show approximate info
                const routeInfo = document.querySelector('.route-info');
                if (routeInfo) {
                    routeInfo.innerHTML = `
                        <div class="route-summary">
                            <h4>Approximate Route Information</h4>
                            <p><strong>From:</strong> ${origin}</p>
                            <p><strong>To:</strong> ${destination}</p>
                            <p><strong>Direct distance:</strong> ${distanceKm} km</p>
                            <p><em>Note: This is an approximate straight-line distance. Actual driving distance may be longer.</em></p>
                        </div>
                    `;
                }
                
                return true;
            }
        } catch (fallbackError) {
            console.error("Fallback routing failed:", fallbackError);
        }
        
        throw new Error("Could not calculate route. Please check the locations and try again.");
    }
    };

    // Initialize map directions when the script loads
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(global.initMapDirections, 1000);
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(global.initMapDirections, 1000);
        });
    }
})(window);
