/* ==========================================================================
   Wiener Urkundenbuch — Digital Edition
   Facsimile viewer (synopsis mode)
   ========================================================================== */

(function() {
    'use strict';

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

    document.addEventListener('DOMContentLoaded', function() {
        initFacsimileViewer();
    });

})();
