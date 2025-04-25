const socket = io();

const ordersDiv = document.getElementById('orders');

socket.on('newOrder', order => {
  const orderElement = document.createElement('div');
  orderElement.classList.add('order');

  orderElement.innerHTML = `
    <strong>Kupac:</strong> ${order.customer}<br>
    <strong>Stavke:</strong> ${order.items.join(', ')}
  `;

  ordersDiv.prepend(orderElement); // najnovija narudžba ide na vrh
});