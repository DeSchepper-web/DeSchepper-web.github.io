/* /products.js — v8.6 (client-cart aligned + global toast)
   - Adds N unit items (global schema: [{name, price}, ...])
   - Qty buttons wired (.qty-control .qty-btn.down/.up)
   - Calls window.showCartToast() just like your global JS
   - Optionally injects #cart-toast if missing (safe to remove if you include it in HTML)
   - Gallery + Dots + Lightbox + Duplicate guards
*/
(function () {
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  document.addEventListener('DOMContentLoaded', function () {
    var root = $('.product-page') || document;

    /* ---------------------------------------------
       Ensure #cart-toast exists (so global showCartToast works everywhere)
    --------------------------------------------- */
    (function ensureCartToast(){
      if (!document.getElementById('cart-toast')) {
        var t = document.createElement('div');
        t.id = 'cart-toast';
        t.textContent = 'Added to cart';
        // Minimal inline styles; remove if you style #cart-toast in CSS already
        Object.assign(t.style, {
          position: 'fixed', left: '50%', bottom: '24px', transform: 'translateX(-50%)',
          padding: '10px 14px', background: 'rgba(0,0,0,0.85)', color: '#fff',
          borderRadius: '10px', fontSize: '14px', zIndex: 9999, opacity: '0',
          transition: 'opacity .25s'
        });
        document.body.appendChild(t);
      }
    })();

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
       BUY UI — CLIENT-SIDE CART (global schema)
    --------------------------------------------- */
    var buyForm        = $('#buy-form', root);
    var priceDesktop   = $('#price', root);
    var variantDesktop = $('#variant', root);
    var qtyDesktop     = $('#qty', root);

    // Optional mobile hooks
    var buybar         = $('.buybar', root);
    var priceMobile    = $('#price-mobile', buybar || root);
    var variantMobile  = $('#variant-mobile', buybar || root);
    var qtyMobile      = $('#qty-mobile', buybar || root);

    var titleEl        = $('#product-title', root) || $('.product-title', root) || $('h1', root);

    function formatPrice(num) { return '$' + Number(num).toFixed(2); }
    function getVariantPrice(selectEl) {
      if (!selectEl) return null;
      var opt = selectEl.selectedOptions ? selectEl.selectedOptions[0] : null;
      var n = parseFloat(opt && opt.dataset ? opt.dataset.price || '' : '');
      return Number.isFinite(n) ? n : null;
    }
    function updatePrices() {
      var p = getVariantPrice(variantDesktop);
      if (p == null) p = getVariantPrice(variantMobile);
      if (p != null) {
        if (priceDesktop) priceDesktop.textContent = formatPrice(p);
        if (priceMobile)  priceMobile.textContent  = formatPrice(p);
      }
    }

    // Mirror helpers
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

    // Wire mirrors
    if (variantDesktop) variantDesktop.addEventListener('change', function () {
      mirrorSelect(variantDesktop, variantMobile); updatePrices();
    });
    if (variantMobile) variantMobile.addEventListener('change', function () {
      mirrorSelect(variantMobile, variantDesktop); updatePrices();
    });
    if (qtyDesktop) qtyDesktop.addEventListener('input', function () {
      mirrorInput(qtyDesktop, qtyMobile);
    });
    if (qtyMobile) qtyMobile.addEventListener('input', function () {
      mirrorInput(qtyMobile, qtyDesktop);
    });
    updatePrices();

    // ---- Quantity controls (.qty-btn.down/.up)
    (function attachQtyControls(){
      function toInt(v, d){ var n = parseInt(String(v||'').trim(), 10); return Number.isFinite(n) ? n : d; }
      function clamp(v, lo, hi){ return Math.max(lo, Math.min(hi, v)); }
      function setQty(input, val){
        input.value = String(val);
        input.dispatchEvent(new Event('input',  { bubbles:true }));
        input.dispatchEvent(new Event('change', { bubbles:true }));
      }

      document.addEventListener('click', function(e){
        var btn = e.target.closest('.qty-control .qty-btn');
        if(!btn) return;

        var wrap  = btn.closest('.qty-control');
        var input = wrap && wrap.querySelector('input[type="number"]');
        if(!input) return;

        e.preventDefault();

        var step = toInt(input.step, 1) || 1;
        var min  = toInt(input.min, 1) || 1;
        var max  = Number.isFinite(parseFloat(input.max)) ? parseInt(input.max,10) : Infinity;

        var val = toInt(input.value, min);
        if (btn.classList.contains('up'))   val += step;
        if (btn.classList.contains('down')) val -= step;

        setQty(input, clamp(val, min, max));

        if (input === qtyDesktop) mirrorInput(qtyDesktop, qtyMobile);
        if (input === qtyMobile)  mirrorInput(qtyMobile,  qtyDesktop);
      });

      var q = qtyDesktop;
      if (q){
        var min = toInt(q.min, 1), step = toInt(q.step, 1) || 1;
        var max = Number.isFinite(parseFloat(q.max)) ? parseInt(q.max,10) : Infinity;
        function clampSelf(){ setQty(q, clamp(toInt(q.value, min), min, max)); }
        q.addEventListener('blur', clampSelf);
        q.addEventListener('change', clampSelf);
        q.addEventListener('keydown', function(e){
          if (e.key === 'ArrowUp')   { e.preventDefault(); setQty(q, clamp(toInt(q.value,min)+step, min, max)); }
          if (e.key === 'ArrowDown') { e.preventDefault(); setQty(q, clamp(toInt(q.value,min)-step, min, max)); }
        });
      }
    })();

    // ---- Submit: add N unit items to match global cart schema ----
    var submitting = false;
    function submitBuy(e) {
      if (e) e.preventDefault();
      if (submitting) return;

      mirrorSelect(variantMobile, variantDesktop);
      mirrorInput(qtyMobile, qtyDesktop);

      var productName = (titleEl && titleEl.textContent.trim()) || 'Product';
      var vSel = variantDesktop || variantMobile;
      var variantText = '';
      if (vSel) {
        var opt = vSel.options[vSel.selectedIndex];
        variantText = opt ? (opt.text || opt.label || '') : '';
      }
      var displayName = variantText ? (productName + ' — ' + variantText) : productName;

      var priceVal = getVariantPrice(variantDesktop) ?? getVariantPrice(variantMobile) ?? 0;
      var qtyInput = buyForm && buyForm.querySelector('.qty-control input[type="number"]');
      if (!qtyInput) qtyInput = qtyDesktop || qtyMobile;
      var qtyVal = Math.max(1, parseInt(String(qtyInput ? qtyInput.value : '1').trim(), 10) || 1);

      var key = displayName + '|' + Number(priceVal || 0);

      var haveEnsureOrder     = (typeof window.ensureOrder === 'function');
      var haveGetCart         = (typeof window.getCart === 'function');
      var haveSetCart         = (typeof window.setCart === 'function');
      var haveUpdateCartCount = (typeof window.updateCartCount === 'function');
      var haveShowCartToast   = (typeof window.showCartToast === 'function');

      submitting = true;
      try {
        if (haveEnsureOrder) window.ensureOrder(key);

        var items = haveGetCart ? window.getCart() : (function(){ try { return JSON.parse(localStorage.getItem('cart')||'[]'); } catch { return []; } })();
        if (!Array.isArray(items)) items = [];

        for (var i = 0; i < qtyVal; i++) {
          items.push({ name: displayName, price: Number(priceVal) || 0 });
        }

        if (haveSetCart) window.setCart(items);
        else localStorage.setItem('cart', JSON.stringify(items));

        if (haveUpdateCartCount) window.updateCartCount();
        if (haveShowCartToast)   window.showCartToast();   // <-- same notification as global
        // Optional redirect:
        // location.href = '/cart/';
      } finally {
        submitting = false;
      }
    }

    if (buyForm) {
      buyForm.addEventListener('submit', function (e) {
        var clientMode = (buyForm.dataset.mode || '').toLowerCase() === 'client';
        if (clientMode) submitBuy(e);
      });
    }

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

    if (hero) console.log('[products.js v8.6] hero found, building gallery…');

    if (hero && heroImg && heroFrame && dotsWrap) {
      function parseImagesFromAttr(raw) {
        try { var arr = JSON.parse(raw); if (Array.isArray(arr) && arr.length) return arr; } catch(e){}
        try { var arr2 = JSON.parse(raw.replace(/&quot;/g, '"')); if (Array.isArray(arr2) && arr2.length) return arr2; } catch(e){}
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
        dotsWrap.style.display = '';
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

      renderDots();
      show();

      if (prevBtn) prevBtn.addEventListener('click', prev);
      if (nextBtn) nextBtn.addEventListener('click', next);

      hero.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') { next(); e.preventDefault(); }
        if (e.key === 'ArrowLeft')  { prev(); e.preventDefault(); }
      });

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
        if (Math.abs(dy) > Math.abs(dx)) return;
        if (Math.abs(dx) > 36) { if (dx > 0) prev(); else next(); swiping = false; }
      }
      function onTouchEnd() { swiping = false; touchX = touchY = null; }
      if (heroFrame) {
        heroFrame.addEventListener('touchstart', onTouchStart, { passive: true });
        heroFrame.addEventListener('touchmove',  onTouchMove,  { passive: true });
        heroFrame.addEventListener('touchend',   onTouchEnd,   { passive: true });
      }

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
      if (heroImg) heroImg.addEventListener('click', openLightbox);
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

      var EXT_ALTS = ['.jpg', '.jpeg', '.png', '.webp'];
      var triedByIndex = new Map();
      if (heroImg) {
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
    }
  });
})();
