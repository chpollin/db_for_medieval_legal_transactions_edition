/* ==========================================================================
   Wiener Urkundenbuch — Digital Edition
   Exploration: Relationship Explorer (Epic B)
   Uses: ChartHelpers, DrillDown
   ========================================================================== */

(function() {
    'use strict';

    var esc = EdCore.esc;
    var fmt = ChartHelpers.fmt;
    var TOOLTIP_CLASS = 'explore-tooltip';

    function initNetworkExplorer() {
        if (!document.getElementById('explore-rel-chart')) return;

        ChartHelpers.createTooltip(TOOLTIP_CLASS);
        var drillHandle = DrillDown.bind({});

        var epicB = null;

        // Colours
        var REL_COLORS = {
            kin: ChartHelpers.getToken('--color-rel-kin') || '#c45a5a',
            occ: ChartHelpers.getToken('--color-rel-occ') || '#2e5a88',
            rep: ChartHelpers.getToken('--color-rel-rep') || '#3a7a5c',
            friend: ChartHelpers.getToken('--color-rel-friend') || '#c4a035'
        };
        var REL_LABELS = {
            kin: 'Verwandtschaft', occ: 'Beruf',
            rep: 'Vertretung', friend: 'Freundschaft'
        };
        var SEX_LABELS = ChartHelpers.SEX_LABELS;
        var SEX_COLORS = {
            m: ChartHelpers.getToken('--color-sex-m') || '#2e5a88',
            f: ChartHelpers.getToken('--color-sex-f') || '#b85c2f',
            unspecified: ChartHelpers.getToken('--color-sex-none') || '#b0a99f'
        };
        var REL_TYPES = ['kin', 'occ', 'rep', 'friend'];
        var SEX_KEYS = ['m', 'f', 'unspecified'];

        // State
        var state = {
            decadeMin: 1170,
            decadeMax: 1520,
            typeFilter: 'all',
            sexFilter: 'all',
            labelSearch: '',
            labelTableView: false,
            overviewTableView: false,
            selectedLabel: null,
            labelSortKey: 'total',
            labelSortAsc: false
        };

        // -- Shared bindings --
        ChartHelpers.bindTimeRange('explore-rel', state, renderAll);

        ChartHelpers.bindChipFilter('#explore-rel-type-filter .explore-chip', 'data-rel',
            state, 'typeFilter', renderAll);

        ChartHelpers.bindChipFilter('#explore-rel-sex-filter .explore-chip', 'data-sex',
            state, 'sexFilter', renderAll);

        ChartHelpers.bindToggle('explore-overview-table-toggle', 'explore-rel-chart',
            'explore-rel-overview-table', state, 'overviewTableView', renderOverviewTable);

        ChartHelpers.bindToggle('explore-label-table-toggle', 'explore-label-heatmap',
            'explore-label-table', state, 'labelTableView', renderLabelTable);

        ChartHelpers.bindSearch('explore-label-search', function(q) {
            state.labelSearch = q;
            if (state.labelTableView) {
                renderLabelTable();
            } else {
                renderLabelHeatmap();
            }
        });

        // -- Person search --
        var personSearchInput = document.getElementById('explore-person-search');
        var personSearchTimer = null;
        personSearchInput.addEventListener('input', function() {
            clearTimeout(personSearchTimer);
            personSearchTimer = setTimeout(function() {
                var q = personSearchInput.value.toLowerCase().trim();
                if (q.length < 2) return;
                renderPersonSearchResults(q);
            }, 300);
        });

        // ── Compute filtered overview data ──
        function getFilteredOverview() {
            var obs = epicB.overview;
            var tbsd = obs.type_by_sex_by_decade;
            var types = state.typeFilter === 'all' ? REL_TYPES : [state.typeFilter];
            var result = {};
            for (var ti = 0; ti < types.length; ti++) {
                var t = types[ti];
                result[t] = { m: 0, f: 0, unspecified: 0, total: 0 };
                var decadeData = tbsd[t] || {};
                for (var dStr in decadeData) {
                    var d = parseInt(dStr, 10);
                    if (d < state.decadeMin || d > state.decadeMax) continue;
                    var sexCounts = decadeData[dStr];
                    for (var si = 0; si < SEX_KEYS.length; si++) {
                        result[t][SEX_KEYS[si]] += sexCounts[SEX_KEYS[si]] || 0;
                    }
                }
                result[t].total = result[t].m + result[t].f + result[t].unspecified;
            }
            return result;
        }

        // ── Render overview bar chart ──
        function renderOverviewChart() {
            var data = getFilteredOverview();
            var wrap = document.getElementById('explore-rel-chart');

            var types = state.typeFilter === 'all' ? REL_TYPES : [state.typeFilter];
            var sexes = state.sexFilter === 'all' ? SEX_KEYS : [state.sexFilter];

            var items = types.map(function(relType) {
                var segs = sexes.map(function(sex) {
                    return { key: sex, value: data[relType][sex] || 0, color: SEX_COLORS[sex] };
                });
                return { label: REL_LABELS[relType] || relType, relType: relType, segments: segs, total: data[relType].total };
            });

            var legend = sexes.map(function(s) { return { label: esc(SEX_LABELS[s]), color: SEX_COLORS[s] }; });

            ChartHelpers.renderHorizontalBars(wrap, {
                items: items,
                labelWidth: 120,
                ariaLabel: 'Beziehungstypen nach Geschlecht',
                legend: legend,
                onTip: function(item, seg) {
                    var pct = item.total > 0 ? Math.round(seg.value / item.total * 100) : 0;
                    return esc(item.label) + ' \u00B7 ' + esc(SEX_LABELS[seg.key]) +
                        ': ' + fmt(seg.value) + ' (' + pct + '\u00A0%)';
                },
                onClick: function(item, seg) {
                    openTypeSexDrillDown(item.relType, seg.key);
                }
            });

            // Footer
            var grandTotal = 0;
            for (var ft = 0; ft < types.length; ft++) {
                grandTotal += data[types[ft]].total;
            }
            var footer = document.getElementById('explore-overview-footer');
            footer.textContent = 'Datenbasis: ' + fmt(grandTotal) +
                ' annotierte Beziehungen \u00B7 Zeitraum ' +
                state.decadeMin + '\u2013' + state.decadeMax;
        }

        // ── Render overview table ──
        function renderOverviewTable() {
            var data = getFilteredOverview();
            var types = state.typeFilter === 'all' ? REL_TYPES : [state.typeFilter];
            var tbody = document.getElementById('explore-rel-overview-tbody');
            tbody.innerHTML = '';
            for (var ti = 0; ti < types.length; ti++) {
                var t = types[ti];
                var d = data[t];
                var tr = document.createElement('tr');
                tr.innerHTML =
                    '<td>' + esc(REL_LABELS[t] || t) + '</td>' +
                    '<td class="num">' + fmt(d.m) + '</td>' +
                    '<td class="num">' + fmt(d.f) + '</td>' +
                    '<td class="num">' + fmt(d.unspecified) + '</td>' +
                    '<td class="num"><strong>' + fmt(d.total) + '</strong></td>';
                tbody.appendChild(tr);
            }
        }

        // ── Get filtered labels ──
        function getFilteredLabels() {
            var labels = epicB.labels;
            var filtered = [];
            for (var i = 0; i < labels.length; i++) {
                var lb = labels[i];
                if (state.typeFilter !== 'all' && lb.type !== state.typeFilter) continue;
                if (state.labelSearch && lb.label.toLowerCase().indexOf(state.labelSearch) < 0) continue;
                filtered.push(lb);
            }
            return filtered;
        }

        // ── Heatmap pagination ──
        var heatmapLimit = 20;
        var HEATMAP_STEPS = [20, 60, Infinity];

        // ── Render label heatmap ──
        function renderLabelHeatmap() {
            var wrap = document.getElementById('explore-label-heatmap');
            wrap.innerHTML = '';

            var filtered = getFilteredLabels();
            var labels = filtered.slice(0, heatmapLimit);
            if (labels.length === 0) {
                wrap.innerHTML = '<p class="explore-hint">Keine Bezeichnungen gefunden.</p>';
                return;
            }

            var sexes = state.sexFilter === 'all' ? SEX_KEYS : [state.sexFilter];

            // Hide 'unspecified' column if all visible labels have 0
            if (sexes.length > 1) {
                var hasUnspecified = false;
                for (var ui = 0; ui < labels.length; ui++) {
                    if ((labels[ui].unspecified || 0) > 0) { hasUnspecified = true; break; }
                }
                if (!hasUnspecified) {
                    sexes = sexes.filter(function(s) { return s !== 'unspecified'; });
                }
            }

            var maxCount = 1;
            for (var mi = 0; mi < labels.length; mi++) {
                for (var si = 0; si < sexes.length; si++) {
                    var c = labels[mi][sexes[si]] || 0;
                    if (c > maxCount) maxCount = c;
                }
            }

            var labelW = 140;
            var cellW = 80;
            var cellH = 22;
            var cellGap = 2;
            var headerH = 28;
            var typeColW = 20;
            var totalW = labelW + typeColW + sexes.length * (cellW + cellGap) + 10;
            var totalH = headerH + labels.length * (cellH + cellGap);

            var svg = document.createElementNS(ChartHelpers.SVG_NS, 'svg');
            svg.setAttribute('width', totalW);
            svg.setAttribute('height', totalH);
            svg.setAttribute('role', 'img');
            svg.setAttribute('aria-label', 'Heatmap der Beziehungsbezeichnungen');
            svg.style.display = 'block';

            // Column headers
            for (var hi = 0; hi < sexes.length; hi++) {
                var headerText = document.createElementNS(ChartHelpers.SVG_NS, 'text');
                headerText.setAttribute('x', labelW + typeColW + hi * (cellW + cellGap) + cellW / 2);
                headerText.setAttribute('y', headerH - 8);
                headerText.setAttribute('text-anchor', 'middle');
                headerText.setAttribute('class', 'explore-heatmap-header');
                headerText.textContent = SEX_LABELS[sexes[hi]];
                svg.appendChild(headerText);
            }

            // Rows
            for (var ri = 0; ri < labels.length; ri++) {
                var lb = labels[ri];
                var rowY = headerH + ri * (cellH + cellGap);

                var labelText = document.createElementNS(ChartHelpers.SVG_NS, 'text');
                labelText.setAttribute('x', labelW - 4);
                labelText.setAttribute('y', rowY + cellH / 2 + 4);
                labelText.setAttribute('text-anchor', 'end');
                labelText.setAttribute('class', 'explore-heatmap-label');
                var displayLabel = lb.label.length > 18 ? lb.label.substring(0, 16) + '\u2026' : lb.label;
                labelText.textContent = displayLabel;
                svg.appendChild(labelText);

                var typeRect = document.createElementNS(ChartHelpers.SVG_NS, 'rect');
                typeRect.setAttribute('x', labelW + 2);
                typeRect.setAttribute('y', rowY + 2);
                typeRect.setAttribute('width', typeColW - 6);
                typeRect.setAttribute('height', cellH - 4);
                typeRect.setAttribute('rx', 3);
                typeRect.setAttribute('fill', REL_COLORS[lb.type] || '#999');
                svg.appendChild(typeRect);

                for (var ci = 0; ci < sexes.length; ci++) {
                    var sex = sexes[ci];
                    var count = lb[sex] || 0;
                    var cx = labelW + typeColW + ci * (cellW + cellGap);
                    var opacity = count > 0 ? 0.15 + 0.85 * (count / maxCount) : 0.05;

                    var cell = document.createElementNS(ChartHelpers.SVG_NS, 'rect');
                    cell.setAttribute('x', cx);
                    cell.setAttribute('y', rowY);
                    cell.setAttribute('width', cellW);
                    cell.setAttribute('height', cellH);
                    cell.setAttribute('rx', 3);
                    cell.setAttribute('fill', REL_COLORS[lb.type] || '#999');
                    cell.setAttribute('opacity', opacity);
                    cell.setAttribute('class', 'explore-heatmap-cell');

                    (function(label, type, s, cnt, total, variants) {
                        cell.addEventListener('mouseenter', function(e) {
                            var pct = total > 0 ? Math.round(cnt / total * 100) : 0;
                            var tip = esc(label) + ' \u00B7 ' + esc(SEX_LABELS[s]) +
                                ': ' + fmt(cnt) + ' (' + pct + '\u00A0%)';
                            if (variants && variants.length) {
                                tip += '<br><small>auch: ' + esc(variants.join(', ')) + '</small>';
                            }
                            ChartHelpers.showTooltip(TOOLTIP_CLASS, tip, e.clientX, e.clientY);
                        });
                        cell.addEventListener('mouseleave', function() { ChartHelpers.hideTooltip(TOOLTIP_CLASS); });
                        cell.addEventListener('click', function() {
                            showLabelDetail(label, type, s);
                        });
                    })(lb.label, lb.type, sex, count, lb.total, lb.variants || []);

                    svg.appendChild(cell);

                    if (count > 0) {
                        var countText = document.createElementNS(ChartHelpers.SVG_NS, 'text');
                        countText.setAttribute('x', cx + cellW / 2);
                        countText.setAttribute('y', rowY + cellH / 2 + 4);
                        countText.setAttribute('text-anchor', 'middle');
                        countText.setAttribute('class', 'explore-heatmap-count');
                        countText.setAttribute('pointer-events', 'none');
                        countText.textContent = fmt(count);
                        svg.appendChild(countText);
                    }
                }
            }

            wrap.appendChild(svg);

            // Legend
            var legendDiv = document.createElement('div');
            legendDiv.className = 'explore-legend';
            var typesToShow = state.typeFilter === 'all' ? REL_TYPES : [state.typeFilter];
            for (var tl = 0; tl < typesToShow.length; tl++) {
                var tItem = document.createElement('span');
                tItem.className = 'explore-legend-item';
                tItem.innerHTML = '<span class="explore-legend-swatch" style="background:' +
                    REL_COLORS[typesToShow[tl]] + '"></span>' + esc(REL_LABELS[typesToShow[tl]]);
                legendDiv.appendChild(tItem);
            }
            wrap.appendChild(legendDiv);

            // "Show more" button
            if (labels.length < filtered.length) {
                var moreBtn = document.createElement('button');
                moreBtn.className = 'explore-btn explore-btn--secondary';
                var nextStep = Infinity;
                for (var nsi = 0; nsi < HEATMAP_STEPS.length; nsi++) {
                    if (HEATMAP_STEPS[nsi] > heatmapLimit) { nextStep = HEATMAP_STEPS[nsi]; break; }
                }
                var nextCount = nextStep === Infinity ? filtered.length : Math.min(nextStep, filtered.length);
                moreBtn.textContent = 'Mehr anzeigen (' + nextCount + ' von ' + fmt(filtered.length) + ')';
                moreBtn.addEventListener('click', function() {
                    heatmapLimit = nextStep;
                    renderLabelHeatmap();
                });
                wrap.appendChild(moreBtn);
            }

            var footer = document.getElementById('explore-label-footer');
            var shown = labels.length;
            var total = filtered.length;
            footer.textContent = shown < total ?
                'Zeige ' + shown + ' von ' + fmt(total) + ' Bezeichnungen' :
                fmt(total) + ' Bezeichnungen';
        }

        // ── Render label table ──
        function renderLabelTable() {
            var filtered = getFilteredLabels();
            filtered.sort(function(a, b) {
                var key = state.labelSortKey;
                var va = key === 'label' ? a.label.toLowerCase() : (key === 'type' ? a.type : (a[key] || 0));
                var vb = key === 'label' ? b.label.toLowerCase() : (key === 'type' ? b.type : (b[key] || 0));
                if (va < vb) return state.labelSortAsc ? -1 : 1;
                if (va > vb) return state.labelSortAsc ? 1 : -1;
                return 0;
            });

            var tbody = document.getElementById('explore-label-tbody');
            tbody.innerHTML = '';
            var maxRows = 200;
            var count = Math.min(filtered.length, maxRows);
            for (var i = 0; i < count; i++) {
                var lb = filtered[i];
                var tr = document.createElement('tr');
                tr.className = 'explore-label-row';
                tr.innerHTML =
                    '<td>' + esc(lb.label) +
                    ' <span class="explore-rel-badge" style="background:' +
                    (REL_COLORS[lb.type] || '#999') + '">' + esc(REL_LABELS[lb.type] || lb.type) + '</span></td>' +
                    '<td>' + esc(REL_LABELS[lb.type] || lb.type) + '</td>' +
                    '<td class="num">' + fmt(lb.m) + '</td>' +
                    '<td class="num">' + fmt(lb.f) + '</td>' +
                    '<td class="num"><strong>' + fmt(lb.total) + '</strong></td>';
                (function(label, type) {
                    tr.addEventListener('click', function() {
                        showLabelDetail(label, type, null);
                    });
                })(lb.label, lb.type);
                tbody.appendChild(tr);
            }

            ChartHelpers.bindSortHeaders('#explore-label-table .sortable',
                state, 'labelSortKey', 'labelSortAsc', renderLabelTable, ['label', 'type']);

            var footer = document.getElementById('explore-label-footer');
            footer.textContent = count < filtered.length ?
                'Zeige ' + count + ' von ' + fmt(filtered.length) + ' Bezeichnungen' :
                fmt(filtered.length) + ' Bezeichnungen';
        }

        // ── Show label detail in Panel 3 ──
        function showLabelDetail(label, type, sex) {
            state.selectedLabel = { label: label, type: type, sex: sex };
            var body = document.getElementById('explore-detail-body');
            var title = document.getElementById('explore-detail-title');
            body.innerHTML = '';

            var heading = esc(label) + ' (' + esc(REL_LABELS[type] || type) + ')';
            if (sex) heading += ' \u00B7 ' + esc(SEX_LABELS[sex]);
            title.innerHTML = heading;

            var labelLowerForLookup = label.toLowerCase();
            for (var vi = 0; vi < epicB.labels.length; vi++) {
                if (epicB.labels[vi].label.toLowerCase() === labelLowerForLookup &&
                    epicB.labels[vi].type === type) {
                    var vars = epicB.labels[vi].variants;
                    if (vars && vars.length) {
                        title.innerHTML += ' <small style="color:var(--color-text-muted)">(auch: ' +
                            esc(vars.join(', ')) + ')</small>';
                    }
                    break;
                }
            }

            var persons = epicB.persons;
            var matches = [];
            var labelLower = label.toLowerCase();
            for (var i = 0; i < persons.length; i++) {
                var p = persons[i];
                if (sex && p.sex !== sex) continue;
                var rels = p.rels;
                var matchingFkeys = [];
                for (var j = 0; j < rels.length; j++) {
                    var relLabel = (rels[j].ln || rels[j].l || '').toLowerCase();
                    if (rels[j].t === type && relLabel === labelLower) {
                        if (rels[j].f) matchingFkeys.push(rels[j].f);
                    }
                }
                if (matchingFkeys.length > 0) {
                    matches.push({ id: p.id, name: p.name, sex: p.sex, file_keys: matchingFkeys });
                }
            }

            if (matches.length === 0) {
                body.innerHTML = '<p class="explore-hint">Keine Personen gefunden.</p>';
                return;
            }

            var table = document.createElement('table');
            table.className = 'explore-data-table';
            table.innerHTML = '<thead><tr><th>Person</th><th>Geschlecht</th><th>Belege</th></tr></thead>';
            var tbody = document.createElement('tbody');

            for (var mi = 0; mi < matches.length; mi++) {
                var m = matches[mi];
                var tr = document.createElement('tr');
                tr.className = 'explore-label-row';
                tr.innerHTML =
                    '<td>' + esc(m.name) + '</td>' +
                    '<td>' + esc(SEX_LABELS[m.sex] || m.sex) + '</td>' +
                    '<td class="num">' + m.file_keys.length + '</td>';
                (function(name, fkeys) {
                    tr.addEventListener('click', function() {
                        DrillDown.open(drillHandle, name, fkeys);
                    });
                })(m.name, m.file_keys);
                tbody.appendChild(tr);
            }
            table.appendChild(tbody);
            body.appendChild(table);

            var detailFooter = document.getElementById('explore-detail-footer');
            detailFooter.textContent = fmt(matches.length) + ' Personen mit dieser Bezeichnung';

            var detailPanel = document.getElementById('explore-panel-detail');
            detailPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
            detailPanel.classList.add('explore-panel--highlight');
            setTimeout(function() {
                detailPanel.classList.remove('explore-panel--highlight');
            }, 1200);
        }

        // ── Person search results ──
        function renderPersonSearchResults(query) {
            var body = document.getElementById('explore-detail-body');
            var title = document.getElementById('explore-detail-title');
            body.innerHTML = '';
            title.textContent = 'Personensuche: ' + esc(query);

            var persons = epicB.persons;
            var matches = [];
            for (var i = 0; i < persons.length && matches.length < 50; i++) {
                if (persons[i].name.toLowerCase().indexOf(query) >= 0) {
                    matches.push(persons[i]);
                }
            }

            if (matches.length === 0) {
                body.innerHTML = '<p class="explore-hint">Keine Personen gefunden.</p>';
                return;
            }

            var table = document.createElement('table');
            table.className = 'explore-data-table';
            table.innerHTML = '<thead><tr><th>Person</th><th>Geschlecht</th><th>Beziehungen</th></tr></thead>';
            var tbody = document.createElement('tbody');

            for (var mi = 0; mi < matches.length; mi++) {
                var p = matches[mi];
                var tr = document.createElement('tr');
                tr.className = 'explore-label-row';

                var relSummary = {};
                var allFkeys = [];
                for (var ri = 0; ri < p.rels.length; ri++) {
                    var rel = p.rels[ri];
                    relSummary[rel.t] = (relSummary[rel.t] || 0) + 1;
                    if (rel.f) allFkeys.push(rel.f);
                }
                var badges = '';
                for (var t = 0; t < REL_TYPES.length; t++) {
                    var rt = REL_TYPES[t];
                    if (relSummary[rt]) {
                        badges += '<span class="explore-rel-badge" style="background:' +
                            REL_COLORS[rt] + '">' + relSummary[rt] + ' ' + esc(REL_LABELS[rt]) + '</span> ';
                    }
                }

                tr.innerHTML =
                    '<td>' + esc(p.name) + '</td>' +
                    '<td>' + esc(SEX_LABELS[p.sex] || p.sex) + '</td>' +
                    '<td>' + badges + '</td>';
                (function(name, fkeys) {
                    tr.addEventListener('click', function() {
                        if (fkeys.length) DrillDown.open(drillHandle, name, fkeys);
                    });
                })(p.name, allFkeys);
                tbody.appendChild(tr);
            }
            table.appendChild(tbody);
            body.appendChild(table);

            var detailFooter = document.getElementById('explore-detail-footer');
            detailFooter.textContent = matches.length >= 50 ?
                'Erste 50 Treffer angezeigt' : fmt(matches.length) + ' Treffer';
        }

        // ── Drill-down for type × sex bar click ──
        function openTypeSexDrillDown(type, sex) {
            var dd = epicB.drill_down || {};
            var ts = dd.type_sex || {};
            var key = type + '_' + sex;
            var fkeys = ts[key] || [];
            if (!fkeys.length) return;
            DrillDown.open(drillHandle, esc(REL_LABELS[type]) + ' \u00B7 ' + esc(SEX_LABELS[sex]), fkeys);
        }

        // ── Render all panels ──
        function renderAll() {
            if (!epicB) return;
            renderOverviewChart();
            if (state.overviewTableView) renderOverviewTable();
            if (state.labelTableView) {
                renderLabelTable();
            } else {
                renderLabelHeatmap();
            }
        }

        // ── Load data and initial render ──
        personSearchInput.classList.remove('hidden');

        ChartHelpers.loadJSON('./data/epic_b.json', 'explore-rel-chart', function(data) {
            epicB = data;
            renderAll();
        });
    }

    document.addEventListener('DOMContentLoaded', function() {
        if (document.getElementById('exploration-page')) {
            initNetworkExplorer();
        }
    });

})();
