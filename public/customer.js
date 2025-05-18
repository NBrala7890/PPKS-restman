// localStorage.setItem("isAuthenticated", "false");
localStorage.removeItem("isAuthenticated");

// Tab switching functionality
function openTab(tabName) {
  // Hide all tab contents
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Deactivate all tab buttons
  document.querySelectorAll('.tab-button').forEach(button => {
    button.classList.remove('active');
  });
  
  // Show the selected tab content
  document.getElementById(tabName).classList.add('active');
  
  // Activate the clicked tab button
  event.currentTarget.classList.add('active');
}

// Initialize socket connection
const socket = io();

// Cart management
let cart = {
  meals: [],
  drinks: [],
  total: 0
};

// Store all available menu items
let menuItems = {
  meals: [],
  drinks: []
};

// Updates to customer.js for tooltip functionality

// Fetch menu data when page loads
window.addEventListener('DOMContentLoaded', async () => {
  try {
    // Fetch meals
    const mealsResponse = await fetch('/api/meals');
    const mealsData = await mealsResponse.json();
    menuItems.meals = mealsData;
    
    // Fetch drinks
    const drinksResponse = await fetch('/api/drinks');
    const drinksData = await drinksResponse.json();
    menuItems.drinks = drinksData;
    
    // Render menu items
    renderMenu();

    // Initialize tooltip positioning
    initializeTooltips();
  } catch (error) {
    console.error('Error fetching menu:', error);
    document.getElementById('meals-container').innerHTML = '<div class="menu-item-error">Pogreška pri učitavanju jelovnika. Pokušajte osvježiti stranicu.</div>';
    document.getElementById('drinks-container').innerHTML = '<div class="menu-item-error">Pogreška pri učitavanju pića. Pokušajte osvježiti stranicu.</div>';
  }
});

function renderMenu() {
  const mealsContainer = document.getElementById('meals-container');
  const drinksContainer = document.getElementById('drinks-container');
  
  // Render meals
  mealsContainer.innerHTML = menuItems.meals.map(meal => `
    <div class="menu-item" data-id="${meal.mealID}" data-type="meal">
      <div>
        <div class="item-name">
          ${meal.mealName}
          <div class="info-icon" data-item-type="meal" data-item-id="${meal.mealID}">i
            <div class="tooltip">
              <div class="tooltip-title">${meal.mealName}</div>
              <div class="tooltip-section">
                <span class="tooltip-label">Opis:</span> ${meal.mealDescription || 'Nije dostupno'}
              </div>
              <div class="tooltip-section">
                <span class="tooltip-label">Kategorija:</span> ${meal.mealCategory || 'Nije dostupno'}
              </div>
              <div class="tooltip-section">
                <span class="tooltip-label">Alergeni:</span> ${meal.mealAllergens || 'Nema'}
              </div>
              <div class="tooltip-section">
                <span class="tooltip-label">Vrijeme pripreme:</span> ${meal.mealPreparationTimeMinutes || '0'} min
              </div>
            </div>
          </div>
        </div>
        <div class="item-price">${meal.price.toFixed(2)} €</div>
      </div>
      <div class="item-controls">
        <div class="quantity-control">
          <button class="quantity-btn" onclick="decreaseQuantity(this)">-</button>
          <span class="quantity-display">1</span>
          <button class="quantity-btn" onclick="increaseQuantity(this)">+</button>
        </div>
        <button class="add-btn" onclick="addToCart(this, 'meal')">Dodaj</button>
      </div>
    </div>
  `).join('');
  
  // Render drinks
  drinksContainer.innerHTML = menuItems.drinks.map(drink => `
    <div class="menu-item" data-id="${drink.drinkID}" data-type="drink">
      <div>
        <div class="item-name">
          ${drink.drinkName}
          <div class="info-icon" data-item-type="drink" data-item-id="${drink.drinkID}">i
            <div class="tooltip">
              <div class="tooltip-title">${drink.drinkName}</div>
              <div class="tooltip-section">
                <span class="tooltip-label">Opis:</span> ${drink.drinkDescription || 'Nije dostupno'}
              </div>
              <div class="tooltip-section">
                <span class="tooltip-label">Kategorija:</span> ${drink.drinkCategory || 'Nije dostupno'}
              </div>
              <div class="tooltip-section">
                <span class="tooltip-label">Volumen:</span> ${drink.drinkVolume || 'Nije dostupno'}
              </div>
            </div>
          </div>
        </div>
        <div class="item-price">${drink.price.toFixed(2)} €</div>
      </div>
      <div class="item-controls">
        <div class="quantity-control">
          <button class="quantity-btn" onclick="decreaseQuantity(this)">-</button>
          <span class="quantity-display">1</span>
          <button class="quantity-btn" onclick="increaseQuantity(this)">+</button>
        </div>
        <button class="add-btn" onclick="addToCart(this, 'drink')">Dodaj</button>
      </div>
    </div>
  `).join('');
}

// Initialize tooltip positioning
function initializeTooltips() {
  // Add event listeners to ensure tooltips are always visible
  document.querySelectorAll('.info-icon').forEach(infoIcon => {
    infoIcon.addEventListener('mouseenter', adjustTooltipPosition);
    infoIcon.addEventListener('mouseleave', hideTooltip);
  });
}

// Hide tooltip when mouse leaves
function hideTooltip(event) {
  const tooltip = event.currentTarget.querySelector('.tooltip');
  tooltip.style.visibility = 'hidden';
  tooltip.style.opacity = '0';
}

// Adjust tooltip position to ensure it's fully visible
function adjustTooltipPosition(event) {
  const infoIcon = event.currentTarget;
  const tooltip = infoIcon.querySelector('.tooltip');
  const iconRect = infoIcon.getBoundingClientRect();
  
  // Remove all directional classes
  tooltip.classList.remove('tooltip-top', 'tooltip-bottom', 'tooltip-left', 'tooltip-right');
  
  // Get window dimensions
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  
  // Default positioning - above the icon
  let tooltipTop = iconRect.top - 10; // 10px above the icon
  let tooltipLeft = iconRect.left + (iconRect.width / 2);
  let placement = 'top';
  
  // Set tooltip initially visible and get its dimensions
  tooltip.style.visibility = 'hidden';
  tooltip.style.opacity = '0';
  tooltip.style.left = '0';
  tooltip.style.top = '0';
  const tooltipWidth = tooltip.offsetWidth;
  const tooltipHeight = tooltip.offsetHeight;
  
  // Check if tooltip would go off the top of the screen
  if (tooltipTop - tooltipHeight < 0) {
    // Place tooltip below the icon
    tooltipTop = iconRect.bottom + 10;
    placement = 'bottom';
  } else {
    // Place tooltip above the icon
    tooltipTop = iconRect.top - tooltipHeight - 10;
    placement = 'top';
  }
  
  // Center horizontally by default
  tooltipLeft = iconRect.left + (iconRect.width / 2) - (tooltipWidth / 2);
  
  // Check horizontal boundaries
  if (tooltipLeft < 10) {
    // Too close to left edge
    tooltipLeft = 10;
  } else if (tooltipLeft + tooltipWidth > windowWidth - 10) {
    // Too close to right edge
    tooltipLeft = windowWidth - tooltipWidth - 10;
  }
  
  // Set tooltip direction class for arrow positioning
  tooltip.classList.add(`tooltip-${placement}`);
  
  // Position the tooltip
  tooltip.style.top = `${tooltipTop}px`;
  tooltip.style.left = `${tooltipLeft}px`;
  
  // Make tooltip visible
  tooltip.style.visibility = 'visible';
  tooltip.style.opacity = '1';
}

// Make sure tooltips are properly positioned after DOM changes
window.addEventListener('resize', () => {
  // Hide all tooltips on resize to prevent positioning issues
  document.querySelectorAll('.tooltip').forEach(tooltip => {
    tooltip.style.visibility = 'hidden';
    tooltip.style.opacity = '0';
  });
});

// Handle scroll events to reposition tooltips
window.addEventListener('scroll', () => {
  document.querySelectorAll('.info-icon:hover').forEach(icon => {
    adjustTooltipPosition({ currentTarget: icon });
  });
}, { passive: true });

function decreaseQuantity(button) {
  const quantityDisplay = button.nextElementSibling;
  let quantity = parseInt(quantityDisplay.textContent);
  if (quantity > 1) {
    quantity--;
    quantityDisplay.textContent = quantity;
  }
}

function increaseQuantity(button) {
  const quantityDisplay = button.previousElementSibling;
  let quantity = parseInt(quantityDisplay.textContent);
  quantity++;
  quantityDisplay.textContent = quantity;
}

function addToCart(button, type) {
  const menuItem = button.closest('.menu-item');
  const id = parseInt(menuItem.dataset.id);
  const quantityDisplay = menuItem.querySelector('.quantity-display');
  const quantity = parseInt(quantityDisplay.textContent);
  
  // Reset quantity display to 1
  quantityDisplay.textContent = "1";
  
  // Find the item in our menu data
  const item = type === 'meal' 
    ? menuItems.meals.find(meal => meal.mealID === id)
    : menuItems.drinks.find(drink => drink.drinkID === id);
  
  if (!item) return;
  
  // Check if item already exists in cart
  const cartArray = type === 'meal' ? cart.meals : cart.drinks;
  const existingItemIndex = cartArray.findIndex(cartItem => 
    cartItem.id === id
  );
  
  if (existingItemIndex >= 0) {
    // Update quantity if item exists
    cartArray[existingItemIndex].quantity += quantity;
  } else {
    // Add new item to cart
    cartArray.push({
      id: id,
      name: type === 'meal' ? item.mealName : item.drinkName,
      price: item.price,
      quantity: quantity
    });
  }
  
  // Update cart display
  updateCart();
}

function removeFromCart(id, type) {
  if (type === 'meal') {
    cart.meals = cart.meals.filter(item => item.id !== id);
  } else {
    cart.drinks = cart.drinks.filter(item => item.id !== id);
  }
  
  updateCart();
}

function updateCart() {
  const cartItemsContainer = document.getElementById('cart-items');
  const cartTotalElement = document.getElementById('cart-total');
  const checkoutBtn = document.getElementById('checkout-btn');
  
  // Calculate total
  cart.total = 0;
  cart.meals.forEach(item => {
    cart.total += item.price * item.quantity;
  });
  cart.drinks.forEach(item => {
    cart.total += item.price * item.quantity;
  });
  
  // Update total display
  cartTotalElement.textContent = `${cart.total.toFixed(2)} €`;
  
  // Enable/disable checkout button
  checkoutBtn.disabled = cart.meals.length === 0 && cart.drinks.length === 0;
  
  // Update cart items display
  if (cart.meals.length === 0 && cart.drinks.length === 0) {
    cartItemsContainer.innerHTML = '<div class="empty-cart">Vaša košarica je prazna</div>';
    return;
  }
  
  let cartHTML = '';
  
  // Add meals to cart display
  cart.meals.forEach(item => {
    cartHTML += `
      <div class="cart-item">
        <div class="cart-item-details">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">${item.price.toFixed(2)} € × ${item.quantity}</div>
        </div>
        <button class="remove-btn" onclick="removeFromCart(${item.id}, 'meal')">×</button>
      </div>
    `;
  });
  
  // Add drinks to cart display
  cart.drinks.forEach(item => {
    cartHTML += `
      <div class="cart-item">
        <div class="cart-item-details">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">${item.price.toFixed(2)} € × ${item.quantity}</div>
        </div>
        <button class="remove-btn" onclick="removeFromCart(${item.id}, 'drink')">×</button>
      </div>
    `;
  });
  
  cartItemsContainer.innerHTML = cartHTML;
}

// Handle checkout process
document.getElementById('checkout-btn').addEventListener('click', async () => {
  const customerName = document.getElementById('customer-name').value.trim();
  const notes = document.getElementById('order-notes').value.trim();
  
  if (!customerName) {
    alert('Molimo unesite svoje ime');
    return;
  }
  
  // Prepare order data
  const orderData = {
    customerName: customerName,
    meals: cart.meals.map(item => ({
      name: item.name,
      quantity: item.quantity
    })),
    drinks: cart.drinks.map(item => ({
      name: item.name,
      quantity: item.quantity
    })),
    notes: notes
  };
  
  try {
    // Send order to server
    const response = await fetch('http://localhost:3000/api/newOrder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderData)
    });
    
    const result = await response.json();
    
    if (result.status === 'OK') {
      // Show confirmation
      document.getElementById('menu-view').style.display = 'none';
      document.getElementById('confirmation-view').style.display = 'block';
      document.getElementById('confirmation-order-id').textContent = result.orderID;
    } else {
      alert(`Greška: ${result.message || 'Neuspješna narudžba'}`);
    }
  } catch (error) {
    console.error('Error placing order:', error);
    alert('Greška prilikom slanja narudžbe. Molimo pokušajte ponovno.');
  }
});

// Reset order form
function resetOrder() {
  // Reset cart
  cart = {
    meals: [],
    drinks: [],
    total: 0
  };
  
  // Clear customer info
  document.getElementById('customer-name').value = '';
  document.getElementById('order-notes').value = '';
  
  // Reset view
  document.getElementById('menu-view').style.display = 'block';
  document.getElementById('confirmation-view').style.display = 'none';
  
  // Update cart display
  updateCart();
}

// Handle status check form
document.getElementById('status-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const orderID = document.getElementById('order-id').value;
  
  if (!orderID) {
    alert('Molimo unesite broj narudžbe');
    return;
  }

  const statusResult = document.getElementById('status-result');
    
    // Remove all status classes
    statusResult.className = 'status-result';
  
  try {
    // Fetch order status
    const response = await fetch(`/api/orderStatus/${orderID}`);
    const data = await response.json();

    // Doing this, so that the code goes to the catch block if there was an error
    let errorCheck = data.orderID;

    let statusText = '';
    let statusClass = '';

    // Show status
    document.getElementById('status-order-id').textContent = data.orderID;

    // Show customer
    document.getElementById('status-customer').textContent = data.customerName;

    // Determine status text and class
    switch (data.status) {
        case 'pending':
            statusText = 'U pripremi';
            statusClass = 'pending';
            break;
        // case 'in-progress':
        //     statusText = 'U pripremi';
        //     statusClass = 'in-progress';
        //     break;
        case 'ready':
            statusText = 'Spremno za dostavu';
            statusClass = 'ready';
            break;
        case 'delivery in progress':
            statusText = 'U dostavi';
            statusClass = 'delivery';
            break;
        case 'completed':
            statusText = 'Dostavljeno';
            statusClass = 'completed';
            break;
        // default:
        //     statusText = data.order.status;
        //     statusClass = 'pending';
    }

    document.getElementById('status-text').textContent = statusText;

    document.getElementById('status-details').textContent = '';

    // Display order details
    // let detailsHTML = '<strong>Naručene stavke:</strong><br>';
      
    // if (data.order.meals && data.order.meals.length > 0) {
    //   detailsHTML += 'Jela: ';
    //   detailsHTML += data.order.meals.map(meal => 
    //     `${meal.name} × ${meal.quantity}`
    //   ).join(', ');
    //   detailsHTML += '<br>';
    // }
    
    // if (data.order.drinks && data.order.drinks.length > 0) {
    //   detailsHTML += 'Pića: ';
    //   detailsHTML += data.order.drinks.map(drink => 
    //     `${drink.name} × ${drink.quantity}`
    //   ).join(', ');
    // }
    
    // document.getElementById('status-details').innerHTML = detailsHTML;
    
    // Add status class
    statusResult.classList.add(statusClass);
    
    // Show status result
    statusResult.style.display = 'block';
  } catch (error) {
    // Show error
    document.getElementById('status-text').textContent = 'Nije pronađeno';
    document.getElementById('status-order-id').textContent = orderID;
    document.getElementById('status-customer').textContent = '-';
    document.getElementById('status-details').textContent = 'Narudžba s navedenim brojem nije pronađena. Provjerite ispravnost broja narudžbe.';
    
    // Add not found class
    statusResult.classList.add('not-found');
    // console.error('Error checking order status:', error);
    // alert('Greška prilikom provjere statusa narudžbe. Pokušajte ponovno.');
  }
});

// Listen for socket events for real-time updates
socket.on('orderStatusUpdate', (updatedOrder) => {
  // Check if we're currently viewing this order's status
  const statusOrderId = document.getElementById('status-order-id').textContent;
  
  if (statusOrderId && statusOrderId == updatedOrder.orderID) {
    // Update the displayed status if we're viewing this order
    const statusResult = document.getElementById('status-result');
    statusResult.className = 'status-result';
    
    let statusText = '';
    let statusClass = '';
    
    // Determine status text and class
    switch (updatedOrder.status) {
      case 'pending':
        statusText = 'U obradi';
        statusClass = 'pending';
        break;
      case 'in-progress':
        statusText = 'U pripremi';
        statusClass = 'in-progress';
        break;
      case 'ready':
        statusText = 'Spremno za dostavu';
        statusClass = 'ready';
        break;
      case 'delivery':
        statusText = 'U dostavi';
        statusClass = 'delivery';
        break;
      case 'completed':
        statusText = 'Dostavljeno';
        statusClass = 'completed';
        break;
      default:
        statusText = updatedOrder.status;
        statusClass = 'pending';
    }
    
    document.getElementById('status-text').textContent = statusText;
    statusResult.classList.add(statusClass);
  }
});