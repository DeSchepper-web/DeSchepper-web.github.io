/* /products.js — v8.7 (client-cart aligned + global toast, cleaned)
   - Adds N unit items (global schema: [{name, price}, ...])
   - Qty buttons wired (.qty-control .qty-btn.down/.up)
   - Calls window.showCartToast() like your global JS
   - Optionally injects #cart-toast if missing (safe to remove if you include it in HTML)
   - Gallery + Dots + Lightbox (no-DOM-rewrite, robust + Option A swipe fix)
   - Review images lightbox (scoped to #reviews-bottom), closes on backdrop/X/Esc/image
*/
(function () {
  function $(sel, root)  { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  document.addEventListener('DOMContentLoaded', function () {
    var root = $('.product-page') || document;

    /* ---------------------------------------------
       Ensure #cart-toast exists
    --------------------------------------------- */
    (function ensureCartToast(){
      if (!document.getElementById('cart-toast')) {
        var t = document.createElement('div');
        t.id = 'cart-toast';
        t.textContent = 'Added to cart';
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

        for (var k = 0; k < qtyVal; k++) {
          items.push({ name: displayName, price: Number(priceVal) || 0 });
        }

        if (haveSetCart) window.setCart(items);
        else localStorage.setItem('cart', JSON.stringify(items));

        if (haveUpdateCartCount) window.updateCartCount();
        if (haveShowCartToast)   window.showCartToast();
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
       GALLERY + DOTS + LIGHTBOX (no-DOM-rewrite, robust)
       Works with your existing HTML (hero-img, arrows, prebuilt dots)
    --------------------------------------------- */
    var hero        = $('.hero', root);
    var heroImg     = hero ? $('#hero-img', hero) : null;
    var heroFrame   = hero ? $('.hero-frame', hero) : null;
    var prevBtn     = hero ? $('.hero-nav.prev', hero) : null;
    var nextBtn     = hero ? $('.hero-nav.next', hero) : null;
    var dotsWrap    = hero ? $('.hero-dots', hero) : null;

    var lightbox    = $('#lightbox');
    var lightboxImg = $('#lightbox-img');

    if (hero) console.log('[products.js v8.7-clean] binding simple slider…');

    if (hero && heroImg && heroFrame && dotsWrap) {
      function parseImagesFromAttr(raw) {
        try { var a = JSON.parse(raw); if (Array.isArray(a) && a.length) return a; } catch(e){}
        try { var b = JSON.parse((raw||'').replace(/&quot;/g,'"')); if (Array.isArray(b)&&b.length) return b; } catch(e){}
        var out=[],m,rx=/"([^"]+)"/g; while((m=rx.exec(raw||''))) out.push(m[1]); return out;
      }
      function getImages() {
        if (Array.isArray(window.PRODUCT_IMAGES) && window.PRODUCT_IMAGES.length) return window.PRODUCT_IMAGES.slice();
        var raw = hero.getAttribute('data-images'); if (raw) { var list = parseImagesFromAttr(raw); if (list.length) return list; }
        var src = heroImg.getAttribute('src'); return src ? [src] : [];
      }

      var images = getImages();
      var gi = 0; // gallery index (avoid var-collisions)

      function ensureDots() {
        var dots = $$('.hero-dots > button', hero);
        if (dots.length === images.length) return dots;
        while (dots.length < images.length) {
          var b = document.createElement('button');
          b.type = 'button'; b.setAttribute('role','tab');
          b.setAttribute('aria-controls','hero-img'); b.setAttribute('aria-selected','false'); b.tabIndex = -1;
          dotsWrap.appendChild(b);
          dots.push(b);
        }
        while (dots.length > images.length) {
          var last = dots.pop(); last.parentNode.removeChild(last);
        }
        return $$('.hero-dots > button', hero);
      }

      function preloadAll(arr){ arr.forEach(function(url){ var im=new Image(); im.decoding='async'; im.src=url; }); }

      function updateDots() {
        $$('.hero-dots > button', hero).forEach(function (b, idx) {
          var sel = (idx === gi);
          b.setAttribute('aria-selected', sel ? 'true' : 'false');
          b.tabIndex = sel ? 0 : -1;
          b.classList.toggle('is-active', sel);
        });
      }

      function show(idx) {
        gi = (idx + images.length) % images.length;
        if (images[gi]) heroImg.src = images[gi];
        if (!heroImg.alt) heroImg.alt = 'Product image ' + (gi+1);
        updateDots();
        if (lightbox && lightboxImg && lightbox.getAttribute('aria-hidden') === 'false') {
          lightboxImg.src = images[gi];
        }
      }

      function next(){ show(gi + 1); }
      function prev(){ show(gi - 1); }

      // Init
      ensureDots();
      preloadAll(images);
      if (images[0] && heroImg.src !== images[0]) heroImg.src = images[0];
      updateDots();

      var hasMany = images.length > 1;
      if (prevBtn) prevBtn.disabled = !hasMany;
      if (nextBtn) nextBtn.disabled = !hasMany;

      if (hasMany) {
        // Arrow clickability guard
        (function ensureArrowClickability(){
          [prevBtn, nextBtn].forEach(function(btn){
            if (!btn) return;
            btn.style.pointerEvents = 'auto';
            btn.style.zIndex = '5';
            $$('.hero-nav *', btn).forEach(function(n){ n.style.pointerEvents = 'none'; });
          });
        })();

        // Arrows
        if (prevBtn) prevBtn.addEventListener('click', function(e){
          e.preventDefault(); e.stopPropagation(); prev();
        }, true);
        if (nextBtn) nextBtn.addEventListener('click', function(e){
          e.preventDefault(); e.stopPropagation(); next();
        }, true);

        heroFrame.addEventListener('click', function(e){
          var btn = e.target.closest && e.target.closest('.hero-nav');
          if (!btn) return;
          e.preventDefault(); e.stopPropagation();
          if (btn.classList.contains('prev')) prev();
          if (btn.classList.contains('next')) next();
        }, true);

        // Dots
        $$('.hero-dots > button', hero).forEach(function(b, idx){
          b.addEventListener('click', function(){ show(idx); });
        });

        // Keyboard on hero
        hero.addEventListener('keydown', function (e) {
          if (e.key === 'ArrowRight') { next(); e.preventDefault(); }
          if (e.key === 'ArrowLeft')  { prev(); e.preventDefault(); }
        });

        /* ---------------------------------------------
           SWIPE / DRAG — Option A (never start from controls)
        --------------------------------------------- */
        var startX = null, startY = null, dragging = false, activePointerId = null;

        function isInteractiveTarget(t){
          return !!(t && (t.closest('.hero-nav') || t.closest('.hero-dots button')));
        }

        function onPointerDown(e){
          if (isInteractiveTarget(e.target)) return;
          dragging = true;
          activePointerId = e.pointerId;
          startX = e.clientX;
          startY = e.clientY;
          if (heroFrame.setPointerCapture && activePointerId != null) {
            try { heroFrame.setPointerCapture(activePointerId); } catch(_){ }
          }
        }

        function onPointerMove(e){
          if (!dragging) return;
          var dx = e.clientX - startX, dy = e.clientY - startY;
          if (Math.abs(dx) < 10 || Math.abs(dy) > Math.abs(dx)) return;
          e.preventDefault();
        }

        function endGesture(e){
          if (!dragging) return;
          dragging = false;
          var dx = e.clientX - startX;
          if (dx > 40) prev();
          else if (dx < -40) next();
          if (heroFrame.releasePointerCapture && activePointerId != null) {
            try { heroFrame.releasePointerCapture(activePointerId); } catch(_){ }
          }
          activePointerId = null;
        }

        function cancelGesture(){
          dragging = false;
          if (heroFrame.releasePointerCapture && activePointerId != null) {
            try { heroFrame.releasePointerCapture(activePointerId); } catch(_){ }
          }
          activePointerId = null;
        }

        heroFrame.addEventListener('pointerdown', onPointerDown);
        heroFrame.addEventListener('pointermove', onPointerMove, { passive: false });
        heroFrame.addEventListener('pointerup',   endGesture);
        heroFrame.addEventListener('pointercancel', cancelGesture);
        heroFrame.addEventListener('lostpointercapture', cancelGesture);
      } else {
        // Single-image: still allow click to open hero lightbox
        if (heroImg) heroImg.addEventListener('click', openLightbox);
        console.warn('[products.js] Gallery has one image. Add more via data-images or window.PRODUCT_IMAGES.');
      }

      // Hero lightbox
      function openLightbox() {
        if (!lightbox || !lightboxImg) return;
        lightbox.setAttribute('aria-hidden', 'false');
        lightboxImg.src = images[gi];
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
      }
      if (heroImg) heroImg.addEventListener('click', openLightbox);

      if (lightbox) {
        lightbox.addEventListener('click', function (e) {
          if (e.target === lightbox) {
            lightbox.setAttribute('aria-hidden', 'true');
            document.documentElement.style.overflow = '';
            document.body.style.overflow = '';
          }
        });
        document.addEventListener('keydown', function (e) {
          if (lightbox.getAttribute('aria-hidden') !== 'false') return;
          if (e.key === 'Escape') {
            lightbox.setAttribute('aria-hidden', 'true');
            document.documentElement.style.overflow = '';
            document.body.style.overflow = '';
          }
          if (e.key === 'ArrowRight') { next(); }
          if (e.key === 'ArrowLeft')  { prev(); }
        });
        if (lightboxImg) {
          lightboxImg.addEventListener('click', function (e) {
            var rect = lightboxImg.getBoundingClientRect();
            var mid = rect.left + rect.width / 2;
            if (e.clientX < mid) prev(); else next();
          });
        }
      }

      // Extension fallback + skip broken
      var EXT_ALTS = ['.webp','.jpg','.jpeg','.png'];
      var triedByIndex = new Map();
      heroImg.addEventListener('error', function () {
        var url = images[gi] || '';
        var m = url.match(/\.(webp|jpe?g|png)(\?.*)?$/i);
        var curExt = m ? '.' + m[1].toLowerCase() : '';
        var rest   = m ? (m[2] || '') : '';
        var tried  = triedByIndex.get(gi) || new Set();
        if (curExt) tried.add(curExt);
        triedByIndex.set(gi, tried);

        var nextExt = m && EXT_ALTS.find(function (ext) { return !tried.has(ext); });
        if (nextExt) {
          images[gi] = url.replace(/\.(webp|jpe?g|png)(\?.*)?$/i, nextExt + rest);
          heroImg.src = images[gi];
          return;
        }
        images.splice(gi, 1);
        if (!images.length) return;
        if (gi >= images.length) gi = 0;
        ensureDots();
        updateDots();
        heroImg.src = images[gi];
      });

      // Debug surface
      window.__gallery = {
        images: images.slice(),
        index: function(){ return gi; },
        next: next, prev: prev, show: show
      };
    } // end hero block

    /* ---------------------------------------------
       REVIEWS — Lightbox Zoom (scoped to #reviews-bottom)
       Works with: <button class="thumb" data-full="..."><img alt=""></button>
    --------------------------------------------- */
    (function reviewsZoom(){
      var lastFocused = null;

      function ensureReviewLightbox() {
        var lb = document.getElementById('review-lightbox');
        if (lb) return lb;

        lb = document.createElement('div');
        lb.id = 'review-lightbox';
        lb.setAttribute('role', 'dialog');
        lb.setAttribute('aria-modal', 'true');
        lb.setAttribute('aria-label', 'Image preview');
        lb.innerHTML =
          '<button type="button" class="rlb-close" aria-label="Close">×</button>' +
          '<img alt="Expanded review image">';

        document.body.appendChild(lb);

        // Backdrop, X button, or IMAGE -> close
        lb.addEventListener('click', function (e) {
          var isBackdrop = e.target === lb;
          var isCloseBtn = !!e.target.closest('.rlb-close');
          var isImage    = e.target.tagName === 'IMG';
          if (isBackdrop || isCloseBtn || isImage) closeReviewLightbox();
        });

        // ESC anywhere -> close (capture)
        document.addEventListener('keydown', function (e) {
          if (e.key === 'Escape' && lb.classList.contains('open')) closeReviewLightbox();
        }, true);

        // Keyboard on the X (Enter/Space)
        lb.querySelector('.rlb-close').addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); closeReviewLightbox(); }
        });

        return lb;
      }

      function openReviewLightbox(src, alt) {
        if (!src) return;
        var lb  = ensureReviewLightbox();
        var img = lb.querySelector('img');
        lastFocused = document.activeElement;

        img.removeAttribute('src'); // force refresh if same src
        img.alt = alt || 'Expanded review image';
        requestAnimationFrame(function () {
          img.src = src;
          lb.classList.add('open');
          document.body.classList.add('rlb-open');
          lb.setAttribute('aria-hidden', 'false');
          lb.querySelector('.rlb-close').focus({ preventScroll: true });
        });
      }

      function closeReviewLightbox() {
        var lb = document.getElementById('review-lightbox');
        if (!lb) return;
        lb.classList.remove('open');
        lb.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('rlb-open');
        if (lastFocused && document.body.contains(lastFocused)) {
          try { lastFocused.focus({ preventScroll: true }); } catch(_) {}
        }
      }

      var reviewsRoot = document.getElementById('reviews-bottom');
      if (!reviewsRoot) return;

      // Delegate clicks inside reviews only
      reviewsRoot.addEventListener('click', function (e) {
        var btn = e.target.closest('.review-media .thumb');
        if (!btn) return;
        var imgEl = btn.querySelector('img');
        var src = btn.getAttribute('data-full') || (imgEl && (imgEl.currentSrc || imgEl.src));
        var alt = imgEl ? imgEl.alt : '';
        e.preventDefault();
        openReviewLightbox(src, alt);
      });
    })();

  }); // DOMContentLoaded
})();
