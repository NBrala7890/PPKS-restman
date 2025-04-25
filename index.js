const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;

app.use(cors());
app.use(express.json());

// Posluži statičke datoteke iz 'public' mape
app.use(express.static(path.join(__dirname, 'public')));

// REST API ruta
app.post('/order', (req, res) => {
  const order = req.body;

  console.log('Primljena narudžba:', order);

  const isOrderValid = order && order.customer && order.items?.length > 0;

  if (isOrderValid) {
    // Emit narudžbe preko WebSocketa
    io.emit('newOrder', order);
    return res.status(200).json({ status: 'OK' });
  } else {
    return res.status(400).json({ status: 'DENIED', reason: 'Invalid order format' });
  }
});

server.listen(PORT, () => {
  console.log(`Server pokrenut na http://localhost:${PORT}`);
});