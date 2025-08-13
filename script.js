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
function getCart() { try { return JSON.parse(localStorage.getItem('cart') || '[]'); } catch { return []; } }
function setCart(cart) { localStorage.setItem('cart', JSON.stringify(cart)); }
function updateCartCount() { const el = document.getElementById('cart-count'); if (el) el.textContent = getCart().length; }
function showCartToast() { const toast = document.getElementById('cart-toast'); if (!toast) return; toast.style.opacity = '1'; clearTimeout(showCartToast._t); showCartToast._t = setTimeout(() => { toast.style.opacity = '0'; }, 2000); }
function renderCart() {
  const list = document.getElementById('cart-items');
  const totalEl = document.getElementById('cart-total');
  if (!list || !totalEl) return;
  const items = getCart();
  if (!items.length) { list.innerHTML = '<p>Your cart is empty.</p>'; totalEl.textContent = '0.00'; return; }
  const groups = new Map();
  for (const it of items) {
    const name = it.name || 'Item';
    const price = Number(it.price) || 0;
    const key = `${name}|${price}`;
    const g = groups.get(key) || { name, price, qty: 0 };
    g.qty += 1; groups.set(key, g);
  }
  list.innerHTML = '';
  let total = 0;
  for (const [key, g] of groups) {
    total += g.price * g.qty;
    const row = document.createElement('div');
    row.className = 'cart-item';
    row.innerHTML = `
      <span class="item-name">${g.name} — $${g.price.toFixed(2)}</span>
      <div class="qty-controls" role="group" aria-label="Quantity for ${g.name}">
        <button class="qty-btn" data-action="dec" data-key="${key}" aria-label="Decrease quantity">−</button>
        <input class="qty-input" type="number" inputmode="numeric" pattern="[0-9]*" min="0" step="1" value="${g.qty}" data-key="${key}" aria-label="Quantity for ${g.name}">
        <button class="qty-btn" data-action="inc" data-key="${key}" aria-label="Increase quantity">+</button>
      </div>
      <button class="remove-item" data-action="remove" data-key="${key}" aria-label="Remove all ${g.name}">
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
    const items = getCart(); items.push({ name, price: Number(price) || 0 });
    setCart(items); updateCartCount(); renderCart(); showCartToast();
  });
  document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]'); if (!btn) return;
    const action = btn.getAttribute('data-action'); const key = btn.getAttribute('data-key'); if (!key) return;
    const [name, priceStr] = key.split('|'); const price = Number(priceStr) || 0;
    let items = getCart();
    if (action === 'inc') { items.push({ name, price }); }
    else if (action === 'dec') { const idx = items.findIndex(it => it.name === name && Number(it.price) === price); if (idx > -1) items.splice(idx, 1); }
    else if (action === 'remove') { items = items.filter(it => !(it.name === name && Number(it.price) === price)); }
    setCart(items); updateCartCount(); renderCart();
  });
  document.body.addEventListener('change', (e) => {
    const input = e.target.closest('.qty-input'); if (!input) return;
    const key = input.getAttribute('data-key'); if (!key) return;
    const [name, priceStr] = key.split('|'); const price = Number(priceStr) || 0;
    let qty = parseInt(input.value, 10); if (!Number.isFinite(qty) || qty < 0) qty = 0;
    let items = getCart().filter(it => !(it.name === name && Number(it.price) === price));
    for (let i = 0; i < qty; i++) items.push({ name, price });
    setCart(items); updateCartCount(); renderCart();
  });
  document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-clear-cart]'); if (!btn) return;
    localStorage.removeItem('cart'); updateCartCount(); renderCart();
  });
  document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-proceed-checkout]'); if (!btn) return;
    window.location.href = '/checkout/';
  });
});
window.addEventListener('storage', (e) => { if (e.key === 'cart') { updateCartCount(); renderCart(); } });
