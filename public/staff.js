const socket = io();
let kitchenOrders = [];
let deliveryOrders = [];
let currentPreparingIndex = -1;
let isProcessingOrder = false;
const MAX_DRIVERS = 5;
let availableDrivers = 5;

// Redirect to auth.html if user is not authenticated
if (localStorage.getItem("isAuthenticated") !== "true")
  window.location.href = "auth.html";

document.addEventListener('DOMContentLoaded', function() {
  // Set up tab functionality
  window.openTab = function(tabName) {
    // Hide all tab contents
    const tabContents = document.getElementsByClassName('tab-content');
    for (let i = 0; i < tabContents.length; i++) {
      tabContents[i].classList.remove('active');
    }
    
    // Remove active class from all tab buttons
    const tabButtons = document.getElementsByClassName('tab-button');
    for (let i = 0; i < tabButtons.length; i++) {
      tabButtons[i].classList.remove('active');
    }
    
    // Show the selected tab content and mark the button as active
    document.getElementById(tabName).classList.add('active');
    document.querySelector(`.tab-button[onclick="openTab('${tabName}')"]`).classList.add('active');
  };

  // Initial renders
  renderKitchenOrders();
  updateDriversDisplay();
  
  // Request existing ready orders from server
  socket.emit('getReadyOrders');
});

// Socket event listeners
socket.on('connect', () => {
  console.log('Staff portal connected to server with socket ID:', socket.id);
});

// Kitchen events
socket.on('newOrder', (order) => {
  order.remainingTime = order.totalPrepTime;
  order.progress = 0;
  kitchenOrders.push(order);

  renderKitchenOrders();

  if (!isProcessingOrder) {
    startNextOrder();
  }
});

// Delivery events
socket.on('allReadyOrders', (readyOrders) => {
  console.log('Received all ready orders:', readyOrders);
  deliveryOrders = readyOrders;
  renderDeliveryOrders();
  updateDriversDisplay();
});

socket.on('newReadyOrder', (order) => {
  console.log('New ready order received:', order);
  deliveryOrders.push(order);
  renderDeliveryOrders();
});

// =============== KITCHEN FUNCTIONALITY ===============

function renderKitchenOrders() {
  const container = document.getElementById('kitchen-orders');
  container.innerHTML = '';

  if (kitchenOrders.length === 0) {
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'empty-message';
    emptyMessage.textContent = 'Trenutno nema narudžbi';
    container.appendChild(emptyMessage);
    return;
  }

  kitchenOrders.forEach((order) => {
    const card = document.createElement('div');
    card.className = 'order-card';
    card.id = `kitchen-order-${order.orderID}`;
    
    // Generate HTML for order items
    let mealsHtml = '';
    if (order.meals && order.meals.length > 0) {
      order.meals.forEach(meal => {
        mealsHtml += `
          <li class="order-item">
            <span class="item-name">${meal.name}</span>
            <span class="item-quantity">x${meal.quantity}</span>
          </li>
        `;
      });
    }
    
    let drinksHtml = '';
    if (order.drinks && order.drinks.length > 0) {
      order.drinks.forEach(drink => {
        drinksHtml += `
          <li class="order-item">
            <span class="item-name">${drink.name}</span>
            <span class="item-quantity">x${drink.quantity}</span>
          </li>
        `;
      });
    }
    
    let actionButton = '';
    if (order.status === 'ready') {
      actionButton = `
        <div class="order-actions">
          <button class="kitchen-action-btn" onclick="removeKitchenOrder(${order.orderID})">Ukloni</button>
        </div>
      `;
    }
    
    card.innerHTML = `
      <div class="order-header">
        <div class="order-id">Narudžba #${order.orderID}</div>
      </div>
      <div class="order-customer">Kupac: ${order.customerName}</div>
      <ul class="order-items">
        ${mealsHtml}
        ${drinksHtml}
      </ul>
      <div class="order-footer">
        <div class="order-status">${getStatusText(order.status)}</div>
        ${order.status !== 'ready' ? `
          <div class="progress-container">
            <div class="progress-bar" id="kitchen-progress-${order.orderID}" style="width: ${order.progress || 0}%"></div>
          </div>
        ` : ''}
        ${actionButton}
      </div>
    `;
    
    container.appendChild(card);
  });
}

function startNextOrder() {
  const nextIndex = kitchenOrders.findIndex(order => order.status === 'pending');

  if (nextIndex === -1) {
    currentPreparingIndex = -1;
    isProcessingOrder = false;
    return;
  }

  isProcessingOrder = true;
  currentPreparingIndex = nextIndex;
  const order = kitchenOrders[currentPreparingIndex];
  order.status = 'in progress';
  // Notify server about status change
  socket.emit('orderStatusChanged', {
    orderID: order.orderID,
    status: 'in-progress'
  });
  renderKitchenOrders();

  // Use setInterval which continues to execute even when tab is not active
  const startTime = Date.now();
  const totalDurationMs = order.totalPrepTime * 1000;
  
  // Set up interval to regularly update progress
  const updateInterval = 100; // 100ms interval for smooth animation
  const interval = setInterval(() => {
    if (!kitchenOrders.includes(order)) {
      // Order might have been removed
      clearInterval(interval);
      startNextOrder();
      return;
    }

    const elapsed = Date.now() - startTime;
    order.progress = Math.min((elapsed / totalDurationMs) * 100, 100);
    
    // Update progress bar
    const progressBar = document.getElementById(`kitchen-progress-${order.orderID}`);
    if (progressBar) {
      progressBar.style.width = `${order.progress}%`;
    }

    // When order is completed, clear interval and continue
    if (elapsed >= totalDurationMs) {
      clearInterval(interval);
      order.status = 'ready';
      
      console.log(`Emitting status change for order #${order.orderID} to 'ready'`);
      // Notify server about status change
      socket.emit('orderStatusChanged', {
        orderID: order.orderID,
        status: 'ready'
      });
      console.log('Status change emission completed');
      
      renderKitchenOrders();
      startNextOrder();
    }
  }, updateInterval);
}

function removeKitchenOrder(orderID) {
  const card = document.getElementById(`kitchen-order-${orderID}`);
  if (!card) return;

  // Shrink animation
  card.classList.add('shrink');

  setTimeout(() => {
    // Check if the order being removed is the one currently being prepared
    const orderIndex = kitchenOrders.findIndex(o => o.orderID === orderID);
    const isCurrentProcessing = orderIndex === currentPreparingIndex;
    
    // Remove order from array
    kitchenOrders = kitchenOrders.filter(o => o.orderID !== orderID);
    
    // Update currentPreparingIndex if needed
    if (isCurrentProcessing) {
      currentPreparingIndex = -1;
      isProcessingOrder = false;
      startNextOrder(); // Start next order if exists
    } else if (orderIndex < currentPreparingIndex) {
      // If the removed order was before the current one, adjust index
      currentPreparingIndex--;
    }
    
    renderKitchenOrders();
  }, 400);
}

// =============== DELIVERY FUNCTIONALITY ===============

function renderDeliveryOrders() {
  const container = document.getElementById('delivery-orders');
  container.innerHTML = '';

  if (deliveryOrders.length === 0) {
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'empty-message';
    emptyMessage.textContent = 'Trenutno nema narudžbi spremnih za dostavu';
    container.appendChild(emptyMessage);
    return;
  }

  deliveryOrders.forEach((order) => {
    const card = document.createElement('div');
    card.className = 'order-card';
    card.id = `delivery-order-${order.orderID}`;
    
    // Generate HTML for order items
    let mealsHtml = '';
    if (order.meals && order.meals.length > 0) {
      order.meals.forEach(meal => {
        mealsHtml += `
          <li class="order-item">
            <span class="item-name">${meal.name}</span>
            <span class="item-quantity">x${meal.quantity}</span>
          </li>
        `;
      });
    }
    
    let drinksHtml = '';
    if (order.drinks && order.drinks.length > 0) {
      order.drinks.forEach(drink => {
        drinksHtml += `
          <li class="order-item">
            <span class="item-name">${drink.name}</span>
            <span class="item-quantity">x${drink.quantity}</span>
          </li>
        `;
      });
    }
    
    card.innerHTML = `
      <div class="order-header">
        <div class="order-id">Narudžba #${order.orderID}</div>
      </div>
      <div class="order-customer">Kupac: ${order.customerName}</div>
      <ul class="order-items">
        ${mealsHtml}
        ${drinksHtml}
      </ul>
      <div class="order-footer">
        <div class="order-status">Spremno za dostavu</div>
        <div class="order-actions">
          <button class="delivery-action-btn ${availableDrivers <= 0 ? 'disabled' : ''}" 
                  onclick="startDelivery(${order.orderID})" 
                  ${availableDrivers <= 0 ? 'disabled' : ''}>
            Pošalji na dostavu
          </button>
        </div>
      </div>
    `;
    
    container.appendChild(card);
  });
}

function updateDriversDisplay() {
  // Update the drivers display
  const driversProgress = document.getElementById('drivers-progress');
  const availableDriversSpan = document.getElementById('available-drivers');
  const totalDriversSpan = document.getElementById('total-drivers');
  
  if (driversProgress && availableDriversSpan && totalDriversSpan) {
    availableDriversSpan.textContent = availableDrivers;
    totalDriversSpan.textContent = MAX_DRIVERS;
    driversProgress.style.width = `${(availableDrivers / MAX_DRIVERS) * 100}%`;
  }
  
  // Update all delivery buttons based on driver availability
  document.querySelectorAll('.delivery-action-btn').forEach(button => {
    if (availableDrivers > 0) {
      button.classList.remove('disabled');
      button.disabled = false;
    } else {
      button.classList.add('disabled');
      button.disabled = true;
    }
  });
}

function startDelivery(orderID) {
  console.log(`Starting delivery for order #${orderID}`);
  
  // Check driver availability
  if (availableDrivers <= 0) {
    alert('Nema dostupnih dostavljača! Pričekajte dok se neki dostavljač ne oslobodi.');
    return;
  }
  
  // Decrease available drivers
  availableDrivers--;
  updateDriversDisplay();
  
  // Find order
  const orderIndex = deliveryOrders.findIndex(o => o.orderID === orderID);
  if (orderIndex === -1) return;
  
  const order = deliveryOrders[orderIndex];
  
  // Change status and notify server
  order.status = 'delivery in progress';
  socket.emit('orderStatusChanged', {
    orderID: order.orderID,
    status: 'delivery in progress'
  });
  
  // Shrink animation
  const card = document.getElementById(`delivery-order-${orderID}`);
  if (card) {
    card.classList.add('shrink');
  }
  
  // Remove order from local display
  setTimeout(() => {
    deliveryOrders = deliveryOrders.filter(o => o.orderID !== orderID);
    renderDeliveryOrders();
    
    // Simulate delivery (30 seconds)
    console.log(`Delivery in progress for order #${orderID}, will complete in 30 seconds`);
    setTimeout(() => {
      // Order delivered - change status to "completed"
      console.log(`Delivery completed for order #${orderID}`);
      socket.emit('orderStatusChanged', {
        orderID: orderID,
        status: 'completed'
      });
      
      // Increase available drivers
      availableDrivers++;
      updateDriversDisplay();
    }, 30000); // 30 seconds
  }, 400); // Animation duration
}

// =============== HELPER FUNCTIONS ===============

function getStatusText(status) {
  switch(status) {
    case 'pending':
      return 'Čeka obradu';
    case 'in progress':
      return 'U pripremi';
    case 'ready':
      return 'Spremno za dostavu';
    case 'delivery in progress':
      return 'U dostavi';
    case 'completed':
      return 'Isporučeno';
    default:
      return status;
  }
}

function requireAuth() {
    window.location.href = 'auth.html'
}

// Expose functions to window for the onclick attributes
window.openTab = openTab;
window.removeKitchenOrder = removeKitchenOrder;
window.startDelivery = startDelivery;

requireAuth();