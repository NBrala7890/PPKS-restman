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

// DB Configuration
const sql = require('mssql');

const dbConfig = {
  user: 'sa',
  password: 'posint',
  server: 'localhost',
  port: 1433,
  database: 'PPKS-restman',
  options: {
    trustServerCertificate: true, // za lokalni rad bez certifikata
    encrypt: false, // za lokalnu konekciju
  },
};

// Cache za lokalno praćenje statusa narudžbi
const orderStatusCache = new Map();
const orderDetailsCache = new Map(); // Za spremanje detalja o narudžbama

// Socket.io event handling
io.on('connection', (socket) => {
  console.log('Client connected\n');

  // Slušamo zahtjev za dohvaćanje svih narudžbi sa statusom "ready"
  socket.on('getReadyOrders', async () => {
    try {
      const pool = await sql.connect(dbConfig);
      const result = await pool.request()
        .query(`
          SELECT co.*, 
                 (SELECT STRING_AGG(CONCAT(m.mealName, ' (', oi.quantity, ')'), ', ') 
                  FROM orderItem oi 
                  JOIN meal m ON oi.itemID = m.mealID 
                  WHERE oi.orderID = co.orderID AND oi.itemType = 'meal') as meals,
                 (SELECT STRING_AGG(CONCAT(d.drinkName, ' (', oi.quantity, ')'), ', ') 
                  FROM orderItem oi 
                  JOIN drink d ON oi.itemID = d.drinkID 
                  WHERE oi.orderID = co.orderID AND oi.itemType = 'drink') as drinks
          FROM customerOrder co
          WHERE co.status = 'ready'
        `);

      const readyOrders = result.recordset.map(order => {
        // Pripremamo podatke u formatu koji očekuje front-end
        const formattedOrder = {
          orderID: order.orderID,
          customerName: order.customerName,
          status: order.status,
          totalAmount: order.totalAmount,
          meals: [],
          drinks: []
        };

        // Pretvaramo string meals i drinks u polje objekata
        if (order.meals) {
          const mealItems = order.meals.split(', ');
          mealItems.forEach(item => {
            const match = item.match(/(.*) \((\d+)\)$/);
            if (match) {
              formattedOrder.meals.push({
                name: match[1],
                quantity: parseInt(match[2])
              });
            }
          });
        }

        if (order.drinks) {
          const drinkItems = order.drinks.split(', ');
          drinkItems.forEach(item => {
            const match = item.match(/(.*) \((\d+)\)$/);
            if (match) {
              formattedOrder.drinks.push({
                name: match[1],
                quantity: parseInt(match[2])
              });
            }
          });
        }

        // Spremamo u cache za buduće upite
        orderDetailsCache.set(order.orderID, formattedOrder);

        return formattedOrder;
      });

      socket.emit('allReadyOrders', readyOrders);
    } catch (err) {
      console.error('Error fetching ready orders:', err);
    }
  });

  // Slušamo promjene statusa narudžbi
  socket.on('orderStatusChanged', async (data) => {
    console.log(`Received status update for order #${data.orderID}: ${data.status}`);
    
    try {
      // Ažuriraj status u bazi podataka
      const pool = await sql.connect(dbConfig);
      await pool.request()
        .input('orderID', sql.Int, data.orderID)
        .input('status', sql.VarChar(20), data.status)
        .query('UPDATE customerOrder SET status = @status WHERE orderID = @orderID');
      
      // Ažuriraj lokalni cache
      orderStatusCache.set(data.orderID, data.status);
      
      console.log(`Updated order #${data.orderID} status to ${data.status}\n`);

      // Ako je status postao "ready", pošalji obavijest delivery.js
      if (data.status === 'ready') {
        // Dohvati detalje narudžbe ako nisu u cacheu
        let orderDetails = orderDetailsCache.get(data.orderID);
        
        if (!orderDetails) {
          // Dohvati detalje narudžbe iz baze
          const orderResult = await pool.request()
            .input('orderID', sql.Int, data.orderID)
            .query(`
              SELECT co.*, 
                     (SELECT STRING_AGG(CONCAT(m.mealName, ' (', oi.quantity, ')'), ', ') 
                      FROM orderItem oi 
                      JOIN meal m ON oi.itemID = m.mealID 
                      WHERE oi.orderID = co.orderID AND oi.itemType = 'meal') as meals,
                     (SELECT STRING_AGG(CONCAT(d.drinkName, ' (', oi.quantity, ')'), ', ') 
                      FROM orderItem oi 
                      JOIN drink d ON oi.itemID = d.drinkID 
                      WHERE oi.orderID = co.orderID AND oi.itemType = 'drink') as drinks
              FROM customerOrder co
              WHERE co.orderID = @orderID
            `);

          if (orderResult.recordset.length > 0) {
            const order = orderResult.recordset[0];
            orderDetails = {
              orderID: order.orderID,
              customerName: order.customerName,
              status: order.status,
              totalAmount: order.totalAmount,
              meals: [],
              drinks: []
            };

            // Pretvaramo string meals i drinks u polje objekata
            if (order.meals) {
              const mealItems = order.meals.split(', ');
              mealItems.forEach(item => {
                const match = item.match(/(.*) \((\d+)\)$/);
                if (match) {
                  orderDetails.meals.push({
                    name: match[1],
                    quantity: parseInt(match[2])
                  });
                }
              });
            }

            if (order.drinks) {
              const drinkItems = order.drinks.split(', ');
              drinkItems.forEach(item => {
                const match = item.match(/(.*) \((\d+)\)$/);
                if (match) {
                  orderDetails.drinks.push({
                    name: match[1],
                    quantity: parseInt(match[2])
                  });
                }
              });
            }

            // Spremamo u cache
            orderDetailsCache.set(data.orderID, orderDetails);
          }
        }

        if (orderDetails) {
          // Pošalji narudžbu delivery.js
          io.emit('newReadyOrder', orderDetails);
        }
      }
    } catch (err) {
      console.error('Error updating order status:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected\n');
  });
});

// GET endpoint za dohvat hrane
app.get('/api/meals', async (req, res) => {

  console.log("Retreiving all the meals from the database...");

  try {

    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .query('SELECT * FROM meal');

    return res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching meals:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }

  

});

// GET endpoint za dohvat pića
app.get('/api/drinks', async (req, res) => {

  console.log("Retreiving all the drinks from the database...");

  try {

    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .query('SELECT * FROM drink');

    return res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching drinks:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }

});

// GET endpoint za provjeru statusa narudžbe
app.get('/api/orderStatus/:id', async (req, res) => {
  const orderID = parseInt(req.params.id);
  
  if (isNaN(orderID)) {
    return res.status(400).json({ error: 'Invalid order ID' });
  }
  
  console.log(`GET request for order status #${orderID}`);
  
  try {
    // Prvo provjerimo cache
    if (orderStatusCache.has(orderID)) {
      console.log(`Found in cache: Order #${orderID} status: ${orderStatusCache.get(orderID)}\n`);
      let orderDetails = orderDetailsCache.get(orderID);
      orderDetails.status = orderStatusCache.get(orderID);
      orderDetailsCache.set(orderID, orderDetails);
      return res.json(orderDetails);
    }
    
    // Ako nije u cacheu, dohvati iz baze
    console.log(`Not in cache, querying database for order #${orderID}`);
    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .input('orderID', sql.Int, orderID)
      .query('SELECT * FROM customerOrder WHERE orderID = @orderID');
    
    if (result.recordset.length === 0) {
      console.log(`Order #${orderID} not found in database\n`);
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const status = result.recordset[0].status;
    console.log(`Database status for order #${orderID}: ${status}\n`);
    
    // Spremi u cache za buduće upite
    orderDetailsCache.set(orderID, result.recordset[0])
    orderStatusCache.set(orderID, status);
    
    // return res.json({ orderID, status });
    return res.json(result.recordset[0]);
  } catch (err) {
    console.error('Error fetching order status:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// REST API ruta za kreiranje nove narudžbe
app.post('/api/newOrder', async (req, res) => {
  const order = req.body;
  const { customerName, meals = [], drinks = [], notes = '' } = order;

  // Turning given meal/drink names to lowercase
  for (const meal of meals) {
    meal.name = meal.name.toLowerCase();
  }

  for (const drink of drinks) {
    drink.name = drink.name.toLowerCase();
  }

  if (!customerName || (meals.length === 0 && drinks.length === 0)) {
    return res.status(400).json({ status: 'DENIED', reason: 'Missing customerName or items.' });
  }

  try {
    const pool = await sql.connect(dbConfig);

    // Dohvati sve narucene obroke
    const mealNames = meals.map(m => `'${m.name}'`).join(',');
    const drinkNames = drinks.map(d => `'${d.name}'`).join(',');

    console.log("Ordered meals: ", mealNames);
    console.log("Ordered drinks: ", drinkNames, "\n");

    const mealQuery = meals.length > 0
      ? await pool.request().query(`SELECT * FROM meal WHERE LOWER(mealName) IN (${mealNames})`)
      : { recordset: [] };

    const drinkQuery = drinks.length > 0
      ? await pool.request().query(`SELECT * FROM drink WHERE LOWER(drinkName) IN (${drinkNames})`)
      : { recordset: [] };

    // Provjeri postoje li svi traženi proizvodi
    if (mealQuery.recordset.length !== meals.length || drinkQuery.recordset.length !== drinks.length) {
      return res.status(400).json({ status: 'DENIED', reason: 'One or more products do not exist.' });
    }

    // Izračunaj totalAmount, totalItems itd.
    let totalAmount = 0;
    let totalItems = 0;
    const orderItems = [];

    for (const meal of meals) {
      const dbMeal = mealQuery.recordset.find(m => m.mealName.toLowerCase() === meal.name.toLowerCase());
      const quantity = meal.quantity;
      const subtotal = quantity * parseFloat(dbMeal.price);
      totalAmount += subtotal;
      totalItems += quantity;

      orderItems.push({
        itemType: 'meal',
        itemID: dbMeal.mealID,
        quantity,
        unitPrice: dbMeal.price,
        subtotal,
      });
    }

    for (const drink of drinks) {
      const dbDrink = drinkQuery.recordset.find(d => d.drinkName.toLowerCase() === drink.name.toLowerCase());
      const quantity = drink.quantity;
      const subtotal = quantity * parseFloat(dbDrink.price);
      totalAmount += subtotal;
      totalItems += quantity;

      orderItems.push({
        itemType: 'drink',
        itemID: dbDrink.drinkID,
        quantity,
        unitPrice: dbDrink.price,
        subtotal,
      });
    }

    const totalDistinctItems = orderItems.length;
    const prepTime = mealQuery.recordset.reduce((acc, m) => acc + m.mealPreparationTimeMinutes, 0);

    // Kreiraj novu narudžbu
    const insertOrderResult = await pool.request()
      .input('customerName', sql.VarChar(100), customerName)
      .input('status', sql.VarChar(20), 'pending')
      .input('orderPreparationTimeMinutes', sql.Int, prepTime)
      .input('totalItems', sql.Int, totalItems)
      .input('totalDistinctItems', sql.Int, totalDistinctItems)
      .input('totalAmount', sql.Decimal(10, 2), totalAmount)
      .input('notes', sql.VarChar(255), notes)
      .query(`
        INSERT INTO customerOrder (
          customerName, status, orderPreparationTimeMinutes,
          totalItems, totalDistinctItems, totalAmount, notes
        )
        OUTPUT INSERTED.orderID
        VALUES (@customerName, @status, @orderPreparationTimeMinutes, @totalItems, @totalDistinctItems, @totalAmount, @notes)
      `);

    const orderID = insertOrderResult.recordset[0].orderID;

    // Unesi orderItems
    for (const item of orderItems) {
      await pool.request()
        .input('orderID', sql.Int, orderID)
        .input('itemType', sql.VarChar(10), item.itemType)
        .input('itemID', sql.Int, item.itemID)
        .input('quantity', sql.Int, item.quantity)
        .input('unitPrice', sql.Decimal(10, 2), item.unitPrice)
        .input('subtotal', sql.Decimal(10, 2), item.subtotal)
        .input('notes', sql.VarChar(255), '')
        .query(`
          INSERT INTO orderItem (orderID, itemType, itemID, quantity, unitPrice, subtotal, notes)
          VALUES (@orderID, @itemType, @itemID, @quantity, @unitPrice, @subtotal, @notes)
        `);
    }

    // Izračunaj totalPrepTime
    let maxPrepTime = 0;
    for (const meal of meals) {
      const dbMeal = mealQuery.recordset.find(m => m.mealName.toLowerCase() === meal.name.toLowerCase());
      if (dbMeal) {
        const quantity = meal.quantity;
        const prepTime = quantity * dbMeal.mealPreparationTimeMinutes;
        if (prepTime > maxPrepTime)
          maxPrepTime = prepTime;
      }
    }

    // Dodaj status u cache
    orderStatusCache.set(orderID, 'pending');

    // Spremi detalje narudžbe u cache
    const orderDetails = {
      orderID,
      customerName,
      meals,
      drinks,
      totalAmount,
      status: 'pending',
      totalPrepTime: maxPrepTime
    };
    orderDetailsCache.set(orderID, orderDetails);

    // Pošalji kuhinji novu narudžbu
    io.emit('newOrder', orderDetails);

    return res.status(200).json({ status: 'OK', orderID });

  } catch (err) {
    console.error('Greška prilikom obrade narudžbe:', err);
    return res.status(500).json({ status: 'DENIED', reason: 'Internal server error' });
  }
});

server.listen(PORT, async () => {
  try {
    await sql.connect(dbConfig);
    console.log('Povezano na SQL Server bazu.');
    console.log(`Server pokrenut na http://localhost:${PORT}\n`);
  } catch (err) {
    console.error('Greška prilikom spajanja na bazu:', err);
  }
});