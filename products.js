(function () {
  function $(sel, root){ return (root || document).querySelector(sel); }
  function $$(sel, root){ return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  document.addEventListener('DOMContentLoaded', function () {
    var root = $('.product-page') || document;

    // Anchored toast above the Add to Cart button
    (function ensureAnchoredToast(){
      var buybox = $('.buybox', root);
      var addBtn = $('.buy-actions .cta', root);
      if (!buybox || !addBtn) return;
      var t = $('#cart-toast', buybox);
      if (!t){
        t = document.createElement('div');
        t.id = 'cart-toast';
        t.setAttribute('role','status');
        t.setAttribute('aria-live','polite');
        t.innerHTML = '<span class="msg">Added to cart</span>';
        buybox.appendChild(t);
        t.style.position = 'absolute';
        t.style.opacity = '0';
        t.style.pointerEvents = 'none';
        t.style.transition = 'opacity .18s ease, transform .18s ease';
        t.style.transform = 'translateY(6px)';
      }
      function placeToast(){
        var bb = buybox.getBoundingClientRect();
        var ct = addBtn.getBoundingClientRect();
        var left = ct.left - bb.left;
        t.style.left  = left + 'px';
        t.style.width = ct.width + 'px';
        var h = t.offsetHeight || 32;
        t.style.top   = (-h - 10) + 'px';
      }
      var ro = new ResizeObserver(placeToast);
      ro.observe(buybox); ro.observe(addBtn);
      window.addEventListener('resize', placeToast);
      requestAnimationFrame(placeToast);
      window.showCartToast = function(text){
        var msg = t.querySelector('.msg');
        if (msg) msg.textContent = text || 'Added to cart';
        placeToast();
        t.classList.remove('is-showing');
        void t.offsetWidth;
        t.classList.add('is-showing');
        t.style.opacity = '1';
        t.style.transform = 'none';
        clearTimeout(t._timer);
        t._timer = setTimeout(function(){
          t.classList.remove('is-showing');
          t.style.opacity = '0';
          t.style.transform = 'translateY(6px)';
        }, 2000);
      };
    })();

    var yearEl = $('#year');
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());

    // De-dupe product blocks if something re-renders
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

    // Elements
    var buyForm        = $('#buy-form', root);
    var priceDesktop   = $('#price', root);
    var variantDesktop = $('#variant', root);
    var qtyDesktop     = $('#qty', root);
    var buybar         = $('.buybar', root);
    var priceMobile    = $('#price-mobile', buybar || root);
    var variantMobile  = $('#variant-mobile', buybar || root);
    var qtyMobile      = $('#qty-mobile', buybar || root);
    var titleEl        = $('#product-title', root) || $('.product-title', root) || $('h1', root);

    // Helpers
    function formatPrice(num){ return '$' + Number(num).toFixed(2); }
    function getVariantPrice(selectEl){
      if (!selectEl) return null;
      var opt = selectEl.selectedOptions ? selectEl.selectedOptions[0] : null;
      var n = parseFloat(opt && opt.dataset ? opt.dataset.price || '' : '');
      return Number.isFinite(n) ? n : null;
    }
    function getVariantPriceId(selectEl){
      var opt = selectEl && selectEl.selectedOptions ? selectEl.selectedOptions[0] : null;
      return (opt && opt.dataset && opt.dataset.priceId) ? opt.dataset.priceId : '';
    }
    function updatePrices(){
      var p = getVariantPrice(variantDesktop);
      if (p == null) p = getVariantPrice(variantMobile);
      if (p != null) {
        if (priceDesktop) priceDesktop.textContent = formatPrice(p);
        if (priceMobile)  priceMobile.textContent  = formatPrice(p);
      }
    }
    function mirrorSelect(from, to){
      if (!from || !to) return;
      if (to.value !== from.value){
        to.value = from.value;
        to.dispatchEvent(new Event('change', { bubbles:true }));
      }
    }
    function mirrorInput(from, to){
      if (!from || !to) return;
      if (to.value !== from.value){
        to.value = from.value;
        to.dispatchEvent(new Event('input',  { bubbles:true }));
      }
    }
    if (variantDesktop) variantDesktop.addEventListener('change', function(){
      mirrorSelect(variantDesktop, variantMobile); updatePrices();
    });
    if (variantMobile) variantMobile.addEventListener('change', function(){
      mirrorSelect(variantMobile, variantDesktop); updatePrices();
    });
    if (qtyDesktop) qtyDesktop.addEventListener('input', function(){
      mirrorInput(qtyDesktop, qtyMobile);
    });
    if (qtyMobile) qtyMobile.addEventListener('input', function(){
      mirrorInput(qtyMobile, qtyDesktop);
    });
    updatePrices();

    // Qty +/- controls
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

    // Cart persistence (fp-cart)
    function getCartFP(){
      try { return JSON.parse(localStorage.getItem('fp-cart') || '{"items":[]}'); }
      catch(_) { return { items: [] }; }
    }
    function saveCartFP(c){
      localStorage.setItem('fp-cart', JSON.stringify(c));
    }
    function updateHeaderCount(c){
      var count = (c.items || []).reduce(function(s,x){ return s + Number(x.qty||0); }, 0);
      var cc = document.getElementById('cart-count');
      if (cc) cc.textContent = String(count);
    }

    // Add to cart
    var submitting = false;
    function submitBuy(e) {
      if (e) e.preventDefault();
      if (submitting) return;

      // Normalize UI -> desktop fields
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

      var qtyInput = buyForm && buyForm.querySelector('.qty-control input[type="number"]');
      if (!qtyInput) qtyInput = qtyDesktop || qtyMobile;
      var qtyVal = Math.max(1, parseInt(String(qtyInput ? qtyInput.value : '1').trim(), 10) || 1);

      submitting = true;
      try {
        var cart = getCartFP();

        // Price number for display/totaling
        var priceVal = getVariantPrice(variantDesktop);
        if (priceVal == null) priceVal = getVariantPrice(variantMobile);
        if (priceVal == null) {
          var txt = (priceDesktop && priceDesktop.textContent) || (priceMobile && priceMobile.textContent) || '';
          var m = String(txt).match(/[\d,.]+/);
          priceVal = m ? parseFloat(m[0].replace(/,/g, '')) : 0;
        }

        // Require a real Stripe price_id from the selected option
        var priceId = getVariantPriceId(variantDesktop) || getVariantPriceId(variantMobile) || '';
        if (!priceId) {
          alert('This option is missing a Stripe price. Please refresh or contact support.');
          return; // don’t add an un-checkout-able item
        }

        // Merge or insert line item (key is the real price_… ID)
        var it = (cart.items || []).find(function(x){ return x.variantKey === priceId; });
        if (it) {
          it.qty += qtyVal;
          it.name  = displayName || it.name;
          it.price = Number.isFinite(priceVal) ? priceVal : (it.price || 0);
        } else {
          cart.items.push({
            variantKey: priceId,      // always the real Stripe price_… ID
            qty:  qtyVal,
            name: displayName,
            price: Number.isFinite(priceVal) ? priceVal : 0
          });
        }

        saveCartFP(cart);
        updateHeaderCount(cart);
        if (typeof window.showCartToast === 'function') window.showCartToast('Added to cart');
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

    // ------- Image zoom overlay -------
    var overlay = (function ensureOverlay(){
      var ov = document.getElementById('zoom-overlay');
      if (!ov) {
        ov = document.createElement('div');
        ov.id = 'zoom-overlay';
        ov.setAttribute('role','dialog');
        ov.setAttribute('aria-modal','true');
        ov.setAttribute('aria-label','Image viewer');
        ov.tabIndex = -1;
        ov.innerHTML = '<button class="close" aria-label="Close">✕</button><img alt="">';
        document.body.appendChild(ov);
        Object.assign(ov.style, {
          position:'fixed', inset:'0', display:'none',
          alignItems:'center', justifyContent:'center',
          background:'#2b2b2b', padding:'2rem', zIndex:'10050'
        });
        var img = ov.querySelector('img');
        Object.assign(img.style, {
          maxWidth:'min(96vw, 1800px)', maxHeight:'92vh', objectFit:'contain',
          boxShadow:'0 20px 60px rgba(0,0,0,.45)', cursor:'zoom-out'
        });
        var x = ov.querySelector('.close');
        Object.assign(x.style, {
          position:'absolute', top:'12px', right:'16px', fontSize:'32px',
          background:'transparent', border:'0', color:'#fff', lineHeight:'1', cursor:'pointer'
        });
      }
      return ov;
    })();

    function lockScroll(){
      var y = window.scrollY || document.documentElement.scrollTop || 0;
      document.body.dataset.scrollY = y;
      document.body.classList.add('zoom-locked');
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.top = '-' + y + 'px';
    }
    function unlockScroll(){
      var y = parseInt(document.body.dataset.scrollY || '0', 10) || 0;
      document.body.classList.remove('zoom-locked');
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.top = '';
      delete document.body.dataset.scrollY;
      window.scrollTo(0, y);
    }
    (function wireOverlay(){
      if (overlay.dataset.wired === '1') return;
      overlay.dataset.wired = '1';
      var img   = overlay.querySelector('img');
      var close = overlay.querySelector('.close');
      function closeOverlay(){
        overlay.style.display = 'none';
        overlay.classList.remove('open');
        overlay.setAttribute('aria-hidden','true');
        unlockScroll();
        delete overlay._onArrowLeft;
        delete overlay._onArrowRight;
        if (overlay._lastFocus && document.body.contains(overlay._lastFocus)) {
          try { overlay._lastFocus.focus({ preventScroll:true }); } catch(_){}
        }
      }
      overlay.addEventListener('click', function(e){
        if (e.target === overlay) closeOverlay();
      }, true);
      close.addEventListener('click', function(e){ e.preventDefault(); closeOverlay(); });
      img.addEventListener('click', function(e){ e.preventDefault(); closeOverlay(); });
      overlay.addEventListener('wheel', function(e){ if (overlay.classList.contains('open')) e.preventDefault(); }, { passive:false });
      overlay.addEventListener('touchmove', function(e){ if (overlay.classList.contains('open')) e.preventDefault(); }, { passive:false });
      document.addEventListener('keydown', function(e){
        if (!overlay.classList.contains('open')) return;
        var k = e.key;
        if (k === 'Escape') { e.preventDefault(); return closeOverlay(); }
        var scrollKeys = ['PageUp','PageDown','Home','End',' ','Spacebar','ArrowUp','ArrowDown'];
        if (scrollKeys.indexOf(k) !== -1) { e.preventDefault(); return; }
        if (k === 'ArrowLeft' && typeof overlay._onArrowLeft === 'function') { e.preventDefault(); overlay._onArrowLeft(); }
        if (k === 'ArrowRight' && typeof overlay._onArrowRight === 'function') { e.preventDefault(); overlay._onArrowRight(); }
      }, true);
      overlay.close = closeOverlay;
      overlay.openWith = function(src, alt, opts){
        var img = overlay.querySelector('img');
        img.removeAttribute('style');
        img.alt = alt || '';
        img.src = '';
        overlay._lastFocus = document.activeElement;
        overlay._onArrowLeft  = (opts && opts.onLeft)  || null;
        overlay._onArrowRight = (opts && opts.onRight) || null;
        overlay.style.touchAction = 'none';
        img.style.touchAction = 'none';
        lockScroll();
        overlay.style.display = 'flex';
        overlay.classList.add('open');
        overlay.setAttribute('aria-hidden','false');
        requestAnimationFrame(function(){
          img.src = src;
          try { overlay.focus({ preventScroll:true }); } catch(_){}
        });
      };
    })();

    // Make review images zoomable
    (function tagReviewImgs(){
      var reviewSel = '.reviews-panel img, #reviews-bottom img';
      $$(reviewSel).forEach(function(img){
        if (!img.hasAttribute('data-zoomable')) img.setAttribute('data-zoomable', '');
        if (!img.getAttribute('alt')) img.setAttribute('alt', 'Review image');
      });
    })();

    document.addEventListener('click', function (e) {
      var t = e.target;
      var isReviewZoomable =
        t && t.matches && (
          t.matches('.reviews-panel img[data-zoomable]') ||
          t.matches('#reviews-bottom img[data-zoomable]')
        );
      if (!isReviewZoomable) return;
      e.preventDefault();
      e.stopPropagation();
      var src = t.getAttribute('data-zoom-src') || t.currentSrc || t.src;
      overlay.openWith(src, t.alt || '');
    }, { capture: true });

    // Gallery / hero
    var hero        = $('.hero', root);
    var heroImg     = hero ? $('#hero-img', hero) : null;
    var heroFrame   = hero ? $('.hero-frame', hero) : null;
    var prevBtn     = hero ? $('.hero-nav.prev', hero) : null;
    var nextBtn     = hero ? $('.hero-nav.next', hero) : null;
    var dotsWrap    = hero ? $('.hero-dots', hero) : null;

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
      var gi = 0;
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
      }
      function next(){ show(gi + 1); }
      function prev(){ show(gi - 1); }
      ensureDots();
      preloadAll(images);
      if (images[0] && heroImg.src !== images[0]) heroImg.src = images[0];
      updateDots();
      var hasMany = images.length > 1;
      if (prevBtn) prevBtn.disabled = !hasMany;
      if (nextBtn) nextBtn.disabled = !hasMany;

      if (hasMany) {
        (function ensureArrowClickability(){
          [prevBtn, nextBtn].forEach(function(btn){
            if (!btn) return;
            btn.style.pointerEvents = 'auto';
            btn.style.zIndex = '5';
            $$('.hero-nav *', btn).forEach(function(n){ n.style.pointerEvents = 'none'; });
          });
        })();
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
        $$('.hero-dots > button', hero).forEach(function(b, idx){
          b.addEventListener('click', function(){ show(idx); });
        });

        (function enableHoverKeys(){
          var frame = heroFrame || hero;
          var hot = false;
          function isTypingTarget(el){
            return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' ||
                          el.tagName === 'SELECT' || el.isContentEditable);
          }
          frame.addEventListener('mouseenter', function(){ hot = true; });
          frame.addEventListener('mouseleave', function(){ hot = false; });
          if (!frame.hasAttribute('tabindex')) frame.setAttribute('tabindex','0');
          frame.addEventListener('focusin',  function(){ hot = true; });
          frame.addEventListener('focusout', function(e){
            if (!frame.contains(e.relatedTarget)) hot = false;
          });
          document.addEventListener('keydown', function(e){
            if (!hot) return;
            if (isTypingTarget(e.target)) return;
            if (e.altKey || e.ctrlKey || e.metaKey) return;
            if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
          }, { passive:false });
        })();

        try {
          heroImg.setAttribute('draggable', 'false');
          heroImg.style.webkitUserDrag = 'none';
          heroFrame.style.touchAction = 'pan-y';
          heroImg.style.touchAction = 'manipulation';
        } catch(_) {}

        (function preventDoubleTapZoom(){
          var lastTouchEnd = 0;
          heroFrame.addEventListener('touchend', function(e){
            var now = Date.now();
            if (now - lastTouchEnd < 350) e.preventDefault();
            lastTouchEnd = now;
          }, { passive:false });
        })();

        (function pointerSwipe(){
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
            if (dx > 35) prev();
            else if (dx < -35) next();
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
        })();

        (function touchSwipeFallback(){
          if ('onpointerdown' in window) return;
          var startX = null, startY = null, dragging = false;
          function isInteractiveTarget(t){
            return !!(t && (t.closest('.hero-nav') || t.closest('.hero-dots button')));
          }
          heroFrame.addEventListener('touchstart', function(e){
            if (isInteractiveTarget(e.target)) return;
            if (!e.touches || e.touches.length !== 1) return;
            var t = e.touches[0];
            startX = t.clientX; startY = t.clientY; dragging = true;
          }, { passive:true });
          heroFrame.addEventListener('touchmove', function(e){
            if (!dragging || !e.touches || e.touches.length !== 1) return;
            var t = e.touches[0];
            var dx = t.clientX - startX, dy = t.clientY - startY;
            if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) e.preventDefault();
          }, { passive:false });
          heroFrame.addEventListener('touchend', function(e){
            if (!dragging) return; dragging = false;
            var t = (e.changedTouches && e.changedTouches[0]) || null;
            if (!t) return;
            var dx = t.clientX - startX;
            if (dx > 35) prev();
            else if (dx < -35) next();
          }, { passive:true });
          heroFrame.addEventListener('touchcancel', function(){ dragging = false; }, { passive:true });
        })();
      }

      if (heroImg) {
        heroImg.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopImmediatePropagation();
        }, true);
      }

      window.__gallery = {
        images: (typeof images !== 'undefined' ? images.slice() : []),
        index: function(){ return (typeof gi !== 'undefined' ? gi : 0); },
        next: function(){ if (typeof gi !== 'undefined') show(gi+1); },
        prev: function(){ if (typeof gi !== 'undefined') show(gi-1); },
        show: function(i){ if (typeof show === 'function') show(i); }
      };
    }
  });
})();
