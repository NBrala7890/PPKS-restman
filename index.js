const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Posluži statičke datoteke iz 'public' mape
app.use(express.static(path.join(__dirname, 'public')));

// DB Configuration - PostgreSQL
const pool = require('./db');

// Cache za lokalno praćenje statusa narudžbi
const orderStatusCache = new Map();
const orderDetailsCache = new Map(); // Za spremanje detalja o narudžbama

// Socket.io event handling
io.on('connection', (socket) => {
  console.log('Client connected\n');

  // Slušamo zahtjev za dohvaćanje svih narudžbi sa statusom "ready"
  socket.on('getReadyOrders', async () => {
    try {
      const result = await pool.query(`
        SELECT co.*, 
               (SELECT STRING_AGG(CONCAT(m.mealname, ' (', oi.quantity, ')'), ', ') 
                FROM orderitem oi 
                JOIN meal m ON oi.itemid = m.mealid 
                WHERE oi.customerorderid = co.customerorderid AND oi.itemtype = 'meal') as meals,
               (SELECT STRING_AGG(CONCAT(d.drinkname, ' (', oi.quantity, ')'), ', ') 
                FROM orderitem oi 
                JOIN drink d ON oi.itemid = d.drinkid 
                WHERE oi.customerorderid = co.customerorderid AND oi.itemtype = 'drink') as drinks
        FROM customerorder co
        WHERE co.status = 'ready'
      `);

      const readyOrders = result.rows.map(order => {
        // Pripremamo podatke u formatu koji očekuje front-end
        const formattedOrder = {
          orderID: order.customerorderid,
          customerName: order.customername,
          status: order.status,
          totalAmount: order.totalamount,
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
        orderDetailsCache.set(order.customerorderid, formattedOrder);

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
      await pool.query('UPDATE customerorder SET status = $1 WHERE customerorderid = $2', [data.status, data.orderID]);
      
      // Ažuriraj lokalni cache
      orderStatusCache.set(data.orderID, data.status);
      
      console.log(`Updated order #${data.orderID} status to ${data.status}\n`);

      // Ako je status postao "ready", pošalji obavijest delivery.js
      if (data.status === 'ready') {
        // Dohvati detalje narudžbe ako nisu u cacheu
        let orderDetails = orderDetailsCache.get(data.orderID);
        
        if (!orderDetails) {
          // Dohvati detalje narudžbe iz baze
          const orderResult = await pool.query(`
            SELECT co.*, 
                   (SELECT STRING_AGG(CONCAT(m.mealname, ' (', oi.quantity, ')'), ', ') 
                    FROM orderitem oi 
                    JOIN meal m ON oi.itemid = m.mealid 
                    WHERE oi.customerorderid = co.customerorderid AND oi.itemtype = 'meal') as meals,
                   (SELECT STRING_AGG(CONCAT(d.drinkname, ' (', oi.quantity, ')'), ', ') 
                    FROM orderitem oi 
                    JOIN drink d ON oi.itemid = d.drinkid 
                    WHERE oi.customerorderid = co.customerorderid AND oi.itemtype = 'drink') as drinks
            FROM customerorder co
            WHERE co.customerorderid = $1
          `, [data.orderID]);

          if (orderResult.rows.length > 0) {
            const order = orderResult.rows[0];
            orderDetails = {
              orderID: order.customerorderid,
              customerName: order.customername,
              status: order.status,
              totalAmount: order.totalamount,
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
    const result = await pool.query('SELECT * FROM meal');
    return res.json(result.rows);
  } catch (err) {
    console.error('Error fetching meals:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET endpoint za dohvat pića
app.get('/api/drinks', async (req, res) => {
  console.log("Retreiving all the drinks from the database...");

  try {
    const result = await pool.query('SELECT * FROM drink');
    return res.json(result.rows);
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
    const result = await pool.query('SELECT * FROM customerorder WHERE customerorderid = $1', [orderID]);
    
    if (result.rows.length === 0) {
      console.log(`Order #${orderID} not found in database\n`);
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const order = result.rows[0];
    const status = order.status;
    console.log(`Database status for order #${orderID}: ${status}\n`);
    
    // Spremi u cache za buduće upite
    const orderDetails = {
      orderID: order.customerorderid,
      customerName: order.customername,
      status: order.status,
      totalAmount: order.totalamount
    };
    orderDetailsCache.set(orderID, orderDetails);
    orderStatusCache.set(orderID, status);
    
    return res.json(orderDetails);
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
    // Dohvati sve narucene obroke
    let mealQuery = { rows: [] };
    let drinkQuery = { rows: [] };

    if (meals.length > 0) {
      const mealNames = meals.map(m => m.name);
      console.log("Ordered meals: ", mealNames);
      
      const placeholders = mealNames.map((_, index) => `$${index + 1}`).join(',');
      mealQuery = await pool.query(
        `SELECT * FROM meal WHERE LOWER(mealname) IN (${placeholders})`,
        mealNames
      );
    }

    if (drinks.length > 0) {
      const drinkNames = drinks.map(d => d.name);
      console.log("Ordered drinks: ", drinkNames, "\n");
      
      const placeholders = drinkNames.map((_, index) => `$${index + 1}`).join(',');
      drinkQuery = await pool.query(
        `SELECT * FROM drink WHERE LOWER(drinkname) IN (${placeholders})`,
        drinkNames
      );
    }

    // Provjeri postoje li svi traženi proizvodi
    if (mealQuery.rows.length !== meals.length || drinkQuery.rows.length !== drinks.length) {
      return res.status(400).json({ status: 'DENIED', reason: 'One or more products do not exist.' });
    }

    // Izračunaj totalAmount, totalItems itd.
    let totalAmount = 0;
    let totalItems = 0;
    const orderItems = [];

    for (const meal of meals) {
      const dbMeal = mealQuery.rows.find(m => m.mealname.toLowerCase() === meal.name.toLowerCase());
      const quantity = meal.quantity;
      const subtotal = quantity * parseFloat(dbMeal.price);
      totalAmount += subtotal;
      totalItems += quantity;

      orderItems.push({
        itemType: 'meal',
        itemID: dbMeal.mealid,
        quantity,
        unitPrice: dbMeal.price,
        subtotal,
      });
    }

    for (const drink of drinks) {
      const dbDrink = drinkQuery.rows.find(d => d.drinkname.toLowerCase() === drink.name.toLowerCase());
      const quantity = drink.quantity;
      const subtotal = quantity * parseFloat(dbDrink.price);
      totalAmount += subtotal;
      totalItems += quantity;

      orderItems.push({
        itemType: 'drink',
        itemID: dbDrink.drinkid,
        quantity,
        unitPrice: dbDrink.price,
        subtotal,
      });
    }

    const totalDistinctItems = orderItems.length;
    const prepTime = mealQuery.rows.reduce((acc, m) => acc + m.mealpreparationtimeminutes, 0);

    // Kreiraj novu narudžbu
    const insertOrderResult = await pool.query(`
      INSERT INTO customerorder (
        customername, status, orderpreparationtimeminutes,
        totalitems, totaldistinctitems, totalamount, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING customerorderid
    `, [customerName, 'pending', prepTime, totalItems, totalDistinctItems, totalAmount, notes]);

    const orderID = insertOrderResult.rows[0].customerorderid;

    // Unesi orderItems
    for (const item of orderItems) {
      await pool.query(`
        INSERT INTO orderitem (customerorderid, itemtype, itemid, quantity, unitprice, subtotal, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [orderID, item.itemType, item.itemID, item.quantity, item.unitPrice, item.subtotal, '']);
    }

    // Izračunaj totalPrepTime
    let maxPrepTime = 0;
    for (const meal of meals) {
      const dbMeal = mealQuery.rows.find(m => m.mealname.toLowerCase() === meal.name.toLowerCase());
      if (dbMeal) {
        const quantity = meal.quantity;
        const prepTime = quantity * dbMeal.mealpreparationtimeminutes;
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
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('Povezano na PostgreSQL bazu.');
    console.log(`Server pokrenut na portu ${PORT}\n`);
  } catch (err) {
    console.error('Greška prilikom spajanja na bazu:', err);
  }
});