/* ==========================================================================
   Wiener Urkundenbuch — Digital Edition
   Exploration: Role Explorer (Epic A)
   Panel 1: Function roles by sex (bar chart)
   Panel 2: Institutional affiliation by org type (bar chart)
   Panel 3: Detail (context-dependent drill-down)
   Uses: ChartHelpers, DrillDown
   ========================================================================== */

(function() {
    'use strict';

    var esc = EdCore.esc;
    var fmt = ChartHelpers.fmt;
    var TOOLTIP_CLASS = 'explore-tooltip';

    // Human-readable labels for org types
    var ORG_TYPE_LABELS = {
        'Messe': 'Messe/Stiftung',
        'Pfarre': 'Pfarre',
        'Stadt': 'Stadt',
        'Kirche_Kapelle': 'Kirche/Kapelle',
        'Altar': 'Altar',
        'Dioezese_Erzdioezese': 'Di\u00f6zese',
        'Kloster_m': 'Kloster (m.)',
        'Gemeinde': 'Gemeinde',
        'Zeche_Bruderschaft': 'Zeche/Bruderschaft',
        'OTHER': 'Sonstige',
        'Kloster_f': 'Kloster (w.)',
        'Spital_Siechenhaus': 'Spital/Siechenhaus',
        'Stadtviertel': 'Stadtviertel',
        'Herzogtum': 'Herzogtum',
        'Orden': 'Orden',
        'Burg': 'Burg',
        'Koenigreich': 'K\u00f6nigreich',
        'Universitaet': 'Universit\u00e4t',
        'Reich': 'Reich',
        'Markgrafschaft': 'Markgrafschaft',
        'Kloster': 'Kloster',
        'Kirche': 'Kirche',
        'Kapelle': 'Kapelle'
    };

    function initExploration() {
        if (!document.getElementById('explore-role-chart')) return;

        ChartHelpers.createTooltip(TOOLTIP_CLASS);

        var epicA = null;

        // Colour map
        var SEX_COLORS = {
            m: ChartHelpers.getToken('--color-sex-m') || '#2e5a88',
            f: ChartHelpers.getToken('--color-sex-f') || '#b85c2f',
            unspecified: ChartHelpers.getToken('--color-sex-none') || '#b0a99f'
        };
        var SEX_LABELS = ChartHelpers.SEX_LABELS;
        var ROLE_LABELS = ChartHelpers.ROLE_LABELS;
        var CANONICAL_ROLES = ChartHelpers.ROLE_ORDER;
        var SEX_KEYS = ['m', 'f', 'unspecified'];
        var ORG_COLOR = ChartHelpers.getToken('--color-rel-occ') || '#2e5a88';

        // State
        var state = {
            decadeMin: 1170,
            decadeMax: 1520,
            sexFilter: 'all',
            tableView: false,
            instTableView: false
        };

        var drillHandle = DrillDown.bind({});

        // -- Shared bindings --
        ChartHelpers.bindTimeRange('explore', state, function() {
            renderRoleChart();
            renderInstChart();
        });

        ChartHelpers.bindChipFilter('#explore-sex-filter .explore-chip', 'data-sex',
            state, 'sexFilter', function() {
                renderRoleChart();
                renderInstChart();
            });

        ChartHelpers.bindToggle('explore-table-toggle', 'explore-role-chart',
            'explore-role-table', state, 'tableView', renderRoleTable);

        ChartHelpers.bindToggle('explore-inst-table-toggle', 'explore-inst-chart',
            'explore-inst-table', state, 'instTableView', renderInstTable);

        // ================================================================
        // Panel 1: Role chart
        // ================================================================

        function getFilteredData() {
            var obs = epicA.observations;
            var roleDecade = obs.role_by_sex_by_decade;

            var result = {};
            for (var ri = 0; ri < CANONICAL_ROLES.length; ri++) {
                var role = CANONICAL_ROLES[ri];
                result[role] = { m: 0, f: 0, unspecified: 0, total: 0 };

                var decadeData = roleDecade[role] || {};
                for (var dStr in decadeData) {
                    var d = parseInt(dStr, 10);
                    if (d < state.decadeMin || d > state.decadeMax) continue;
                    var sexCounts = decadeData[dStr];
                    for (var si = 0; si < SEX_KEYS.length; si++) {
                        var sex = SEX_KEYS[si];
                        result[role][sex] += sexCounts[sex] || 0;
                    }
                }
                result[role].total = result[role].m + result[role].f + result[role].unspecified;
            }
            // Merge empty-role data into "other"
            var emptyDecade = roleDecade[''] || {};
            for (var edStr in emptyDecade) {
                var ed = parseInt(edStr, 10);
                if (ed < state.decadeMin || ed > state.decadeMax) continue;
                var eSex = emptyDecade[edStr];
                for (var esi = 0; esi < SEX_KEYS.length; esi++) {
                    result.other[SEX_KEYS[esi]] += eSex[SEX_KEYS[esi]] || 0;
                }
            }
            result.other.total = result.other.m + result.other.f + result.other.unspecified;

            return result;
        }

        function renderRoleChart() {
            var data = getFilteredData();
            var wrap = document.getElementById('explore-role-chart');
            var sexes = state.sexFilter === 'all' ? SEX_KEYS : [state.sexFilter];

            // Build items for shared bar chart
            var items = [];
            for (var ri = 0; ri < CANONICAL_ROLES.length; ri++) {
                var role = CANONICAL_ROLES[ri];
                var segs = [];
                for (var si = 0; si < sexes.length; si++) {
                    segs.push({
                        key: sexes[si],
                        value: data[role][sexes[si]] || 0,
                        color: SEX_COLORS[sexes[si]]
                    });
                }
                items.push({ label: ROLE_LABELS[role] || role, role: role, segments: segs, total: data[role].total });
            }

            var legend = sexes.map(function(s) { return { label: SEX_LABELS[s], color: SEX_COLORS[s] }; });

            ChartHelpers.renderHorizontalBars(wrap, {
                items: items,
                labelWidth: 100,
                ariaLabel: 'Funktionsrollen nach Geschlecht',
                legend: legend,
                onTip: function(item, seg) {
                    var pct = item.total > 0 ? Math.round(seg.value / item.total * 100) : 0;
                    return item.label + ' \u00B7 ' + SEX_LABELS[seg.key] + ': ' +
                        seg.value.toLocaleString('de-DE') + ' (' + pct + ' %)';
                },
                onClick: function(item, seg) {
                    openRoleDrillDown(item.role, seg.key);
                }
            });

            var grandTotal = 0;
            for (var ft = 0; ft < CANONICAL_ROLES.length; ft++) {
                grandTotal += data[CANONICAL_ROLES[ft]].total;
            }
            var footer = document.getElementById('explore-role-footer');
            footer.textContent = 'Datenbasis: ' + grandTotal.toLocaleString('de-DE') +
                ' Personen-Ereignis-Zuordnungen \u00B7 Zeitraum ' +
                state.decadeMin + '\u2013' + state.decadeMax;
        }

        function renderRoleTable() {
            var data = getFilteredData();
            var tbody = document.getElementById('explore-role-tbody');
            tbody.innerHTML = '';
            for (var ri = 0; ri < CANONICAL_ROLES.length; ri++) {
                var role = CANONICAL_ROLES[ri];
                var d = data[role];
                var tr = document.createElement('tr');
                tr.innerHTML =
                    '<td>' + (ROLE_LABELS[role] || role) + '</td>' +
                    '<td class="num">' + d.m.toLocaleString('de-DE') + '</td>' +
                    '<td class="num">' + d.f.toLocaleString('de-DE') + '</td>' +
                    '<td class="num">' + d.unspecified.toLocaleString('de-DE') + '</td>' +
                    '<td class="num"><strong>' + d.total.toLocaleString('de-DE') + '</strong></td>';
                tbody.appendChild(tr);
            }
        }

        function openRoleDrillDown(role, sex) {
            var drillDownData = epicA.drill_down || {};
            var roleFkeys = (drillDownData.role_sex || {})[role] || {};
            var fkeys = roleFkeys[sex] || [];
            if (role === 'other') {
                var emptyFkeys = ((drillDownData.role_sex || {})[''] || {})[sex] || [];
                fkeys = fkeys.concat(emptyFkeys);
                var seen = {};
                fkeys = fkeys.filter(function(fk) {
                    if (seen[fk]) return false;
                    seen[fk] = true;
                    return true;
                });
            }
            if (!fkeys.length) return;
            DrillDown.open(drillHandle, (ROLE_LABELS[role] || role) + ' \u00B7 ' + SEX_LABELS[sex], fkeys);
        }

        // ================================================================
        // Panel 2: Institutional affiliation (org-type bar chart)
        // ================================================================

        function getFilteredOrgData() {
            var obs = epicA.observations;
            var orgByDecade = obs.org_type_by_decade || {};
            var orgBySex = obs.org_type_by_sex || {};

            var allTypes = {};
            for (var ot in orgByDecade) { allTypes[ot] = true; }

            var result = [];
            for (var otype in allTypes) {
                var decades = orgByDecade[otype] || {};
                var total = 0;
                for (var dStr in decades) {
                    var d = parseInt(dStr, 10);
                    if (d < state.decadeMin || d > state.decadeMax) continue;
                    total += decades[dStr];
                }
                if (total === 0) continue;

                var sexData = orgBySex[otype] || {};
                var m = sexData.m || 0;
                var f = sexData.f || 0;
                var u = sexData.unspecified || 0;

                if (state.sexFilter !== 'all') {
                    if (state.sexFilter === 'm' && m === 0) continue;
                    if (state.sexFilter === 'f' && f === 0) continue;
                    if (state.sexFilter === 'unspecified' && u === 0) continue;
                }

                result.push({
                    type: otype,
                    label: ORG_TYPE_LABELS[otype] || otype,
                    total: total,
                    m: m, f: f, unspecified: u,
                    personTotal: m + f + u
                });
            }
            result.sort(function(a, b) { return b.total - a.total; });
            return result;
        }

        function renderInstChart() {
            if (!epicA) return;
            var data = getFilteredOrgData();
            var wrap = document.getElementById('explore-inst-chart');

            if (data.length === 0) {
                wrap.innerHTML = '<p style="text-align:center;padding:2rem;color:var(--color-text-muted)">Keine Daten f\u00fcr diesen Zeitraum.</p>';
                return;
            }

            var items = data.map(function(d) {
                return {
                    label: d.label,
                    type: d.type,
                    segments: [{ key: d.type, value: d.total, color: ORG_COLOR }],
                    total: d.total,
                    personTotal: d.personTotal,
                    m: d.m, f: d.f
                };
            });

            ChartHelpers.renderHorizontalBars(wrap, {
                items: items,
                labelWidth: 120,
                barHeight: 22,
                barGap: 6,
                groupGap: 0,
                labelFontSize: '12',
                ariaLabel: 'Organisationstypen nach Ereignish\u00e4ufigkeit',
                onTip: function(item) {
                    return item.label + ': ' + item.total.toLocaleString('de-DE') +
                        ' Ereignisse \u00B7 ' + item.personTotal.toLocaleString('de-DE') +
                        ' Personen (M ' + item.m + ' / W ' + item.f + ')';
                },
                onClick: function(item) {
                    openOrgDrillDown(item.type);
                }
            });

            var totalEvents = 0;
            for (var ti = 0; ti < data.length; ti++) totalEvents += data[ti].total;
            var footer = document.getElementById('explore-inst-footer');
            footer.textContent = data.length + ' Organisationstypen \u00B7 ' +
                totalEvents.toLocaleString('de-DE') + ' Ereignisse \u00B7 Zeitraum ' +
                state.decadeMin + '\u2013' + state.decadeMax;
        }

        function renderInstTable() {
            var data = getFilteredOrgData();
            var tbody = document.getElementById('explore-inst-tbody');
            tbody.innerHTML = '';
            for (var i = 0; i < data.length; i++) {
                var d = data[i];
                var tr = document.createElement('tr');
                tr.innerHTML =
                    '<td>' + esc(d.label) + '</td>' +
                    '<td class="num">' + d.m.toLocaleString('de-DE') + '</td>' +
                    '<td class="num">' + d.f.toLocaleString('de-DE') + '</td>' +
                    '<td class="num">' + d.unspecified.toLocaleString('de-DE') + '</td>' +
                    '<td class="num"><strong>' + d.personTotal.toLocaleString('de-DE') + '</strong></td>';
                tr.style.cursor = 'pointer';
                (function(item) {
                    tr.addEventListener('click', function() {
                        openOrgDrillDown(item.type);
                    });
                })(d);
                tbody.appendChild(tr);
            }
        }

        function openOrgDrillDown(orgType) {
            var fkeys = (epicA.drill_down.org_type || {})[orgType] || [];
            if (!fkeys.length) return;
            var label = ORG_TYPE_LABELS[orgType] || orgType;
            DrillDown.open(drillHandle, label + ' \u2014 Dokumente', fkeys);
        }

        // ================================================================
        // Data loading
        // ================================================================

        ChartHelpers.loadJSON('./data/epic_a.json', 'explore-role-chart', function(data) {
            epicA = data;
            renderRoleChart();
            renderInstChart();
        });
    }

    document.addEventListener('DOMContentLoaded', function() {
        if (document.getElementById('exploration-page')) {
            initExploration();
        }
    });

})();
