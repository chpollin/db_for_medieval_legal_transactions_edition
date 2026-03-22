/* ==========================================================================
   Wiener Urkundenbuch — Digital Edition
   Register page: search, filter, sort
   ========================================================================== */

(function() {
    'use strict';

    var esc = EdCore.esc;

    function initRegister() {
        var table = document.getElementById('register-table');
        if (!table) return;
        var regType = table.dataset.type;
        var filterType = document.getElementById('filter-type');
        var filterDocs = document.getElementById('filter-docs');
        var filterQuality = document.getElementById('filter-quality');
        var resultCount = document.getElementById('result-count');
        var activeFiltersEl = document.getElementById('active-filters');

        var allEntries = [];
        var state = {
            query: '',
            letter: '',
            typeFilter: '',
            docsFilter: '',
            qualityFilter: '',
            sortKey: 'n',
            sortDir: 1
        };

        var filteredEntries = [];
        var colCount = regType === 'persons' ? 6 : 5;

        // --- Detail JSON cache ---
        var detailCache = null;  // lazy-loaded JSON { entityId: [{u,i,d,c,r},...] }
        var jsonFile = 'register/' + regType + '.json';

        function loadDetailJSON(cb) {
            if (detailCache) { cb(detailCache); return; }
            fetch(jsonFile)
                .then(function(r) { return r.json(); })
                .then(function(data) { detailCache = data; cb(detailCache); })
                .catch(function() { detailCache = {}; cb(detailCache); });
        }

        function renderDetailRow(entry, parentTr) {
            var existing = parentTr.nextElementSibling;
            if (existing && existing.classList.contains('detail-row')) {
                existing.remove();
                parentTr.classList.remove('expanded');
                return;
            }
            loadDetailJSON(function(cache) {
                var docs = cache[entry.id] || [];
                var detailTr = document.createElement('tr');
                detailTr.className = 'detail-row';
                var td = document.createElement('td');
                td.colSpan = colCount;
                if (docs.length === 0) {
                    td.innerHTML = '<div class="detail-content"><p class="no-docs-note">Keine Dokumente verkn\u00fcpft.</p></div>';
                } else {
                    var html = '<div class="detail-content"><table class="detail-doc-table"><thead><tr>'
                        + '<th>Nr.</th><th>Datum</th><th>Sammlung</th><th>Regest</th></tr></thead><tbody>';
                    for (var i = 0; i < docs.length; i++) {
                        var d = docs[i];
                        html += '<tr><td><a href="' + esc(d.u) + '">' + esc(d.i) + '</a></td>'
                            + '<td>' + esc(d.d) + '</td>'
                            + '<td>' + esc(d.c) + '</td>'
                            + '<td>' + esc(d.r) + '</td></tr>';
                    }
                    html += '</tbody></table></div>';
                    td.innerHTML = html;
                }
                detailTr.appendChild(td);
                parentTr.classList.add('expanded');
                parentTr.parentNode.insertBefore(detailTr, parentTr.nextSibling);
            });
        }

        // --- Table renderer ---
        var renderer = TableInfra.createTableRenderer({
            tbodyId: 'register-tbody',
            noResultsId: 'no-results',
            colCount: colCount,
            renderRow: function(entry, i, tr) {
                tr.dataset.entityId = entry.id;
                var dcClass = entry.dc === 0 ? 'doc-count-badge doc-count-zero' : 'doc-count-badge';
                var nameBtn = entry.dc > 0
                    ? '<button class="register-name register-name-linked" data-idx="' + i + '">' + esc(entry.n) + '</button>'
                    : '<span class="register-name">' + esc(entry.n) + '</span>';
                var html = '<td class="col-name">' + nameBtn + '</td>';

                if (regType === 'persons') {
                    var sexLabel = entry.sex === 'm' ? 'm' : entry.sex === 'f' ? 'w' : '\u2013';
                    html += '<td class="col-sex">' + sexLabel + '</td>';
                    html += '<td class="col-death">' + esc(entry.d) + '</td>';
                } else {
                    html += '<td class="col-type">' + esc(entry.tp) + '</td>';
                }

                if (entry.dc > 0) {
                    html += '<td class="col-docs"><button class="doc-count-link"><span class="' + dcClass + '">' + entry.dc + '</span></button></td>';
                } else {
                    html += '<td class="col-docs"><span class="' + dcClass + '">' + entry.dc + '</span></td>';
                }

                // Quality indicator (worst score across linked documents)
                var qLabel = entry.qw === 2 ? '\u26a0' : entry.qw === 1 ? '\u2139' : entry.qw === 0 ? '\u2713' : '\u2013';
                var qClass = 'quality-dot quality-' + (entry.qw === 2 ? 'warning' : entry.qw === 1 ? 'notice' : entry.qw === 0 ? 'ok' : 'na');
                html += '<td class="col-quality"><span class="' + qClass + '" title="' + (entry.qw === 2 ? 'Warnungen' : entry.qw === 1 ? 'Hinweise' : entry.qw === 0 ? 'Fehlerfrei' : 'Keine Dokumente') + '">' + qLabel + '</span></td>';

                html += '<td class="col-id"><span class="cell-id">' + esc(entry.id) + '</span></td>';

                tr.innerHTML = html;
            }
        });

        // --- Click handler for inline detail expansion ---
        var tbody = document.getElementById('register-tbody');
        tbody.addEventListener('click', function(e) {
            // Clickable: name button OR doc-count badge (when dc > 0)
            var trigger = e.target.closest('.register-name-linked, .doc-count-link');
            if (!trigger) return;
            var tr = trigger.closest('tr');
            var entityId = tr.dataset.entityId;
            var entry = null;
            for (var i = 0; i < allEntries.length; i++) {
                if (allEntries[i].id === entityId) { entry = allEntries[i]; break; }
            }
            if (entry && entry.dc > 0) renderDetailRow(entry, tr);
        });

        // --- Shared infrastructure ---
        TableInfra.setupSearch(state, applyFilters);
        TableInfra.setupSortHeaders('register-table', state, applyFilters);

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

        // --- Quality filter ---
        if (filterQuality) {
            filterQuality.addEventListener('change', function() {
                state.qualityFilter = filterQuality.value;
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

                if (state.qualityFilter !== '') {
                    var qVal = parseInt(state.qualityFilter);
                    if (entry.qw !== qVal) return false;
                }

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
                if (state.sortKey === 'dc' || state.sortKey === 'qw') {
                    va = a[state.sortKey]; vb = b[state.sortKey];
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
                TableInfra.addFilterChip(activeFiltersEl, 'Buchstabe: ' + state.letter, function() {
                    state.letter = '';
                    alphaBtns.forEach(function(b) { b.classList.remove('active'); });
                    document.querySelector('.alpha-btn-all').classList.add('active');
                    applyFilters();
                });
            }
            if (state.typeFilter) {
                TableInfra.addFilterChip(activeFiltersEl, (regType === 'persons' ? 'Geschlecht' : 'Typ') + ': ' + state.typeFilter, function() {
                    state.typeFilter = '';
                    if (filterType) filterType.value = '';
                    applyFilters();
                });
            }
            if (state.docsFilter) {
                TableInfra.addFilterChip(activeFiltersEl, state.docsFilter === '1' ? 'Mit Dokumenten' : 'Ohne Dokumente', function() {
                    state.docsFilter = '';
                    if (filterDocs) filterDocs.value = '';
                    applyFilters();
                });
            }
        }

        // Deep-link: auto-expand entity from URL hash (e.g. persons.html#pe__123)
        function openFromHash() {
            var hash = window.location.hash;
            if (!hash || hash.length < 2) return;
            var targetId = decodeURIComponent(hash.substring(1));
            var row = tbody.querySelector('tr[data-entity-id="' + CSS.escape(targetId) + '"]');
            if (!row) return;
            row.scrollIntoView({ block: 'center' });
            var entry = null;
            for (var i = 0; i < allEntries.length; i++) {
                if (allEntries[i].id === targetId) { entry = allEntries[i]; break; }
            }
            if (entry) renderDetailRow(entry, row);
        }

        // --- Load data from external JSON file ---
        var loadingTbody = document.getElementById('register-tbody');
        loadingTbody.innerHTML = '<tr><td colspan="' + colCount + '" style="text-align:center;padding:2rem;color:var(--color-text-muted)">Daten werden geladen\u2026</td></tr>';

        fetch('./data/' + regType + '_search.json')
            .then(function(r) { return r.json(); })
            .then(function(data) {
                allEntries = data;
                // Pre-compute search strings
                allEntries.forEach(function(entry) {
                    entry._s = (entry.n + ' ' + entry.id + ' ' + (entry.tp || '') + ' ' + (entry.fn || '') + ' ' + (entry.sn || '')).toLowerCase();
                    entry._fl = entry.n.charAt(0).toUpperCase();
                });
                filteredEntries = allEntries.slice();
                applyFilters();
                openFromHash();
                window.addEventListener('hashchange', openFromHash);
            })
            .catch(function(err) {
                console.warn('Register-Daten konnten nicht geladen werden:', err);
                loadingTbody.innerHTML = '<tr><td colspan="' + colCount + '" style="text-align:center;padding:2rem;color:var(--color-text-muted)">Daten konnten nicht geladen werden.</td></tr>';
            });
    }

    document.addEventListener('DOMContentLoaded', function() {
        if (document.getElementById('register-table')) {
            initRegister();
        }
    });

})();
