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
function getOrder() {
  try { return JSON.parse(localStorage.getItem('cartOrder') || '{}'); } catch { return {}; }
}
function setOrder(o) { localStorage.setItem('cartOrder', JSON.stringify(o)); }
function ensureOrder(key) {
  const o = getOrder();
  if (o[key] == null) {
    const c = Number(localStorage.getItem('cartOrderCounter') || '0') + 1;
    localStorage.setItem('cartOrderCounter', String(c));
    o[key] = c;
    setOrder(o);
  }
  return o[key];
}
function maybeClearOrderFor(key) {
  const o = getOrder();
  if (o[key] != null) { delete o[key]; setOrder(o); }
}
function getCart() { try { return JSON.parse(localStorage.getItem('cart') || '[]'); } catch { return []; } }
function setCart(cart) { localStorage.setItem('cart', JSON.stringify(cart)); }
function updateCartCount() {
  const el = document.getElementById('cart-count');
  if (el) el.textContent = getCart().length;
}
function showCartToast() {
  const toast = document.getElementById('cart-toast');
  if (!toast) return;
  toast.style.opacity = '1';
  clearTimeout(showCartToast._t);
  showCartToast._t = setTimeout(() => { toast.style.opacity = '0'; }, 2000);
}
function renderCart() {
  const list = document.getElementById('cart-items');
  const totalEl = document.getElementById('cart-total');
  if (!list || !totalEl) return;
  const items = getCart();
  if (!items.length) {
    list.innerHTML = '<p>Your cart is empty.</p>';
    totalEl.textContent = '0.00';
    return;
  }
  const groups = new Map();
  for (const it of items) {
    const name = it.name || 'Item';
    const price = Number(it.price) || 0;
    const key = `${name}|${price}`;
    const g = groups.get(key) || { key, name, price, qty: 0 };
    g.qty += 1; groups.set(key, g);
  }
  const order = getOrder();
  const grouped = Array.from(groups.values()).sort((a, b) => {
    const ao = order[a.key] ?? Number.MAX_SAFE_INTEGER;
    const bo = order[b.key] ?? Number.MAX_SAFE_INTEGER;
    return ao - bo;
  });
  list.innerHTML = '';
  let total = 0;
  for (const g of grouped) {
    total += g.price * g.qty;
    const row = document.createElement('div');
    row.className = 'cart-item';
    row.innerHTML = `
      <span class="item-name">
        <span class="item-title">${g.name}</span> — <span class="price item-price">$${g.price.toFixed(2)}</span>
      </span>
      <div class="qty-controls" role="group" aria-label="Quantity for ${g.name}">
        <button class="qty-btn" data-action="dec" data-key="${g.key}" aria-label="Decrease quantity">−</button>
        <input class="qty-input" type="number" inputmode="numeric" pattern="[0-9]*" min="0" step="1" value="${g.qty}" data-key="${g.key}" aria-label="Quantity for ${g.name}">
        <button class="qty-btn" data-action="inc" data-key="${g.key}" aria-label="Increase quantity">+</button>
      </div>
      <button class="remove-item" data-action="remove" data-key="${g.key}" aria-label="Remove all ${g.name}">
        ${TRASH_SVG}
      </button>
    `;
    list.appendChild(row);
  }

  totalEl.textContent = total.toFixed(2);
}
document.addEventListener('DOMContentLoaded', () => {
  updateCartCount();
  renderCart();
  document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-add-to-cart]'); if (!btn) return;
    const name = btn.getAttribute('data-name') || 'Item';
    const price = Number(btn.getAttribute('data-price') || '0');
    const key = `${name}|${price}`;
    ensureOrder(key);
    const items = getCart(); items.push({ name, price: Number(price) || 0 });
    setCart(items); updateCartCount(); renderCart(); showCartToast();
  });
  document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]'); if (!btn) return;
    const action = btn.getAttribute('data-action'); const key = btn.getAttribute('data-key'); if (!key) return;
    const [name, priceStr] = key.split('|'); const price = Number(priceStr) || 0;
    let items = getCart();
    if (action === 'inc') {
      ensureOrder(key);
      items.push({ name, price });
    } else if (action === 'dec') {
      const idx = items.findIndex(it => it.name === name && Number(it.price) === price);
      if (idx > -1) items.splice(idx, 1);
    } else if (action === 'remove') {
      items = items.filter(it => !(it.name === name && Number(it.price) === price));
      maybeClearOrderFor(key);
    }
    setCart(items); updateCartCount(); renderCart();
  });
  document.body.addEventListener('change', (e) => {
    const input = e.target.closest('.qty-input'); if (!input) return;
    const key = input.getAttribute('data-key'); if (!key) return;
    const [name, priceStr] = key.split('|'); const price = Number(priceStr) || 0;
    let qty = parseInt(input.value, 10); if (!Number.isFinite(qty) || qty < 0) qty = 0;
    if (qty > 0) ensureOrder(key);
    let items = getCart().filter(it => !(it.name === name && Number(it.price) === price));
    for (let i = 0; i < qty; i++) items.push({ name, price });
    setCart(items); updateCartCount(); renderCart();
  });
  document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-clear-cart]'); if (!btn) return;
    localStorage.removeItem('cart'); localStorage.removeItem('cartOrder'); localStorage.removeItem('cartOrderCounter');
    updateCartCount(); renderCart();
  });
  document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-proceed-checkout]'); if (!btn) return;
    window.location.href = '/checkout/';
  });
});
window.addEventListener('storage', (e) => {
  if (e.key === 'cart') { updateCartCount(); renderCart(); }
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
