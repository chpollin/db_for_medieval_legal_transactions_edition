/* ==========================================================================
   Wiener Urkundenbuch — Digital Edition
   Core: navigation, hamburger menu, esc() utility
   ========================================================================== */

var EdCore = (function() {
    'use strict';

    /* ------------------------------------------------------------------
       HTML-escape utility (used by multiple modules)
       ------------------------------------------------------------------ */

    var esc = (function() {
        var d = document.createElement('div');
        return function(s) {
            if (s === undefined || s === null || s === '') return '';
            d.textContent = String(s);
            return d.innerHTML;
        };
    })();


    /* ------------------------------------------------------------------
       Navigation dropdown
       ------------------------------------------------------------------ */

    function closeAllDropdowns(dropdowns) {
        dropdowns.forEach(function(d) {
            d.classList.remove('open');
            var t = d.querySelector('.nav-dropdown-trigger');
            if (t) t.setAttribute('aria-expanded', 'false');
        });
    }

    function initNavDropdown() {
        var dropdowns = document.querySelectorAll('.nav-dropdown');
        dropdowns.forEach(function(dd) {
            var trigger = dd.querySelector('.nav-dropdown-trigger');
            if (!trigger) return;

            trigger.addEventListener('click', function(e) {
                e.stopPropagation();
                var isOpen = dd.classList.contains('open');
                closeAllDropdowns(dropdowns);
                if (!isOpen) {
                    dd.classList.add('open');
                    trigger.setAttribute('aria-expanded', 'true');
                }
            });
        });

        document.addEventListener('click', function() {
            closeAllDropdowns(dropdowns);
        });

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeAllDropdowns(dropdowns);
            }
        });
    }


    /* ------------------------------------------------------------------
       Hamburger menu (responsive nav)
       ------------------------------------------------------------------ */

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


    /* ------------------------------------------------------------------
       Initialise on every page
       ------------------------------------------------------------------ */

    document.addEventListener('DOMContentLoaded', function() {
        initNavDropdown();
        initNavHamburger();
    });


    /* ------------------------------------------------------------------
       Public API
       ------------------------------------------------------------------ */

    return {
        esc: esc
    };

})();
