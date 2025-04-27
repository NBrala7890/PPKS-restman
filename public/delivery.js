const socket = io();
let orders = [];

socket.on('connect', () => {
  console.log('Delivery connected to server with socket ID:', socket.id, '\n');
  
  // Zatražimo sve postojeće narudžbe sa statusom "ready"
  socket.emit('getReadyOrders');
});

// Primanje svih narudžbi koje su spremne za dostavu
socket.on('allReadyOrders', (readyOrders) => {
  console.log('Received all ready orders:', readyOrders, '\n');
  orders = readyOrders;
  renderOrders();
});

// Primanje nove narudžbe spremne za dostavu
socket.on('newReadyOrder', (order) => {
  console.log('New ready order received:', order, '\n');
  orders.push(order);
  renderOrders();
});

function renderOrders() {
  const container = document.getElementById('orders');
  container.innerHTML = '';

  if (orders.length === 0) {
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'empty-message';
    emptyMessage.textContent = 'Trenutno nema narudžbi spremnih za dostavu';
    container.appendChild(emptyMessage);
    return;
  }

  orders.forEach((order) => {
    const card = document.createElement('div');
    card.className = 'order-card';
    card.id = `order-${order.orderID}`;
    card.style.backgroundColor = '#8cb369'; // Sve narudžbe su zelene jer su spremne
  
    card.innerHTML = `
      <h3>Narudžba #${order.orderID}</h3>
      <p><strong>Kupac:</strong> ${order.customer}</p>
      <p><strong>Status:</strong> ${order.status}</p>
      <p><strong>Ukupno:</strong> ${order.totalAmount.toFixed(2)} €</p>
      <p><strong>Meals:</strong> ${order.meals.map(m => `${m.name} (${m.quantity})`).join(', ')}</p>
      <p><strong>Drinks:</strong> ${order.drinks.map(d => `${d.name} (${d.quantity})`).join(', ')}</p>
    `;
  
    const deliveryButton = document.createElement('button');
    deliveryButton.textContent = 'Pošalji na dostavu';
    deliveryButton.className = 'delivery-button';
    deliveryButton.setAttribute('data-order-id', order.orderID);
    card.appendChild(deliveryButton);
  
    container.appendChild(card);
  });
  
  // Dodajemo event listenere nakon što je DOM ažuriran
  document.querySelectorAll('.delivery-button').forEach(button => {
    button.addEventListener('click', function() {
      const orderID = parseInt(this.getAttribute('data-order-id'));
      startDelivery(orderID);
    });
  });
}

function startDelivery(orderID) {
  console.log(`Starting delivery for order #${orderID}`);
  
  // Pronađi narudžbu
  const orderIndex = orders.findIndex(o => o.orderID === orderID);
  if (orderIndex === -1) return;
  
  const order = orders[orderIndex];
  
  // Promijeni status i obavijesti server
  order.status = 'delivery in progress';
  socket.emit('orderStatusChanged', {
    orderID: order.orderID,
    status: 'delivery in progress'
  });
  
  // Animacija skupljanja kartice
  const card = document.getElementById(`order-${orderID}`);
  if (card) {
    card.classList.add('shrink');
  }
  
  // Ukloni narudžbu iz lokalnog prikaza
  setTimeout(() => {
    orders = orders.filter(o => o.orderID !== orderID);
    renderOrders();
    
    // Simulacija dostave (30 sekundi)
    console.log(`Delivery in progress for order #${orderID}, will complete in 30 seconds\n`);
    setTimeout(() => {
      // Narudžba je dostavljena - promijeni status u "completed"
      console.log(`Delivery completed for order #${orderID}\n`);
      socket.emit('orderStatusChanged', {
        orderID: orderID,
        status: 'completed'
      });
    }, 30000); // 30 sekundi
  }, 400); // Vrijeme za animaciju
}