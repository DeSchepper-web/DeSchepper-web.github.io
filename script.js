/* ---------- Off-canvas Menu: unified behavior ---------- */

function setMenuState(open) {
  const menu = document.getElementById('offcanvasMenu');
  const overlay = document.getElementById('overlay');
  const button = document.querySelector('.menu-toggle');

  if (!menu || !overlay) return;

  // Primary (current) classes
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

/* ---------- Cart / Toast Logic ---------- */

function addToCart(productName, price) {
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  cart.push({ name: productName, price: Number(price) || 0 });
  localStorage.setItem('cart', JSON.stringify(cart));

  updateCartCount();
  showCartToast();
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

function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  const countSpan = document.getElementById('cart-count');
  if (countSpan) countSpan.textContent = cart.length;
}

function renderCart() {
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
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
  cart.forEach((item) => {
    total += Number(item.price) || 0;
    const row = document.createElement('div');
    row.style.marginBottom = '10px';
    row.textContent = `${item.name} – $${(Number(item.price) || 0).toFixed(2)}`;
    cartItemsDiv.appendChild(row);
  });
  totalSpan.textContent = total.toFixed(2);
}

function clearCart() {
  localStorage.removeItem('cart');
  updateCartCount();
  renderCart();
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
});