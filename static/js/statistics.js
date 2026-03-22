/* ==========================================================================
   Wiener Urkundenbuch — Digital Edition
   Statistics dashboard: SVG charts + cross-filtering
   ========================================================================== */

(function() {
    'use strict';

    var esc = EdCore.esc;
    var svgEl = ChartHelpers.svgEl;
    var fmt = ChartHelpers.fmt;
    var TOOLTIP_CLASS = 'stats-tooltip';

    function initStatistics() {
        var dataScript = document.getElementById('stats-data');
        if (!dataScript) return;
        var data;
        try { data = JSON.parse(dataScript.textContent); } catch(e) { return; }

        // Initialise shared tooltip
        ChartHelpers.createTooltip(TOOLTIP_CLASS);

        function showTip(html, x, y) { ChartHelpers.showTooltip(TOOLTIP_CLASS, html, x, y); }
        function hideTip() { ChartHelpers.hideTooltip(TOOLTIP_CLASS); }
        function touchTip(html, x, y) { ChartHelpers.touchTooltip(TOOLTIP_CLASS, html, x, y); }

        // --- State ---
        var state = { selectedCollection: null };

        // --- Shared labels from ChartHelpers ---
        var ROLE_LABELS = ChartHelpers.ROLE_LABELS;
        var ROLE_ORDER = ChartHelpers.ROLE_ORDER;

        var ANNO_TYPE_LABELS = {
            events: 'Ereignisse', functions: 'Funktionen',
            persons: 'Personen', orgs: 'Organisationen',
            rolenames: 'Rollennamen', triggerstrings: 'Formeln'
        };
        var ANNO_TYPE_ORDER = ['persons', 'orgs', 'events', 'functions', 'rolenames', 'triggerstrings'];

        // Colours from CSS design tokens (with fallbacks)
        var gt = ChartHelpers.getToken;
        var ROLE_COLORS = {
            issuer: gt('--anno-fn-issuer') || '#b85c2f',
            recipient: gt('--anno-fn-recipient') || '#2e7a88',
            witness: gt('--anno-fn-witness') || '#6b6040',
            other: gt('--anno-fn-other') || '#7a6b8c'
        };
        var ENTITY_COLORS = {
            persons: gt('--anno-person') || '#2e5a88',
            orgs: gt('--anno-org') || '#7b4d8e',
            places: gt('--anno-place') || '#3a7a5c'
        };
        var ANNO_TYPE_COLORS = {
            persons: gt('--anno-person') || '#2e5a88',
            orgs: gt('--anno-org') || '#7b4d8e',
            events: gt('--anno-trigger') || '#8c5a2e',
            functions: gt('--anno-fn-issuer') || '#b85c2f',
            rolenames: gt('--anno-attr') || '#6b6560',
            triggerstrings: gt('--anno-fn-witness') || '#6b6040'
        };
        var BAR_COLOR = gt('--anno-person') || '#2e5a88';
        var BAR_COLOR_DIM = '#d0ccc6';

        // Gender colors and labels (from ChartHelpers; prose labels for rankings below)
        var SEX_COLORS = ChartHelpers.sexColors();
        var SEX_LABELS = ChartHelpers.SEX_LABELS;

        // Collection accent colors (cycle)
        var COLL_COLORS = ['#2e5a88', '#7b4d8e', '#3a7a5c', '#b85c2f', '#2e7a88', '#6b6040'];

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
                    stroke: gt('--color-border-light') || '#ece8e2', 'stroke-width': 1, 'stroke-dasharray': tick === 0 ? 'none' : '3,3'
                }));
                // label
                var label = svgEl('text', {
                    x: margin.left - 8, y: y + 4,
                    'text-anchor': 'end', fill: gt('--color-text-light') || '#8c8680',
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
                        tipText += '<br><small>davon ' + fmt(collCount) + ' in gew\u00e4hlter Sammlung</small>';
                    }
                    showTip(tipText, e.clientX, e.clientY);
                    // Highlight bar
                    var bars = svg.querySelectorAll('.stats-bar-rect');
                    bars.forEach(function(b, bi) {
                        b.setAttribute('opacity', bi === i ? '1' : '0.4');
                    });
                });
                hit.addEventListener('mousemove', function(e) {
                    ChartHelpers.moveTooltip(TOOLTIP_CLASS, e.clientX, e.clientY);
                });
                hit.addEventListener('mouseleave', function() {
                    hideTip();
                    var bars = svg.querySelectorAll('.stats-bar-rect');
                    bars.forEach(function(b) { b.setAttribute('opacity', '0.65'); });
                });
                hit.addEventListener('touchstart', function(e) {
                    e.preventDefault();
                    var touch = e.touches[0];
                    var tipText = '<strong>' + d.decade + 'er</strong>: ' + fmt(d.count) + ' Dok.';
                    touchTip(tipText, touch.clientX, touch.clientY);
                });
                svg.appendChild(hit);

                // X-axis labels (every 3rd bar)
                if (i % 3 === 0) {
                    var lbl = svgEl('text', {
                        x: x + barW / 2, y: h - 6,
                        'text-anchor': 'middle', fill: gt('--color-text-light') || '#8c8680',
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
                    showTip('<strong>' + ROLE_LABELS[role] + '</strong>: ' + fmt(count) + ' (' + pct + '%)', e.clientX, e.clientY);
                });
                rect.addEventListener('mousemove', function(e) {
                    ChartHelpers.moveTooltip(TOOLTIP_CLASS, e.clientX, e.clientY);
                });
                rect.addEventListener('mouseleave', hideTip);
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
                showTip('<strong>' + roleLabel + ' \u2014 ' + SEX_LABELS[sex] + '</strong>: ' +
                    fmt(count) + ' (' + pct.toFixed(1) + '%)', e.clientX, e.clientY);
            });
            seg.addEventListener('mousemove', function(e) { ChartHelpers.moveTooltip(TOOLTIP_CLASS, e.clientX, e.clientY); });
            seg.addEventListener('mouseleave', hideTip);
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
                    stroke: gt('--color-border-light') || '#ece8e2', 'stroke-width': 1, 'stroke-dasharray': t === 0 ? 'none' : '2,2'
                }));
                if (t > 0) {
                    var lbl = svgEl('text', {
                        x: margin.left - 6, y: gy + 3,
                        'text-anchor': 'end', fill: gt('--color-text-light') || '#8c8680',
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
                    showTip(label + ' Pers.: <strong>' + fmt(d.count) + '</strong> Dok.', e.clientX, e.clientY);
                });
                hit.addEventListener('mousemove', function(e) {
                    ChartHelpers.moveTooltip(TOOLTIP_CLASS, e.clientX, e.clientY);
                });
                hit.addEventListener('mouseleave', hideTip);
                svg.appendChild(hit);

                // X label every 5
                if (i % 5 === 0 || i === 30) {
                    var xl = svgEl('text', {
                        x: x + barW / 2, y: h - 6,
                        'text-anchor': 'middle', fill: gt('--color-text-light') || '#8c8680',
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
                    fill: 'none', stroke: gt('--color-border-light') || '#ece8e2', 'stroke-width': strokeW
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
                    fill: gt('--color-text') || '#2c2825', 'font-family': 'Crimson Pro, serif',
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
                'Top 10 M\u00e4nner', 'men', SEX_COLORS.m
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
            var labelMap = { women: 'Frauen', men: 'M\u00e4nner', orgs: 'Organisationen' };

            if (state.selectedCollection) {
                var ct = data.perCollectionTop[state.selectedCollection];
                items = ct ? (ct[dataKey] || []) : [];
                var collLabel = '';
                data.collections.forEach(function(c) {
                    if (c.path === state.selectedCollection) collLabel = c.label;
                });
                title = 'Top 10 ' + (labelMap[dataKey] || dataKey) +
                    (collLabel ? ' \u2014 ' + collLabel : '');
            } else {
                var topMap = { women: data.topWomen, men: data.topMen, orgs: data.topOrgs };
                items = topMap[dataKey] || [];
                title = defaultTitle;
            }

            if (titleEl) titleEl.textContent = title;

            if (!items || !items.length) {
                container.innerHTML = '<p class="stats-no-data">Keine Daten verf\u00fcgbar.</p>';
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

    document.addEventListener('DOMContentLoaded', function() {
        if (document.getElementById('stats-data')) {
            initStatistics();
        }
    });

})();
