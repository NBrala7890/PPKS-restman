const socket = io();
let orders = [];
let currentPreparingIndex = -1;
let isProcessingOrder = false;

renderOrders();

socket.on('newOrder', (order) => {
  order.remainingTime = order.totalPrepTime;
  order.progress = 0;
  orders.push(order);

  renderOrders();

  if (!isProcessingOrder) {
    startNextOrder();
  }
});

function renderOrders() {
  const container = document.getElementById('orders');
  container.innerHTML = '';

  if (orders.length === 0) {
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'empty-message';
    emptyMessage.textContent = 'Trenutno nema narudžbi';
    container.appendChild(emptyMessage);
    return;
  }

  orders.forEach((order) => {
    const card = document.createElement('div');
    card.className = 'order-card';
    card.id = `order-${order.orderID}`;
    card.style.backgroundColor = order.status === 'ready' ? '#8cb369' : '#f4e285';
  
    card.innerHTML = `
      <h3>Narudžba #${order.orderID}</h3>
      <p><strong>Kupac:</strong> ${order.customer}</p>
      <p><strong>Status:</strong> ${order.status}</p>
      <p><strong>Ukupno:</strong> ${order.totalAmount.toFixed(2)} €</p>
      <p><strong>Meals:</strong> ${order.meals.map(m => `${m.name} (${m.quantity})`).join(', ')}</p>
      <p><strong>Drinks:</strong> ${order.drinks.map(d => `${d.name} (${d.quantity})`).join(', ')}</p>
      ${
        order.status !== 'ready' ? `
        <div class="progress-container">
          <div class="progress-bar" id="progress-${order.orderID}" style="width: ${order.progress || 0}%"></div>
        </div>` : ''
      }
    `;
  
    if (order.status === 'ready') {
      const deleteButton = document.createElement('button');
      deleteButton.textContent = 'Obriši';
      deleteButton.className = 'delete-button';
      deleteButton.setAttribute('data-order-id', order.orderID);
      card.appendChild(deleteButton);
    }
  
    container.appendChild(card);
  });
  
  // Dodajemo event listenere nakon što je DOM ažuriran
  document.querySelectorAll('.delete-button').forEach(button => {
    button.addEventListener('click', function() {
      const orderID = parseInt(this.getAttribute('data-order-id'));
      removeOrder(orderID);
    });
  });
}

function startNextOrder() {
  const nextIndex = orders.findIndex(order => order.status === 'pending');

  if (nextIndex === -1) {
    currentPreparingIndex = -1;
    isProcessingOrder = false;
    return;
  }

  isProcessingOrder = true;
  currentPreparingIndex = nextIndex;
  const order = orders[currentPreparingIndex];
  order.status = 'in progress';
  renderOrders();

  const startTime = performance.now();
  const totalDurationMs = order.totalPrepTime * 1000;

  function updateProgress(timestamp) {
    if (!orders.includes(order)) {
      // Narudžba je možda uklonjena
      startNextOrder();
      return;
    }

    const elapsed = timestamp - startTime;
    order.progress = Math.min((elapsed / totalDurationMs) * 100, 100);
    
    // Ažuriramo samo progress bar, ne cijeli prikaz
    const progressBar = document.getElementById(`progress-${order.orderID}`);
    if (progressBar) {
      progressBar.style.width = `${order.progress}%`;
    }

    if (elapsed < totalDurationMs) {
      requestAnimationFrame(updateProgress);
    } else {
      order.status = 'ready';
      renderOrders();
      startNextOrder();
    }
  }

  requestAnimationFrame(updateProgress);
}

function removeOrder(orderID) {
  const card = document.getElementById(`order-${orderID}`);
  if (!card) return;

  // Animacija skupljanja
  card.classList.add('shrink');

  setTimeout(() => {
    // Provjeravamo je li narudžba koja se trenutno uklanja ona koja se priprema
    const orderIndex = orders.findIndex(o => o.orderID === orderID);
    const isCurrentProcessing = orderIndex === currentPreparingIndex;
    
    // Uklanjamo narudžbu iz polja
    orders = orders.filter(o => o.orderID !== orderID);
    
    // Ažuriramo currentPreparingIndex ako je potrebno
    if (isCurrentProcessing) {
      currentPreparingIndex = -1;
      isProcessingOrder = false;
      startNextOrder(); // Započinjemo sljedeću narudžbu ako postoji
    } else if (orderIndex < currentPreparingIndex) {
      // Ako je uklonjena narudžba bila prije trenutne, pomičemo indeks
      currentPreparingIndex--;
    }
    
    renderOrders();
  }, 400);
}