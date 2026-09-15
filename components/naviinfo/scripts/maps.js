/* Yola navigation map: MapLibre + OpenFreeMap + Geoapify proxy. */
(function () {
	'use strict';

	var CENTER = [12.4954, 9.2035];
	var MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/bright';
	var MAP_STYLE_FALLBACK_URL = 'https://tiles.openfreemap.org/styles/liberty';
	var map;
	var leafletFallback = false;
	var selectedMarker;
	var userMarker;
	var resultMarkers = [];
	var cardMarkers = [];
	var nearbyMarkers = [];
	var origin;
	var destination;
	var selectedPlace;
	var travelMode = 'drive';
	var initialized = false;
	var initializedContainer;
	var mapResizeObserver;
	var toastTimer;
	var satelliteEnabled = false;
	var satelliteTogglePending = true;
	var leafletStreetLayer;
	var leafletSatelliteLayer;
	var threeDEnabled = false;

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

	function cardPlaceId(card) {
		var heading = card.querySelector('h3, h2');
		return (heading ? heading.textContent : '')
			.toLowerCase()
			.replace(/&/g, ' and ')
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '');
	}

	function cardCoordinateKey(card) {
		var heading = card.querySelector('h3, h2');
		var location = card.querySelector('.meta-item');
		return [heading && heading.textContent, location && location.textContent, 'Yola, Adamawa'].filter(Boolean).join(', ').replace(/\s+/g, ' ').trim();
	}

	function hydrateCardCoordinates() {
		var cards = Array.prototype.slice.call(document.querySelectorAll('.place-article'));
		if (!cards.length) return;
		var verifiedCoordinates = window.YOLA_NAVIGATION_COORDINATES || {};

		cards.forEach(function (card) {
			var placeId = cardPlaceId(card);
			if (placeId) card.setAttribute('data-place-id', placeId);
			var coordinates = placeId && verifiedCoordinates[placeId];
			if (coordinates && Number.isFinite(Number(coordinates.lat)) && Number.isFinite(Number(coordinates.lng))) {
				card.setAttribute('data-lat', String(coordinates.lat));
				card.setAttribute('data-lng', String(coordinates.lng));
				card.setAttribute('data-coordinate-source', 'verified');
			}
		});
	}

	function markerElement(color, label) {
		var element = document.createElement('div');
		element.className = 'yola-map-marker';
		element.style.backgroundColor = color || '#064e3b';
		if (label) {
			var labelElement = document.createElement('span');
			labelElement.className = 'yola-map-marker-label';
			labelElement.textContent = label;
			element.appendChild(labelElement);
		}
		return element;
	}

	function removeMarker(marker) { if (marker) marker.remove(); }

	function update3DControl() {
		var control = $('ctrl3D');
		if (!control) return;
		var icon = control.querySelector('i');
		control.setAttribute('aria-label', threeDEnabled ? 'Switch to flat map view' : 'Open 3D view');
		control.setAttribute('title', threeDEnabled ? 'Flat map view' : '3D / 360 view');
		if (icon) {
			icon.classList.toggle('fa-cube', !threeDEnabled);
			icon.classList.toggle('fa-map', threeDEnabled);
		}
	}

	function addCardMarkers() {
		var cards = document.querySelectorAll('.place-article[data-lat][data-lng]');
		cardMarkers.forEach(function (marker) { marker.remove(); });
		cardMarkers = [];
		Array.prototype.forEach.call(cards, function (card) {
			var heading = card.querySelector('h3, h2');
			var name = heading ? heading.textContent.trim() : 'Place';
			var place = {
				name: name,
				address: 'Yola, Adamawa State',
				lat: Number(card.getAttribute('data-lat')),
				lng: Number(card.getAttribute('data-lng'))
			};
			if (!Number.isFinite(place.lat) || !Number.isFinite(place.lng)) return;
			var marker;
			if (leafletFallback) {
				marker = L.marker([place.lat, place.lng], { title: place.name }).addTo(map);
				marker.bindTooltip(place.name, { direction: 'top', offset: [0, -12] });
				marker.on('click', function () { selectPlace(place); });
			} else {
				marker = new maplibregl.Marker({ element: markerElement('#17997a', place.name) })
					.setLngLat([place.lng, place.lat])
					.setPopup(new maplibregl.Popup({ offset: 18 }).setText(place.name))
					.addTo(map);
				marker.getElement().setAttribute('aria-label', place.name);
				marker.getElement().addEventListener('click', function () { selectPlace(place); });
			}
			cardMarkers.push(marker);
		});
	}

	function renderNearbyPlaces(features) {
		nearbyMarkers.forEach(function (marker) { marker.remove(); });
		nearbyMarkers = [];
		var labelFeatures = [];
		(features || []).forEach(function (feature) {
			var place = normalizedFeature(feature);
			if (!Number.isFinite(place.lat) || !Number.isFinite(place.lng)) return;
			labelFeatures.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [place.lng, place.lat] }, properties: { name: place.name } });
			if (leafletFallback) {
				var leafletMarker = L.marker([place.lat, place.lng], { title: place.name }).addTo(map);
				leafletMarker.bindTooltip(place.name, { direction: 'top', offset: [0, -12] });
				leafletMarker.on('click', function () { selectPlace(place); });
				nearbyMarkers.push(leafletMarker);
				return;
			}
			var marker = new maplibregl.Marker({ element: markerElement('#d97706', place.name) })
				.setLngLat([place.lng, place.lat])
				.setPopup(new maplibregl.Popup({ offset: 18 }).setText(place.name))
				.addTo(map);
			marker.getElement().setAttribute('aria-label', place.name);
			marker.getElement().addEventListener('click', function () { selectPlace(place); });
			nearbyMarkers.push(marker);
		});
		if (!leafletFallback && map && map.isStyleLoaded()) {
			var labelData = { type: 'FeatureCollection', features: labelFeatures };
			if (map.getSource('yola-place-labels')) map.getSource('yola-place-labels').setData(labelData);
			else map.addSource('yola-place-labels', { type: 'geojson', data: labelData });
			if (!map.getLayer('yola-place-label-layer')) {
				map.addLayer({ id: 'yola-place-label-layer', type: 'symbol', source: 'yola-place-labels', layout: { 'text-field': ['get', 'name'], 'text-size': 11, 'text-offset': [0, 1.4], 'text-anchor': 'top', 'text-allow-overlap': true, 'text-ignore-placement': true }, paint: { 'text-color': '#17352d', 'text-halo-color': '#ffffff', 'text-halo-width': 2 } });
			}
		}
	}

	function resolveVectorLabelSource() {
		if (!map || !map.getStyle() || !map.getStyle().sources) return null;
		var sources = map.getStyle().sources;
		var preferred = ['openmaptiles', 'openfreemap', 'vector', 'maptiler_planet'];
		for (var i = 0; i < preferred.length; i++) {
			if (sources[preferred[i]]) return preferred[i];
		}
		var candidate = Object.keys(sources).find(function (id) {
			return sources[id] && sources[id].type === 'vector';
		});
		return candidate || null;
	}

	function ensureSatelliteBelowLabels() {
		if (leafletFallback || !map || !map.isStyleLoaded()) return;
		var style = map.getStyle();
		if (!style || !style.layers) return;
		var symbolLayers = style.layers.filter(function (layer) { return layer.type === 'symbol'; });
		var firstSymbolLayer = symbolLayers[0];
		if (map.getLayer('yola-satellite-layer') && firstSymbolLayer) {
			map.moveLayer('yola-satellite-layer', firstSymbolLayer.id);
		}
		['yola-place-label-layer', 'yola-road-label-layer', 'yola-geographic-label-layer', 'yola-poi-label-layer'].forEach(function (layerId) {
			if (map.getLayer(layerId)) map.moveLayer(layerId);
		});
	}

	function applyGoogleLikeLabelSettings() {
		if (leafletFallback || !map || !map.isStyleLoaded()) return;
		['yola-road-label-layer', 'yola-geographic-label-layer', 'yola-poi-label-layer', 'yola-place-label-layer'].forEach(function (layerId) {
			if (!map.getLayer(layerId)) return;
			try { map.setLayoutProperty(layerId, 'text-allow-overlap', true); } catch (error) {}
			try { map.setLayoutProperty(layerId, 'text-ignore-placement', true); } catch (error) {}
			try { map.setLayoutProperty(layerId, 'text-max-width', 8); } catch (error) {}
			try { map.setLayoutProperty(layerId, 'text-letter-spacing', 0.02); } catch (error) {}
			try { map.setPaintProperty(layerId, 'text-opacity', 1); } catch (error) {}
			try { map.setPaintProperty(layerId, 'text-halo-width', 2.5); } catch (error) {}
			try { map.setPaintProperty(layerId, 'text-halo-color', '#ffffff'); } catch (error) {}
		});
	}

	function addExplicitBasemapLabels() {
		if (leafletFallback || !map || !map.isStyleLoaded()) return;
		var sourceId = resolveVectorLabelSource();
		if (!sourceId) return;
		var textField = ['coalesce', ['get', 'name_en'], ['get', 'name:latin'], ['get', 'name']];
		var labelConfigs = [
			{ id: 'yola-road-label-layer', source: sourceId, 'source-layer': 'transportation_name', minzoom: 10, layout: { 'symbol-placement': 'line', 'text-field': textField, 'text-size': ['interpolate', ['linear'], ['zoom'], 10, 10, 16, 15], 'text-allow-overlap': true, 'text-ignore-placement': true }, paint: { 'text-color': '#2c3a3f', 'text-halo-color': '#ffffff', 'text-halo-width': 2.5, 'text-opacity': 1 } },
			{ id: 'yola-geographic-label-layer', source: sourceId, 'source-layer': 'place', minzoom: 4, layout: { 'text-field': textField, 'text-size': ['interpolate', ['linear'], ['zoom'], 4, 9, 13, 16], 'text-allow-overlap': true, 'text-ignore-placement': true }, paint: { 'text-color': '#1f2937', 'text-halo-color': '#ffffff', 'text-halo-width': 2.5, 'text-opacity': 1 } },
			{ id: 'yola-poi-label-layer', source: sourceId, 'source-layer': 'poi', minzoom: 12, layout: { 'text-field': textField, 'text-size': ['interpolate', ['linear'], ['zoom'], 12, 9, 17, 12], 'text-allow-overlap': true, 'text-ignore-placement': true }, paint: { 'text-color': '#244a42', 'text-halo-color': '#ffffff', 'text-halo-width': 2.5, 'text-opacity': 1 } }
		];
		labelConfigs.forEach(function (config) {
			if (!map.getLayer(config.id)) {
				map.addLayer(config, map.getLayer('yola-satellite-layer') ? 'yola-satellite-layer' : undefined);
			}
		});
		applyGoogleLikeLabelSettings();
		ensureSatelliteBelowLabels();
	}

	function loadNearbyPlaces() {
		var categories = 'catering,accommodation,commercial,education,healthcare,religion,leisure,tourism,service,man_made';
		var center = getMapCenter();
		api('search', { category: categories, lat: center.lat, lon: center.lng, limit: 200 })
			.then(function (body) { renderNearbyPlaces(body.features); })
			.catch(function () { toast('Nearby place labels are unavailable until the Geoapify service is configured.'); });
	}

	function toggle3D() {
		if (leafletFallback) {
			return toast('3D and 360-degree panoramic mode require MapLibre WebGL in this browser.');
		}
		if (!map) return;
		threeDEnabled = !threeDEnabled;
		map.easeTo({ pitch: threeDEnabled ? 60 : 0, bearing: threeDEnabled ? 25 : 0, duration: 900 });
		if (!threeDEnabled && map.isStyleLoaded()) {
			map.getStyle().layers.forEach(function (layer) {
				if (/^yola-3d-/.test(layer.id)) {
					try { map.removeLayer(layer.id); } catch (error) { }
				} else if (/building/i.test(layer.id) && map.getLayer(layer.id)) {
					try { map.setLayoutProperty(layer.id, 'visibility', 'visible'); } catch (error) { }
				}
			});
		} else if (threeDEnabled && map.isStyleLoaded()) {
			map.getStyle().layers.forEach(function (layer) {
				if (layer.type === 'fill-extrusion' || !/building/i.test(layer.id || '')) return;
				if (layer.type === 'fill' && map.getLayer(layer.id)) {
					try {
						map.setLayoutProperty(layer.id, 'visibility', 'none');
						map.addLayer({ id: 'yola-3d-' + layer.id, type: 'fill-extrusion', source: layer.source, 'source-layer': layer['source-layer'], minzoom: 14, paint: { 'fill-extrusion-color': '#b8c7c1', 'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 10], 'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0], 'fill-extrusion-opacity': 0.85 } });
					} catch (error) { }
				}
			});
		}
		update3DControl();
		toast(threeDEnabled ? '3D view enabled. Drag to rotate around Yola.' : 'Flat map view enabled.');
	}

	function updateSatelliteControl() {
		var control = $('ctrlType');
		if (!control) return;
		var icon = control.querySelector('i');
		control.setAttribute('aria-label', satelliteEnabled ? 'Switch to map view' : 'Switch to satellite view');
		control.setAttribute('title', satelliteEnabled ? 'Map view' : 'Satellite view');
		if (icon) {
			icon.classList.toggle('fa-satellite', !satelliteEnabled);
			icon.classList.toggle('fa-map', satelliteEnabled);
		}
	}

	function routeToSelectedPlace() {
		var activeDestination = destination || selectedPlace;
		var destinationText = $('destInput') && $('destInput').value.trim();
		if (!activeDestination || !Number.isFinite(activeDestination.lat) || !Number.isFinite(activeDestination.lng)) {
			if (!destinationText) {
				toast('Select a place on the map or enter a destination first.');
				return;
			}
			toast('Finding your destination...');
			api('geocode', { text: destinationText }).then(function (body) {
				var feature = body.features && body.features[0];
				if (!feature) throw new Error('Destination could not be found.');
				destination = normalizedFeature(feature);
				$('destInput').value = destination.name || destination.address || destinationText;
				switchTab('route');
				if (!origin) useLocation(true); else calculateRoute();
			}).catch(function (error) { toast(error.message); });
			return;
		}
		destination = activeDestination;
		$('destInput').value = activeDestination.name || activeDestination.address || 'Selected destination';
		switchTab('route');
		if (!origin) {
			useLocation(true);
			return;
		}
		calculateRoute();
	}

	function selectPlace(place, zoom) {
		if (!map || !place || !Number.isFinite(place.lat) || !Number.isFinite(place.lng)) return;
		selectedPlace = place;
		destination = place;
		$('destInput').value = place.name || place.address || 'Selected destination';
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
				marker = new maplibregl.Marker({ element: markerElement('#17997a', place.name) })
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

	function getMapCenter() {
		if (map && map.getCenter && typeof map.getCenter === 'function') {
			var center = map.getCenter();
			if (center && Number.isFinite(center.lat) && Number.isFinite(center.lng)) {
				return { lat: center.lat, lng: center.lng };
			}
		}
		return { lat: CENTER[1], lng: CENTER[0] };
	}

	function normalizeGeoapifyCategory(rawQuery) {
		var map = {
			restaurant: 'catering.restaurant',
			hotel: 'accommodation.hotel',
			gas_station: 'service.fuel',
			atm: 'service.financial.atm',
			hospital: 'healthcare.hospital',
			school: 'education.school',
			bank: 'service.financial.bank',
			park: 'leisure.park',
			religious: 'religion.place_of_worship',
			religious_center: 'religion.place_of_worship',
			commercial: 'commercial.supermarket',
			market: 'commercial.marketplace'
		};
		var key = String(rawQuery || '').trim().toLowerCase();
		return map[key] || key || '';
	}

	function search(query) {
		if (!query) return;
		var center = getMapCenter();
		api('search', { text: query, lat: center.lat, lon: center.lng })
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

	function toggleSatellite() {
		var nextSatelliteState = !satelliteEnabled;
		if (leafletFallback) {
			if (!leafletSatelliteLayer) {
				leafletSatelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
					attribution: 'Tiles &copy; Esri',
					maxZoom: 19
				});
			}
			if (nextSatelliteState) {
				if (leafletStreetLayer) leafletStreetLayer.remove();
				leafletSatelliteLayer.addTo(map);
			} else {
				leafletSatelliteLayer.remove();
				if (leafletStreetLayer) leafletStreetLayer.addTo(map);
			}
			satelliteEnabled = nextSatelliteState;
			updateSatelliteControl();
			return;
		}

		if (!map || !map.isStyleLoaded()) {
			satelliteTogglePending = true;
			return;
		}
		satelliteTogglePending = false;
		addExplicitBasemapLabels();
		if (nextSatelliteState) {
			if (!map.getSource('yola-satellite')) {
				map.addSource('yola-satellite', {
					type: 'raster',
					tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
					tileSize: 256,
					attribution: 'Tiles &copy; Esri'
				});
			}
			if (!map.getLayer('yola-satellite-layer')) {
				var firstSymbolLayer = map.getStyle().layers.find(function (layer) { return layer.type === 'symbol'; });
				map.addLayer({ id: 'yola-satellite-layer', type: 'raster', source: 'yola-satellite', paint: { 'raster-opacity': 1 } }, firstSymbolLayer && firstSymbolLayer.id);
			} else {
				var firstVisibleSymbolLayer = map.getStyle().layers.find(function (layer) { return layer.type === 'symbol' && (!layer.layout || layer.layout.visibility !== 'none'); });
				if (firstVisibleSymbolLayer) map.moveLayer('yola-satellite-layer', firstVisibleSymbolLayer.id);
			}
			['yola-road-label-layer', 'yola-geographic-label-layer', 'yola-poi-label-layer', 'yola-place-label-layer'].forEach(function (layerId) {
				if (map.getLayer(layerId)) {
					try { map.setLayoutProperty(layerId, 'text-allow-overlap', true); } catch (error) {}
					try { map.setLayoutProperty(layerId, 'text-ignore-placement', true); } catch (error) {}
					try { map.setPaintProperty(layerId, 'text-opacity', 1); } catch (error) {}
				}
			});
			ensureSatelliteBelowLabels();
		} else {
			if (map.getLayer('yola-satellite-layer')) map.removeLayer('yola-satellite-layer');
			if (map.getSource('yola-satellite')) map.removeSource('yola-satellite');
		}
		satelliteEnabled = nextSatelliteState;
		updateSatelliteControl();
	}

	function switchTab(tab) {
		var searchTab = tab === 'search';
		['tabSearch', 'tabRoute'].forEach(function (id) { $(id).classList.toggle('is-active', $(id).id === (searchTab ? 'tabSearch' : 'tabRoute')); });
		$('paneSearch').hidden = !searchTab;
		$('paneRoute').hidden = searchTab;
	}

	function resolveCardPlace(card) {
		var heading = card && card.querySelector('h3, h2');
		var location = card && card.querySelector('.meta-item');
		var rawLat = card && (card.getAttribute('data-lat') || card.dataset && card.dataset.lat);
		var rawLng = card && (card.getAttribute('data-lng') || card.dataset && card.dataset.lng);
		var lat = Number(rawLat);
		var lng = Number(rawLng);
        var name = heading && heading.textContent ? heading.textContent.trim() : 'Selected place';
        var address = location && location.textContent ? location.textContent.trim() : 'Yola, Adamawa State';

		if (Number.isFinite(lat) && Number.isFinite(lng)) {
			return {
				name: name,
				address: address,
				lat: lat,
				lng: lng
			};
		}

		var query = [name, address, 'Yola, Adamawa'].filter(Boolean).join(', ');
		return { query: query, name: name, address: address };
	}

	function focusCard(card) {
		var placeInfo = resolveCardPlace(card);
		if (!placeInfo || !Number.isFinite(placeInfo.lat) || !Number.isFinite(placeInfo.lng)) {
			window.alert('Coordinates for this place are not available yet.');
			return;
		}
		var mapSection = document.querySelector('.section3[data-category="Maps"], .map-section, .section3[data-category="maps"]');
		var mapChip = document.querySelector('.filter-chips .chip[data-filter="Maps"], .filter-chips .chip[data-filter="maps"]');
		if (mapSection && mapSection.classList.contains('section3')) {
			mapSection.hidden = false;
			mapSection.style.display = 'block';
		}
		var searchInput = document.querySelector('.search-bar input');
		if (searchInput) searchInput.value = '';
		if (mapChip) {
			document.querySelectorAll('.filter-chips .chip').forEach(function (chip) {
				chip.classList.remove('active');
				chip.setAttribute('aria-selected', 'false');
			});
			mapChip.classList.add('active');
			mapChip.setAttribute('aria-selected', 'true');
			if (typeof performSearch === 'function') {
				performSearch('', 'Maps');
			}
		}
		if (mapSection) {
			mapSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}

		selectPlace(placeInfo);
	}

	function wireControls() {
		on($('tabSearch'), 'click', function () { switchTab('search'); });
		on($('tabRoute'), 'click', function () { switchTab('route'); });
		on($('searchClear'), 'click', function () { $('searchInput').value = ''; hide($('searchSuggestions')); });
		on($('routeBtn'), 'click', calculateRoute);
		on($('routeClear'), 'click', function () {
			if (!leafletFallback && map && map.getLayer && map.getLayer('yola-route-line')) map.removeLayer('yola-route-line');
			if (!leafletFallback && map && map.getSource && map.getSource('yola-route')) map.removeSource('yola-route');
			hide($('routeSummary'));
		});
		on($('useLocation'), 'click', function () { useLocation(false); });
		on($('ctrlLocate'), 'click', function () { useLocation(false); });
		on($('ctrlRoute'), 'click', routeToSelectedPlace);
		on($('ctrlZoomIn'), 'click', function () { map.zoomIn(); });
		on($('ctrlZoomOut'), 'click', function () { map.zoomOut(); });
		on($('ctrlFullscreen'), 'click', function () { var stage = document.querySelector('.map-stage'); if (stage && stage.requestFullscreen) stage.requestFullscreen(); });
		on($('ctrlType'), 'click', toggleSatellite);
		on($('ctrl3D'), 'click', toggle3D);
		on($('placeClose'), 'click', function () { hide($('placeCard')); removeMarker(selectedMarker); selectedMarker = null; });
		on($('routeClear'), 'click', function () { origin = null; destination = null; selectedPlace = null; $('originInput').value = ''; $('destInput').value = ''; });
		on($('searchInput'), 'keydown', function (event) { if (event.key === 'Enter') search(event.target.value.trim()); });
		document.querySelectorAll('.map-chip').forEach(function (chip) {
			on(chip, 'click', function () {
				var center = getMapCenter();
				var category = normalizeGeoapifyCategory(chip.getAttribute('data-query'));
				api('search', { category: category, lat: center.lat, lon: center.lng })
					.then(function (body) { renderResults(body.features, chip.textContent.trim()); })
					.catch(function (error) { toast(error.message); });
			});
		});
		document.querySelectorAll('.mode-btn').forEach(function (button) { on(button, 'click', function () { document.querySelectorAll('.mode-btn').forEach(function (item) { item.classList.remove('is-active'); }); button.classList.add('is-active'); travelMode = button.getAttribute('data-mode').toLowerCase(); }); });
		var main = document.getElementById('main-content');
		on(main, 'click', function (event) { var button = event.target.closest('.map-btn'); if (!button) return; event.preventDefault(); var card = button.closest('.place-article'); if (card) focusCard(card); });
		hydrateCardCoordinates();
		suggestions($('searchInput'), $('searchSuggestions'), function (place) { selectPlace(place); });
		suggestions($('originInput'), $('originSuggestions'), function (place) { setEndpoint(place, 'origin'); });
		suggestions($('destInput'), $('destSuggestions'), function (place) { setEndpoint(place, 'destination'); });
	}

	function refreshMapSize() {
		if (!map) return;
		var container = document.querySelector('.map-stage, #map');
		if (container) {
			var rect = container.getBoundingClientRect();
			if (!rect.width || !rect.height) return;
		}
		try {
			map.resize();
		} catch (error) {}
		try {
			if (typeof map.invalidateSize === 'function') map.invalidateSize();
		} catch (error) {}
		try {
			if (typeof map._onResize === 'function') map._onResize();
		} catch (error) {}
	}

	function init() {
		var mapContainer = $('map');
		if (!mapContainer) return;
		if (initialized && initializedContainer === mapContainer) return;
		if (initialized && map && !leafletFallback && typeof map.remove === 'function') map.remove();
		initialized = true;
		initializedContainer = mapContainer;
		map = null;
		leafletFallback = false;
		satelliteEnabled = false;
		satelliteTogglePending = false;
		mapContainer.style.width = '100%';
		mapContainer.style.height = '100%';
		updateSatelliteControl();
		if (!hasWebGL() || !window.maplibregl || (maplibregl.supported && !maplibregl.supported({ failIfMajorPerformanceCaveat: false }))) {
			if (window.L) {
				initLeafletFallback();
				return;
			}
			showMapFallback('This browser cannot create a WebGL map. Yola, Nigeria is shown as the default location.');
			return;
		}
		try {
			map = new maplibregl.Map({
				container: 'map',
				style: MAP_STYLE_URL,
				center: CENTER,
				zoom: 13,
				attributionControl: true
			});
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
		map.on('load', function () {
			hide($('mapLoader'));
			toast('Map ready.');
			addExplicitBasemapLabels();
			applyGoogleLikeLabelSettings();
			addCardMarkers();
			loadNearbyPlaces();
			ensureSatelliteBelowLabels();
			requestAnimationFrame(function () {
				refreshMapSize();
				requestAnimationFrame(refreshMapSize);
			});
			setTimeout(refreshMapSize, 120);
			setTimeout(refreshMapSize, 500);
		});
		map.on('idle', function () {
			addExplicitBasemapLabels();
			applyGoogleLikeLabelSettings();
			ensureSatelliteBelowLabels();
			requestAnimationFrame(function () {
				refreshMapSize();
				requestAnimationFrame(refreshMapSize);
			});
		});
		var mapStage = mapContainer.closest('.map-stage');
		if (mapStage && 'ResizeObserver' in window) {
			if (mapResizeObserver) mapResizeObserver.disconnect();
			mapResizeObserver = new ResizeObserver(function () {
				requestAnimationFrame(function () {
					refreshMapSize();
					requestAnimationFrame(refreshMapSize);
				});
			});
			mapResizeObserver.observe(mapStage);
		}
		window.addEventListener('resize', refreshMapSize, { passive: true });
		setTimeout(function () {
			requestAnimationFrame(function () {
				refreshMapSize();
				requestAnimationFrame(refreshMapSize);
			});
		}, 150);
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
		leafletStreetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '&copy; OpenStreetMap contributors',
			maxZoom: 19
		}).addTo(map);
		toggleSatellite();
		addCardMarkers();
		loadNearbyPlaces();
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
