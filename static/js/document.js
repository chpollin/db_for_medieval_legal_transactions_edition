/* ==========================================================================
   Wiener Urkundenbuch — Digital Edition
   Document page: factoid view + citation helper
   ========================================================================== */

(function() {
    'use strict';

    var esc = EdCore.esc;


    /* ------------------------------------------------------------------
       Factoid View — extract atomic assertions from annotation spans
       ------------------------------------------------------------------ */

    function initFactoidView() {
        var toggleBtn = document.getElementById('factoid-toggle');
        var container = document.getElementById('factoid-view');
        if (!toggleBtn || !container) return;

        var built = false;

        toggleBtn.addEventListener('click', function() {
            var isVisible = !container.classList.contains('hidden');
            if (isVisible) {
                container.classList.add('hidden');
                toggleBtn.setAttribute('aria-expanded', 'false');
                return;
            }
            if (!built) {
                buildFactoidTable(container);
                built = true;
            }
            container.classList.remove('hidden');
            toggleBtn.setAttribute('aria-expanded', 'true');
        });
    }

    function buildFactoidTable(container) {
        var body = document.querySelector('.doc-body');
        if (!body) return;

        var factoids = [];

        // Walk all function role spans — each is a factoid context
        var fnSpans = body.querySelectorAll('.anno-fn');
        for (var i = 0; i < fnSpans.length; i++) {
            var fnSpan = fnSpans[i];
            var role = fnSpan.getAttribute('data-role') || '';
            var roleLabel = {
                'issuer': 'Aussteller*in',
                'recipient': 'Empf\u00e4nger*in',
                'witness': 'Zeug*in',
                'other': 'Sonstige'
            }[role] || role;

            // Find entities within this function span
            var entities = fnSpan.querySelectorAll('.anno-person, .anno-org, .anno-place');
            for (var j = 0; j < entities.length; j++) {
                var entity = entities[j];
                var type = entity.classList.contains('anno-person') ? 'Person' :
                           entity.classList.contains('anno-org') ? 'Organisation' : 'Ort';
                var ref = entity.getAttribute('data-ref') || '';
                var name = entity.textContent.trim();
                var title = entity.getAttribute('title') || entity.getAttribute('data-title') || '';
                if (title) name = title.replace(/\s*\[.*\]\s*$/, '') || name;

                // Collect attributes (roleName) within or near this entity
                var attrs = [];
                var attrSpans = entity.querySelectorAll('.anno-attr');
                for (var k = 0; k < attrSpans.length; k++) {
                    attrs.push(attrSpans[k].textContent.trim());
                }

                // Find event context (closest parent anno-event)
                var eventSpan = entity.closest('.anno-event');
                var eventRef = eventSpan ? (eventSpan.getAttribute('data-ref') || '') : '';

                factoids.push({
                    entity: name,
                    type: type,
                    ref: ref,
                    role: roleLabel,
                    attributes: attrs.join(', '),
                    event: eventRef
                });
            }
        }

        // Also find entities NOT inside any function span (standalone annotations)
        var allEntities = body.querySelectorAll('.anno-person, .anno-org, .anno-place');
        for (var m = 0; m < allEntities.length; m++) {
            var el = allEntities[m];
            if (el.closest('.anno-fn')) continue; // already captured above
            var elType = el.classList.contains('anno-person') ? 'Person' :
                         el.classList.contains('anno-org') ? 'Organisation' : 'Ort';
            var elRef = el.getAttribute('data-ref') || '';
            var elName = el.textContent.trim();
            var elTitle = el.getAttribute('title') || el.getAttribute('data-title') || '';
            if (elTitle) elName = elTitle.replace(/\s*\[.*\]\s*$/, '') || elName;

            var elAttrs = [];
            var elAttrSpans = el.querySelectorAll('.anno-attr');
            for (var n = 0; n < elAttrSpans.length; n++) {
                elAttrs.push(elAttrSpans[n].textContent.trim());
            }

            var elEvent = el.closest('.anno-event');
            var elEventRef = elEvent ? (elEvent.getAttribute('data-ref') || '') : '';

            factoids.push({
                entity: elName,
                type: elType,
                ref: elRef,
                role: '\u2013',
                attributes: elAttrs.join(', '),
                event: elEventRef
            });
        }

        if (factoids.length === 0) {
            container.innerHTML = '<p class="factoid-empty">Keine annotierten Entit\u00e4ten in diesem Dokument.</p>';
            return;
        }

        var html = '<table class="factoid-table"><thead><tr>'
            + '<th>Entit\u00e4t</th><th>Typ</th><th>Rolle</th><th>Attribute</th><th>Event</th><th>ID</th>'
            + '</tr></thead><tbody>';
        for (var p = 0; p < factoids.length; p++) {
            var f = factoids[p];
            html += '<tr>'
                + '<td>' + esc(f.entity) + '</td>'
                + '<td><span class="factoid-type factoid-type-' + f.type.toLowerCase() + '">' + esc(f.type) + '</span></td>'
                + '<td>' + esc(f.role) + '</td>'
                + '<td>' + esc(f.attributes || '\u2013') + '</td>'
                + '<td><span class="cell-id">' + esc(f.event || '\u2013') + '</span></td>'
                + '<td><span class="cell-id">' + esc(f.ref) + '</span></td>'
                + '</tr>';
        }
        html += '</tbody></table>';

        container.innerHTML = '<div class="factoid-header">'
            + '<span class="factoid-count">' + factoids.length + ' Faktoid' + (factoids.length !== 1 ? 'e' : '') + '</span>'
            + '</div>' + html;
    }


    /* ------------------------------------------------------------------
       Citation Helper — formatted citation with copy-to-clipboard
       ------------------------------------------------------------------ */

    function initCitationHelper() {
        var btn = document.getElementById('cite-toggle');
        var popover = document.getElementById('cite-popover');
        if (!btn || !popover) return;

        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            var isVisible = !popover.classList.contains('hidden');
            if (isVisible) {
                popover.classList.add('hidden');
                btn.setAttribute('aria-expanded', 'false');
            } else {
                buildCitations(popover);
                popover.classList.remove('hidden');
                btn.setAttribute('aria-expanded', 'true');
            }
        });

        document.addEventListener('click', function(e) {
            if (!popover.contains(e.target) && e.target !== btn) {
                popover.classList.add('hidden');
                btn.setAttribute('aria-expanded', 'false');
            }
        });

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                popover.classList.add('hidden');
                btn.setAttribute('aria-expanded', 'false');
            }
        });
    }

    function buildCitations(popover) {
        // Read metadata from the page DOM
        var metaScript = document.getElementById('doc-meta');
        if (!metaScript) return;
        var meta;
        try { meta = JSON.parse(metaScript.textContent); } catch(e) { return; }

        var idno = meta.idno || '';
        var dateDisplay = meta.date_display || '';
        var citation = meta.citation || '';
        var collection = meta.collection_label || '';
        var url = window.location.href;
        var today = new Date().toISOString().slice(0, 10);

        // Chicago style
        var chicago = '';
        if (citation) {
            chicago = citation + '.';
        } else {
            chicago = 'Nr. ' + idno;
            if (dateDisplay) chicago += ' (' + dateDisplay + ')';
            chicago += '.';
        }
        chicago += ' In: Wiener Urkundenbuch Digital. Universität Wien.';
        chicago += ' ' + url + ' (Zugriff: ' + today + ').';

        // BibTeX
        var bibKey = 'WUB_' + idno.replace(/[^a-zA-Z0-9_]/g, '_');
        var bibtex = '@misc{' + bibKey + ',\n'
            + '  title     = {Nr. ' + idno + (dateDisplay ? ' (' + dateDisplay + ')' : '') + '},\n'
            + '  author    = {{Wiener Urkundenbuch Digital}},\n'
            + '  publisher = {Universität Wien},\n'
            + '  year      = {' + (dateDisplay.match(/\d{4}/) || ['s.d.'])[0] + '},\n'
            + '  howpublished = {\\url{' + url + '}},\n'
            + '  note      = {' + collection + '. Zugriff: ' + today + '}\n'
            + '}';

        popover.innerHTML = '<div class="cite-section">'
            + '<div class="cite-label">Chicago</div>'
            + '<div class="cite-text" id="cite-chicago">' + esc(chicago) + '</div>'
            + '<button class="cite-copy-btn" data-target="cite-chicago" title="Kopieren">&#x2398;</button>'
            + '</div>'
            + '<div class="cite-section">'
            + '<div class="cite-label">BibTeX</div>'
            + '<pre class="cite-text cite-bibtex" id="cite-bibtex">' + esc(bibtex) + '</pre>'
            + '<button class="cite-copy-btn" data-target="cite-bibtex" title="Kopieren">&#x2398;</button>'
            + '</div>';

        // Wire up copy buttons
        var copyBtns = popover.querySelectorAll('.cite-copy-btn');
        for (var i = 0; i < copyBtns.length; i++) {
            copyBtns[i].addEventListener('click', function(e) {
                e.stopPropagation();
                var targetId = this.getAttribute('data-target');
                var textEl = document.getElementById(targetId);
                if (!textEl) return;
                var text = textEl.textContent;
                navigator.clipboard.writeText(text).then(function() {
                    e.target.textContent = '\u2713';
                    setTimeout(function() { e.target.textContent = '\u2398'; }, 1500);
                });
            });
        }
    }


    /* ------------------------------------------------------------------
       Initialise on document pages
       ------------------------------------------------------------------ */

    document.addEventListener('DOMContentLoaded', function() {
        if (document.querySelector('.doc-body')) {
            initFactoidView();
            initCitationHelper();
        }
    });

})();
