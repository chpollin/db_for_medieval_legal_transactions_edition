/* ==========================================================================
   Wiener Urkundenbuch — Digital Edition
   Shared table infrastructure (range slider, search, sort, renderer, chips)
   ========================================================================== */

var TableInfra = (function() {
    'use strict';

    var esc = EdCore.esc;


    /* ------------------------------------------------------------------
       Range slider with histogram
       ------------------------------------------------------------------ */

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


    /* ------------------------------------------------------------------
       Debounced search input + clear button
       ------------------------------------------------------------------ */

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


    /* ------------------------------------------------------------------
       Sortable column headers
       ------------------------------------------------------------------ */

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


    /* ------------------------------------------------------------------
       Progressive-rendering table engine
       config: {tbodyId, noResultsId, colCount, renderRow(item, index, tr)}
       Returns {render(items)}
       ------------------------------------------------------------------ */

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


    /* ------------------------------------------------------------------
       Filter chip
       ------------------------------------------------------------------ */

    function addFilterChip(container, label, onRemove) {
        var chip = document.createElement('span');
        chip.className = 'filter-chip';
        chip.innerHTML = esc(label) + ' <button aria-label="Filter entfernen">\u00D7</button>';
        chip.querySelector('button').addEventListener('click', onRemove);
        container.appendChild(chip);
    }


    /* ------------------------------------------------------------------
       Public API
       ------------------------------------------------------------------ */

    return {
        initRangeSlider: initRangeSlider,
        setupSearch: setupSearch,
        setupSortHeaders: setupSortHeaders,
        createTableRenderer: createTableRenderer,
        addFilterChip: addFilterChip
    };

})();
