(function () {
  const SELECTORS = {
    nav: '#primary-nav',
    overlay: '#overlay',
    toggleBtn: '.menu-toggle'
  };
  const nav = document.querySelector(SELECTORS.nav);
  const overlay = document.querySelector(SELECTORS.overlay);
  const toggleBtn = document.querySelector(SELECTORS.toggleBtn);
  if (!nav || !overlay) return;
  const closeBtn = nav.querySelector('.drawer-close');

  function setAria(isOpen) {
    nav.setAttribute('aria-hidden', String(!isOpen));
    overlay.setAttribute('aria-hidden', String(!isOpen));
    if (toggleBtn) toggleBtn.setAttribute('aria-expanded', String(isOpen));
  }

  function setMenuState(open) {
    const isOpen = Boolean(open);
    document.body.classList.toggle('menu-open', isOpen);
    setAria(isOpen);
    document.documentElement.style.overflow = isOpen ? 'hidden' : '';
    document.body.style.overflow = isOpen ? 'hidden' : '';
  }

  function toggleMenu(force) {
    const next = typeof force === 'boolean'
      ? force
      : !document.body.classList.contains('menu-open');
    setMenuState(next);
  }

  if (!nav.dataset.bound) {
    if (toggleBtn) toggleBtn.addEventListener('click', () => toggleMenu());
    if (closeBtn) closeBtn.addEventListener('click', () => toggleMenu(false));
    overlay.addEventListener('click', () => toggleMenu(false));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') toggleMenu(false);
    });
    nav.addEventListener('click', (e) => {
      if (e.target.closest('a')) toggleMenu(false);
    });
    const mql = window.matchMedia('(min-width: 1200px)');
    function handleViewportChange(e) {
      if (e.matches) {
        document.body.classList.remove('menu-open');
        nav.classList.remove('show');
        overlay.classList.remove('show');
        nav.style.cssText = '';
        overlay.style.cssText = '';
        nav.removeAttribute('aria-hidden');
        overlay.setAttribute('aria-hidden', 'true');
        if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
      } else {
        setAria(document.body.classList.contains('menu-open'));
      }
    }
    mql.addEventListener('change', handleViewportChange);
    handleViewportChange(mql);
    nav.dataset.bound = '1';
  }
})();

const TRASH_SVG = `
<svg width="18" height="18" viewBox="0 0 24 24" fill="none"
     stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
     aria-hidden="true">
  <polyline points="3 6 5 6 21 6"></polyline>
  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
  <path d="M10 11v6"></path>
  <path d="M14 11v6"></path>
  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
</svg>`.trim();

/* ---------- Unified cart: fp-cart ({ items: [{variantKey, qty, name, price}] }) ---------- */
function getCartFP() {
  try {
    const c = JSON.parse(localStorage.getItem('fp-cart') || '{"items":[]}');
    return c && Array.isArray(c.items) ? c : { items: [] };
  } catch { return { items: [] }; }
}
function setCartFP(cart) { localStorage.setItem('fp-cart', JSON.stringify(cart)); }

/* Keep manual order for rows */
function getOrder() {
  try { return JSON.parse(localStorage.getItem('cartOrder') || '{}'); } catch { return {}; }
}
function setOrder(o) { localStorage.setItem('cartOrder', JSON.stringify(o)); }
function ensureOrder(key) {
  const o = getOrder();
  if (o[key] == null) {
    const c = Number(localStorage.getItem('cartOrderCounter') || '0') + 1;
    localStorage.setItem('cartOrderCounter', String(c));
    o[key] = c; setOrder(o);
  }
  return o[key];
}
function maybeClearOrderFor(key) {
  const o = getOrder();
  if (o[key] != null) { delete o[key]; setOrder(o); }
}

/* Migrate any legacy “cart” array -> fp-cart once */
function migrateLegacyCart() {
  try {
    const legacy = JSON.parse(localStorage.getItem('cart') || 'null');
    if (!Array.isArray(legacy) || !legacy.length) return;
    const cur = getCartFP();
    const map = new Map();
    // seed with current fp-cart items
    for (const it of cur.items) map.set(it.variantKey, { ...it });
    // fold legacy rows as pseudo-variant keys
    for (const it of legacy) {
      const name = it?.name || 'Item';
      const price = Number(it?.price) || 0;
      const variantKey = `legacy:${name}|${price}`;
      const ex = map.get(variantKey) || { variantKey, qty: 0, name, price };
      ex.qty += 1; map.set(variantKey, ex);
    }
    setCartFP({ items: Array.from(map.values()) });
    localStorage.removeItem('cart'); // done
  } catch {}
}

function updateCartCount() {
  const el = document.getElementById('cart-count');
  if (!el) return;
  const count = getCartFP().items.reduce((s, x) => s + Number(x.qty || 0), 0);
  el.textContent = String(count);
}

/* Simple toast (product page may override with anchored toast) */
function showCartToast(text) {
  const toast = document.getElementById('cart-toast');
  if (!toast) return;
  const msg = toast.querySelector('.msg');
  if (msg) msg.textContent = text || 'Added to cart';
  toast.style.opacity = '1';
  toast.style.transform = 'none';
  clearTimeout(showCartToast._t);
  showCartToast._t = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(6px)';
  }, 2000);
}

function renderCart() {
  const list = document.getElementById('cart-items');
  const totalEl = document.getElementById('cart-total');
  if (!list || !totalEl) return;

  const cart = getCartFP();
  const items = cart.items || [];
  if (!items.length) {
    list.innerHTML = '<p>Your cart is empty.</p>';
    totalEl.textContent = '0.00';
    return;
  }

  const order = getOrder();
  const rows = items.slice().sort((a, b) => {
    const ak = a.variantKey, bk = b.variantKey;
    const ao = order[ak] ?? Number.MAX_SAFE_INTEGER;
    const bo = order[bk] ?? Number.MAX_SAFE_INTEGER;
    return ao - bo;
  });

  list.innerHTML = '';
  let total = 0;

  for (const it of rows) {
    const name  = it.name || 'Item';
    const qty   = Math.max(0, Number(it.qty) || 0);
    const price = Math.max(0, Number(it.price) || 0);
    total += qty * price;

    const row = document.createElement('div');
    row.className = 'cart-item';
    row.innerHTML = `
      <span class="item-name">
        <span class="item-title">${name}</span> — <span class="price item-price">$${price.toFixed(2)}</span>
      </span>
      <div class="qty-controls" role="group" aria-label="Quantity for ${name}">
        <button class="qty-btn" data-action="dec" data-key="${it.variantKey}" aria-label="Decrease quantity">−</button>
        <input class="qty-input" type="number" inputmode="numeric" pattern="[0-9]*" min="0" step="1" value="${qty}" data-key="${it.variantKey}" aria-label="Quantity for ${name}">
        <button class="qty-btn" data-action="inc" data-key="${it.variantKey}" aria-label="Increase quantity">+</button>
      </div>
      <button class="remove-item" data-action="remove" data-key="${it.variantKey}" aria-label="Remove all ${name}">
        ${TRASH_SVG}
      </button>
    `;
    list.appendChild(row);
  }

  totalEl.textContent = total.toFixed(2);
}

document.addEventListener('DOMContentLoaded', () => {
  migrateLegacyCart();
  updateCartCount();
  renderCart();

  // Qty +/- and remove
  document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-action');
    const key = btn.getAttribute('data-key');
    if (!key) return;

    const cart = getCartFP();
    const idx = cart.items.findIndex(x => x.variantKey === key);
    if (idx === -1) return;

    if (action === 'inc') {
      cart.items[idx].qty += 1;
      ensureOrder(key);
    } else if (action === 'dec') {
      cart.items[idx].qty = Math.max(0, (cart.items[idx].qty || 0) - 1);
      if (cart.items[idx].qty === 0) {
        cart.items.splice(idx, 1);
        maybeClearOrderFor(key);
      }
    } else if (action === 'remove') {
      cart.items.splice(idx, 1);
      maybeClearOrderFor(key);
    }

    setCartFP(cart);
    updateCartCount();
    renderCart();
  });

  // Direct qty input change
  document.body.addEventListener('change', (e) => {
    const input = e.target.closest('.qty-input');
    if (!input) return;
    const key = input.getAttribute('data-key');
    if (!key) return;

    let qty = parseInt(input.value, 10);
    if (!Number.isFinite(qty) || qty < 0) qty = 0;

    const cart = getCartFP();
    const it = cart.items.find(x => x.variantKey === key);
    if (!it) return;

    if (qty === 0) {
      cart.items = cart.items.filter(x => x.variantKey !== key);
      maybeClearOrderFor(key);
    } else {
      it.qty = qty;
      ensureOrder(key);
    }

    setCartFP(cart);
    updateCartCount();
    renderCart();
  });

  // Clear cart
  document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-clear-cart]');
    if (!btn) return;
    localStorage.removeItem('fp-cart');
    localStorage.removeItem('cart'); // legacy
    localStorage.removeItem('cartOrder');
    localStorage.removeItem('cartOrderCounter');
    updateCartCount();
    renderCart();
  });

  // --- Stripe client-side checkout (works on all pages, including /cart) ---
  const STRIPE_PK = 'pk_live_51RbV04GRkBmBYPEqyPW6PZ1uZNUVWubIxGwuXxpTMzN1Oph1BEuRjWols3PUjcj3IWucWBUwC6qAPyZyZyj8MShT005IZUwOFE';
  const STRIPE_SUCCESS_URL = 'https://formprecision.com/checkout/success/';
  const STRIPE_CANCEL_URL  = 'https://formprecision.com/cart/';

  function resolvePriceIdFrom(key){
    return /^price_/.test(key) ? key : null; // we store real price IDs in the cart
  }

  let stripePromise;
  function getStripe(){
    if (stripePromise) return stripePromise;
    stripePromise = new Promise((resolve, reject) => {
      if (window.Stripe) return resolve(window.Stripe(STRIPE_PK));

      const existing = document.querySelector('script[src^="https://js.stripe.com/v3"]');

      function waitUntilReady(deadlineMs){
        const start = Date.now();
        (function poll(){
          if (window.Stripe) return resolve(window.Stripe(STRIPE_PK));
          if (Date.now() - start > deadlineMs) return reject(new Error('Stripe.js failed to load'));
          setTimeout(poll, 100);
        })();
      }

      if (existing) { waitUntilReady(15000); return; }

      const s = document.createElement('script');
      s.src = 'https://js.stripe.com/v3';
      s.async = true;
      s.setAttribute('data-cfasync','false');
      s.onload  = () => resolve(window.Stripe(STRIPE_PK));
      s.onerror = () => reject(new Error('Stripe.js failed to load'));
      document.head.appendChild(s);

      waitUntilReady(15000);
    });
    return stripePromise;
  }

  document.body.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-proceed-checkout]'); if (!btn) return;
    e.preventDefault();

    const cart = getCartFP();
    const lineItems = (cart.items || []).map(it => {
      const priceId = resolvePriceIdFrom(it.variantKey);
      if (!priceId || !it.qty) return null;
      return { price: priceId, quantity: Math.max(1, parseInt(it.qty, 10) || 1) };
    }).filter(Boolean);

    if (!lineItems.length) {
      alert('Cart is empty or items are missing Stripe price IDs.');
      return;
    }

    btn.disabled = true;
    try {
      const stripe = await getStripe();
const { error } = await stripe.redirectToCheckout({
  mode: 'payment',
  lineItems,

  // ✅ require a shipping address
  shippingAddressCollection: {
    // add more ISO-2 codes if you ship internationally
    allowedCountries: ['US']
  },

  // ✅ collect full billing address (improves AVS / fraud checks)
  billingAddressCollection: 'required',

  successUrl: STRIPE_SUCCESS_URL,
  cancelUrl: STRIPE_CANCEL_URL
});
      if (error) throw error;
    } catch (err) {
      console.error(err);
      const msg = String((err && err.message) || '');
      const isLoadErr = msg.toLowerCase().includes('failed to load') || msg.toLowerCase().includes('stripe is not defined');
      alert(isLoadErr
        ? 'Stripe could not load. Please disable ad/script blockers and try again.'
        : msg || 'Unable to start checkout.'
      );
      btn.disabled = false;
    }
  });
}); // end DOMContentLoaded

// Keep pages in sync across tabs/windows
window.addEventListener('storage', (e) => {
  if (e.key === 'fp-cart' || e.key === 'cart') { // include legacy to re-migrate quickly
    migrateLegacyCart();
    updateCartCount();
    renderCart();
  }
});

(function () {
  function init(form){
    if (!form || form.dataset.fpInit) return;
    form.dataset.fpInit = 1;

    function labelTextFor(el){
      if (el.id){
        var lbl = form.querySelector('label[for="'+el.id+'"]');
        if (lbl) return lbl.textContent.trim();
      }
      return '';
    }
    function messageFor(el){
      if(el.type==="email"&&el.validity.typeMismatch)return"Please enter a valid email address.";
      var lbl=el.id&&el.form&&el.form.querySelector('label[for="'+el.id+'"]');
      var txt=(lbl?lbl.textContent:"")||(el.getAttribute("aria-label")||el.placeholder||el.name||"");
      txt=txt.trim();
      return txt?'Please fill out “'+txt+'”.':'Please fill out this field.';
    }
    function wrapWithField(el){
      if(el&&el.parentElement&&el.parentElement.classList&&el.parentElement.classList.contains("fp-field"))return el.parentElement;
      var w=document.createElement("div");
      w.className="fp-field";
      el.parentNode.insertBefore(w,el);
      w.appendChild(el);
      return w;
    }
    function getHint(container){
      var hint=container.querySelector(".fp-hint");
      if(!hint){
        hint=document.createElement("div");
        hint.className="fp-hint";
        hint.setAttribute("role","alert");
        hint.setAttribute("aria-live","polite");
        container.appendChild(hint);
      }
      return hint;
    }
    function showHint(container,text){
      var h=getHint(container);
      h.textContent=text;
      h.classList.add("show");
    }
    function hideHint(container){
      var h=container.querySelector(".fp-hint");
      if(h)h.classList.remove("show");
    }
    var requiredFields=form.querySelectorAll('input[required]:not([type="radio"]):not([type="checkbox"]), textarea[required]');
    requiredFields.forEach(function(el){
      var container=wrapWithField(el);
      el.addEventListener("invalid",function(e){
        e.preventDefault();
        showHint(container,messageFor(el));
      });
      el.addEventListener("input",function(){hideHint(container);});
    });
    var ratingBox=form.querySelector(".rating-input");
    var ratingRadios=ratingBox?ratingBox.querySelectorAll('input[name="rating"]'):[];
    ratingRadios.forEach(function(r){
      r.addEventListener("invalid",function(e){e.preventDefault();});
      r.addEventListener("change",function(){hideHint(ratingBox);});
    });
    var consent=form.querySelector('input[name="consent_publish"][type="checkbox"]');
    var consentWrap=consent?wrapWithField(consent.closest("label.checkbox")||consent):null;
    if(consent){
      consent.addEventListener("invalid",function(e){e.preventDefault();showHint(consentWrap,"Please check the consent box.");});
      consent.addEventListener("change",function(){hideHint(consentWrap);});
    }
    form.addEventListener("submit",function(e){
      var firstTarget=null,hasInvalid=false;
      requiredFields.forEach(function(f){
        if(!f.checkValidity()){
          hasInvalid=true;
          f.dispatchEvent(new Event("invalid",{cancelable:true}));
          if(!firstTarget)firstTarget=f;
        }
      });
      if(ratingBox&&!form.querySelector('input[name="rating"]:checked')){
        hasInvalid=true;
        showHint(ratingBox,"Please select a star rating.");
        if(!firstTarget)firstTarget=(ratingRadios[0]||ratingBox);
      }
      if(consent&&!consent.checked){
        hasInvalid=true;
        showHint(consentWrap,"Please check the consent box.");
        if(!firstTarget)firstTarget=consent;
      }
      if(hasInvalid){
        e.preventDefault();
        try{firstTarget.focus({preventScroll:true});}catch(_){}
        (firstTarget.closest(".fp-field")||firstTarget).scrollIntoView({block:"center",behavior:"smooth"});
      }
    });
    form.addEventListener('submit', function(e){
      for (var i=0; i<requiredFields.length; i++){
        var f = requiredFields[i];
        if (!f.checkValidity()){
          e.preventDefault();
          f.dispatchEvent(new Event('invalid', {cancelable:true}));
          try{ f.focus({preventScroll:true}); }catch(_){}
          f.scrollIntoView({block:'center', behavior:'smooth'});
          return;
        }
      }
      if (ratingBox && !form.querySelector('input[name="rating"]:checked')){
        e.preventDefault();
        showHint(ratingBox, 'Please select a star rating.');
        ratingBox.scrollIntoView({block:'center', behavior:'smooth'});
        return;
      }
      if (consent && !consent.checked){
        e.preventDefault();
        showHint(consentWrap, 'Please check the consent box.');
        consentWrap.scrollIntoView({block:'center', behavior:'smooth'});
      }
    });
  }

  function run(){ document.querySelectorAll('.contact-form').forEach(init); }
  if (document.readyState !== 'loading') run();
  else document.addEventListener('DOMContentLoaded', run, {once:true});

  /* Also initialize forms added later (e.g., SPA/partial renders) */
  new MutationObserver(function(muts){
    muts.forEach(function(m){
      m.addedNodes && m.addedNodes.forEach(function(n){
        if (n.nodeType!==1) return;
        if (n.matches && n.matches('.contact-form')) init(n);
        n.querySelectorAll && n.querySelectorAll('.contact-form').forEach(init);
      });
    });
  }).observe(document.documentElement, {childList:true, subtree:true});
})();

/* ---- SINGLE add-to-cart handler with data-qty support (guarded) ---- */
(function bindCartHandler(){
  function attach(){
    if (!document.body || document.body.dataset.fpCartHandler) return;
    document.body.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-add-to-cart]');
      if (!btn) return;

      const name   = btn.getAttribute('data-name') || 'Item';
      const price  = Number(btn.getAttribute('data-price') || '0');
      const lookup = btn.getAttribute('data-lookup-key'); // prefer Stripe price_… when present
      const qtyAdd = Math.max(1, parseInt(btn.getAttribute('data-qty') || '1', 10) || 1);

      if (lookup && !/^price_/.test(lookup)) {
        console.warn('Item added without a Stripe price_… ID; it will be ignored at checkout.');
      }

      const variantKey = lookup || `btn:${name}|${price}`;

      const cart = getCartFP();
      const existing = cart.items.find(x => x.variantKey === variantKey);
      if (existing) {
        existing.qty += qtyAdd;
        existing.name  = name || existing.name;
        if (Number.isFinite(price)) existing.price = price;
      } else {
        cart.items.push({
          variantKey,
          qty: qtyAdd,
          name,
          price: Number.isFinite(price) ? price : 0
        });
      }
      ensureOrder(variantKey);
      setCartFP(cart);
      updateCartCount();
      renderCart();
      showCartToast('Added to cart');
    });
    document.body.dataset.fpCartHandler = '1';
  }
  if (document.body) attach();
  else document.addEventListener('DOMContentLoaded', attach, { once:true });
})();

/* =========================
   Per-card pager for article cards
   (.article-card[data-pager] with .pager-pages > [data-page])
========================= */
(function(){
  function initCardPagers(root){
    var scope = root || document;
    var cards = scope.querySelectorAll('.article-card[data-pager]');
    cards.forEach(function(card){
      if (card.dataset.pagerInit === '1') return;

      var pages = card.querySelectorAll('.pager-pages > [data-page]');
      if (!pages.length) return;

      card.dataset.pagerInit = '1';

      // Build controls (once)
      var ctrl = card.querySelector('.card-pager');
      if (!ctrl){
        ctrl = document.createElement('div');
        ctrl.className = 'card-pager';
        ctrl.setAttribute('role', 'group');
        ctrl.setAttribute('aria-label', 'Card pager');
        ctrl.innerHTML =
          '<button class="pager-btn prev" type="button" aria-label="Previous">‹</button>' +
          '<span class="pager-indicator" aria-live="polite"><span class="curr">1</span>/<span class="total">'+ pages.length +'</span></span>' +
          '<button class="pager-btn next" type="button" aria-label="Next">›</button>';
        card.appendChild(ctrl);
      } else {
        var totalEl = ctrl.querySelector('.pager-indicator .total');
        if (totalEl) totalEl.textContent = pages.length;
      }

      var prev = ctrl.querySelector('.prev');
      var next = ctrl.querySelector('.next');
      var curr = ctrl.querySelector('.curr');
      var i = 0;

      function show(idx){
        pages.forEach(function(p, k){ p.classList.toggle('is-active', k === idx); });
        i = idx;
        if (curr) curr.textContent = String(i + 1);
        if (prev) prev.disabled = (i === 0);
        if (next) next.disabled = (i === pages.length - 1);
      }

      // init state
      show(0);
      card.classList.add('pager-ready');

      // events
      if (prev) prev.addEventListener('click', function(){ if (i > 0) show(i - 1); });
      if (next) next.addEventListener('click', function(){ if (i < pages.length - 1) show(i + 1); });

      // keyboard left/right when card is focused
      if (!card.hasAttribute('tabindex')) card.setAttribute('tabindex', '0');
      card.addEventListener('keydown', function(e){
        if (e.key === 'ArrowLeft')  { e.preventDefault(); if (i > 0) show(i - 1); }
        if (e.key === 'ArrowRight') { e.preventDefault(); if (i < pages.length - 1) show(i + 1); }
      });

      // single-page: disable arrows
      if (pages.length === 1) { if (prev) prev.disabled = true; if (next) next.disabled = true; }
    });
  }

  function start(){ initCardPagers(document); }
  if (document.readyState !== 'loading') start();
  else document.addEventListener('DOMContentLoaded', start, { once:true });

  // Initialize on dynamically-added cards too
  new MutationObserver(function(muts){
    muts.forEach(function(m){
      m.addedNodes && m.addedNodes.forEach(function(n){
        if (n.nodeType !== 1) return;
        if (n.matches && n.matches('.article-card[data-pager]')) initCardPagers(n);
        n.querySelectorAll && n.querySelectorAll('.article-card[data-pager]').forEach(function(el){ initCardPagers(el); });
      });
    });
  }).observe(document.documentElement, { childList:true, subtree:true });
})();
