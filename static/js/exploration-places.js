/* ==========================================================================
   Wiener Urkundenbuch — Digital Edition
   Exploration: Place Explorer (Epic D)
   Uses: ChartHelpers, DrillDown
   ========================================================================== */

(function() {
    'use strict';

    var esc = EdCore.esc;
    var fmt = ChartHelpers.fmt;
    var TOOLTIP_CLASS = 'explore-tooltip';

    function initPlaceExplorer() {
        if (!document.getElementById('explore-panel-map')) return;

        ChartHelpers.createTooltip(TOOLTIP_CLASS);
        var drillHandle = DrillDown.bind({});

        var epicD = null;
        var map = null;
        var markerGroup = null;
        var markerLookup = {};
        var selectedPlaceId = null;

        // State
        var state = {
            search: '',
            typeFilter: 'all',
            refFilter: 'all',
            geoFilter: 'all',
            sortField: 'doc_count',
            sortDir: -1,
            decadeMin: 1170,
            decadeMax: 1520
        };

        var timeActive = false;

        var TYPE_LABELS = {
            settlement: 'Siedlung',
            immo: 'Immobilie',
            street: 'Stra\u00dfe',
            river: 'Fluss'
        };

        var GEOREF_LABELS = {
            both: 'Koordinaten + GeoNames',
            coords: 'Koordinaten',
            geonames: 'GeoNames',
            none: '\u2014'
        };

        function georefStatus(p) {
            if (p.has_coords && p.has_geonames) return 'both';
            if (p.has_coords) return 'coords';
            if (p.has_geonames) return 'geonames';
            return 'none';
        }

        function placeInTimeRange(p) {
            if (!timeActive) return true;
            if (!p.decades || p.decades.length === 0) return true;
            for (var i = 0; i < p.decades.length; i++) {
                if (p.decades[i] >= state.decadeMin && p.decades[i] <= state.decadeMax) return true;
            }
            return false;
        }

        // -- Shared bindings --
        ChartHelpers.bindTimeRange('explore', state, function() {
            timeActive = (state.decadeMin > 1170 || state.decadeMax < 1520);
            if (epicD) {
                populateMap();
                renderTable();
            }
        });

        // -- Init Leaflet map --
        function initMap() {
            map = L.map('explore-map', {
                center: [48.2082, 16.3738],
                zoom: 11,
                scrollWheelZoom: true
            });

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                maxZoom: 18
            }).addTo(map);

            markerGroup = L.markerClusterGroup({
                maxClusterRadius: 40,
                showCoverageOnHover: false
            });
            map.addLayer(markerGroup);
        }

        // -- Populate map markers --
        function populateMap() {
            markerGroup.clearLayers();
            markerLookup = {};

            var placeColor = ChartHelpers.getToken('--anno-place') || '#3a7a5c';
            var mutedColor = ChartHelpers.getToken('--color-text-light') || '#b0a99f';

            var settlements = epicD.places.filter(function(p) {
                return p.type === 'settlement' && p.has_coords && p.lat != null && p.lng != null
                    && placeInTimeRange(p);
            });

            for (var i = 0; i < settlements.length; i++) {
                var p = settlements[i];
                var marker = L.circleMarker([p.lat, p.lng], {
                    radius: Math.min(5 + Math.sqrt(p.doc_count) * 1.5, 18),
                    fillColor: p.referenced ? placeColor : mutedColor,
                    color: '#fff',
                    weight: 1.5,
                    fillOpacity: 0.8
                });

                marker.bindPopup(buildPopup(p));
                marker._placeId = p.id;

                marker.on('click', function() {
                    highlightTableRow(this._placeId);
                });

                markerGroup.addLayer(marker);
                markerLookup[p.id] = marker;
            }

            var covEl = document.getElementById('explore-map-coverage');
            if (covEl) {
                var covText = settlements.length + ' Siedlungen';
                if (timeActive) covText += ' (' + state.decadeMin + '\u2013' + state.decadeMax + ')';
                covEl.textContent = covText;
            }

            if (settlements.length > 0) {
                map.fitBounds(markerGroup.getBounds(), { padding: [30, 30] });
            }
        }

        function buildPopup(p) {
            var h = '<div class="explore-map-popup">';
            h += '<strong>' + esc(p.name) + '</strong>';
            h += '<br>' + esc(TYPE_LABELS[p.type] || p.type);
            h += '<br>' + (p.doc_count || 0) + ' Dokumente';
            if (p.file_keys && p.file_keys.length > 0) {
                h += '<br><a href="#" class="explore-popup-docs" data-place-id="'
                   + esc(p.id) + '">Dokumente anzeigen</a>';
            }
            h += '</div>';
            return h;
        }

        // Delegate popup link clicks
        document.getElementById('explore-map').addEventListener('click', function(e) {
            var link = e.target.closest('.explore-popup-docs');
            if (!link) return;
            e.preventDefault();
            var pid = link.getAttribute('data-place-id');
            var place = epicD.places.find(function(p) { return p.id === pid; });
            if (place && place.file_keys) {
                DrillDown.open(drillHandle, esc(place.name) + ' \u2014 Dokumente', place.file_keys);
            }
        });

        // -- Render place table --
        var tbody = document.getElementById('explore-place-tbody');
        var footer = document.getElementById('explore-place-footer');

        function filteredPlaces() {
            return epicD.places.filter(function(p) {
                if (state.search) {
                    var q = state.search;
                    if (p.name.toLowerCase().indexOf(q) === -1 && p.id.toLowerCase().indexOf(q) === -1) return false;
                }
                if (state.typeFilter !== 'all' && p.type !== state.typeFilter) return false;
                if (state.refFilter === 'referenced' && !p.referenced) return false;
                if (state.refFilter === 'unreferenced' && p.referenced) return false;
                var gs = georefStatus(p);
                if (state.geoFilter === 'coords' && gs !== 'coords' && gs !== 'both') return false;
                if (state.geoFilter === 'geonames' && gs !== 'geonames') return false;
                if (state.geoFilter === 'none' && gs !== 'none') return false;
                if (!placeInTimeRange(p)) return false;
                return true;
            });
        }

        function sortPlaces(arr) {
            var field = state.sortField;
            var dir = state.sortDir;
            return arr.slice().sort(function(a, b) {
                var va, vb;
                if (field === 'name') { va = a.name.toLowerCase(); vb = b.name.toLowerCase(); }
                else if (field === 'type') { va = a.type; vb = b.type; }
                else if (field === 'doc_count') { va = a.doc_count; vb = b.doc_count; }
                else if (field === 'georef') {
                    var order = { both: 3, coords: 2, geonames: 1, none: 0 };
                    va = order[georefStatus(a)]; vb = order[georefStatus(b)];
                }
                else { va = a.name; vb = b.name; }
                if (va < vb) return -1 * dir;
                if (va > vb) return 1 * dir;
                return 0;
            });
        }

        var BATCH_SIZE = 100;
        var renderOffset = 0;
        var currentSorted = [];
        var sentinelObserver = null;

        function renderTable() {
            currentSorted = sortPlaces(filteredPlaces());
            renderOffset = 0;
            tbody.innerHTML = '';
            renderBatch();
            footer.textContent = currentSorted.length + ' von ' + epicD.places.length + ' Orten';
        }

        function renderBatch() {
            var end = Math.min(renderOffset + BATCH_SIZE, currentSorted.length);
            var frag = document.createDocumentFragment();
            for (var i = renderOffset; i < end; i++) {
                frag.appendChild(buildRow(currentSorted[i]));
            }
            var oldSentinel = tbody.querySelector('.explore-loading-more');
            if (oldSentinel) oldSentinel.remove();

            tbody.appendChild(frag);
            renderOffset = end;

            if (renderOffset < currentSorted.length) {
                var sentinel = document.createElement('tr');
                sentinel.className = 'explore-loading-more';
                sentinel.innerHTML = '<td colspan="4">Weitere laden\u2026</td>';
                tbody.appendChild(sentinel);
                observeSentinel(sentinel);
            }
        }

        function observeSentinel(el) {
            if (sentinelObserver) sentinelObserver.disconnect();
            if (!('IntersectionObserver' in window)) {
                renderOffset = 0;
                return;
            }
            sentinelObserver = new IntersectionObserver(function(entries) {
                if (entries[0].isIntersecting) {
                    sentinelObserver.disconnect();
                    renderBatch();
                }
            }, { root: document.getElementById('explore-place-table-wrap'), threshold: 0.1 });
            sentinelObserver.observe(el);
        }

        function buildRow(p) {
            var tr = document.createElement('tr');
            var gs = georefStatus(p);
            var mappable = p.type === 'settlement' && p.has_coords;
            tr.className = 'explore-place-row' + (mappable ? ' explore-place-row--mappable' : '');
            tr.setAttribute('data-place-id', p.id);

            if (p.id === selectedPlaceId) tr.classList.add('active');

            var typeClass = 'explore-place-type explore-place-type--' + (p.type || 'immo');
            tr.innerHTML = '<td>' + esc(p.name) + '</td>'
                + '<td><span class="' + typeClass + '">' + esc(TYPE_LABELS[p.type] || p.type || '\u2014') + '</span></td>'
                + '<td class="num">' + (p.doc_count || 0) + '</td>'
                + '<td><span class="explore-georef explore-georef--' + gs + '">'
                + esc(GEOREF_LABELS[gs]) + '</span></td>';

            tr.addEventListener('click', function() {
                var pid = this.getAttribute('data-place-id');
                if (mappable) {
                    centerMapOnPlace(pid);
                }
                var place = epicD.places.find(function(pp) { return pp.id === pid; });
                if (place && place.file_keys && place.file_keys.length > 0) {
                    DrillDown.open(drillHandle, esc(place.name) + ' \u2014 Dokumente', place.file_keys);
                }
            });

            return tr;
        }

        // -- Bidirectional linking --
        function highlightTableRow(placeId) {
            selectedPlaceId = placeId;
            var rows = tbody.querySelectorAll('.explore-place-row');
            for (var i = 0; i < rows.length; i++) {
                rows[i].classList.toggle('active', rows[i].getAttribute('data-place-id') === placeId);
            }
            var activeRow = tbody.querySelector('.explore-place-row.active');
            if (activeRow) {
                activeRow.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }

        function centerMapOnPlace(placeId) {
            selectedPlaceId = placeId;
            var marker = markerLookup[placeId];
            if (!marker) return;

            highlightTableRow(placeId);

            markerGroup.zoomToShowLayer(marker, function() {
                map.setView(marker.getLatLng(), Math.max(map.getZoom(), 14));
                marker.openPopup();
            });
        }

        // -- Filter bindings --
        var typeFilter = document.getElementById('explore-place-type-filter');
        var refFilter = document.getElementById('explore-place-ref-filter');
        var geoFilter = document.getElementById('explore-place-geo-filter');

        ChartHelpers.bindSearch('explore-place-search', function(q) {
            state.search = q;
            renderTable();
        });

        typeFilter.addEventListener('change', function() {
            state.typeFilter = this.value;
            renderTable();
        });
        refFilter.addEventListener('change', function() {
            state.refFilter = this.value;
            renderTable();
        });
        geoFilter.addEventListener('change', function() {
            state.geoFilter = this.value;
            renderTable();
        });

        // Sortable headers (places uses ▲/▼ arrows instead of ↑/↓)
        var sortHeaders = document.querySelectorAll('#explore-place-table th.sortable');
        for (var h = 0; h < sortHeaders.length; h++) {
            sortHeaders[h].style.cursor = 'pointer';
            sortHeaders[h].addEventListener('click', function() {
                var field = this.getAttribute('data-sort');
                if (state.sortField === field) {
                    state.sortDir *= -1;
                } else {
                    state.sortField = field;
                    state.sortDir = field === 'name' || field === 'type' ? 1 : -1;
                }
                for (var j = 0; j < sortHeaders.length; j++) {
                    var arrow = sortHeaders[j].querySelector('.sort-arrow');
                    if (sortHeaders[j].getAttribute('data-sort') === state.sortField) {
                        arrow.textContent = state.sortDir > 0 ? '\u25b2' : '\u25bc';
                    } else {
                        arrow.textContent = '';
                    }
                }
                renderTable();
            });
        }

        // -- Init: load data and render --
        initMap();

        ChartHelpers.loadJSON('./data/epic_d.json', 'explore-map', function(data) {
            epicD = data;
            populateMap();
            renderTable();
            var defaultArrow = document.querySelector('#explore-place-table th[data-sort="doc_count"] .sort-arrow');
            if (defaultArrow) defaultArrow.textContent = '\u25bc';
        });
    }

    document.addEventListener('DOMContentLoaded', function() {
        if (document.getElementById('exploration-page')) {
            initPlaceExplorer();
        }
    });

})();
