function toggleMenu() {
  const nav = document.getElementById('navLinks');
  nav.classList.toggle('show');
}

function addToCart(productName, price) {
  // Example: add item to localStorage cart
  let cart = JSON.parse(localStorage.getItem('cart')) || [];
  cart.push({ name: productName, price: price });
  localStorage.setItem('cart', JSON.stringify(cart));

  updateCartCount();

  // Show toast
  const toast = document.getElementById('cart-toast');
  toast.style.opacity = '1';

  // Hide after 2 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
  }, 2000);
}


function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  const countSpan = document.getElementById('cart-count');
  if (countSpan) {
    countSpan.textContent = cart.length;
  }
}

// Run this once on every page load
updateCartCount();
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
  cart.forEach((item, index) => {
    total += item.price;
    cartItemsDiv.innerHTML += `
      <div style="margin-bottom: 10px;">
        ${item.name} – $${item.price.toFixed(2)}
      </div>
    `;
  });

  totalSpan.textContent = total.toFixed(2);
}

function clearCart() {
  localStorage.removeItem('cart');
  updateCartCount();
  renderCart();
}

// Run on every page
updateCartCount();
renderCart();
