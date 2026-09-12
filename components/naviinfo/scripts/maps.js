/* Yola navigation map: MapLibre + OpenFreeMap + Geoapify proxy. */
(function () {
	'use strict';

	var CENTER = [12.4954, 9.2035];
	var map;
	var leafletFallback = false;
	var selectedMarker;
	var userMarker;
	var resultMarkers = [];
	var origin;
	var destination;
	var travelMode = 'drive';
	var initialized = false;
	var toastTimer;

	function $(id) { return document.getElementById(id); }
	function show(element) { if (element) element.hidden = false; }
	function hide(element) { if (element) element.hidden = true; }
	function on(element, event, handler) { if (element) element.addEventListener(event, handler); }

	function toast(message) {
		var element = $('mapToast');
		if (!element) return;
		element.textContent = message;
		show(element);
		clearTimeout(toastTimer);
		toastTimer = setTimeout(function () { hide(element); }, 3600);
	}

	function api(path, params) {
		var query = new URLSearchParams(params || {}).toString();
		var base = window.getApiBase ? window.getApiBase() : '';
		return fetch(base + '/api/geoapify/' + path + (query ? '?' + query : ''))
			.then(function (response) {
				return response.json().then(function (body) {
					if (!response.ok) throw new Error(body.error || 'Map service unavailable');
					return body;
				});
			});
	}

	function normalizedFeature(feature) {
		var properties = feature && feature.properties ? feature.properties : feature || {};
		var coordinates = feature && feature.geometry && feature.geometry.coordinates;
		return {
			name: properties.name || properties.address_line1 || 'Selected place',
			address: properties.formatted || properties.address_line2 || properties.address_line1 || '',
			lat: Number(properties.lat || (coordinates && coordinates[1])),
			lng: Number(properties.lon || (coordinates && coordinates[0])),
			website: properties.website || '',
			phone: properties.contact && properties.contact.phone || properties.phone || '',
			categories: properties.categories || []
		};
	}

	function markerElement(color) {
		var element = document.createElement('div');
		element.className = 'yola-map-marker';
		element.style.backgroundColor = color || '#064e3b';
		return element;
	}

	function removeMarker(marker) { if (marker) marker.remove(); }

	function selectPlace(place, zoom) {
		if (!map || !place || !Number.isFinite(place.lat) || !Number.isFinite(place.lng)) return;
		if (leafletFallback) {
			if (selectedMarker) selectedMarker.remove();
			selectedMarker = L.marker([place.lat, place.lng]).addTo(map);
			map.flyTo([place.lat, place.lng], zoom || 16);
			renderPlace(place);
			return;
		}
		removeMarker(selectedMarker);
		selectedMarker = new maplibregl.Marker({ element: markerElement('#c9a84c') })
			.setLngLat([place.lng, place.lat]).addTo(map);
		map.flyTo({ center: [place.lng, place.lat], zoom: zoom || 16, essential: true });
		renderPlace(place);
	}

	function renderPlace(place) {
		var card = $('placeCard');
		if (!card) return;
		$('placeName').textContent = place.name || 'Selected place';
		$('placeAddress').textContent = place.address || '';
		hide($('placePhoto'));
		var meta = $('placeMeta');
		meta.innerHTML = '';
		if (place.categories && place.categories[0]) meta.appendChild(pill('fa-tag', String(place.categories[0]).replace(/_/g, ' ')));
		var website = $('placeWebsite');
		if (place.website) { website.href = place.website; show(website); } else hide(website);
		var phone = $('placePhone');
		if (place.phone) { phone.href = 'tel:' + place.phone.replace(/\s/g, ''); show(phone); } else hide(phone);
		$('placeDirections').onclick = function () {
			destination = place;
			$('destInput').value = place.name;
			switchTab('route');
			if (!origin) useLocation(true); else calculateRoute();
		};
		show(card);
	}

	function pill(icon, text) {
		var element = document.createElement('span');
		element.className = 'meta-pill';
		element.innerHTML = '<i class="fas ' + icon + '" aria-hidden="true"></i> ';
		element.appendChild(document.createTextNode(text));
		return element;
	}

	function renderResults(features, label) {
		resultMarkers.forEach(function (marker) { marker.remove(); });
		resultMarkers = [];
		var list = $('resultsList');
		if (!list) return;
		list.innerHTML = '';
		$('resultsTitle').textContent = label || 'Results';
		(features || []).slice(0, 20).forEach(function (feature, index) {
			var place = normalizedFeature(feature);
			if (!Number.isFinite(place.lat) || !Number.isFinite(place.lng)) return;
			var marker;
			if (leafletFallback) {
				marker = L.marker([place.lat, place.lng]).addTo(map);
				marker.on('click', function () { selectPlace(place); });
			} else {
				marker = new maplibregl.Marker({ element: markerElement('#17997a') })
					.setLngLat([place.lng, place.lat]).addTo(map);
				marker.getElement().addEventListener('click', function () { selectPlace(place); });
			}
			resultMarkers.push(marker);
			var item = document.createElement('li');
			item.className = 'result-item';
			item.innerHTML = '<span class="result-index">' + (index + 1) + '</span><span><span class="result-name"></span><span class="result-sub"></span></span>';
			item.querySelector('.result-name').textContent = place.name;
			item.querySelector('.result-sub').textContent = place.address;
			item.addEventListener('click', function () { selectPlace(place); });
			list.appendChild(item);
		});
		show($('resultsBlock'));
	}

	function search(query) {
		if (!query) return;
		api('search', { text: query, lat: map.getCenter().lat, lon: map.getCenter().lng })
			.then(function (body) {
				renderResults(body.features, query);
				if (!body.features || !body.features.length) toast('No places matched "' + query + '".');
			}).catch(function (error) { toast(error.message); });
	}

	function suggestions(input, list, onPick) {
		if (!input || !list) return;
		var timer;
		on(input, 'input', function () {
			clearTimeout(timer);
			var text = input.value.trim();
			if (text.length < 2) { hide(list); return; }
			timer = setTimeout(function () {
				api('geocode', { text: text }).then(function (body) {
					list.innerHTML = '';
					(body.features || []).slice(0, 5).forEach(function (feature) {
						var place = normalizedFeature(feature);
						var item = document.createElement('li');
						item.className = 'suggestion-item';
						item.textContent = place.name + (place.address ? ', ' + place.address : '');
						item.addEventListener('click', function () { hide(list); onPick(place); });
						list.appendChild(item);
					});
					show(list);
				}).catch(function () { hide(list); });
			}, 250);
		});
		on(input, 'keydown', function (event) {
			if (event.key === 'Enter') {
				event.preventDefault();
				hide(list);
				if (input.value.trim()) search(input.value.trim());
			}
		});
	}

	function setEndpoint(place, field) {
		if (!place) return;
		if (field === 'origin') { origin = place; $('originInput').value = place.name; }
		else { destination = place; $('destInput').value = place.name; }
	}

	function useLocation(routeAfter) {
		if (!navigator.geolocation) return toast('Your browser does not support location sharing.');
		navigator.geolocation.getCurrentPosition(function (position) {
			origin = { name: 'My location', lat: position.coords.latitude, lng: position.coords.longitude };
			$('originInput').value = 'My location';
			removeMarker(userMarker);
			userMarker = leafletFallback
				? L.marker([origin.lat, origin.lng]).addTo(map)
				: new maplibregl.Marker({ element: markerElement('#17997a') }).setLngLat([origin.lng, origin.lat]).addTo(map);
			if (leafletFallback) map.flyTo([origin.lat, origin.lng], 15);
			else map.flyTo({ center: [origin.lng, origin.lat], zoom: 15 });
			if (routeAfter && destination) calculateRoute();
		}, function () { toast('Location permission denied. Type a starting point instead.'); });
	}

	function calculateRoute() {
		var start = origin;
		var end = destination;
		if (!start || !end) return toast('Choose both a starting point and a destination.');
		api('route', { start: start.lat + ',' + start.lng, end: end.lat + ',' + end.lng, mode: travelMode })
			.then(function (body) {
				var feature = body.features && body.features[0];
				if (!feature) throw new Error('No route found between those points.');
				drawRoute(feature);
				var properties = feature.properties || {};
				$('routeDistance').textContent = properties.distance ? (properties.distance / 1000).toFixed(1) + ' km' : '—';
				$('routeDuration').textContent = properties.time ? Math.round(properties.time / 60) + ' min' : '—';
				show($('routeSummary'));
				$('stepsList').innerHTML = '';
				toast('Route ready.');
			}).catch(function (error) { toast(error.message); });
	}

	function drawRoute(feature) {
		if (leafletFallback) {
			toast('Route drawing is unavailable in the WebGL fallback map.');
			return;
		}
		if (map.getSource('yola-route')) map.getSource('yola-route').setData(feature);
		else {
			map.addSource('yola-route', { type: 'geojson', data: feature });
			map.addLayer({ id: 'yola-route-line', type: 'line', source: 'yola-route', paint: { 'line-color': '#17997a', 'line-width': 5, 'line-opacity': 0.9 } });
		}
	}

	function switchTab(tab) {
		var searchTab = tab === 'search';
		['tabSearch', 'tabRoute'].forEach(function (id) { $(id).classList.toggle('is-active', $(id).id === (searchTab ? 'tabSearch' : 'tabRoute')); });
		$('paneSearch').hidden = !searchTab;
		$('paneRoute').hidden = searchTab;
	}

	function focusCard(card) {
		var heading = card.querySelector('h3, h2');
		var location = card.querySelector('.meta-item');
		var query = [heading && heading.textContent, location && location.textContent, 'Yola, Adamawa'].filter(Boolean).join(', ');
		var section = document.querySelector('.map-section');
		if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
		api('geocode', { text: query }).then(function (body) {
			var place = body.features && body.features[0] && normalizedFeature(body.features[0]);
			if (!place) throw new Error('This place could not be located yet.');
			selectPlace(place);
		}).catch(function (error) { toast(error.message); });
	}

	function wireControls() {
		on($('tabSearch'), 'click', function () { switchTab('search'); });
		on($('tabRoute'), 'click', function () { switchTab('route'); });
		on($('searchClear'), 'click', function () { $('searchInput').value = ''; hide($('searchSuggestions')); });
		on($('routeBtn'), 'click', calculateRoute);
		on($('routeClear'), 'click', function () {
			if (!leafletFallback && map.getLayer('yola-route-line')) map.removeLayer('yola-route-line');
			if (!leafletFallback && map.getSource('yola-route')) map.removeSource('yola-route');
			hide($('routeSummary'));
		});
		on($('useLocation'), 'click', function () { useLocation(false); });
		on($('ctrlLocate'), 'click', function () { useLocation(false); });
		on($('ctrlZoomIn'), 'click', function () { map.zoomIn(); });
		on($('ctrlZoomOut'), 'click', function () { map.zoomOut(); });
		on($('ctrlFullscreen'), 'click', function () { var stage = document.querySelector('.map-stage'); if (stage && stage.requestFullscreen) stage.requestFullscreen(); });
		on($('ctrlType'), 'click', function () { toast('OpenFreeMap provides the street basemap. Satellite imagery is not part of this free map source.'); });
		on($('placeClose'), 'click', function () { hide($('placeCard')); removeMarker(selectedMarker); selectedMarker = null; });
		on($('routeClear'), 'click', function () { origin = null; destination = null; $('originInput').value = ''; $('destInput').value = ''; });
		on($('searchInput'), 'keydown', function (event) { if (event.key === 'Enter') search(event.target.value.trim()); });
		document.querySelectorAll('.map-chip').forEach(function (chip) {
			on(chip, 'click', function () {
				api('search', { category: chip.getAttribute('data-query'), lat: map.getCenter().lat, lon: map.getCenter().lng })
					.then(function (body) { renderResults(body.features, chip.textContent.trim()); })
					.catch(function (error) { toast(error.message); });
			});
		});
		document.querySelectorAll('.mode-btn').forEach(function (button) { on(button, 'click', function () { document.querySelectorAll('.mode-btn').forEach(function (item) { item.classList.remove('is-active'); }); button.classList.add('is-active'); travelMode = button.getAttribute('data-mode').toLowerCase(); }); });
		var main = document.getElementById('main-content');
		on(main, 'click', function (event) { var button = event.target.closest('.map-btn'); if (!button) return; event.preventDefault(); var card = button.closest('.place-article'); if (card) focusCard(card); });
		suggestions($('searchInput'), $('searchSuggestions'), function (place) { selectPlace(place); });
		suggestions($('originInput'), $('originSuggestions'), function (place) { setEndpoint(place, 'origin'); });
		suggestions($('destInput'), $('destSuggestions'), function (place) { setEndpoint(place, 'destination'); });
	}

	function init() {
		if (initialized || !$('map')) return;
		initialized = true;
		if (!hasWebGL() || !window.maplibregl || (maplibregl.supported && !maplibregl.supported({ failIfMajorPerformanceCaveat: false }))) {
			if (window.L) {
				initLeafletFallback();
				return;
			}
			showMapFallback('This browser cannot create a WebGL map. Yola, Nigeria is shown as the default location.');
			return;
		}
		try {
			map = new maplibregl.Map({ container: 'map', style: 'https://tiles.openfreemap.org/styles/liberty', center: CENTER, zoom: 13, attributionControl: true });
			map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');
		} catch (error) {
			console.warn('MapLibre could not initialize:', error);
			if (window.L) {
				initLeafletFallback();
				return;
			}
			showMapFallback('The interactive map is unavailable in this browser. Yola, Nigeria is shown as the default location.');
			return;
		}
		map.on('click', function (event) {
			var place = { name: 'Pinned destination', address: event.lngLat.lng.toFixed(5) + ', ' + event.lngLat.lat.toFixed(5), lat: event.lngLat.lat, lng: event.lngLat.lng };
			destination = place;
			$('destInput').value = place.address;
			selectPlace(place);
		});
		map.on('load', function () { hide($('mapLoader')); toast('Map ready.'); });
		map.on('error', function (event) {
			if (event && event.error) console.warn('MapLibre map error:', event.error);
			hide($('mapLoader'));
		});
		wireControls();
	}

	function hasWebGL() {
		try {
			var canvas = document.createElement('canvas');
			return Boolean(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
		} catch (error) {
			return false;
		}
	}

	function initLeafletFallback() {
		leafletFallback = true;
		map = L.map('map', { zoomControl: true }).setView([CENTER[1], CENTER[0]], 13);
		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '&copy; OpenStreetMap contributors',
			maxZoom: 19
		}).addTo(map);
		hide($('mapLoader'));
		toast('Map ready.');
		map.on('click', function (event) {
			var place = { name: 'Pinned destination', address: event.latlng.lat.toFixed(5) + ', ' + event.latlng.lng.toFixed(5), lat: event.latlng.lat, lng: event.latlng.lng };
			destination = place;
			$('destInput').value = place.address;
			selectPlace(place);
		});
		wireControls();
	}

	function showMapFallback(message) {
		hide($('mapLoader'));
		var overlay = $('mapOverlay');
		if (!overlay) return;
		$('overlayTitle').textContent = 'Yola, Nigeria';
		$('overlayText').textContent = message;
		show(overlay);
	}

	window.initYolaMap = init;
	window.focusYolaPlace = function (place) { if (map) selectPlace(place); };
	if (document.readyState !== 'loading') init();
	else document.addEventListener('DOMContentLoaded', init);
})();
