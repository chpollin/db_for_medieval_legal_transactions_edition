/* ==========================================================================
   Wiener Urkundenbuch — Digital Edition
   Client-side interactions
   ========================================================================== */

(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', function() {
        initNavDropdown();
        initNavHamburger();
        initTooltips();
        initFacsimileViewer();

        // Index page
        if (document.getElementById('doc-table')) {
            initIndex();
        }

        // Register page
        if (document.getElementById('register-table')) {
            initRegister();
        }

        // Statistics page
        if (document.getElementById('stats-data')) {
            initStatistics();
        }
    });


    /* ======================================================================
       Navigation dropdown
       ====================================================================== */

    function initNavDropdown() {
        var dropdowns = document.querySelectorAll('.nav-dropdown');
        dropdowns.forEach(function(dd) {
            var trigger = dd.querySelector('.nav-dropdown-trigger');
            if (!trigger) return;

            trigger.addEventListener('click', function(e) {
                e.stopPropagation();
                var isOpen = dd.classList.contains('open');
                // Close all
                dropdowns.forEach(function(d) { d.classList.remove('open'); });
                if (!isOpen) {
                    dd.classList.add('open');
                    trigger.setAttribute('aria-expanded', 'true');
                } else {
                    trigger.setAttribute('aria-expanded', 'false');
                }
            });
        });

        document.addEventListener('click', function() {
            dropdowns.forEach(function(d) {
                d.classList.remove('open');
                var t = d.querySelector('.nav-dropdown-trigger');
                if (t) t.setAttribute('aria-expanded', 'false');
            });
        });

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                dropdowns.forEach(function(d) {
                    d.classList.remove('open');
                    var t = d.querySelector('.nav-dropdown-trigger');
                    if (t) t.setAttribute('aria-expanded', 'false');
                });
            }
        });
    }


    /* ======================================================================
       Hamburger menu (responsive nav)
       ====================================================================== */

    function initNavHamburger() {
        var btn = document.getElementById('nav-hamburger');
        var links = document.getElementById('nav-links');
        if (!btn || !links) return;

        btn.addEventListener('click', function() {
            var isOpen = links.classList.toggle('open');
            btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });

        document.addEventListener('click', function(e) {
            if (!btn.contains(e.target) && !links.contains(e.target)) {
                links.classList.remove('open');
                btn.setAttribute('aria-expanded', 'false');
            }
        });
    }


    /* ======================================================================
       Tooltips (entity hover)
       ====================================================================== */

    function initTooltips() {
        var tooltip = document.createElement('div');
        tooltip.className = 'edition-tooltip';
        tooltip.innerHTML = '<span class="tooltip-type"></span><span class="tooltip-name"></span><span class="tooltip-id"></span>';
        document.body.appendChild(tooltip);

        var typeEl = tooltip.querySelector('.tooltip-type');
        var nameEl = tooltip.querySelector('.tooltip-name');
        var idEl = tooltip.querySelector('.tooltip-id');

        var typeLabels = {
            'anno-person': ['Person', 'tooltip-type-person'],
            'anno-org': ['Organisation', 'tooltip-type-org'],
            'anno-place': ['Ort', 'tooltip-type-place']
        };

        document.addEventListener('mouseover', function(e) {
            var target = e.target.closest('.anno-person, .anno-org, .anno-place');
            if (!target) return;

            var cls = target.classList.contains('anno-person') ? 'anno-person' :
                      target.classList.contains('anno-org') ? 'anno-org' : 'anno-place';
            var info = typeLabels[cls];
            var title = target.getAttribute('title') || '';
            var ref = target.getAttribute('data-ref') || '';

            var name = title.replace(/\s*\[.*\]\s*$/, '');

            typeEl.className = 'tooltip-type ' + info[1];
            typeEl.textContent = info[0];
            nameEl.textContent = name;
            idEl.textContent = ref;

            if (title) {
                target.setAttribute('data-title', title);
                target.removeAttribute('title');
            }

            tooltip.classList.add('visible');
        });

        document.addEventListener('mousemove', function(e) {
            if (!tooltip.classList.contains('visible')) return;
            var x = e.clientX + 12;
            var y = e.clientY + 16;
            var w = tooltip.offsetWidth;
            var h = tooltip.offsetHeight;
            if (x + w > window.innerWidth - 8) x = e.clientX - w - 8;
            if (y + h > window.innerHeight - 8) y = e.clientY - h - 8;
            tooltip.style.left = x + 'px';
            tooltip.style.top = y + 'px';
        });

        document.addEventListener('mouseout', function(e) {
            var target = e.target.closest('.anno-person, .anno-org, .anno-place');
            if (!target) return;
            tooltip.classList.remove('visible');
            var saved = target.getAttribute('data-title');
            if (saved) {
                target.setAttribute('title', saved);
                target.removeAttribute('data-title');
            }
        });
    }


    /* ======================================================================
       Facsimile viewer (synopsis mode — loads immediately)
       ====================================================================== */

    function initFacsimileViewer() {
        var urlScript = document.querySelector('.facs-urls');
        var facsUrls = [];
        if (urlScript) {
            try { facsUrls = JSON.parse(urlScript.textContent); } catch(e) { /* ignore */ }
        }
        if (!facsUrls.length) return;

        var currentPage = 0;
        var zoom = 1;
        var imgEl = document.getElementById('facs-image');
        var wrapEl = document.getElementById('facs-image-wrap');
        var currentEl = document.getElementById('facs-current');
        var prevBtn = document.querySelector('.facs-prev');
        var nextBtn = document.querySelector('.facs-next');
        var loaded = {};

        loadCurrentImage();

        function loadCurrentImage() {
            if (!imgEl || currentPage >= facsUrls.length) return;
            var url = facsUrls[currentPage];
            if (loaded[url]) { imgEl.src = url; return; }
            imgEl.classList.add('loading');
            imgEl.src = url;
            imgEl.onload = function() { imgEl.classList.remove('loading'); loaded[url] = true; };
            imgEl.onerror = function() { imgEl.classList.remove('loading'); imgEl.alt = 'Bild konnte nicht geladen werden'; };
        }

        if (prevBtn) prevBtn.addEventListener('click', function() {
            if (currentPage > 0) { currentPage--; updatePageControls(); loadCurrentImage(); }
        });
        if (nextBtn) nextBtn.addEventListener('click', function() {
            if (currentPage < facsUrls.length - 1) { currentPage++; updatePageControls(); loadCurrentImage(); }
        });

        function updatePageControls() {
            if (currentEl) currentEl.textContent = currentPage + 1;
            if (prevBtn) prevBtn.disabled = currentPage === 0;
            if (nextBtn) nextBtn.disabled = currentPage >= facsUrls.length - 1;
            resetZoom();
        }

        var zoomIn = document.querySelector('.facs-zoom-in');
        var zoomOut = document.querySelector('.facs-zoom-out');
        var zoomReset = document.querySelector('.facs-zoom-reset');

        if (zoomIn) zoomIn.addEventListener('click', function() { setZoom(zoom * 1.3); });
        if (zoomOut) zoomOut.addEventListener('click', function() { setZoom(zoom / 1.3); });
        if (zoomReset) zoomReset.addEventListener('click', resetZoom);

        function setZoom(z) {
            zoom = Math.max(0.5, Math.min(5, z));
            if (imgEl) imgEl.style.transform = 'scale(' + zoom + ')';
        }

        function resetZoom() {
            zoom = 1;
            if (imgEl) imgEl.style.transform = 'scale(1)';
        }

        if (wrapEl) {
            wrapEl.addEventListener('wheel', function(e) {
                e.preventDefault();
                var delta = e.deltaY > 0 ? 0.9 : 1.1;
                setZoom(zoom * delta);
            }, { passive: false });
        }
    }


    /* ======================================================================
       Range slider with histogram
       ====================================================================== */

    function initRangeSlider(state, applyFilters) {
        var slider = document.getElementById('range-slider');
        if (!slider) return null;

        var rangeMin = document.getElementById('range-min');
        var rangeMax = document.getElementById('range-max');
        var labelMin = document.getElementById('range-label-min');
        var labelMax = document.getElementById('range-label-max');
        var histogram = document.getElementById('range-histogram');
        var bars = histogram ? histogram.querySelectorAll('.range-bar') : [];

        var dataMin = parseInt(slider.dataset.min);
        var dataMax = parseInt(slider.dataset.max);

        state.yearMin = dataMin;
        state.yearMax = dataMax;

        // Track fill element
        var trackFill = document.createElement('div');
        trackFill.className = 'range-track-fill';
        slider.querySelector('.range-inputs').appendChild(trackFill);

        function updateSlider() {
            var minVal = parseInt(rangeMin.value);
            var maxVal = parseInt(rangeMax.value);

            // Prevent crossing
            if (minVal > maxVal) {
                if (this === rangeMin) {
                    rangeMin.value = maxVal;
                    minVal = maxVal;
                } else {
                    rangeMax.value = minVal;
                    maxVal = minVal;
                }
            }

            state.yearMin = minVal;
            state.yearMax = maxVal;

            // Percentages for positioning
            var range = dataMax - dataMin;
            var pctMin = range > 0 ? (minVal - dataMin) / range * 100 : 0;
            var pctMax = range > 0 ? (maxVal - dataMin) / range * 100 : 100;

            // Update labels — position them at handle locations
            labelMin.textContent = minVal;
            labelMax.textContent = maxVal;
            labelMin.style.left = pctMin + '%';
            labelMax.style.left = pctMax + '%';

            // Track fill position
            trackFill.style.left = pctMin + '%';
            trackFill.style.width = (pctMax - pctMin) + '%';

            // Histogram bar opacity
            bars.forEach(function(bar) {
                var decade = parseInt(bar.dataset.decade);
                var decadeEnd = decade + 9;
                if (decade >= minVal && decadeEnd <= maxVal) {
                    bar.className = 'range-bar in-range';
                } else if (decadeEnd < minVal || decade > maxVal) {
                    bar.className = 'range-bar out-of-range';
                } else {
                    bar.className = 'range-bar in-range';
                }
            });

            applyFilters();
        }

        rangeMin.addEventListener('input', updateSlider);
        rangeMax.addEventListener('input', updateSlider);

        // Initial track fill
        updateSlider.call(rangeMin);

        return {
            reset: function() {
                rangeMin.value = dataMin;
                rangeMax.value = dataMax;
                updateSlider.call(rangeMin);
            },
            isFiltered: function() {
                return state.yearMin > dataMin || state.yearMax < dataMax;
            }
        };
    }


    /* ======================================================================
       Shared table infrastructure (used by initIndex + initRegister)
       ====================================================================== */

    /**
     * Wire up debounced search input + clear button.
     */
    function setupSearch(state, applyFilters) {
        var searchInput = document.getElementById('search-input');
        var searchClear = document.getElementById('search-clear');
        if (!searchInput) return;
        var searchTimer;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(function() {
                state.query = searchInput.value.trim().toLowerCase();
                searchClear.classList.toggle('hidden', !state.query);
                applyFilters();
            }, 200);
        });
        searchClear.addEventListener('click', function() {
            searchInput.value = '';
            state.query = '';
            searchClear.classList.add('hidden');
            applyFilters();
        });
    }

    /**
     * Wire up sortable column headers on a table.
     */
    function setupSortHeaders(tableId, state, applyFilters) {
        var headers = document.querySelectorAll('#' + tableId + ' th[data-sort]');
        headers.forEach(function(th) {
            th.addEventListener('click', function() {
                var key = th.getAttribute('data-sort');
                if (state.sortKey === key) {
                    state.sortDir *= -1;
                } else {
                    state.sortKey = key;
                    state.sortDir = 1;
                }
                headers.forEach(function(h) { h.classList.remove('sorted-asc', 'sorted-desc'); });
                th.classList.add(state.sortDir === 1 ? 'sorted-asc' : 'sorted-desc');
                applyFilters();
            });
        });
    }

    /**
     * Create a progressive-rendering table engine.
     * config: {tbodyId, noResultsId, colCount, renderRow(item, index)}
     * Returns {render(items)}
     */
    function createTableRenderer(config) {
        var tbody = document.getElementById(config.tbodyId);
        var noResults = document.getElementById(config.noResultsId);
        var batchSize = config.batchSize || 100;
        var renderedCount = 0;
        var observer = null;
        var items = [];

        function renderTable() {
            tbody.innerHTML = '';
            renderedCount = 0;
            if (items.length === 0) { noResults.classList.remove('hidden'); return; }
            noResults.classList.add('hidden');
            renderBatch();
            setupScrollObserver();
        }

        function renderBatch() {
            var end = Math.min(renderedCount + batchSize, items.length);
            var fragment = document.createDocumentFragment();
            for (var i = renderedCount; i < end; i++) {
                var tr = document.createElement('tr');
                config.renderRow(items[i], i, tr);
                fragment.appendChild(tr);
            }
            tbody.appendChild(fragment);
            renderedCount = end;
        }

        function setupScrollObserver() {
            if (observer) observer.disconnect();
            if (renderedCount >= items.length) return;
            var sentinel = document.createElement('tr');
            sentinel.className = 'scroll-sentinel';
            sentinel.innerHTML = '<td colspan="' + config.colCount + '" style="height:1px;padding:0;border:none"></td>';
            tbody.appendChild(sentinel);
            observer = new IntersectionObserver(function(entries) {
                if (entries[0].isIntersecting && renderedCount < items.length) {
                    sentinel.remove();
                    renderBatch();
                    setupScrollObserver();
                }
            }, { rootMargin: '200px' });
            observer.observe(sentinel);
        }

        return {
            render: function(filteredItems) {
                items = filteredItems;
                renderTable();
            }
        };
    }

    /**
     * Create a filter chip and append it to a container.
     */
    function addFilterChip(container, label, onRemove) {
        var chip = document.createElement('span');
        chip.className = 'filter-chip';
        chip.innerHTML = esc(label) + ' <button aria-label="Filter entfernen">\u00D7</button>';
        chip.querySelector('button').addEventListener('click', onRemove);
        container.appendChild(chip);
    }


    /* ======================================================================
       Index page: search, filter, sort, preview
       ====================================================================== */

    function initIndex() {
        var dataScript = document.getElementById('search-data');
        if (!dataScript) return;
        var allDocs;
        try { allDocs = JSON.parse(dataScript.textContent); } catch(e) { return; }

        var filterPlace = document.getElementById('filter-place');
        var filterFacs = document.getElementById('filter-facs');
        var resultCount = document.getElementById('result-count');
        var activeFiltersEl = document.getElementById('active-filters');

        // State
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

        // Pre-compute search strings and collection label map
        var collectionLabels = {};
        allDocs.forEach(function(doc) {
            doc._s = (doc.t + ' ' + doc.d + ' ' + doc.p + ' ' + doc.id + ' ' + doc.cl).toLowerCase();
            if (doc.cp && !collectionLabels[doc.cp]) collectionLabels[doc.cp] = doc.cl;
        });

        var filteredDocs = allDocs.slice();

        // --- Table renderer ---
        var renderer = createTableRenderer({
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
        setupSearch(state, applyFilters);
        setupSortHeaders('doc-table', state, applyFilters);

        // --- Range slider ---
        var rangeSlider = initRangeSlider(state, applyFilters);

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
                addFilterChip(activeFiltersEl, 'Sammlung: ' + (collectionLabels[state.collection] || state.collection),
                    clearFilter('collection', function() { chips.forEach(function(c) { c.classList.remove('active'); }); }));
            }
            if (state.place) {
                addFilterChip(activeFiltersEl, 'Ort: ' + state.place,
                    clearFilter('place', function() { if (filterPlace) filterPlace.value = ''; }));
            }
            if (state.facs) {
                addFilterChip(activeFiltersEl, state.facs === '1' ? 'Mit Faksimile' : 'Ohne Faksimile',
                    clearFilter('facs', function() { if (filterFacs) filterFacs.value = ''; }));
            }
            if (rangeSlider && rangeSlider.isFiltered()) {
                addFilterChip(activeFiltersEl, 'Zeitraum: ' + state.yearMin + '\u2013' + state.yearMax,
                    function() { rangeSlider.reset(); });
            }
        }

        // --- Initial render ---
        applyFilters();
    }


    /* ======================================================================
       Register page: search, filter, sort
       ====================================================================== */

    function initRegister() {
        var dataScript = document.getElementById('register-data');
        if (!dataScript) return;
        var allEntries;
        try { allEntries = JSON.parse(dataScript.textContent); } catch(e) { return; }

        var table = document.getElementById('register-table');
        var regType = table.dataset.type;
        var filterType = document.getElementById('filter-type');
        var filterDocs = document.getElementById('filter-docs');
        var resultCount = document.getElementById('result-count');
        var activeFiltersEl = document.getElementById('active-filters');

        var state = {
            query: '',
            letter: '',
            typeFilter: '',
            docsFilter: '',
            sortKey: 'n',
            sortDir: 1
        };

        // Pre-compute search strings
        allEntries.forEach(function(entry) {
            entry._s = (entry.n + ' ' + entry.id + ' ' + (entry.tp || '') + ' ' + (entry.fn || '') + ' ' + (entry.sn || '')).toLowerCase();
            entry._fl = entry.n.charAt(0).toUpperCase();
        });

        var filteredEntries = allEntries.slice();
        var colCount = regType === 'persons' ? 5 : 4;

        // --- Table renderer ---
        var renderer = createTableRenderer({
            tbodyId: 'register-tbody',
            noResultsId: 'no-results',
            colCount: colCount,
            renderRow: function(entry, i, tr) {
                var html = '<td class="col-name"><span class="register-name">' + esc(entry.n) + '</span></td>';

                if (regType === 'persons') {
                    var sexLabel = entry.sex === 'm' ? 'm' : entry.sex === 'f' ? 'w' : '\u2013';
                    html += '<td class="col-sex">' + sexLabel + '</td>';
                    html += '<td class="col-death">' + esc(entry.d) + '</td>';
                } else {
                    html += '<td class="col-type">' + esc(entry.tp) + '</td>';
                }

                var dcClass = entry.dc === 0 ? 'doc-count-badge doc-count-zero' : 'doc-count-badge';
                html += '<td class="col-docs"><span class="' + dcClass + '">' + entry.dc + '</span></td>';
                html += '<td class="col-id"><span class="cell-id">' + esc(entry.id) + '</span></td>';

                tr.innerHTML = html;
            }
        });

        // --- Shared infrastructure ---
        setupSearch(state, applyFilters);
        setupSortHeaders('register-table', state, applyFilters);

        // --- Alphabet bar ---
        var alphaBtns = document.querySelectorAll('.alpha-btn');
        alphaBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                var letter = btn.dataset.letter;
                if (state.letter === letter) {
                    state.letter = '';
                } else {
                    state.letter = letter;
                }
                alphaBtns.forEach(function(b) { b.classList.remove('active'); });
                if (state.letter) {
                    btn.classList.add('active');
                } else {
                    document.querySelector('.alpha-btn-all').classList.add('active');
                }
                applyFilters();
            });
        });

        // --- Type filter ---
        if (filterType) {
            filterType.addEventListener('change', function() {
                state.typeFilter = filterType.value;
                applyFilters();
            });
        }

        // --- Docs filter ---
        if (filterDocs) {
            filterDocs.addEventListener('change', function() {
                state.docsFilter = filterDocs.value;
                applyFilters();
            });
        }

        // --- Core filter ---
        function applyFilters() {
            filteredEntries = allEntries.filter(function(entry) {
                if (state.letter && entry._fl !== state.letter) return false;

                if (state.typeFilter) {
                    var field = regType === 'persons' ? entry.sex : entry.tp;
                    if (field !== state.typeFilter) return false;
                }

                if (state.docsFilter === '1' && entry.dc === 0) return false;
                if (state.docsFilter === '0' && entry.dc > 0) return false;

                if (state.query) {
                    var words = state.query.split(/\s+/);
                    for (var i = 0; i < words.length; i++) {
                        if (entry._s.indexOf(words[i]) === -1) return false;
                    }
                }

                return true;
            });

            // Sort
            filteredEntries.sort(function(a, b) {
                var va, vb;
                if (state.sortKey === 'dc') {
                    va = a.dc; vb = b.dc;
                } else {
                    va = (a[state.sortKey] || '').toLowerCase();
                    vb = (b[state.sortKey] || '').toLowerCase();
                }
                if (va < vb) return -state.sortDir;
                if (va > vb) return state.sortDir;
                return 0;
            });

            renderer.render(filteredEntries);
            if (resultCount) resultCount.textContent = filteredEntries.length + ' Eintr\u00e4ge';
            updateActiveFilters();
        }

        function updateActiveFilters() {
            if (!activeFiltersEl) return;
            activeFiltersEl.innerHTML = '';

            if (state.letter) {
                addFilterChip(activeFiltersEl, 'Buchstabe: ' + state.letter, function() {
                    state.letter = '';
                    alphaBtns.forEach(function(b) { b.classList.remove('active'); });
                    document.querySelector('.alpha-btn-all').classList.add('active');
                    applyFilters();
                });
            }
            if (state.typeFilter) {
                addFilterChip(activeFiltersEl, (regType === 'persons' ? 'Geschlecht' : 'Typ') + ': ' + state.typeFilter, function() {
                    state.typeFilter = '';
                    if (filterType) filterType.value = '';
                    applyFilters();
                });
            }
            if (state.docsFilter) {
                addFilterChip(activeFiltersEl, state.docsFilter === '1' ? 'Mit Dokumenten' : 'Ohne Dokumente', function() {
                    state.docsFilter = '';
                    if (filterDocs) filterDocs.value = '';
                    applyFilters();
                });
            }
        }

        // Initial render
        applyFilters();
    }


    /* ======================================================================
       Statistics dashboard: SVG charts + cross-filtering
       ====================================================================== */

    function initStatistics() {
        var dataScript = document.getElementById('stats-data');
        if (!dataScript) return;
        var data;
        try { data = JSON.parse(dataScript.textContent); } catch(e) { return; }

        var SVG_NS = 'http://www.w3.org/2000/svg';

        // --- State ---
        var state = { selectedCollection: null };

        // --- German labels ---
        var ROLE_LABELS = {
            issuer: 'Aussteller*innen', recipient: 'Empfänger*innen',
            witness: 'Zeug*innen', other: 'Sonstige'
        };
        var ROLE_ORDER = ['issuer', 'recipient', 'witness', 'other'];

        var ANNO_TYPE_LABELS = {
            events: 'Ereignisse', functions: 'Funktionen',
            persons: 'Personen', orgs: 'Organisationen',
            rolenames: 'Rollennamen', triggerstrings: 'Formeln'
        };
        var ANNO_TYPE_ORDER = ['persons', 'orgs', 'events', 'functions', 'rolenames', 'triggerstrings'];

        // CSS variable references for JS-created SVG fills
        var ROLE_COLORS = {
            issuer: '#b85c2f', recipient: '#2e7a88',
            witness: '#6b6040', other: '#7a6b8c'
        };
        var ENTITY_COLORS = {
            persons: '#2e5a88', orgs: '#7b4d8e', places: '#3a7a5c'
        };
        var ANNO_TYPE_COLORS = {
            persons: '#2e5a88', orgs: '#7b4d8e',
            events: '#8c5a2e', functions: '#b85c2f',
            rolenames: '#6b6560', triggerstrings: '#6b6040'
        };
        var BAR_COLOR = '#2e5a88';
        var BAR_COLOR_DIM = '#d0ccc6';

        // Gender colors (muted academic palette)
        var SEX_COLORS = { m: '#5a7fa0', f: '#b8696e' };
        var SEX_LABELS = { m: 'Männer', f: 'Frauen' };

        // Collection accent colors (cycle)
        var COLL_COLORS = ['#2e5a88', '#7b4d8e', '#3a7a5c', '#b85c2f', '#2e7a88', '#6b6040'];

        // --- Number formatting ---
        function fmt(n) {
            return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        }

        // --- SVG helpers ---
        function svgEl(tag, attrs) {
            var el = document.createElementNS(SVG_NS, tag);
            if (attrs) {
                for (var k in attrs) {
                    if (attrs.hasOwnProperty(k)) el.setAttribute(k, attrs[k]);
                }
            }
            return el;
        }

        // --- Tooltip ---
        var tooltip = document.createElement('div');
        tooltip.className = 'stats-tooltip';
        document.body.appendChild(tooltip);
        var tooltipTimer = null;

        function showTooltip(html, x, y) {
            tooltip.innerHTML = html;
            tooltip.classList.add('visible');
            var w = tooltip.offsetWidth;
            var h = tooltip.offsetHeight;
            var tx = x + 14;
            var ty = y + 18;
            if (tx + w > window.innerWidth - 8) tx = x - w - 8;
            if (ty + h > window.innerHeight - 8) ty = y - h - 8;
            tooltip.style.left = tx + 'px';
            tooltip.style.top = ty + 'px';
        }

        function hideTooltip() {
            tooltip.classList.remove('visible');
            if (tooltipTimer) { clearTimeout(tooltipTimer); tooltipTimer = null; }
        }

        // Touch support: tap to show, tap elsewhere to dismiss
        document.addEventListener('touchstart', function(e) {
            if (!tooltip.contains(e.target) && !e.target.closest('[data-tip]')) {
                hideTooltip();
            }
        });

        // --- KPI scroll links ---
        var kpiCards = document.querySelectorAll('.stats-kpi[data-scroll]');
        kpiCards.forEach(function(card) {
            card.style.cursor = 'pointer';
            card.addEventListener('click', function() {
                var target = document.getElementById(card.getAttribute('data-scroll'));
                if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        });

        // --- Active filter bar ---
        var filterBar = document.getElementById('stats-active-filter');
        var filterText = document.getElementById('stats-active-filter-text');
        var filterClear = document.getElementById('stats-active-filter-clear');
        if (filterClear) {
            filterClear.addEventListener('click', function() { clearFilter(); });
        }

        function showFilterBar(label) {
            if (filterText) filterText.textContent = 'Sammlung: ' + label;
            if (filterBar) filterBar.classList.remove('hidden');
        }
        function hideFilterBar() {
            if (filterBar) filterBar.classList.add('hidden');
        }


        /* ---- Timeline chart ---- */

        function renderTimeline() {
            var container = document.getElementById('timeline-chart');
            if (!container) return;
            container.innerHTML = '';

            var tl = data.timeline;
            if (!tl || !tl.length) return;

            var cw = container.clientWidth || 800;
            var margin = { top: 20, right: 16, bottom: 44, left: 50 };
            var w = cw;
            var h = 240;
            var chartW = w - margin.left - margin.right;
            var chartH = h - margin.top - margin.bottom;

            var maxCount = 0;
            tl.forEach(function(d) { if (d.count > maxCount) maxCount = d.count; });
            var niceMax = Math.ceil(maxCount / 100) * 100 || 100;

            var barW = Math.max(4, (chartW / tl.length) - 2);
            var gap = Math.max(1, (chartW - barW * tl.length) / (tl.length - 1 || 1));

            var svg = svgEl('svg', { width: w, height: h, viewBox: '0 0 ' + w + ' ' + h });
            svg.style.display = 'block';
            svg.style.width = '100%';
            svg.style.height = 'auto';

            // Y-axis gridlines + labels
            var ticks = [];
            var step = niceMax <= 200 ? 50 : niceMax <= 500 ? 100 : 200;
            for (var t = 0; t <= niceMax; t += step) ticks.push(t);

            ticks.forEach(function(tick) {
                var y = margin.top + chartH - (tick / niceMax * chartH);
                // gridline
                svg.appendChild(svgEl('line', {
                    x1: margin.left, y1: y, x2: w - margin.right, y2: y,
                    stroke: '#ece8e2', 'stroke-width': 1, 'stroke-dasharray': tick === 0 ? 'none' : '3,3'
                }));
                // label
                var label = svgEl('text', {
                    x: margin.left - 8, y: y + 4,
                    'text-anchor': 'end', fill: '#8c8680',
                    'font-family': 'Inter, sans-serif', 'font-size': '11'
                });
                label.textContent = tick;
                svg.appendChild(label);
            });

            // Bars
            tl.forEach(function(d, i) {
                var x = margin.left + i * (barW + gap);
                var barH = d.count > 0 ? Math.max(2, (d.count / niceMax) * chartH) : 0;
                var y = margin.top + chartH - barH;

                var isSelected = !state.selectedCollection;
                var collCount = 0;
                if (state.selectedCollection) {
                    var coll = data.collections.find(function(c) { return c.path === state.selectedCollection; });
                    if (coll && coll.decades) collCount = coll.decades[d.decade] || 0;
                }

                if (state.selectedCollection && d.count > 0) {
                    // Dim background bar
                    svg.appendChild(svgEl('rect', {
                        x: x, y: y, width: barW, height: barH,
                        rx: 2, fill: BAR_COLOR_DIM, opacity: '0.5'
                    }));
                    // Selected collection bar on top
                    if (collCount > 0) {
                        var selH = Math.max(2, (collCount / niceMax) * chartH);
                        svg.appendChild(svgEl('rect', {
                            x: x, y: margin.top + chartH - selH, width: barW, height: selH,
                            rx: 2, fill: BAR_COLOR, opacity: '0.8'
                        }));
                    }
                } else if (d.count > 0) {
                    svg.appendChild(svgEl('rect', {
                        x: x, y: y, width: barW, height: barH,
                        rx: 2, fill: BAR_COLOR, opacity: '0.65',
                        'class': 'stats-bar-rect'
                    }));
                }

                // Invisible hit target
                var hit = svgEl('rect', {
                    x: x - gap / 2, y: margin.top, width: barW + gap, height: chartH,
                    fill: 'transparent', 'data-tip': '1'
                });
                hit.addEventListener('mouseenter', function(e) {
                    var tipText = '<strong>' + d.decade + 'er</strong>: ' + fmt(d.count) + ' Dokumente';
                    if (state.selectedCollection && collCount > 0) {
                        tipText += '<br><small>davon ' + fmt(collCount) + ' in gewählter Sammlung</small>';
                    }
                    showTooltip(tipText, e.clientX, e.clientY);
                    // Highlight bar
                    var bars = svg.querySelectorAll('.stats-bar-rect');
                    bars.forEach(function(b, bi) {
                        b.setAttribute('opacity', bi === i ? '1' : '0.4');
                    });
                });
                hit.addEventListener('mousemove', function(e) {
                    showTooltip(tooltip.innerHTML, e.clientX, e.clientY);
                });
                hit.addEventListener('mouseleave', function() {
                    hideTooltip();
                    var bars = svg.querySelectorAll('.stats-bar-rect');
                    bars.forEach(function(b) { b.setAttribute('opacity', '0.65'); });
                });
                hit.addEventListener('touchstart', function(e) {
                    e.preventDefault();
                    var touch = e.touches[0];
                    var tipText = '<strong>' + d.decade + 'er</strong>: ' + fmt(d.count) + ' Dok.';
                    showTooltip(tipText, touch.clientX, touch.clientY);
                    tooltipTimer = setTimeout(hideTooltip, 3000);
                });
                svg.appendChild(hit);

                // X-axis labels (every 3rd bar)
                if (i % 3 === 0) {
                    var lbl = svgEl('text', {
                        x: x + barW / 2, y: h - 6,
                        'text-anchor': 'middle', fill: '#8c8680',
                        'font-family': 'Inter, sans-serif', 'font-size': '10'
                    });
                    lbl.textContent = d.decade;
                    svg.appendChild(lbl);
                }
            });

            container.appendChild(svg);

            // Century chips
            renderCenturyChips();
        }

        function renderCenturyChips() {
            var container = document.getElementById('century-chips');
            if (!container) return;
            container.innerHTML = '';
            var centuries = data.centuries || [];
            centuries.forEach(function(c) {
                var chip = document.createElement('span');
                chip.className = 'stats-century-chip';
                chip.textContent = Math.floor(c.century / 100 + 1) + '. Jh.: ' + fmt(c.count);
                container.appendChild(chip);
            });
        }


        /* ---- Collection cards ---- */

        function renderCollections() {
            var container = document.getElementById('collection-grid');
            if (!container) return;
            container.innerHTML = '';

            data.collections.forEach(function(coll, idx) {
                var card = document.createElement('div');
                card.className = 'stats-collection-card';
                card.style.borderLeftColor = COLL_COLORS[idx % COLL_COLORS.length];

                if (state.selectedCollection === coll.path) {
                    card.classList.add('active');
                } else if (state.selectedCollection && state.selectedCollection !== coll.path) {
                    card.classList.add('dimmed');
                }

                card.innerHTML =
                    '<div class="stats-coll-header">' +
                        '<span class="stats-coll-label">' + esc(coll.label) + '</span>' +
                        '<span class="stats-coll-count">' + fmt(coll.docs) + ' Dok.</span>' +
                    '</div>' +
                    '<div class="stats-coll-meta">' +
                        '<span>' + esc(coll.dateRange) + '</span>' +
                        '<span>\u2300 ' + coll.avgPersons + ' Pers./Dok.</span>' +
                        '<span>' + coll.facsPct + '% Faksimile</span>' +
                    '</div>' +
                    '<div class="stats-coll-bar-track">' +
                        '<div class="stats-coll-bar-fill" style="width:' + coll.pctOfTotal + '%;background:' + COLL_COLORS[idx % COLL_COLORS.length] + '"></div>' +
                    '</div>' +
                    '<span class="stats-coll-pct">' + coll.pctOfTotal + '% des Korpus</span>';

                card.addEventListener('click', function() {
                    if (state.selectedCollection === coll.path) {
                        clearFilter();
                    } else {
                        selectCollection(coll.path, coll.label);
                    }
                });
                card.style.cursor = 'pointer';
                container.appendChild(card);
            });
        }


        /* ---- Function roles (stacked bar) ---- */

        function renderRoles() {
            var container = document.getElementById('role-chart');
            var introEl = document.getElementById('roles-intro');
            if (!container) return;
            container.innerHTML = '';

            var rawRoles = state.selectedCollection
                ? _getCollectionField('fnRoles')
                : data.fnRoles;
            // Merge non-standard roles into "other"
            var roles = { issuer: 0, recipient: 0, witness: 0, other: 0 };
            for (var rk in rawRoles) {
                if (rawRoles.hasOwnProperty(rk)) {
                    if (roles.hasOwnProperty(rk)) {
                        roles[rk] += rawRoles[rk];
                    } else {
                        roles.other += rawRoles[rk];
                    }
                }
            }
            var total = 0;
            ROLE_ORDER.forEach(function(r) { total += (roles[r] || 0); });

            if (introEl) {
                introEl.textContent = fmt(total) + ' Rollenmarkierungen in vier Kategorien';
            }

            // Stacked bar
            var barH = 36;
            var cw = container.clientWidth || 600;
            var svg = svgEl('svg', { width: cw, height: barH, viewBox: '0 0 ' + cw + ' ' + barH });
            svg.style.display = 'block';
            svg.style.width = '100%';
            svg.style.height = barH + 'px';
            svg.style.borderRadius = '4px';
            svg.style.overflow = 'hidden';

            var x = 0;
            ROLE_ORDER.forEach(function(role) {
                var count = roles[role] || 0;
                var w = total > 0 ? (count / total) * cw : 0;
                if (w < 1 && count > 0) w = 1;
                var rect = svgEl('rect', {
                    x: x, y: 0, width: w, height: barH,
                    fill: ROLE_COLORS[role], 'data-tip': '1'
                });
                rect.addEventListener('mouseenter', function(e) {
                    var pct = total > 0 ? (count / total * 100).toFixed(1) : '0';
                    showTooltip('<strong>' + ROLE_LABELS[role] + '</strong>: ' + fmt(count) + ' (' + pct + '%)', e.clientX, e.clientY);
                });
                rect.addEventListener('mousemove', function(e) {
                    showTooltip(tooltip.innerHTML, e.clientX, e.clientY);
                });
                rect.addEventListener('mouseleave', hideTooltip);
                svg.appendChild(rect);
                x += w;
            });
            container.appendChild(svg);

            // Metric blocks
            var metricsEl = document.getElementById('role-metrics');
            if (!metricsEl) return;
            metricsEl.innerHTML = '';
            ROLE_ORDER.forEach(function(role) {
                var count = roles[role] || 0;
                var pct = total > 0 ? (count / total * 100).toFixed(1) : '0';
                var block = document.createElement('div');
                block.className = 'stats-role-block';
                block.innerHTML =
                    '<span class="stats-dot" style="background:' + ROLE_COLORS[role] + '"></span>' +
                    '<span class="stats-role-name">' + ROLE_LABELS[role] + '</span>' +
                    '<span class="stats-role-value">' + fmt(count) + '</span>' +
                    '<span class="stats-role-pct">' + pct + '%</span>';
                metricsEl.appendChild(block);
            });
        }

        function _getCollectionField(field) {
            var coll = data.collections.find(function(c) { return c.path === state.selectedCollection; });
            return (coll && coll[field]) ? coll[field] : {};
        }

        function _createGenderSeg(track, sex, count, pct, roleLabel) {
            var seg = document.createElement('div');
            seg.className = 'stats-gender-bar-seg stats-gender-' + sex;
            seg.style.width = pct.toFixed(1) + '%';
            seg.setAttribute('data-tip', '1');
            seg.addEventListener('mouseenter', function(e) {
                showTooltip('<strong>' + roleLabel + ' — ' + SEX_LABELS[sex] + '</strong>: ' +
                    fmt(count) + ' (' + pct.toFixed(1) + '%)', e.clientX, e.clientY);
            });
            seg.addEventListener('mousemove', function(e) { showTooltip(tooltip.innerHTML, e.clientX, e.clientY); });
            seg.addEventListener('mouseleave', hideTooltip);
            track.appendChild(seg);
        }

        var _genderLegendRendered = false;

        function renderRoleGender() {
            var container = document.getElementById('role-gender-chart');
            if (!container) return;
            container.innerHTML = '';

            var rawSex = state.selectedCollection
                ? _getCollectionField('fnRolesSex')
                : data.fnRolesSex;
            if (!rawSex) return;

            ROLE_ORDER.forEach(function(role) {
                var sexCounts = rawSex[role] || {};
                var mCount = sexCounts.m || 0;
                var fCount = sexCounts.f || 0;
                var total = mCount + fCount;
                if (total === 0) return;

                var row = document.createElement('div');
                row.className = 'stats-gender-row';

                var label = document.createElement('span');
                label.className = 'stats-gender-label';
                label.textContent = ROLE_LABELS[role];
                row.appendChild(label);

                var track = document.createElement('div');
                track.className = 'stats-gender-bar-track';
                var fPct = fCount / total * 100;
                var mPct = mCount / total * 100;
                _createGenderSeg(track, 'f', fCount, fPct, ROLE_LABELS[role]);
                _createGenderSeg(track, 'm', mCount, mPct, ROLE_LABELS[role]);
                row.appendChild(track);

                var counts = document.createElement('span');
                counts.className = 'stats-gender-counts';
                counts.innerHTML =
                    '<span class="stats-gender-f">' + fmt(fCount) + ' \u2640</span> \u00b7 ' +
                    '<span class="stats-gender-m">' + fmt(mCount) + ' \u2642</span>';
                row.appendChild(counts);

                container.appendChild(row);
            });

            // Static legend: render once
            if (!_genderLegendRendered) {
                var legendEl = document.getElementById('gender-legend');
                if (legendEl) {
                    legendEl.innerHTML =
                        '<span class="stats-gender-legend-item">' +
                            '<span class="stats-dot stats-gender-f-bg"></span>' + SEX_LABELS.f +
                        '</span>' +
                        '<span class="stats-gender-legend-item">' +
                            '<span class="stats-dot stats-gender-m-bg"></span>' + SEX_LABELS.m +
                        '</span>';
                    _genderLegendRendered = true;
                }
            }
        }


        /* ---- Annotation depth ---- */

        function renderAnnotation() {
            var introEl = document.getElementById('annotation-intro');
            if (introEl) {
                introEl.textContent = fmt(data.summary.totalAnnotations) +
                    ' Annotationselemente insgesamt, durchschnittlich ' +
                    data.summary.avgAnnotations + ' pro Dokument';
            }
            renderAnnotationTypes();
            renderPersonDistribution();
        }

        function renderAnnotationTypes() {
            var container = document.getElementById('annotation-type-chart');
            if (!container) return;
            container.innerHTML = '';

            var bd = data.annotationBreakdown || {};
            var maxVal = 0;
            ANNO_TYPE_ORDER.forEach(function(k) {
                var v = bd[k] || 0;
                if (v > maxVal) maxVal = v;
            });

            ANNO_TYPE_ORDER.forEach(function(key) {
                var count = bd[key] || 0;
                var pct = maxVal > 0 ? (count / maxVal * 100) : 0;
                var row = document.createElement('div');
                row.className = 'stats-hbar-row';
                row.innerHTML =
                    '<span class="stats-hbar-label">' + ANNO_TYPE_LABELS[key] + '</span>' +
                    '<div class="stats-hbar-track">' +
                        '<div class="stats-hbar-fill" style="width:' + pct.toFixed(1) + '%;background:' + ANNO_TYPE_COLORS[key] + '"></div>' +
                    '</div>' +
                    '<span class="stats-hbar-value">' + fmt(count) + '</span>';
                container.appendChild(row);
            });
        }

        function renderPersonDistribution() {
            var container = document.getElementById('person-dist-chart');
            if (!container) return;
            container.innerHTML = '';

            var dist = data.personDistribution || [];
            if (!dist.length) return;

            var cw = container.clientWidth || 400;
            var margin = { top: 12, right: 8, bottom: 32, left: 36 };
            var w = cw;
            var h = 160;
            var chartW = w - margin.left - margin.right;
            var chartH = h - margin.top - margin.bottom;

            var maxCount = 0;
            dist.forEach(function(d) { if (d.count > maxCount) maxCount = d.count; });
            var niceMax = Math.ceil(maxCount / 100) * 100 || 100;

            var barW = Math.max(3, chartW / dist.length - 1);
            var gap = Math.max(0.5, (chartW - barW * dist.length) / (dist.length - 1 || 1));

            var svg = svgEl('svg', { width: w, height: h, viewBox: '0 0 ' + w + ' ' + h });
            svg.style.display = 'block';
            svg.style.width = '100%';
            svg.style.height = 'auto';

            // Y gridlines
            var step = niceMax <= 200 ? 50 : niceMax <= 500 ? 100 : 200;
            for (var t = 0; t <= niceMax; t += step) {
                var gy = margin.top + chartH - (t / niceMax * chartH);
                svg.appendChild(svgEl('line', {
                    x1: margin.left, y1: gy, x2: w - margin.right, y2: gy,
                    stroke: '#ece8e2', 'stroke-width': 1, 'stroke-dasharray': t === 0 ? 'none' : '2,2'
                }));
                if (t > 0) {
                    var lbl = svgEl('text', {
                        x: margin.left - 6, y: gy + 3,
                        'text-anchor': 'end', fill: '#8c8680',
                        'font-family': 'Inter, sans-serif', 'font-size': '9'
                    });
                    lbl.textContent = t;
                    svg.appendChild(lbl);
                }
            }

            dist.forEach(function(d, i) {
                var x = margin.left + i * (barW + gap);
                var barH = d.count > 0 ? Math.max(1, (d.count / niceMax) * chartH) : 0;
                var y = margin.top + chartH - barH;

                if (d.count > 0) {
                    var rect = svgEl('rect', {
                        x: x, y: y, width: barW, height: barH,
                        fill: ENTITY_COLORS.persons, opacity: '0.6', rx: 1
                    });
                    svg.appendChild(rect);
                }

                // Hit target
                var hit = svgEl('rect', {
                    x: x, y: margin.top, width: barW + gap, height: chartH,
                    fill: 'transparent', 'data-tip': '1'
                });
                hit.addEventListener('mouseenter', function(e) {
                    var label = d.bucket === 30 ? '30+' : String(d.bucket);
                    showTooltip(label + ' Pers.: <strong>' + fmt(d.count) + '</strong> Dok.', e.clientX, e.clientY);
                });
                hit.addEventListener('mousemove', function(e) {
                    showTooltip(tooltip.innerHTML, e.clientX, e.clientY);
                });
                hit.addEventListener('mouseleave', hideTooltip);
                svg.appendChild(hit);

                // X label every 5
                if (i % 5 === 0 || i === 30) {
                    var xl = svgEl('text', {
                        x: x + barW / 2, y: h - 6,
                        'text-anchor': 'middle', fill: '#8c8680',
                        'font-family': 'Inter, sans-serif', 'font-size': '9'
                    });
                    xl.textContent = i === 30 ? '30+' : i;
                    svg.appendChild(xl);
                }
            });

            container.appendChild(svg);
        }


        /* ---- Coverage rings ---- */

        function renderCoverage() {
            var container = document.getElementById('coverage-rings');
            if (!container) return;
            container.innerHTML = '';

            var types = [
                { key: 'persons', label: 'Personen', color: ENTITY_COLORS.persons },
                { key: 'orgs', label: 'Organisationen', color: ENTITY_COLORS.orgs },
                { key: 'places', label: 'Orte', color: ENTITY_COLORS.places }
            ];

            types.forEach(function(t) {
                var cov = data.coverage[t.key];
                if (!cov) return;

                var wrap = document.createElement('div');
                wrap.className = 'stats-ring-wrap';

                var size = 130;
                var strokeW = 10;
                var r = (size - strokeW) / 2;
                var circ = 2 * Math.PI * r;
                var offset = circ - (cov.pct / 100 * circ);

                var svg = svgEl('svg', {
                    width: size, height: size,
                    viewBox: '0 0 ' + size + ' ' + size
                });
                svg.style.display = 'block';

                // Background ring
                svg.appendChild(svgEl('circle', {
                    cx: size / 2, cy: size / 2, r: r,
                    fill: 'none', stroke: '#ece8e2', 'stroke-width': strokeW
                }));

                // Foreground arc
                var arc = svgEl('circle', {
                    cx: size / 2, cy: size / 2, r: r,
                    fill: 'none', stroke: t.color, 'stroke-width': strokeW,
                    'stroke-linecap': 'round',
                    'stroke-dasharray': circ,
                    'stroke-dashoffset': circ,
                    transform: 'rotate(-90 ' + (size / 2) + ' ' + (size / 2) + ')'
                });
                arc.style.transition = 'stroke-dashoffset 0.8s cubic-bezier(0.22, 1, 0.36, 1)';
                svg.appendChild(arc);

                // Percentage text
                var pctText = svgEl('text', {
                    x: size / 2, y: size / 2 + 2,
                    'text-anchor': 'middle', 'dominant-baseline': 'middle',
                    fill: '#2c2825', 'font-family': 'Crimson Pro, serif',
                    'font-size': '22', 'font-weight': '600'
                });
                pctText.textContent = cov.pct + '%';
                svg.appendChild(pctText);

                wrap.appendChild(svg);

                // Label and detail
                var labelEl = document.createElement('span');
                labelEl.className = 'stats-ring-label';
                labelEl.textContent = t.label;
                wrap.appendChild(labelEl);

                var detailEl = document.createElement('span');
                detailEl.className = 'stats-ring-detail';
                detailEl.textContent = fmt(cov.linked) + ' von ' + fmt(cov.total);
                wrap.appendChild(detailEl);

                container.appendChild(wrap);

                // Animate arc on scroll into view
                requestAnimationFrame(function() {
                    arc.style.strokeDashoffset = offset;
                });
            });
        }


        /* ---- Rankings ---- */

        function renderRankings() {
            _renderRankingList(
                'ranking-women', 'ranking-women-title',
                'Top 10 Frauen', 'women', SEX_COLORS.f
            );
            _renderRankingList(
                'ranking-men', 'ranking-men-title',
                'Top 10 Männer', 'men', SEX_COLORS.m
            );
            _renderRankingList(
                'ranking-orgs', 'ranking-orgs-title',
                'Top 10 Organisationen', 'orgs', ENTITY_COLORS.orgs
            );
        }

        function _renderRankingList(containerId, titleId, defaultTitle, dataKey, color) {
            var container = document.getElementById(containerId);
            var titleEl = document.getElementById(titleId);
            if (!container) return;
            container.innerHTML = '';

            var items, title;
            var labelMap = { women: 'Frauen', men: 'Männer', orgs: 'Organisationen' };

            if (state.selectedCollection) {
                var ct = data.perCollectionTop[state.selectedCollection];
                items = ct ? (ct[dataKey] || []) : [];
                var collLabel = '';
                data.collections.forEach(function(c) {
                    if (c.path === state.selectedCollection) collLabel = c.label;
                });
                title = 'Top 10 ' + (labelMap[dataKey] || dataKey) +
                    (collLabel ? ' — ' + collLabel : '');
            } else {
                var topMap = { women: data.topWomen, men: data.topMen, orgs: data.topOrgs };
                items = topMap[dataKey] || [];
                title = defaultTitle;
            }

            if (titleEl) titleEl.textContent = title;

            if (!items || !items.length) {
                container.innerHTML = '<p class="stats-no-data">Keine Daten verfügbar.</p>';
                return;
            }

            var maxCount = items[0].count;
            var ol = document.createElement('ol');
            ol.className = 'stats-ranking';

            items.forEach(function(item) {
                var pct = maxCount > 0 ? (item.count / maxCount * 100) : 0;
                var li = document.createElement('li');
                li.innerHTML =
                    '<div class="stats-rank-bar-track">' +
                        '<div class="stats-rank-bar-fill" style="width:' + pct.toFixed(1) + '%;background:' + color + '"></div>' +
                    '</div>' +
                    '<span class="stats-rank-name">' + esc(item.name) + '</span>' +
                    '<span class="stats-rank-count">' + fmt(item.count) + ' Dok.</span>';
                ol.appendChild(li);
            });

            container.appendChild(ol);
        }


        /* ---- Cross-filter ---- */

        function selectCollection(path, label) {
            state.selectedCollection = path;
            showFilterBar(label);
            updateAllSections();
        }

        function clearFilter() {
            state.selectedCollection = null;
            hideFilterBar();
            updateAllSections();
        }

        function updateAllSections() {
            renderTimeline();
            renderCollections();
            renderRoles();
            renderRoleGender();
            renderRankings();
        }


        /* ---- Initial render ---- */

        renderTimeline();
        renderCollections();
        renderRoles();
        renderRoleGender();
        renderAnnotation();
        renderCoverage();
        renderRankings();

        // Responsive: redraw timeline on resize
        if (window.ResizeObserver) {
            var resizeTimer;
            var ro = new ResizeObserver(function() {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(function() {
                    renderTimeline();
                    renderPersonDistribution();
                    renderRoles();
                }, 200);
            });
            var tlContainer = document.getElementById('timeline-chart');
            if (tlContainer) ro.observe(tlContainer);
        }
    }


    /* ======================================================================
       Utilities
       ====================================================================== */

    var esc = (function() {
        var d = document.createElement('div');
        return function(s) {
            if (s === undefined || s === null || s === '') return '';
            d.textContent = String(s);
            return d.innerHTML;
        };
    })();

})();
