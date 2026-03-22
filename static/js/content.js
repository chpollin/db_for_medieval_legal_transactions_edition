/* ==========================================================================
   Wiener Urkundenbuch — Digital Edition
   Content pages: guidelines
   ========================================================================== */

(function() {
    'use strict';


    /* ------------------------------------------------------------------
       Guidelines page — scroll-spy + collapsible code blocks
       ------------------------------------------------------------------ */

    function initGuidelines() {
        var sidebar = document.getElementById('guidelines-sidebar');
        var body = document.querySelector('.guidelines-body');
        if (!sidebar || !body) return;

        // --- Collapsible code blocks: wrap long <pre> (>10 lines) in <details> ---
        var pres = body.querySelectorAll('pre');
        for (var i = 0; i < pres.length; i++) {
            var pre = pres[i];
            var lines = pre.textContent.split('\n').length;
            if (lines <= 10) continue;

            // Skip if already inside a <details>
            if (pre.closest('details')) continue;

            var details = document.createElement('details');
            var summary = document.createElement('summary');
            summary.textContent = 'XML-Beispiel anzeigen (' + lines + ' Zeilen)';
            details.appendChild(summary);

            // If pre is inside a .highlight div, wrap the whole .highlight
            var wrapper = pre.closest('.highlight') || pre;
            wrapper.parentNode.insertBefore(details, wrapper);
            details.appendChild(wrapper);
        }

        // --- Scroll-spy: highlight active TOC link ---
        var tocLinks = sidebar.querySelectorAll('a[href^="#"]');
        if (!tocLinks.length) return;

        // Build map of anchor -> TOC link
        var headings = [];
        for (var j = 0; j < tocLinks.length; j++) {
            var href = tocLinks[j].getAttribute('href');
            if (!href) continue;
            var target = document.getElementById(href.slice(1));
            if (target) {
                headings.push({ el: target, link: tocLinks[j] });
            }
        }

        if (!headings.length) return;

        var observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (!entry.isIntersecting) return;
                // Remove active from all
                for (var k = 0; k < headings.length; k++) {
                    headings[k].link.classList.remove('active');
                }
                // Set active on the intersecting heading's link
                for (var m = 0; m < headings.length; m++) {
                    if (headings[m].el === entry.target) {
                        headings[m].link.classList.add('active');
                        break;
                    }
                }
            });
        }, {
            rootMargin: '-80px 0px -70% 0px',
            threshold: 0
        });

        for (var n = 0; n < headings.length; n++) {
            observer.observe(headings[n].el);
        }
    }


    /* ------------------------------------------------------------------
       Initialise on matching pages
       ------------------------------------------------------------------ */

    document.addEventListener('DOMContentLoaded', function() {
        if (document.getElementById('guidelines-sidebar')) {
            initGuidelines();
        }
    });

})();
