/* /product-page.js
   Gallery + Lightbox + Buy UI sync + Duplicate guards
*/
(() => {
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  document.addEventListener('DOMContentLoaded', () => {
    const root = $('.product-page') || document;

    /* ---------------------------------------------
       Footer year
    --------------------------------------------- */
    const yearEl = $('#year');
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());

    /* ---------------------------------------------
       DEDUPE: reviews, buybox, buybar
       (some templates/plugins inject clones on mobile)
    --------------------------------------------- */
    const dedupe = (selector) => {
      const els = $$(selector, root);
      if (els.length <= 1) return;
      els.forEach((el, idx) => { if (idx > 0) el.remove(); });
    };
    const runDedupe = () => {
      dedupe('.reviews-panel');
      dedupe('.buybox');
      dedupe('.buybar');
    };
    runDedupe();

    // Watch for any future DOM injections and re-dedupe
    const grid = $('.grid', root);
    if (grid) {
      new MutationObserver(runDedupe).observe(grid, { childList: true, subtree: true });
    }

    /* ---------------------------------------------
       BUY UI: sync variant/qty/price across desktop
       buybox and (optional) mobile sticky buybar
    --------------------------------------------- */
    const buyForm        = $('#buy-form', root); // desktop form
    const priceDesktop   = $('#price', root);
    const variantDesktop = $('#variant', root);
    const qtyDesktop     = $('#qty', root);

    const buybar         = $('.buybar', root);   // sticky mobile bar (may be hidden via CSS)
    const priceMobile    = $('#price-mobile', buybar || root);
    const variantMobile  = $('#variant-mobile', buybar || root);
    const qtyMobile      = $('#qty-mobile', buybar || root);
    const addMobileBtn   = $('#add-mobile', buybar || root);

    const formatPrice = (num) => `$${Number(num).toFixed(2)}`;

    const getVariantPrice = (selectEl) => {
      if (!selectEl) return null;
      const opt = selectEl.selectedOptions && selectEl.selectedOptions[0];
      const val = opt?.dataset?.price ?? '';
      const n = parseFloat(val);
      return Number.isFinite(n) ? n : null;
    };

    const updatePrices = () => {
      // Prefer desktop variant price; fallback to mobile
      const p = getVariantPrice(variantDesktop) ?? getVariantPrice(variantMobile);
      if (p != null) {
        if (priceDesktop) priceDesktop.textContent = formatPrice(p);
        if (priceMobile)  priceMobile.textContent  = formatPrice(p);
      }
    };

    const mirrorSelect = (from, to) => {
      if (!from || !to) return;
      const val = from.value;
      if (to.value !== val) {
        to.value = val;
        to.dispatchEvent(new Event('change', { bubbles: true }));
      }
    };

    const mirrorInput = (from, to) => {
      if (!from || !to) return;
      const val = from.value;
      if (to.value !== val) {
        to.value = val;
        to.dispatchEvent(new Event('input', { bubbles: true }));
      }
    };

    // Wire up syncing both ways
    variantDesktop?.addEventListener('change', () => {
      mirrorSelect(variantDesktop, variantMobile);
      updatePrices();
    });
    variantMobile?.addEventListener('change', () => {
      mirrorSelect(variantMobile, variantDesktop);
      updatePrices();
    });

    qtyDesktop?.addEventListener('input', () => mirrorInput(qtyDesktop, qtyMobile));
    qtyMobile?.addEventListener('input', () => mirrorInput(qtyMobile, qtyDesktop));

    // Submit via mobile add button: reuse desktop form POST
    addMobileBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      // ensure desktop form values match mobile before submit
      mirrorSelect(variantMobile, variantDesktop);
      mirrorInput(qtyMobile, qtyDesktop);
      buyForm?.submit();
    });

    // Initial price paint
    updatePrices();

    /* ---------------------------------------------
       GALLERY + LIGHTBOX
    --------------------------------------------- */
    const hero        = $('.hero', root);
    const heroImg     = hero ? $('#hero-img', hero) : null;
    const heroFrame   = hero ? $('.hero-frame', hero) : null;
    const prevBtn     = hero ? $('.hero-nav.prev', hero) : null;
    const nextBtn     = hero ? $('.hero-nav.next', hero) : null;
    const dotsWrap    = $('.hero-dots', root);

    const lightbox    = $('#lightbox');
    const lightboxImg = $('#lightbox-img');

    if (hero && heroImg && heroFrame && dotsWrap) {
      // Build image list robustly
      const getImages = () => {
        if (Array.isArray(window.PRODUCT_IMAGES) && window.PRODUCT_IMAGES.length) {
          return window.PRODUCT_IMAGES.slice();
        }
        const rawAttr = hero.getAttribute('data-images');
        if (rawAttr) {
          try {
            const sanitized = rawAttr
              .replace(/&quot;/g, '"')
              .replace(/[\n\r\t]+/g, ' ')
              .replace(/,\s*]/g, ']')
              .replace(/,\s*}/g, '}');
            const arr = JSON.parse(sanitized);
            if (Array.isArray(arr) && arr.length) return arr;
          } catch (e) {
            console.warn('Could not parse data-images JSON:', e);
          }
        }
        const src = heroImg.getAttribute('src');
        return src ? [src] : [];
      };

      let images = getImages();
      let i = 0;

      const renderDots = () => {
        dotsWrap.innerHTML = '';
        images.forEach((_, idx) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.setAttribute('aria-label', `Go to image ${idx + 1}`);
          b.setAttribute('aria-selected', idx === i ? 'true' : 'false');
          b.addEventListener('click', () => go(idx));
          dotsWrap.appendChild(b);
        });
      };

      const updateDots = () => {
        $$('.hero-dots button', root).forEach((b, idx) => {
          b.setAttribute('aria-selected', idx === i ? 'true' : 'false');
        });
      };

      const show = () => {
        if (!images[i]) return;
        heroImg.src = images[i];
        if (!heroImg.alt) heroImg.alt = 'Product image';
        updateDots();
      };

      const go   = (idx) => { i = (idx + images.length) % images.length; show(); };
      const next = () => go(i + 1);
      const prev = () => go(i - 1);

      // Init
      renderDots();
      show();

      // Buttons
      prevBtn?.addEventListener('click', prev);
      nextBtn?.addEventListener('click', next);

      // Keyboard (when hero is focused)
      hero.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') { next(); e.preventDefault(); }
        if (e.key === 'ArrowLeft')  { prev(); e.preventDefault(); }
      });

      // Swipe
      let touchX = null, touchY = null, swiping = false;
      const onTouchStart = (e) => {
        if (!e.touches || e.touches.length !== 1) return;
        const t = e.touches[0];
        touchX = t.clientX; touchY = t.clientY; swiping = true;
      };
      const onTouchMove = (e) => {
        if (!swiping || touchX == null) return;
        const dx = e.touches[0].clientX - touchX;
        const dy = e.touches[0].clientY - touchY;
        if (Math.abs(dy) > Math.abs(dx)) return; // ignore vertical scroll
        if (Math.abs(dx) > 36) { dx > 0 ? prev() : next(); swiping = false; }
      };
      const onTouchEnd = () => { swiping = false; touchX = touchY = null; };
      heroFrame.addEventListener('touchstart', onTouchStart, { passive: true });
      heroFrame.addEventListener('touchmove',  onTouchMove,  { passive: true });
      heroFrame.addEventListener('touchend',   onTouchEnd,   { passive: true });

      // Lightbox
      const openLightbox = () => {
        if (!lightbox || !lightboxImg) return;
        lightbox.setAttribute('aria-hidden', 'false');
        lightboxImg.src = images[i];
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
      };
      const closeLightbox = () => {
        if (!lightbox) return;
        lightbox.setAttribute('aria-hidden', 'true');
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
      };

      heroImg.addEventListener('click', openLightbox);

      lightbox?.addEventListener('click', (e) => {
        if (e.target === lightbox) closeLightbox();
      });

      document.addEventListener('keydown', (e) => {
        if (!lightbox || lightbox.getAttribute('aria-hidden') !== 'false') return;
        if (e.key === 'Escape')     closeLightbox();
        if (e.key === 'ArrowRight') { next(); lightboxImg && (lightboxImg.src = images[i]); }
        if (e.key === 'ArrowLeft')  { prev(); lightboxImg && (lightboxImg.src = images[i]); }
      });

      lightboxImg?.addEventListener('click', (e) => {
        const rect = lightboxImg.getBoundingClientRect();
        const mid = rect.left + rect.width / 2;
        (e.clientX < mid) ? prev() : next();
        lightboxImg.src = images[i];
      });

      /* -------------------------------------------
         Missing image resilience:
         1) Try alternate extensions (.jpg/.jpeg/.png/.webp)
         2) If still bad, skip the slide.
      -------------------------------------------- */
      const EXT_ALTS = ['.jpg', '.jpeg', '.png', '.webp'];
      const triedByIndex = new Map();

      heroImg.addEventListener('error', () => {
        const url = images[i] || '';
        const m = url.match(/\.(jpe?g|png|webp)(\?.*)?$/i);
        const curExt = m ? '.' + m[1].toLowerCase() : '';
        const rest   = m ? (m[2] || '') : '';
        const tried  = triedByIndex.get(i) || new Set();
        if (curExt) tried.add(curExt);
        triedByIndex.set(i, tried);

        // Try a different extension once
        const nextExt = m && EXT_ALTS.find(ext => !tried.has(ext));
        if (nextExt) {
          const candidate = url.replace(/\.(jpe?g|png|webp)(\?.*)?$/i, nextExt + rest);
          console.warn('Gallery image failed, retrying with', nextExt, candidate);
          images[i] = candidate;
          heroImg.src = candidate;
          return;
        }

        // Otherwise, skip this slide
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
