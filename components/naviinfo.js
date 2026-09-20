
// Load common AI utilities first
if (!window.commonAILoaded) {
  const script = document.createElement('script');
    script.src = 'scripts/commonAI.js';
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
        if (typeof window.initializeSearchHandlers === 'function') window.initializeSearchHandlers();
        if (typeof window.initYolaGoogleMap === 'function') window.initYolaGoogleMap();
    
    
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
;(function () {
    'use strict';

    /* --------------------------------------------------------
       Config
       -------------------------------------------------------- */
    var DEFAULT_CENTER = { lat: 9.2035, lng: 12.4954 }; // Yola, Adamawa State
    var DEFAULT_ZOOM = 13;
    var MIN_ZOOM = 7;
    var MAX_ZOOM = 21;

    var MAP_STYLE = [
        { elementType: 'geometry', stylers: [{ color: '#f6f2e4' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#3d4d47' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
        { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#c9a84c' }] },
        { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#eef0dd' }] },
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'on' }] },
        { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#3d4d47' }] },
        { featureType: 'poi', elementType: 'labels.icon', stylers: [{ visibility: 'on' }] },
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
    var placeApi = null;
    var routeApi = null;
    var routePolyline = null;
    var routeOutline = null;
    var infoWindow = null;

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
        if (!window.YolaGoogleMaps || typeof window.YolaGoogleMaps.load !== 'function') {
            showOverlay('Map failed to load', 'The shared Google Maps loader is unavailable.');
            return;
        }
        window.YolaGoogleMaps.load()
            .then(initMap)
            .catch(function (error) {
                showOverlay('Map failed to load', error.message || 'Google Maps is unavailable.');
            });
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
            minZoom: MIN_ZOOM,
            maxZoom: MAX_ZOOM,
            mapTypeId: 'roadmap',
            styles: MAP_STYLE,
            disableDefaultUI: true,
            gestureHandling: 'greedy',
            clickableIcons: true
        });

        geocoder = new google.maps.Geocoder();
        placeApi = google.maps.places.Place;
        infoWindow = new google.maps.InfoWindow({
            headerDisabled: true
        });

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
        callback([]);
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
    function fetchPlaceDetails(placeId, fallbackPlace) {
        if (!placeApi || !placeId) return;
        var place = new placeApi({ id: placeId });
        place.fetchFields({ fields: placeFields() })
            .then(function () { focusPlace(place); })
            .catch(function () {
                if (fallbackPlace) focusPlace(fallbackPlace);
                else toast('Could not load details for that place.');
            });
    }

    function placeFields() {
        return ['id', 'displayName', 'formattedAddress', 'location', 'rating', 'userRatingCount',
            'regularOpeningHours', 'nationalPhoneNumber', 'websiteURI', 'photos', 'types'];
    }

    function placeName(place) {
        if (!place) return 'Selected place';
        if (place.displayName) {
            if (typeof place.displayName === 'string') return place.displayName;
            if (place.displayName.text) return place.displayName.text;
        }
        if (place.name) return place.name;
        if (place.address_components && place.address_components.length) {
            var preferred = ['establishment', 'point_of_interest', 'premise', 'street_number', 'route', 'locality'];
            for (var i = 0; i < preferred.length; i++) {
                for (var j = 0; j < place.address_components.length; j++) {
                    var component = place.address_components[j];
                    if (component.types && component.types.indexOf(preferred[i]) !== -1) {
                        return component.long_name;
                    }
                }
            }
        }
        if (place.formatted_address || place.formattedAddress) {
            return (place.formatted_address || place.formattedAddress).split(',')[0];
        }
        return 'Selected place';
    }

    function placeAddress(place) {
        return place && (place.formattedAddress || place.formatted_address || place.vicinity) || '';
    }

    function placeLocation(place) {
        return place && (place.location || place.geometry && place.geometry.location) || null;
    }

    function placePhotoUrl(place) {
        if (!place || !place.photos || !place.photos.length) return '';
        var photo = place.photos[0];
        try {
            return photo.getURI ? photo.getURI({ maxWidth: 640, maxHeight: 360 }) : photo.getUrl({ maxWidth: 640, maxHeight: 360 });
        } catch (err) {
            return '';
        }
    }

    function placeMapUrl(place) {
        var loc = placeLocation(place);
        if (!loc) return '';
        return 'https://www.google.com/maps/search/?api=1&query=' +
            encodeURIComponent(locationLat(loc) + ',' + locationLng(loc));
    }

    function placeType(place) {
        return place && place.types && place.types.length
            ? place.types[0].replace(/_/g, ' ')
            : '';
    }

    function geocoderResultToPlace(result, fallbackLocation) {
        var location = result && result.geometry && result.geometry.location || fallbackLocation;
        return {
            place_id: result && result.place_id,
            name: placeName(result),
            formatted_address: result && result.formatted_address || '',
            geometry: location ? { location: location } : null,
            types: result && result.types || []
        };
    }

    function placeHoursLabel(place) {
        var openingHours = place && (place.opening_hours || place.regularOpeningHours);
        if (!openingHours || typeof openingHours.isOpen !== 'function') return '';
        return openingHours.isOpen() ? 'Open now' : 'Closed';
    }

    function markerPreviewContent(place) {
        var photoUrl = placePhotoUrl(place);
        var rating = typeof place.rating === 'number'
            ? '<span class="map-place-rating">★ ' + place.rating.toFixed(1) +
                (place.userRatingCount ? ' (' + escapeHtml(place.userRatingCount) + ')' : '') + '</span>'
            : '';
        var hours = placeHoursLabel(place);
        var type = placeType(place);
        var loc = placeLocation(place);
        var mapUrl = placeMapUrl(place);
        var phone = place.nationalPhoneNumber || place.formatted_phone_number || '';
        var website = place.websiteURI || place.website || '';
        var content = '<div class="map-infowindow map-place-details">';

        if (photoUrl) content += '<img class="map-place-photo" src="' + escapeHtml(photoUrl) + '" alt="">';
        content += '<strong>' + escapeHtml(placeName(place)) + '</strong>' +
            '<span class="map-place-address">' + escapeHtml(placeAddress(place)) + '</span>';
        if (rating || hours || type) {
            content += '<div class="map-place-meta">' + rating +
                (hours ? '<span class="map-place-hours">' + escapeHtml(hours) + '</span>' : '') +
                (type ? '<span>' + escapeHtml(type) + '</span>' : '') + '</div>';
        }
        if (phone) content += '<a class="map-place-link" href="tel:' + escapeHtml(phone.replace(/\s/g, '')) + '">' + escapeHtml(phone) + '</a>';
        content += '<div class="map-place-actions">';
        if (loc) content += '<a href="https://www.google.com/maps/dir/?api=1&destination=' +
            encodeURIComponent(locationLat(loc) + ',' + locationLng(loc)) + '" target="_blank" rel="noopener">Directions</a>';
        if (website) content += '<a href="' + escapeHtml(website) + '" target="_blank" rel="noopener">Website</a>';
        if (mapUrl) content += '<a href="' + escapeHtml(mapUrl) + '" target="_blank" rel="noopener">View on Google Maps</a>';
        content += '</div></div>';
        return content;
    }

    function showMarkerPreview(position, place) {
        if (!infoWindow || !position) return;
        infoWindow.setContent(markerPreviewContent(place));
        infoWindow.setPosition(position);
        infoWindow.open(map);
    }

    function placeToLegacyShape(place) {
        var loc = placeLocation(place);
        return {
            place_id: place.id,
            name: placeName(place),
            formatted_address: placeAddress(place),
            geometry: loc ? { location: loc } : null,
            rating: place.rating,
            user_ratings_total: place.userRatingCount,
            opening_hours: place.regularOpeningHours ? { isOpen: function () { return place.regularOpeningHours.isOpen(); } } : null,
            formatted_phone_number: place.nationalPhoneNumber,
            website: place.websiteURI,
            photos: place.photos,
            types: place.types,
            _place: place
        };
    }

    function focusPlace(place) {
        var loc = placeLocation(place);
        if (!loc) return;

        destination = {
            lat: locationLat(loc),
            lng: locationLng(loc),
            label: placeName(place) || placeAddress(place)
        };
        if ($('destInput')) $('destInput').value = destination.label;

        map.panTo(loc);
        map.setZoom(Math.max(map.getZoom(), 16));

        showMarkerPreview(loc, place);
        renderPlaceCard(place);
        newSessionToken();
    }

    function renderPlaceCard(place) {
        var card = $('placeCard');
        if (!card) return;

        $('placeName').textContent = placeName(place);
        $('placeAddress').textContent = placeAddress(place);

        // photo
        var photoEl = $('placePhoto');
        if (place.photos && place.photos.length) {
            photoEl.style.backgroundImage = 'url("' + (place.photos[0].getURI ? place.photos[0].getURI({ maxWidth: 640, maxHeight: 360 }) : place.photos[0].getUrl({ maxWidth: 640, maxHeight: 360 })) + '")';
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
                (place.userRatingCount ? ' (' + place.userRatingCount + ')' : '')));
        }

        if (place.regularOpeningHours && typeof place.regularOpeningHours.isOpen === 'function') {
            var openNow = place.regularOpeningHours.isOpen();
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
        if (place.websiteURI) { site.href = place.websiteURI; show(site); } else { hide(site); }

        var phone = $('placePhone');
        if (place.nationalPhoneNumber) {
            phone.href = 'tel:' + place.nationalPhoneNumber.replace(/\s/g, '');
            show(phone);
        } else { hide(phone); }

        // directions button
        var loc = placeLocation(place);
        $('placeDirections').onclick = function () {
            destination = { lat: locationLat(loc), lng: locationLng(loc), label: placeName(place) || placeAddress(place) };
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
        if (!query || !placeApi) return;
        placeApi.searchByText({
            textQuery: query,
            fields: placeFields(),
            locationBias: { center: map.getCenter(), radius: 30000 },
            maxResultCount: 20
        }).then(function (response) {
            var results = (response.places || []).map(placeToLegacyShape);
            if (!results.length) {
                renderResults([], query);
                toast('No places matched "' + query + '".');
                return;
            }
            renderResults(results, query);
            fitToResults(results);
        }).catch(function () {
            renderResults([], query);
            toast('Could not search places right now.');
        });
    }

    function nearbySearch(type, label) {
        if (!placeApi) return;
        placeApi.searchNearby({
            fields: placeFields(),
            locationRestriction: {
                center: map.getCenter(),
                radius: 8000
            },
            includedPrimaryTypes: [type],
            maxResultCount: 20
        }).then(function (response) {
            var results = (response.places || []).map(placeToLegacyShape);
            if (!results.length) {
                renderResults([], label);
                toast('Nothing found nearby for ' + label + '.');
                return;
            }
            renderResults(results, label);
            fitToResults(results);
        }).catch(function () {
            renderResults([], label);
            toast('Nearby places are unavailable right now.');
        });
    }

    function locationLat(location) {
        return typeof location.lat === 'function' ? location.lat() : location.lat;
    }

    function locationLng(location) {
        return typeof location.lng === 'function' ? location.lng() : location.lng;
    }

    function clearResultMarkers() {
        // Search results are represented by Google's native POI markers only.
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
                showMarkerPreview(loc, place);
                renderPlaceCard(place);
                if (place.place_id) fetchPlaceDetails(place.place_id);
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
        if (count) map.fitBounds(bounds, 100);
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
        var label = latLng.lat().toFixed(5) + ', ' + latLng.lng().toFixed(5);
        destination = { lat: latLng.lat(), lng: latLng.lng(), label: label };
        $('destInput').value = label;

        infoWindow.setContent('<div class="map-infowindow map-place-details"><strong>Loading place details…</strong><span class="map-place-address">' +
            escapeHtml(label) + '</span></div>');
        infoWindow.setPosition(latLng);
        infoWindow.open(map);

        if (geocoder) {
            geocoder.geocode({ location: latLng }, function (results, status) {
                if (status === 'OK' && results && results.length) {
                    var fallbackPlace = geocoderResultToPlace(results[0], latLng);
                    if (results[0].place_id) {
                        fetchPlaceDetails(results[0].place_id, fallbackPlace);
                    } else {
                        focusPlace(fallbackPlace);
                    }
                } else {
                    infoWindow.setContent('<div class="map-infowindow map-place-details"><strong>' + escapeHtml(label) + '</strong><span class="map-place-address">' +
                        escapeHtml(label) + '</span></div>');
                }
            });
        }
        toast('Destination set. Distance and time will be estimated locally.');
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
        var originValue = origin || $('originInput').value.trim();
        var destValue = destination || $('destInput').value.trim();

        if (!originValue || !destValue) {
            toast('Enter both a starting point and a destination.');
            return;
        }

        var start = resolveRoutePoint(originValue);
        var end = resolveRoutePoint(destValue);
        if (!start || !end) {
            toast('Choose locations from the map or Places suggestions first.');
            return;
        }

        var distanceMeters = haversineMeters(start, end);
        var durationMillis = distanceMeters / speedMetersPerSecond(travelMode) * 1000;
        clearResultMarkers();
        drawEstimatedRoute(start, end);
        renderEstimatedRoute(distanceMeters, durationMillis);
    }

    function routePoint(value) {
        if (value && typeof value.lat === 'number') {
            return { location: { latLng: { latitude: value.lat, longitude: value.lng } } };
        }
        return { address: value };
    }

    function routeTravelMode(mode) {
        return { DRIVING: 'DRIVE', WALKING: 'WALK', BICYCLING: 'BICYCLE', TRANSIT: 'TRANSIT' }[mode] || 'DRIVE';
    }

    function resolveRoutePoint(value) {
        if (value && typeof value.lat === 'number' && typeof value.lng === 'number') return value;
        return null;
    }

    function haversineMeters(start, end) {
        var radius = 6371000;
        var lat1 = start.lat * Math.PI / 180;
        var lat2 = end.lat * Math.PI / 180;
        var dLat = (end.lat - start.lat) * Math.PI / 180;
        var dLng = (end.lng - start.lng) * Math.PI / 180;
        var a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
        return 2 * radius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    function speedMetersPerSecond(mode) {
        return { DRIVING: 11.1, WALKING: 1.4, BICYCLING: 4.2 }[mode] || 11.1;
    }

    function drawEstimatedRoute(start, end) {
        if (routePolyline) routePolyline.setMap(null);
        if (routeOutline) routeOutline.setMap(null);
        routeOutline = new google.maps.Polyline({
            map: map,
            path: [start, end],
            strokeColor: '#ffffff',
            strokeOpacity: 0.98,
            strokeWeight: 12,
            zIndex: 99
        });
        routePolyline = new google.maps.Polyline({
            map: map,
            path: [start, end],
            strokeColor: '#d62828',
            strokeOpacity: 1,
            strokeWeight: 7,
            zIndex: 100
        });
        var bounds = new google.maps.LatLngBounds();
        bounds.extend(start);
        bounds.extend(end);
        map.fitBounds(bounds, 100);
    }

    function renderEstimatedRoute(distanceMeters, durationMillis) {
        $('routeDuration').textContent = formatDuration(durationMillis);
        $('routeDistance').textContent = formatDistance(distanceMeters) + ' est.';
        show($('routeSummary'));
        $('stepsList').innerHTML = '<li class="step-item"><span>Estimated direct distance and travel time</span><span class="step-meta">Road routing requires Google Routes API and billing.</span></li>';
        toast('Estimate ready. This line is not a road route.');
    }

    function drawRoute(route) {
        if (routePolyline) routePolyline.setMap(null);
        routePolyline = new google.maps.Polyline({
            map: map,
            path: route.path || [],
            strokeColor: COLORS.emeraldLight,
            strokeOpacity: 0.9,
            strokeWeight: 6
        });
        if (route.path && route.path.length) {
            var bounds = new google.maps.LatLngBounds();
            route.path.forEach(function (point) { bounds.extend(point); });
            map.fitBounds(bounds, 60);
        }
    }

    function renderSteps(route) {
        var leg = route.legs && route.legs[0];
        if (!leg) return;

        $('routeDuration').textContent = formatDuration(route.durationMillis);
        $('routeDistance').textContent = formatDistance(route.distanceMeters);
        show($('routeSummary'));

        var list = $('stepsList');
        list.innerHTML = '';

        (leg.steps || []).forEach(function (step) {
            var li = document.createElement('li');
            li.className = 'step-item';
            var text = document.createElement('span');
            text.textContent = step.navigationInstruction && step.navigationInstruction.instructions || 'Continue';
            li.appendChild(text);

            var meta = document.createElement('span');
            meta.className = 'step-meta';
            meta.textContent = [formatDistance(step.distanceMeters), formatDuration(step.staticDurationMillis)]
                .filter(Boolean).join(' · ');
            li.appendChild(meta);
            list.appendChild(li);
        });

        toast('Route ready — ' + formatDistance(route.distanceMeters) +
            ', about ' + formatDuration(route.durationMillis) + '.');
    }

    function formatDistance(meters) {
        return Number.isFinite(Number(meters)) ? (Number(meters) / 1000).toFixed(1) + ' km' : '—';
    }

    function formatDuration(milliseconds) {
        return Number.isFinite(Number(milliseconds)) ? Math.round(Number(milliseconds) / 60000) + ' min' : '—';
    }

    function clearRoute() {
        if (routePolyline) { routePolyline.setMap(null); routePolyline = null; }
        if (routeOutline) { routeOutline.setMap(null); routeOutline = null; }
        $('stepsList').innerHTML = '';
        hide($('routeSummary'));
        origin = null;
        destination = null;
        $('originInput').value = '';
        $('destInput').value = '';
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
            if (infoWindow) infoWindow.close();
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
        on($('ctrlRoute'), 'click', function () {
            if (!destination) {
                toast('Select a place first.');
                return;
            }
            switchTab('route');
            useMyLocation(true);
        });
        on($('ctrlZoomIn'), 'click', function () { if (map) map.setZoom(map.getZoom() + 1); });
        on($('ctrlZoomOut'), 'click', function () { if (map) map.setZoom(map.getZoom() - 1); });
        on($('ctrl3D'), 'click', openStreetView);

        on($('ctrlType'), 'click', function () {
            if (!map) return;
            var btn = $('ctrlType');
            var satellite = map.getMapTypeId() === 'hybrid' || map.getMapTypeId() === 'satellite';
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

    function openStreetView() {
        if (!map) return;
        var point = destination || { lat: map.getCenter().lat(), lng: map.getCenter().lng() };
        var url = 'https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=' + point.lat + ',' + point.lng;
        window.open(url, '_blank', 'noopener');
    }

    function resolvePlaceLatLng(placeId, cb) {
        if (!placeApi) return;
        var place = new placeApi({ id: placeId });
        place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] })
            .then(function () {
                var loc = placeLocation(place);
                if (!loc) return;
                cb(loc, placeName(place) || placeAddress(place));
                newSessionToken();
            });
    }

    /* --------------------------------------------------------
       Go
       -------------------------------------------------------- */
    window.initYolaGoogleMap = function () {
        var mapElement = $('map');
        if (!mapElement) return;
        wireUp();
        loadMapsApi();
    };
})();


