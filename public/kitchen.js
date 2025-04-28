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
      <p><strong>Kupac:</strong> ${order.customerName}</p>
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

  // Umjesto korištenja requestAnimationFrame, koristimo setInterval
  // koji će se nastaviti izvršavati čak i kada tab nije aktivan
  const startTime = Date.now();
  const totalDurationMs = order.totalPrepTime * 1000;
  
  // Postavljamo interval koji će redovito ažurirati napredak
  const updateInterval = 100; // 100ms interval za glatku animaciju
  const interval = setInterval(() => {
    if (!orders.includes(order)) {
      // Narudžba je možda uklonjena
      clearInterval(interval);
      startNextOrder();
      return;
    }

    const elapsed = Date.now() - startTime;
    order.progress = Math.min((elapsed / totalDurationMs) * 100, 100);
    
    // Ažuriramo progress bar
    const progressBar = document.getElementById(`progress-${order.orderID}`);
    if (progressBar) {
      progressBar.style.width = `${order.progress}%`;
    }

    // Kad je narudžba dovršena, očistimo interval i nastavimo dalje
    if (elapsed >= totalDurationMs) {
      clearInterval(interval);
      order.status = 'ready';
      
      console.log(`Emitting status change for order #${order.orderID} to 'ready'`);
      // Obavijesti server o promjeni statusa
      socket.emit('orderStatusChanged', {
        orderID: order.orderID,
        status: 'ready'
      });
      console.log('Status change emission completed');
      
      renderOrders();
      startNextOrder();
    }
  }, updateInterval);
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