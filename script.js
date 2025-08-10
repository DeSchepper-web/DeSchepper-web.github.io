/* ---------- Off-canvas Menu: unified behavior ---------- */

function setMenuState(open) {
  const menu = document.getElementById('offcanvasMenu');
  const overlay = document.getElementById('overlay');
  const button = document.querySelector('.menu-toggle');

  if (!menu || !overlay) return;

  // Primary classes
  menu.classList.toggle('show', open);
  overlay.classList.toggle('show', open);
  if (button) button.classList.toggle('show', open);

  // Back-compat with older CSS that used "active"
  menu.classList.toggle('active', open);
  overlay.classList.toggle('active', open);
  if (button) button.classList.toggle('active', open);

  // Accessibility
  menu.setAttribute('aria-hidden', !open);
  overlay.setAttribute('aria-hidden', !open);
}

function toggleMenu() {
  const menu = document.getElementById('offcanvasMenu');
  if (!menu) return;
  const open = !menu.classList.contains('show') && !menu.classList.contains('active');
  setMenuState(open);
}

// Close menu when pressing Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') setMenuState(false);
});

// Close menu when clicking any link inside the menu (nice on mobile)
document.addEventListener('click', (e) => {
  const menu = document.getElementById('offcanvasMenu');
  if (!menu) return;
  if (menu.contains(e.target) && e.target.closest('a')) {
    setMenuState(false);
  }
});

/* ---------- Cart / Toast Helpers ---------- */

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
  return JSON.parse(localStorage.getItem('cart') || '[]');
}
function setCart(cart) {
  localStorage.setItem('cart', JSON.stringify(cart));
}

/* ---------- Cart API ---------- */

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
  showCartToast._t = setTimeout(() => {
    toast.style.opacity = '0';
  }, 2000);
}

/* ---------- Render Cart ---------- */

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

/* ---------- Page init ---------- */

document.addEventListener('DOMContentLoaded', () => {
  // Keep counts current across all pages
  updateCartCount();

  // If on cart page, render items
  renderCart();

  // Ensure overlay click always closes (in case inline onclick is missing)
  const overlay = document.getElementById('overlay');
  if (overlay && !overlay.hasAttribute('onclick')) {
    overlay.addEventListener('click', () => setMenuState(false));
  }

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