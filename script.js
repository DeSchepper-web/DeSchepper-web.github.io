/* =========================
   Off-canvas Menu (single source of truth)
   Uses: body.menu-open, #primary-nav, #overlay, .menu-toggle
========================= */

(function () {
  const SELECTORS = {
    nav: '#primary-nav',
    overlay: '#overlay',
    toggleBtn: '.menu-toggle'
  };

  const nav = document.querySelector(SELECTORS.nav);
  const overlay = document.querySelector(SELECTORS.overlay);
  const toggleBtn = document.querySelector(SELECTORS.toggleBtn);

  // Bail gracefully if markup not present on a page
  if (!nav || !overlay) {
    window.toggleMenu = function(){};
    return;
  }

  // Now it's safe to query inside nav
  const closeBtn = nav.querySelector('.drawer-close');


  // Keep ARIA in sync
  function setAria(isOpen) {
    nav.setAttribute('aria-hidden', String(!isOpen));
    overlay.setAttribute('aria-hidden', String(!isOpen));
    if (toggleBtn) toggleBtn.setAttribute('aria-expanded', String(isOpen));
  }

  function setMenuState(open) {
    const isOpen = Boolean(open);
    document.body.classList.toggle('menu-open', isOpen);
    setAria(isOpen);

    // optional: lock scroll when menu open
    document.documentElement.style.overflow = isOpen ? 'hidden' : '';
    document.body.style.overflow = isOpen ? 'hidden' : '';
  }

  // Public API for your HTML onclick="toggleMenu()" / toggleMenu(false)
  window.toggleMenu = function (force) {
    const next = typeof force === 'boolean'
      ? force
      : !document.body.classList.contains('menu-open');
    setMenuState(next);
  };

  // Wire events
  if (toggleBtn) toggleBtn.addEventListener('click', () => window.toggleMenu());
  if (closeBtn) closeBtn.addEventListener('click', () => window.toggleMenu(false));
  overlay.addEventListener('click', () => window.toggleMenu(false));

  // Close when pressing Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') window.toggleMenu(false);
  });

  // Ensure nav is exposed to AT on desktop widths (>=1200px)
  const mql = window.matchMedia('(min-width: 1200px)');
  function syncAriaForDesktop(e) {
    if (e.matches) {
      nav.removeAttribute('aria-hidden'); // desktop: not hidden from AT
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    } else {
      setAria(document.body.classList.contains('menu-open'));
    }
  }
  mql.addEventListener('change', syncAriaForDesktop);
  syncAriaForDesktop(mql);

  // Close menu when clicking any link inside the nav (nice on mobile)
  nav.addEventListener('click', (e) => {
    if (e.target.closest('a')) window.toggleMenu(false);
  });
})();

/* =========================
   Cart / Toast helpers
========================= */

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

function getCart() {
  try { return JSON.parse(localStorage.getItem('cart') || '[]'); }
  catch { return []; }
}
function setCart(cart) {
  localStorage.setItem('cart', JSON.stringify(cart));
}

function addToCart(productName, price) {
  const cart = getCart();
  cart.push({ name: productName, price: Number(price) || 0 });
  setCart(cart);
  updateCartCount();
  showCartToast();
}

function removeFromCart(index) {
  const cart = getCart();
  cart.splice(index, 1);
  setCart(cart);
  updateCartCount();
  renderCart();
}

function clearCart() {
  localStorage.removeItem('cart');
  updateCartCount();
  renderCart();
}

function updateCartCount() {
  const cart = getCart();
  const countSpan = document.getElementById('cart-count');
  if (countSpan) countSpan.textContent = cart.length;
}

function showCartToast() {
  const toast = document.getElementById('cart-toast');
  if (!toast) return;
  toast.style.opacity = '1';
  clearTimeout(showCartToast._t);
  showCartToast._t = setTimeout(() => { toast.style.opacity = '0'; }, 2000);
}

function renderCart() {
  const cart = getCart();
  const cartItemsDiv = document.getElementById('cart-items');
  const totalSpan = document.getElementById('cart-total');
  if (!cartItemsDiv || !totalSpan) return;

  if (cart.length === 0) {
    cartItemsDiv.innerHTML = "<p>Your cart is empty.</p>";
    totalSpan.textContent = "0.00";
    return;
  }

  cartItemsDiv.innerHTML = "";
  let total = 0;

  cart.forEach((item, index) => {
    total += Number(item.price) || 0;

    const row = document.createElement('div');
    row.className = 'cart-item';
    row.innerHTML = `
      <span class="item-name">${item.name} — $${(Number(item.price) || 0).toFixed(2)}</span>
      <button class="remove-item" aria-label="Remove ${item.name}" data-index="${index}">
        ${TRASH_SVG}
      </button>
    `;
    cartItemsDiv.appendChild(row);
  });

  totalSpan.textContent = total.toFixed(2);
}

/* =========================
   Page init
========================= */

document.addEventListener('DOMContentLoaded', () => {
  updateCartCount();
  renderCart();

  // Delegate remove clicks inside cart
  const cartItemsDiv = document.getElementById('cart-items');
  if (cartItemsDiv) {
    cartItemsDiv.addEventListener('click', (e) => {
      const btn = e.target.closest('.remove-item');
      if (!btn) return;
      const idx = Number(btn.dataset.index);
      if (!Number.isNaN(idx)) removeFromCart(idx);
    });
  }

  // Optional: wire up "Clear Cart" button if present
  const clearBtn = document.getElementById('clear-cart');
  if (clearBtn) clearBtn.addEventListener('click', clearCart);
});