/* ==========================================================================
   Wiener Urkundenbuch — Digital Edition
   Index page: search, filter, sort, preview
   ========================================================================== */

(function() {
    'use strict';

    var esc = EdCore.esc;

    function initIndex() {
        var filterPlace = document.getElementById('filter-place');
        var filterFacs = document.getElementById('filter-facs');
        var resultCount = document.getElementById('result-count');
        var activeFiltersEl = document.getElementById('active-filters');

        // State
        var allDocs = [];
        var state = {
            query: '',
            collection: '',
            place: '',
            facs: '',
            yearMin: 0,
            yearMax: 9999,
            sortKey: 'di',
            sortDir: 1,
            previewIdx: -1
        };

        var collectionLabels = {};
        var filteredDocs = [];

        // --- Table renderer ---
        var renderer = TableInfra.createTableRenderer({
            tbodyId: 'doc-tbody',
            noResultsId: 'no-results',
            colCount: 4,
            renderRow: function(doc, i, tr) {
                tr.setAttribute('data-idx', i);
                tr.innerHTML =
                    '<td class="col-idno"><a href="' + esc(doc.u) + '" class="doc-link">' + esc(doc.id) + '</a>' +
                    '<span class="cell-path">' + esc(doc.cp) + '</span></td>' +
                    '<td class="col-date">' + esc(doc.d) + '</td>' +
                    '<td class="col-place">' + esc(doc.p) + '</td>' +
                    '<td class="col-title"><span class="cell-title">' + esc(doc.t) + '</span></td>';
                tr.tabIndex = 0;
                tr.setAttribute('role', 'button');
                tr.setAttribute('aria-label', 'Vorschau f\u00fcr Nr. ' + doc.id);
                (function(idx) {
                    tr.addEventListener('click', function(e) {
                        if (e.target.closest('a')) return;
                        togglePreview(idx);
                    });
                    tr.addEventListener('keydown', function(e) {
                        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePreview(idx); }
                    });
                })(i);
            }
        });

        // --- Shared infrastructure ---
        TableInfra.setupSearch(state, applyFilters);
        TableInfra.setupSortHeaders('doc-table', state, applyFilters);

        // --- Range slider ---
        var rangeSlider = TableInfra.initRangeSlider(state, applyFilters);

        // --- Collection chips ---
        var chips = document.querySelectorAll('.collection-chips .chip');
        chips.forEach(function(chip) {
            chip.addEventListener('click', function() {
                var val = chip.getAttribute('data-collection');
                if (state.collection === val) {
                    state.collection = '';
                    chip.classList.remove('active');
                } else {
                    chips.forEach(function(c) { c.classList.remove('active'); });
                    state.collection = val;
                    chip.classList.add('active');
                }
                applyFilters();
            });
        });

        // --- Place filter ---
        if (filterPlace) {
            filterPlace.addEventListener('change', function() {
                state.place = filterPlace.value;
                applyFilters();
            });
        }

        // --- Facsimile filter ---
        if (filterFacs) {
            filterFacs.addEventListener('change', function() {
                state.facs = filterFacs.value;
                applyFilters();
            });
        }

        // --- Core filter logic ---
        function applyFilters() {
            state.previewIdx = -1;

            filteredDocs = allDocs.filter(function(doc) {
                if (state.collection && doc.cp !== state.collection) return false;
                if (state.place && doc.p !== state.place) return false;
                if (state.facs === '1' && !doc.f) return false;
                if (state.facs === '0' && doc.f) return false;

                // Year range
                if (state.yearMin > 0 && state.yearMax < 9999) {
                    var year = parseInt(doc.di);
                    if (isNaN(year) || year < state.yearMin || year > state.yearMax) return false;
                }

                // Text search (multi-word AND)
                if (state.query) {
                    var words = state.query.split(/\s+/);
                    for (var i = 0; i < words.length; i++) {
                        if (doc._s.indexOf(words[i]) === -1) return false;
                    }
                }

                return true;
            });

            filteredDocs.sort(function(a, b) {
                var va = a[state.sortKey] || '';
                var vb = b[state.sortKey] || '';
                if (va < vb) return -state.sortDir;
                if (va > vb) return state.sortDir;
                return 0;
            });

            renderer.render(filteredDocs);
            if (resultCount) resultCount.textContent = filteredDocs.length + ' Dokumente';
            updateActiveFilters();
        }

        // --- Preview row ---
        function togglePreview(idx) {
            var tbody = document.getElementById('doc-tbody');
            var existing = tbody.querySelector('.preview-row');
            if (existing) existing.remove();

            if (state.previewIdx === idx) { state.previewIdx = -1; return; }

            state.previewIdx = idx;
            var doc = filteredDocs[idx];
            var tr = tbody.querySelector('tr[data-idx="' + idx + '"]');
            if (!tr) return;

            var previewTr = document.createElement('tr');
            previewTr.className = 'preview-row';

            var thumbHtml = '';
            if (doc.fu) {
                thumbHtml = '<div class="preview-thumb"><img src="' + esc(doc.fu) + '" loading="lazy" alt="Faksimile"></div>';
            }

            previewTr.innerHTML =
                '<td colspan="4"><div class="doc-preview">' +
                '<div class="preview-text">' +
                '<p class="preview-regest">' + esc(doc.tf || doc.t) + '</p>' +
                '<div class="preview-meta">' +
                '<span>' + esc(doc.d) + '</span>' +
                (doc.p ? '<span>' + esc(doc.p) + '</span>' : '') +
                '<span>' + esc(doc.cl) + '</span>' +
                (doc.pc ? '<span>' + doc.pc + ' Personen</span>' : '') +
                '</div>' +
                '<a href="' + esc(doc.u) + '" class="preview-link">Dokument anzeigen \u2192</a>' +
                '</div>' +
                thumbHtml +
                '</div></td>';

            tr.after(previewTr);
        }

        // --- Filter helpers ---
        function clearFilter(key, uiReset) {
            return function() {
                state[key] = '';
                if (uiReset) uiReset();
                applyFilters();
            };
        }

        function updateActiveFilters() {
            if (!activeFiltersEl) return;
            activeFiltersEl.innerHTML = '';

            if (state.collection) {
                TableInfra.addFilterChip(activeFiltersEl, 'Sammlung: ' + (collectionLabels[state.collection] || state.collection),
                    clearFilter('collection', function() { chips.forEach(function(c) { c.classList.remove('active'); }); }));
            }
            if (state.place) {
                TableInfra.addFilterChip(activeFiltersEl, 'Ort: ' + state.place,
                    clearFilter('place', function() { if (filterPlace) filterPlace.value = ''; }));
            }
            if (state.facs) {
                TableInfra.addFilterChip(activeFiltersEl, state.facs === '1' ? 'Mit Faksimile' : 'Ohne Faksimile',
                    clearFilter('facs', function() { if (filterFacs) filterFacs.value = ''; }));
            }
            if (rangeSlider && rangeSlider.isFiltered()) {
                TableInfra.addFilterChip(activeFiltersEl, 'Zeitraum: ' + state.yearMin + '\u2013' + state.yearMax,
                    function() { rangeSlider.reset(); });
            }
        }

        // --- Load data from external JSON file ---
        var tbody = document.getElementById('doc-tbody');
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--color-text-muted)">Daten werden geladen\u2026</td></tr>';

        fetch('./data/search.json')
            .then(function(r) { return r.json(); })
            .then(function(data) {
                allDocs = data;
                // Pre-compute search strings and collection label map
                allDocs.forEach(function(doc) {
                    doc._s = (doc.t + ' ' + doc.d + ' ' + doc.p + ' ' + doc.id + ' ' + doc.cl).toLowerCase();
                    if (doc.cp && !collectionLabels[doc.cp]) collectionLabels[doc.cp] = doc.cl;
                });
                filteredDocs = allDocs.slice();
                applyFilters();
            })
            .catch(function(err) {
                console.warn('Suchdaten konnten nicht geladen werden:', err);
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--color-text-muted)">Daten konnten nicht geladen werden.</td></tr>';
            });
    }

    document.addEventListener('DOMContentLoaded', function() {
        if (document.getElementById('doc-table')) {
            initIndex();
        }
    });

})();
