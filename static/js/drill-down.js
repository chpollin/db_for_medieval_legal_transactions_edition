/* ==========================================================================
   Wiener Urkundenbuch — Digital Edition
   DrillDown: shared document drill-down overlay + CSV export
   ========================================================================== */

var DrillDown = (function() {
    'use strict';

    var esc = EdCore.esc;

    // Shared state
    var docsLookup = null;
    var docsLookupLoading = false;
    var currentData = [];
    var boundOverlays = {};

    /* ------------------------------------------------------------------
       Lazy-load docs_lookup.json (shared across all explorers)
       ------------------------------------------------------------------ */

    function loadDocsLookup(callback) {
        if (docsLookup) { callback(docsLookup); return; }
        if (docsLookupLoading) {
            // Queue: wait and retry
            var check = setInterval(function() {
                if (docsLookup) { clearInterval(check); callback(docsLookup); }
                if (!docsLookupLoading && !docsLookup) { clearInterval(check); }
            }, 100);
            return;
        }
        docsLookupLoading = true;
        fetch('./data/docs_lookup.json')
            .then(function(res) { return res.json(); })
            .then(function(data) {
                docsLookup = data;
                docsLookupLoading = false;
                callback(docsLookup);
            })
            .catch(function() {
                docsLookupLoading = false;
            });
    }


    /* ------------------------------------------------------------------
       Bind an overlay by element IDs. Call once per overlay.
       Returns a handle for open/close.
       ------------------------------------------------------------------ */

    function bind(config) {
        var overlayId = config.overlayId || 'explore-drilldown';
        var overlay = document.getElementById(overlayId);
        if (!overlay) return null;

        var titleEl = document.getElementById(config.titleId || 'explore-drilldown-title');
        var tbodyEl = document.getElementById(config.tbodyId || 'explore-drilldown-tbody');
        var countEl = document.getElementById(config.countId || 'explore-drilldown-count');
        var closeBtn = document.getElementById(config.closeId || 'explore-drilldown-close');
        var exportBtn = document.getElementById(config.exportId || 'explore-drilldown-export');

        var handle = {
            overlay: overlay,
            titleEl: titleEl,
            tbodyEl: tbodyEl,
            countEl: countEl
        };

        function close() {
            overlay.classList.add('hidden');
            document.body.style.overflow = '';
        }

        if (closeBtn) closeBtn.addEventListener('click', close);
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) close();
        });

        // Escape key — only close this overlay if it's visible
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && !overlay.classList.contains('hidden')) {
                close();
            }
        });

        // CSV export
        if (exportBtn) {
            exportBtn.addEventListener('click', function() {
                if (!currentData.length) return;
                var lines = ['Nr.;Datum;Sammlung;Regest'];
                for (var i = 0; i < currentData.length; i++) {
                    var d = currentData[i];
                    lines.push([d.i, d.d, d.c, (d.r || '').replace(/;/g, ',')].join(';'));
                }
                var blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
                var url = URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = url;
                a.download = 'exploration_' + (titleEl ? titleEl.textContent : 'export').replace(/[^a-zA-Z0-9]/g, '_') + '.csv';
                a.click();
                URL.revokeObjectURL(url);
            });
        }

        handle.close = close;
        boundOverlays[overlayId] = handle;
        return handle;
    }


    /* ------------------------------------------------------------------
       Open drill-down: show overlay, lazy-load docs, populate table
       ------------------------------------------------------------------ */

    function open(handle, title, fileKeys) {
        if (!handle || !fileKeys.length) return;
        handle.titleEl.textContent = title;
        handle.tbodyEl.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#8c8680">Lade Dokumentdaten\u2026</td></tr>';
        handle.countEl.textContent = fileKeys.length + ' Dokumente';
        handle.overlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        loadDocsLookup(function(lookup) {
            currentData = [];
            handle.tbodyEl.innerHTML = '';
            for (var i = 0; i < fileKeys.length; i++) {
                var doc = lookup[fileKeys[i]];
                if (!doc) continue;
                currentData.push(doc);
                var tr = document.createElement('tr');
                tr.innerHTML =
                    '<td><a href="./' + doc.u + '">' + esc(doc.i) + '</a></td>' +
                    '<td>' + esc(doc.d) + '</td>' +
                    '<td>' + esc(doc.c) + '</td>' +
                    '<td>' + esc(doc.r) + '</td>';
                handle.tbodyEl.appendChild(tr);
            }
            handle.countEl.textContent = currentData.length + ' Dokumente';
        });
    }


    /* ------------------------------------------------------------------
       Public API
       ------------------------------------------------------------------ */

    return {
        loadDocsLookup: loadDocsLookup,
        bind: bind,
        open: open
    };

})();
