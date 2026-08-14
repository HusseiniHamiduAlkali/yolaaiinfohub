
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
    
    
      // Scroll reveal for service cards in the servi template
      if ('IntersectionObserver' in window) {
        const revealCards = document.querySelectorAll('.section4');
        let lastScrollY = window.scrollY || document.documentElement.scrollTop || 0;
        let scrollDirection = 'down';

        window.addEventListener('scroll', () => {
          const currentY = window.scrollY || document.documentElement.scrollTop || 0;
          if (currentY > lastScrollY) {
            scrollDirection = 'down';
          } else if (currentY < lastScrollY) {
            scrollDirection = 'up';
          }
          lastScrollY = currentY;
        }, { passive: true });

        if (revealCards.length) {
          const cardObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
              if (entry.isIntersecting) {
                entry.target.classList.remove('hiding');
                entry.target.classList.add('showing');
                if (scrollDirection === 'up') {
                  entry.target.classList.add('instant');
                  requestAnimationFrame(() => entry.target.classList.remove('instant'));
                }
              } else if (scrollDirection === 'down') {
                entry.target.classList.add('hiding');
                entry.target.classList.remove('showing');
              }
            });
          }, { threshold: 0.2 });
          revealCards.forEach(card => cardObserver.observe(card));
        }
      }

    
  }).catch(err => {
    console.error('Failed to load navi template:', err);
    document.getElementById('main-content').innerHTML = '<p>Failed to load content.</p>';
  });
}



/* ============================================================
   Yola AI Info Hub — Map explorer
   Pure JavaScript, Google Maps JavaScript API + Places (New)
   ============================================================ */

/* ------------------------------------------------------------
   1. PASTE YOUR GOOGLE MAPS API KEY HERE
   Enable: Maps JavaScript API, Places API (New),
           Geocoding API, Directions API
   Restrict the key by HTTP referrer to your own domain.
   ------------------------------------------------------------ */
var GOOGLE_MAPS_API_KEY = 'YOUR_API_KEY_HERE';

(function () {
    'use strict';

    /* --------------------------------------------------------
       Config
       -------------------------------------------------------- */
    var DEFAULT_CENTER = { lat: 9.2035, lng: 12.4954 }; // Yola, Adamawa State
    var DEFAULT_ZOOM = 13;

    var MAP_STYLE = [
        { elementType: 'geometry', stylers: [{ color: '#f6f2e4' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#3d4d47' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
        { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#c9a84c' }] },
        { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#eef0dd' }] },
        { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#6b7a74' }] },
        { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#d6e7d4' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
        { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#fdf7e6' }] },
        { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#f0d78c' }] },
        { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#c9a84c' }] },
        { featureType: 'transit.line', elementType: 'geometry', stylers: [{ color: '#cfe0d8' }] },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17997a' }] },
        { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#04322a' }] }
    ];

    var COLORS = {
        emerald: '#064e3b',
        emeraldLight: '#17997a',
        gold: '#c9a84c',
        cream: '#f5f0e0'
    };

    /* --------------------------------------------------------
       State
       -------------------------------------------------------- */
    var map = null;
    var geocoder = null;
    var placesService = null;
    var directionsService = null;
    var directionsRenderer = null;
    var infoWindow = null;

    var searchMarker = null;
    var resultMarkers = [];
    var userMarker = null;

    var travelMode = 'DRIVING';
    var activeCategory = null;
    var origin = null;      // { lat, lng, label }
    var destination = null; // { lat, lng, label }
    var lastResults = [];
    var toastTimer = null;
    var sessionToken = null;

    /* --------------------------------------------------------
       Tiny DOM helpers
       -------------------------------------------------------- */
    function $(id) { return document.getElementById(id); }
    function on(el, ev, fn) { if (el) el.addEventListener(ev, fn); }
    function show(el) { if (el) el.hidden = false; }
    function hide(el) { if (el) el.hidden = true; }

    function toast(message) {
        var el = $('mapToast');
        if (!el) return;
        el.textContent = message;
        show(el);
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { hide(el); }, 3600);
    }

    function debounce(fn, wait) {
        var t;
        return function () {
            var args = arguments, ctx = this;
            clearTimeout(t);
            t = setTimeout(function () { fn.apply(ctx, args); }, wait);
        };
    }

    /* --------------------------------------------------------
       Bootstrapping the Maps JS API
       -------------------------------------------------------- */
    function showOverlay(title, text) {
        var overlay = $('mapOverlay');
        if (!overlay) return;
        if (title) $('overlayTitle').textContent = title;
        if (text) $('overlayText').textContent = text;
        show(overlay);
        hide($('mapLoader'));
    }

    function loadMapsApi() {
        if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'YOUR_API_KEY_HERE') {
            showOverlay(null, null);
            return;
        }

        window.gm_authFailure = function () {
            showOverlay(
                'Map could not be authorised',
                'Google rejected this API key. Check that billing is enabled, the required APIs are turned on, and that this domain is in the key\'s HTTP referrer allowlist.'
            );
        };

        window.initMap = initMap;

        var script = document.createElement('script');
        script.src = 'https://maps.googleapis.com/maps/api/js?key=' +
            encodeURIComponent(GOOGLE_MAPS_API_KEY) +
            '&libraries=places,geometry&loading=async&callback=initMap';
        script.async = true;
        script.onerror = function () {
            showOverlay('Map failed to load', 'The Google Maps script could not be downloaded. Check your internet connection and try again.');
        };
        document.head.appendChild(script);
    }

    /* --------------------------------------------------------
       Map init
       -------------------------------------------------------- */
    function initMap() {
        var el = $('map');
        if (!el) return;

        map = new google.maps.Map(el, {
            center: DEFAULT_CENTER,
            zoom: DEFAULT_ZOOM,
            styles: MAP_STYLE,
            disableDefaultUI: true,
            gestureHandling: 'greedy',
            clickableIcons: true
        });

        geocoder = new google.maps.Geocoder();
        placesService = new google.maps.places.PlacesService(map);
        directionsService = new google.maps.DirectionsService();
        directionsRenderer = new google.maps.DirectionsRenderer({
            map: map,
            suppressMarkers: false,
            polylineOptions: {
                strokeColor: COLORS.emeraldLight,
                strokeOpacity: 0.9,
                strokeWeight: 6
            },
            markerOptions: {
                icon: pinIcon(COLORS.emerald)
            }
        });
        infoWindow = new google.maps.InfoWindow();

        hide($('mapLoader'));

        // Click anywhere -> reverse geocode and set destination
        map.addListener('click', function (e) {
            if (e.placeId) {
                e.stop();
                fetchPlaceDetails(e.placeId);
                return;
            }
            handleMapClick(e.latLng);
        });

        toast('Map ready — search a place or tap the map.');
    }

    function pinIcon(fill) {
        return {
            path: 'M12 2C7.6 2 4 5.6 4 10c0 6 8 12 8 12s8-6 8-12c0-4.4-3.6-8-8-8z',
            fillColor: fill,
            fillOpacity: 1,
            strokeColor: COLORS.cream,
            strokeWeight: 2,
            scale: 1.6,
            anchor: new google.maps.Point(12, 22)
        };
    }

    function dotIcon(fill) {
        return {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: fill,
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3,
            scale: 8
        };
    }

    /* --------------------------------------------------------
       Autocomplete (Places API New with legacy fallback)
       -------------------------------------------------------- */
    function newSessionToken() {
        try {
            if (google.maps.places.AutocompleteSessionToken) {
                sessionToken = new google.maps.places.AutocompleteSessionToken();
            }
        } catch (err) { sessionToken = null; }
        return sessionToken;
    }

    function fetchSuggestions(text, callback) {
        if (!text || text.length < 2 || !window.google || !google.maps.places) {
            callback([]);
            return;
        }

        var bias = map ? map.getBounds() : null;

        if (google.maps.places.AutocompleteSuggestion &&
            google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions) {

            var request = { input: text, sessionToken: sessionToken || newSessionToken() };
            if (map) {
                request.locationBias = {
                    center: { lat: map.getCenter().lat(), lng: map.getCenter().lng() },
                    radius: 40000
                };
            }

            google.maps.places.AutocompleteSuggestion
                .fetchAutocompleteSuggestions(request)
                .then(function (res) {
                    var list = (res && res.suggestions ? res.suggestions : []).map(function (s) {
                        var p = s.placePrediction;
                        if (!p) return null;
                        return {
                            id: p.placeId,
                            main: p.mainText ? p.mainText.text : (p.text ? p.text.text : ''),
                            sub: p.secondaryText ? p.secondaryText.text : '',
                            newApi: true,
                            raw: p
                        };
                    }).filter(Boolean);
                    callback(list);
                })
                .catch(function () { legacyPredictions(text, bias, callback); });
            return;
        }

        legacyPredictions(text, bias, callback);
    }

    function legacyPredictions(text, bias, callback) {
        if (!google.maps.places.AutocompleteService) { callback([]); return; }
        var svc = new google.maps.places.AutocompleteService();
        svc.getPlacePredictions({ input: text, bounds: bias || undefined }, function (preds, status) {
            if (status !== google.maps.places.PlacesServiceStatus.OK || !preds) { callback([]); return; }
            callback(preds.map(function (p) {
                return {
                    id: p.place_id,
                    main: p.structured_formatting ? p.structured_formatting.main_text : p.description,
                    sub: p.structured_formatting ? p.structured_formatting.secondary_text : '',
                    newApi: false
                };
            }));
        });
    }

    function renderSuggestions(listEl, inputEl, items, onPick) {
        listEl.innerHTML = '';
        if (!items.length) {
            hide(listEl);
            inputEl.setAttribute('aria-expanded', 'false');
            return;
        }

        items.forEach(function (item) {
            var li = document.createElement('li');
            li.className = 'suggestion-item';
            li.setAttribute('role', 'option');
            li.innerHTML = '<i class="fas fa-location-dot" aria-hidden="true"></i>' +
                '<span><span class="suggestion-main"></span>' +
                (item.sub ? '<span class="suggestion-sub"></span>' : '') + '</span>';
            li.querySelector('.suggestion-main').textContent = item.main;
            if (item.sub) li.querySelector('.suggestion-sub').textContent = item.sub;
            li.addEventListener('click', function () {
                hide(listEl);
                inputEl.setAttribute('aria-expanded', 'false');
                onPick(item);
            });
            listEl.appendChild(li);
        });

        show(listEl);
        inputEl.setAttribute('aria-expanded', 'true');
    }

    function attachAutocomplete(inputEl, listEl, onPick) {
        if (!inputEl || !listEl) return;

        var handler = debounce(function () {
            fetchSuggestions(inputEl.value.trim(), function (items) {
                renderSuggestions(listEl, inputEl, items, onPick);
            });
        }, 260);

        on(inputEl, 'input', handler);
        on(inputEl, 'focus', function () {
            if (listEl.children.length) show(listEl);
        });
        on(inputEl, 'keydown', function (e) {
            if (e.key === 'Escape') { hide(listEl); }
            if (e.key === 'Enter') {
                e.preventDefault();
                var first = listEl.querySelector('.suggestion-item');
                if (first) { first.click(); }
                else { textSearch(inputEl.value.trim()); }
            }
        });

        document.addEventListener('click', function (e) {
            if (!listEl.contains(e.target) && e.target !== inputEl) hide(listEl);
        });
    }

    /* --------------------------------------------------------
       Place details
       -------------------------------------------------------- */
    function fetchPlaceDetails(placeId) {
        if (!placesService) return;
        placesService.getDetails({
            placeId: placeId,
            fields: ['name', 'formatted_address', 'geometry', 'rating', 'user_ratings_total',
                     'opening_hours', 'formatted_phone_number', 'website', 'photos', 'types']
        }, function (place, status) {
            if (status !== google.maps.places.PlacesServiceStatus.OK || !place) {
                toast('Could not load details for that place.');
                return;
            }
            focusPlace(place);
        });
    }

    function focusPlace(place) {
        var loc = place.geometry && place.geometry.location;
        if (!loc) return;

        map.panTo(loc);
        map.setZoom(Math.max(map.getZoom(), 16));

        if (searchMarker) searchMarker.setMap(null);
        searchMarker = new google.maps.Marker({
            map: map,
            position: loc,
            icon: pinIcon(COLORS.gold),
            title: place.name || '',
            animation: google.maps.Animation.DROP
        });

        renderPlaceCard(place);
        newSessionToken();
    }

    function renderPlaceCard(place) {
        var card = $('placeCard');
        if (!card) return;

        $('placeName').textContent = place.name || 'Selected place';
        $('placeAddress').textContent = place.formatted_address || place.vicinity || '';

        // photo
        var photoEl = $('placePhoto');
        if (place.photos && place.photos.length) {
            photoEl.style.backgroundImage = 'url("' + place.photos[0].getUrl({ maxWidth: 640, maxHeight: 360 }) + '")';
            show(photoEl);
        } else {
            photoEl.style.backgroundImage = '';
            hide(photoEl);
        }

        // meta pills
        var meta = $('placeMeta');
        meta.innerHTML = '';

        if (typeof place.rating === 'number') {
            meta.appendChild(pill('fa-star', place.rating.toFixed(1) +
                (place.user_ratings_total ? ' (' + place.user_ratings_total + ')' : '')));
        }

        if (place.opening_hours && typeof place.opening_hours.isOpen === 'function') {
            var openNow = place.opening_hours.isOpen();
            if (typeof openNow === 'boolean') {
                var p = pill(openNow ? 'fa-door-open' : 'fa-door-closed', openNow ? 'Open now' : 'Closed');
                p.classList.add(openNow ? 'is-open' : 'is-closed');
                meta.appendChild(p);
            }
        }

        if (place.types && place.types.length) {
            meta.appendChild(pill('fa-tag', place.types[0].replace(/_/g, ' ')));
        }

        // links
        var site = $('placeWebsite');
        if (place.website) { site.href = place.website; show(site); } else { hide(site); }

        var phone = $('placePhone');
        if (place.formatted_phone_number) {
            phone.href = 'tel:' + place.formatted_phone_number.replace(/\s/g, '');
            show(phone);
        } else { hide(phone); }

        // directions button
        var loc = place.geometry.location;
        $('placeDirections').onclick = function () {
            destination = { lat: loc.lat(), lng: loc.lng(), label: place.name || place.formatted_address };
            $('destInput').value = destination.label;
            switchTab('route');
            if (!origin) useMyLocation(true);
            else calculateRoute();
        };

        show(card);
    }

    function pill(icon, text) {
        var el = document.createElement('span');
        el.className = 'meta-pill';
        el.innerHTML = '<i class="fas ' + icon + '" aria-hidden="true"></i>';
        el.appendChild(document.createTextNode(' ' + text));
        return el;
    }

    /* --------------------------------------------------------
       Text search and nearby categories
       -------------------------------------------------------- */
    function textSearch(query) {
        if (!query || !placesService) return;
        placesService.textSearch({
            query: query,
            location: map.getCenter(),
            radius: 30000
        }, function (results, status) {
            if (status !== google.maps.places.PlacesServiceStatus.OK || !results || !results.length) {
                renderResults([], query);
                toast('No places matched "' + query + '".');
                return;
            }
            renderResults(results, query);
            fitToResults(results);
        });
    }

    function nearbySearch(type, label) {
        if (!placesService) return;
        placesService.nearbySearch({
            location: map.getCenter(),
            radius: 8000,
            type: type
        }, function (results, status) {
            if (status !== google.maps.places.PlacesServiceStatus.OK || !results || !results.length) {
                renderResults([], label);
                toast('Nothing found nearby for ' + label + '.');
                return;
            }
            renderResults(results, label);
            fitToResults(results);
        });
    }

    function clearResultMarkers() {
        resultMarkers.forEach(function (m) { m.setMap(null); });
        resultMarkers = [];
    }

    function renderResults(results, label) {
        lastResults = results || [];
        clearResultMarkers();

        var block = $('resultsBlock');
        var list = $('resultsList');
        list.innerHTML = '';
        $('resultsTitle').textContent = label ? (label.charAt(0).toUpperCase() + label.slice(1)) : 'Results';

        if (!lastResults.length) {
            var empty = document.createElement('li');
            empty.className = 'results-empty';
            empty.textContent = 'No results found. Try a different search or move the map.';
            list.appendChild(empty);
            show(block);
            return;
        }

        lastResults.slice(0, 20).forEach(function (place, i) {
            var loc = place.geometry && place.geometry.location;
            if (!loc) return;

            var marker = new google.maps.Marker({
                map: map,
                position: loc,
                icon: pinIcon(COLORS.emeraldLight),
                title: place.name,
                label: {
                    text: String(i + 1),
                    color: COLORS.cream,
                    fontSize: '11px',
                    fontWeight: '700'
                }
            });
            marker.addListener('click', function () {
                infoWindow.setContent(
                    '<div class="map-infowindow"><strong>' + escapeHtml(place.name || '') + '</strong>' +
                    '<span>' + escapeHtml(place.formatted_address || place.vicinity || '') + '</span></div>'
                );
                infoWindow.open(map, marker);
                if (place.place_id) fetchPlaceDetails(place.place_id);
            });
            resultMarkers.push(marker);

            var li = document.createElement('li');
            li.className = 'result-item';
            li.innerHTML = '<span class="result-index">' + (i + 1) + '</span>' +
                '<span><span class="result-name"></span><span class="result-sub"></span></span>';
            li.querySelector('.result-name').textContent = place.name || 'Unnamed place';
            var sub = [];
            if (typeof place.rating === 'number') sub.push('★ ' + place.rating.toFixed(1));
            if (place.vicinity || place.formatted_address) sub.push(place.vicinity || place.formatted_address);
            li.querySelector('.result-sub').textContent = sub.join(' · ');

            li.addEventListener('click', function () {
                Array.prototype.forEach.call(list.children, function (c) { c.classList.remove('is-active'); });
                li.classList.add('is-active');
                map.panTo(loc);
                map.setZoom(Math.max(map.getZoom(), 16));
                google.maps.event.trigger(marker, 'click');
            });

            list.appendChild(li);
        });

        show(block);
    }

    function fitToResults(results) {
        var bounds = new google.maps.LatLngBounds();
        var count = 0;
        results.slice(0, 20).forEach(function (p) {
            if (p.geometry && p.geometry.location) { bounds.extend(p.geometry.location); count++; }
        });
        if (count) map.fitBounds(bounds, 60);
    }

    function escapeHtml(str) {
        return String(str).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    /* --------------------------------------------------------
       Map click -> reverse geocode
       -------------------------------------------------------- */
    function handleMapClick(latLng) {
        if (!geocoder) return;
        geocoder.geocode({ location: latLng }, function (results, status) {
            var label = (status === 'OK' && results && results[0])
                ? results[0].formatted_address
                : latLng.lat().toFixed(5) + ', ' + latLng.lng().toFixed(5);

            destination = { lat: latLng.lat(), lng: latLng.lng(), label: label };
            $('destInput').value = label;

            if (searchMarker) searchMarker.setMap(null);
            searchMarker = new google.maps.Marker({
                map: map,
                position: latLng,
                icon: pinIcon(COLORS.gold),
                animation: google.maps.Animation.DROP
            });

            infoWindow.setContent('<div class="map-infowindow"><strong>Destination set</strong><span>' +
                escapeHtml(label) + '</span></div>');
            infoWindow.open(map, searchMarker);

            toast('Destination set. Open Directions to plan the route.');
        });
    }

    /* --------------------------------------------------------
       Geolocation
       -------------------------------------------------------- */
    function useMyLocation(thenRoute) {
        if (!navigator.geolocation) {
            toast('Your browser does not support location sharing.');
            return;
        }
        toast('Getting your location…');
        navigator.geolocation.getCurrentPosition(function (pos) {
            var latLng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            origin = { lat: latLng.lat, lng: latLng.lng, label: 'My location' };
            $('originInput').value = 'My location';

            if (userMarker) userMarker.setMap(null);
            userMarker = new google.maps.Marker({
                map: map,
                position: latLng,
                icon: dotIcon(COLORS.emeraldLight),
                title: 'You are here',
                zIndex: 999
            });

            map.panTo(latLng);
            map.setZoom(Math.max(map.getZoom(), 15));
            toast('Location found.');

            if (thenRoute && destination) calculateRoute();
        }, function () {
            toast('Location permission denied. Type a starting point instead.');
        }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
    }

    /* --------------------------------------------------------
       Directions
       -------------------------------------------------------- */
    function calculateRoute() {
        if (!directionsService) return;

        var originValue = origin || $('originInput').value.trim();
        var destValue = destination || $('destInput').value.trim();

        if (!originValue || !destValue) {
            toast('Enter both a starting point and a destination.');
            return;
        }

        var request = {
            origin: origin ? { lat: origin.lat, lng: origin.lng } : $('originInput').value.trim(),
            destination: destination ? { lat: destination.lat, lng: destination.lng } : $('destInput').value.trim(),
            travelMode: google.maps.TravelMode[travelMode],
            provideRouteAlternatives: false
        };

        if (travelMode === 'TRANSIT') request.transitOptions = { departureTime: new Date() };

        directionsService.route(request, function (result, status) {
            if (status !== 'OK' || !result) {
                var msg = status === 'ZERO_RESULTS'
                    ? 'No route found between those points for this travel mode.'
                    : 'Could not calculate the route (' + status + ').';
                toast(msg);
                return;
            }

            clearResultMarkers();
            if (searchMarker) { searchMarker.setMap(null); searchMarker = null; }

            directionsRenderer.setMap(map);
            directionsRenderer.setDirections(result);
            renderSteps(result.routes[0]);
        });
    }

    function renderSteps(route) {
        var leg = route.legs[0];
        if (!leg) return;

        $('routeDuration').textContent = leg.duration ? leg.duration.text : '—';
        $('routeDistance').textContent = leg.distance ? leg.distance.text : '—';
        show($('routeSummary'));

        var list = $('stepsList');
        list.innerHTML = '';

        leg.steps.forEach(function (step) {
            var li = document.createElement('li');
            li.className = 'step-item';
            var text = document.createElement('span');
            text.innerHTML = step.instructions; // Google-provided, sanitized markup
            li.appendChild(text);

            var meta = document.createElement('span');
            meta.className = 'step-meta';
            meta.textContent = [step.distance && step.distance.text, step.duration && step.duration.text]
                .filter(Boolean).join(' · ');
            li.appendChild(meta);
            list.appendChild(li);
        });

        toast('Route ready — ' + (leg.distance ? leg.distance.text : '') +
            (leg.duration ? ', about ' + leg.duration.text : '') + '.');
    }

    function clearRoute() {
        if (directionsRenderer) directionsRenderer.setMap(null);
        $('stepsList').innerHTML = '';
        hide($('routeSummary'));
        origin = null;
        destination = null;
        $('originInput').value = '';
        $('destInput').value = '';
        if (userMarker) { userMarker.setMap(null); userMarker = null; }
        toast('Route cleared.');
    }

    /* --------------------------------------------------------
       Tabs and bottom sheet
       -------------------------------------------------------- */
    function switchTab(which) {
        var isSearch = which === 'search';
        $('tabSearch').classList.toggle('is-active', isSearch);
        $('tabRoute').classList.toggle('is-active', !isSearch);
        $('tabSearch').setAttribute('aria-selected', String(isSearch));
        $('tabRoute').setAttribute('aria-selected', String(!isSearch));
        $('paneSearch').classList.toggle('is-active', isSearch);
        $('paneRoute').classList.toggle('is-active', !isSearch);
        $('paneSearch').hidden = !isSearch;
        $('paneRoute').hidden = isSearch;
        openSheet(true);
    }

    function openSheet(force) {
        var panel = $('mapPanel');
        var handle = $('sheetHandle');
        if (!panel) return;
        var open = force === undefined ? !panel.classList.contains('is-open') : force;
        panel.classList.toggle('is-open', open);
        if (handle) handle.setAttribute('aria-expanded', String(open));
    }

    /* --------------------------------------------------------
       Wiring
       -------------------------------------------------------- */
    function wireUp() {
        // Footer year
        var y = $('year');
        if (y) y.textContent = new Date().getFullYear();

        // Tabs
        on($('tabSearch'), 'click', function () { switchTab('search'); });
        on($('tabRoute'), 'click', function () { switchTab('route'); });
        on($('sheetHandle'), 'click', function () { openSheet(); });

        // Search field
        var searchInput = $('searchInput');
        var clearBtn = $('searchClear');
        on(searchInput, 'input', function () {
            if (searchInput.value) show(clearBtn); else hide(clearBtn);
        });
        on(clearBtn, 'click', function () {
            searchInput.value = '';
            hide(clearBtn);
            hide($('searchSuggestions'));
            searchInput.focus();
        });

        attachAutocomplete(searchInput, $('searchSuggestions'), function (item) {
            searchInput.value = item.main + (item.sub ? ', ' + item.sub : '');
            show(clearBtn);
            fetchPlaceDetails(item.id);
        });

        attachAutocomplete($('originInput'), $('originSuggestions'), function (item) {
            $('originInput').value = item.main + (item.sub ? ', ' + item.sub : '');
            resolvePlaceLatLng(item.id, function (loc, label) {
                origin = { lat: loc.lat(), lng: loc.lng(), label: label };
            });
        });

        attachAutocomplete($('destInput'), $('destSuggestions'), function (item) {
            $('destInput').value = item.main + (item.sub ? ', ' + item.sub : '');
            resolvePlaceLatLng(item.id, function (loc, label) {
                destination = { lat: loc.lat(), lng: loc.lng(), label: label };
            });
        });

        // Category chips
        Array.prototype.forEach.call(document.querySelectorAll('#categoryChips .map-chip'), function (chip) {
            chip.addEventListener('click', function () {
                var type = chip.getAttribute('data-query');
                var isSame = activeCategory === type;

                Array.prototype.forEach.call(document.querySelectorAll('#categoryChips .map-chip'), function (c) {
                    c.classList.remove('is-active');
                });

                if (isSame) {
                    activeCategory = null;
                    clearResultMarkers();
                    hide($('resultsBlock'));
                    return;
                }

                activeCategory = type;
                chip.classList.add('is-active');
                nearbySearch(type, chip.textContent.trim());
            });
        });

        // Place card
        on($('placeClose'), 'click', function () {
            hide($('placeCard'));
            if (searchMarker) { searchMarker.setMap(null); searchMarker = null; }
        });

        on($('resultsClear'), 'click', function () {
            clearResultMarkers();
            hide($('resultsBlock'));
            activeCategory = null;
            Array.prototype.forEach.call(document.querySelectorAll('#categoryChips .map-chip'), function (c) {
                c.classList.remove('is-active');
            });
        });

        // Route controls
        on($('useLocation'), 'click', function () { useMyLocation(false); });
        on($('routeBtn'), 'click', calculateRoute);
        on($('routeClear'), 'click', clearRoute);

        on($('swapBtn'), 'click', function () {
            var o = origin, d = destination;
            origin = d; destination = o;
            var oi = $('originInput'), di = $('destInput');
            var tmp = oi.value; oi.value = di.value; di.value = tmp;
            if (origin || destination) toast('Start and destination swapped.');
        });

        Array.prototype.forEach.call(document.querySelectorAll('.mode-btn'), function (btn) {
            btn.addEventListener('click', function () {
                Array.prototype.forEach.call(document.querySelectorAll('.mode-btn'), function (b) {
                    b.classList.remove('is-active');
                    b.setAttribute('aria-pressed', 'false');
                });
                btn.classList.add('is-active');
                btn.setAttribute('aria-pressed', 'true');
                travelMode = btn.getAttribute('data-mode');
                if ((origin || $('originInput').value) && (destination || $('destInput').value)) {
                    calculateRoute();
                }
            });
        });

        // Map controls
        on($('ctrlLocate'), 'click', function () { useMyLocation(false); });
        on($('ctrlZoomIn'), 'click', function () { if (map) map.setZoom(map.getZoom() + 1); });
        on($('ctrlZoomOut'), 'click', function () { if (map) map.setZoom(map.getZoom() - 1); });

        on($('ctrlType'), 'click', function () {
            if (!map) return;
            var btn = $('ctrlType');
            var satellite = map.getMapTypeId() === 'hybrid';
            map.setMapTypeId(satellite ? 'roadmap' : 'hybrid');
            btn.classList.toggle('is-active', !satellite);
            btn.innerHTML = satellite
                ? '<i class="fas fa-satellite" aria-hidden="true"></i>'
                : '<i class="fas fa-map" aria-hidden="true"></i>';
        });

        on($('ctrlFullscreen'), 'click', function () {
            var stage = document.querySelector('.map-stage');
            if (!stage) return;
            if (stage.requestFullscreen) {
                if (document.fullscreenElement) document.exitFullscreen();
                else stage.requestFullscreen().catch(function () { stage.classList.toggle('is-fullscreen'); });
            } else {
                stage.classList.toggle('is-fullscreen');
            }
            setTimeout(function () {
                if (map) google.maps.event.trigger(map, 'resize');
            }, 300);
        });

        document.addEventListener('fullscreenchange', function () {
            var icon = $('ctrlFullscreen');
            if (icon) {
                icon.innerHTML = document.fullscreenElement
                    ? '<i class="fas fa-compress" aria-hidden="true"></i>'
                    : '<i class="fas fa-expand" aria-hidden="true"></i>';
            }
        });
    }

    function resolvePlaceLatLng(placeId, cb) {
        if (!placesService) return;
        placesService.getDetails({ placeId: placeId, fields: ['geometry', 'name', 'formatted_address'] },
            function (place, status) {
                if (status !== google.maps.places.PlacesServiceStatus.OK || !place || !place.geometry) return;
                cb(place.geometry.location, place.name || place.formatted_address);
                newSessionToken();
            });
    }

    /* --------------------------------------------------------
       Go
       -------------------------------------------------------- */
    document.addEventListener('DOMContentLoaded', function () {
        wireUp();
        loadMapsApi();
    });
})();


