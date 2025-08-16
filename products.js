/* /product-page.js  — v7
   Gallery + Dots + Lightbox + Buy UI sync + Duplicate guards
*/
(function () {
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  document.addEventListener('DOMContentLoaded', function () {
    var root = $('.product-page') || document;

    /* ---------------------------------------------
       Footer year
    --------------------------------------------- */
    var yearEl = $('#year');
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());

    /* ---------------------------------------------
       DEDUPE: reviews, buybox, buybar
    --------------------------------------------- */
    function dedupe(selector) {
      var els = $$(selector, root);
      if (els.length <= 1) return;
      els.forEach(function (el, idx) { if (idx > 0) el.parentNode && el.parentNode.removeChild(el); });
    }
    function runDedupe() {
      dedupe('.reviews-panel');
      dedupe('.buybox');
      dedupe('.buybar');
    }
    runDedupe();
    var grid = $('.grid', root);
    if (grid && 'MutationObserver' in window) {
      new MutationObserver(runDedupe).observe(grid, { childList: true, subtree: true });
    }

    /* ---------------------------------------------
       BUY UI sync
    --------------------------------------------- */
    var buyForm        = $('#buy-form', root);
    var priceDesktop   = $('#price', root);
    var variantDesktop = $('#variant', root);
    var qtyDesktop     = $('#qty', root);

    var buybar         = $('.buybar', root);
    var priceMobile    = $('#price-mobile', buybar || root);
    var variantMobile  = $('#variant-mobile', buybar || root);
    var qtyMobile      = $('#qty-mobile', buybar || root);
    var addMobileBtn   = $('#add-mobile', buybar || root);

    function formatPrice(num) { return '$' + Number(num).toFixed(2); }
    function getVariantPrice(selectEl) {
      if (!selectEl) return null;
      var opt = selectEl.selectedOptions && selectEl.selectedOptions[0];
      var n = parseFloat((opt && opt.dataset ? opt.dataset.price : '') || '');
      return isFinite(n) ? n : null;
    }
    function updatePrices() {
      var p = getVariantPrice(variantDesktop);
      if (p == null) p = getVariantPrice(variantMobile);
      if (p != null) {
        if (priceDesktop) priceDesktop.textContent = formatPrice(p);
        if (priceMobile)  priceMobile.textContent  = formatPrice(p);
      }
    }
    function mirrorSelect(from, to) {
      if (!from || !to) return;
      if (to.value !== from.value) {
        to.value = from.value;
        to.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    function mirrorInput(from, to) {
      if (!from || !to) return;
      if (to.value !== from.value) {
        to.value = from.value;
        to.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }

    if (variantDesktop) variantDesktop.addEventListener('change', function () { mirrorSelect(variantDesktop, variantMobile); updatePrices(); });
    if (variantMobile)  variantMobile.addEventListener('change',  function () { mirrorSelect(variantMobile,  variantDesktop); updatePrices(); });

    if (qtyDesktop) qtyDesktop.addEventListener('input', function () { mirrorInput(qtyDesktop, qtyMobile); });
    if (qtyMobile)  qtyMobile.addEventListener('input',  function () { mirrorInput(qtyMobile,  qtyDesktop); });

    if (addMobileBtn) addMobileBtn.addEventListener('click', function (e) {
      e.preventDefault();
      mirrorSelect(variantMobile, variantDesktop);
      mirrorInput(qtyMobile, qtyDesktop);
      if (buyForm) buyForm.submit();
    });

    updatePrices();

    /* ---------------------------------------------
       GALLERY + DOTS + LIGHTBOX
    --------------------------------------------- */
    var hero        = $('.hero', root);
    var heroImg     = hero ? $('#hero-img', hero) : null;
    var heroFrame   = hero ? $('.hero-frame', hero) : null;
    var prevBtn     = hero ? $('.hero-nav.prev', hero) : null;
    var nextBtn     = hero ? $('.hero-nav.next', hero) : null;
    var dotsWrap    = hero ? $('#hero-dots', hero) || $('#hero-dots') : null;

    var lightbox    = $('#lightbox');
    var lightboxImg = $('#lightbox-img');

    // Quick one-line heartbeat so you know this file is loaded:
    // (Open DevTools → Console, you should see this once.)
    if (hero) console.log('[product-page.js v7] hero found, building gallery…');

    if (hero && heroImg && heroFrame && dotsWrap) {
      function parseImagesFromAttr(raw) {
        // 1) Try raw JSON
        try { var arr = JSON.parse(raw); if (Array.isArray(arr) && arr.length) return arr; } catch(e){}
        // 2) Replace &quot; with " and retry
        try { var arr2 = JSON.parse(raw.replace(/&quot;/g, '"')); if (Array.isArray(arr2) && arr2.length) return arr2; } catch(e){}
        // 3) Last resort: extract anything inside straight quotes
        var out = []; var m; var rx = /"([^"]+)"/g;
        while ((m = rx.exec(raw))) out.push(m[1]);
        return out;
      }

      function getImages() {
        if (Array.isArray(window.PRODUCT_IMAGES) && window.PRODUCT_IMAGES.length) {
          return window.PRODUCT_IMAGES.slice();
        }
        var raw = hero.getAttribute('data-images');
        if (raw) {
          var list = parseImagesFromAttr(raw);
          if (list && list.length) return list;
        }
        var src = heroImg.getAttribute('src');
        return src ? [src] : [];
      }

      var images = getImages();
      var i = 0;

      function renderDots() {
        dotsWrap.innerHTML = '';
        if (!images || images.length <= 1) {
          dotsWrap.style.display = 'none';
          return;
        }
        dotsWrap.style.display = ''; // use CSS default
        images.forEach(function (_, idx) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'dot';
          b.setAttribute('role', 'tab');
          b.setAttribute('aria-label', 'Go to image ' + (idx + 1) + ' of ' + images.length);
          b.setAttribute('aria-selected', idx === i ? 'true' : 'false');
          b.tabIndex = (idx === i ? 0 : -1);
          b.addEventListener('click', function () { go(idx); });
          dotsWrap.appendChild(b);
        });
      }

      function updateDots() {
        $$('.dot', dotsWrap).forEach(function (b, idx) {
          var selected = (idx === i);
          b.setAttribute('aria-selected', selected ? 'true' : 'false');
          b.tabIndex = selected ? 0 : -1;
        });
      }

      function show() {
        if (!images[i]) return;
        heroImg.src = images[i];
        if (!heroImg.alt) heroImg.alt = 'Product image';
        updateDots();
      }

      function go(idx) { i = (idx + images.length) % images.length; show(); }
      function next()  { go(i + 1); }
      function prev()  { go(i - 1); }

      // Init
      renderDots();
      show();

      // Buttons
      if (prevBtn) prevBtn.addEventListener('click', prev);
      if (nextBtn) nextBtn.addEventListener('click', next);

      // Keyboard (when hero is focused)
      hero.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') { next(); e.preventDefault(); }
        if (e.key === 'ArrowLeft')  { prev(); e.preventDefault(); }
      });

      // Swipe
      var touchX = null, touchY = null, swiping = false;
      function onTouchStart(e) {
        if (!e.touches || e.touches.length !== 1) return;
        var t = e.touches[0];
        touchX = t.clientX; touchY = t.clientY; swiping = true;
      }
      function onTouchMove(e) {
        if (!swiping || touchX == null) return;
        var dx = e.touches[0].clientX - touchX;
        var dy = e.touches[0].clientY - touchY;
        if (Math.abs(dy) > Math.abs(dx)) return; // ignore vertical scroll
        if (Math.abs(dx) > 36) { if (dx > 0) prev(); else next(); swiping = false; }
      }
      function onTouchEnd() { swiping = false; touchX = touchY = null; }
      heroFrame.addEventListener('touchstart', onTouchStart, { passive: true });
      heroFrame.addEventListener('touchmove',  onTouchMove,  { passive: true });
      heroFrame.addEventListener('touchend',   onTouchEnd,   { passive: true });

      // Lightbox
      function openLightbox() {
        if (!lightbox || !lightboxImg) return;
        lightbox.setAttribute('aria-hidden', 'false');
        lightboxImg.src = images[i];
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
      }
      function closeLightbox() {
        if (!lightbox) return;
        lightbox.setAttribute('aria-hidden', 'true');
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
      }
      heroImg.addEventListener('click', openLightbox);
      if (lightbox) {
        lightbox.addEventListener('click', function (e) { if (e.target === lightbox) closeLightbox(); });
      }
      document.addEventListener('keydown', function (e) {
        if (!lightbox || lightbox.getAttribute('aria-hidden') !== 'false') return;
        if (e.key === 'Escape')     closeLightbox();
        if (e.key === 'ArrowRight') { next(); if (lightboxImg) lightboxImg.src = images[i]; }
        if (e.key === 'ArrowLeft')  { prev(); if (lightboxImg) lightboxImg.src = images[i]; }
      });
      if (lightboxImg) {
        lightboxImg.addEventListener('click', function (e) {
          var rect = lightboxImg.getBoundingClientRect();
          var mid = rect.left + rect.width / 2;
          if (e.clientX < mid) prev(); else next();
          lightboxImg.src = images[i];
        });
      }

      // Missing image resilience
      var EXT_ALTS = ['.jpg', '.jpeg', '.png', '.webp'];
      var triedByIndex = new Map();
      heroImg.addEventListener('error', function () {
        var url = images[i] || '';
        var m = url.match(/\.(jpe?g|png|webp)(\?.*)?$/i);
        var curExt = m ? '.' + m[1].toLowerCase() : '';
        var rest   = m ? (m[2] || '') : '';
        var tried  = triedByIndex.get(i) || new Set();
        if (curExt) tried.add(curExt);
        triedByIndex.set(i, tried);

        var nextExt = m && EXT_ALTS.find(function (ext) { return !tried.has(ext); });
        if (nextExt) {
          var candidate = url.replace(/\.(jpe?g|png|webp)(\?.*)?$/i, nextExt + rest);
          console.warn('Gallery image failed, retrying with', nextExt, candidate);
          images[i] = candidate;
          heroImg.src = candidate;
          return;
        }
        console.warn('Gallery image missing, skipping:', url);
        images.splice(i, 1);
        if (!images.length) return;
        if (i >= images.length) i = 0;
        renderDots();
        heroImg.src = images[i];
      });
    }
  });
})();
