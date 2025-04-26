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

// REST API ruta
app.post('/order', async (req, res) => {
  const order = req.body;
  const { customer, meals = [], drinks = [], notes = '' } = order;

  // Turning given meal/drink names to lowercase
  for (meal of meals)
    meal.name = meal.name.toLowerCase();

  for (drink of meals)
    drink.name = drink.name.toLowerCase();

  if (!customer || (meals.length === 0 && drinks.length === 0)) {
    return res.status(400).json({ status: 'DENIED', reason: 'Missing customer or items.' });
  }

  try {
    const pool = await sql.connect(dbConfig);

    // Dohvati sve narucene obroke
    const mealNames = meals.map(m => `'${m.name}'`).join(',');
    const drinkNames = drinks.map(d => `'${d.name}'`).join(',');

    console.log("Ordered meals: ", mealNames);
    console.log("Ordered drinks: ", drinkNames);

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
      const dbMeal = mealQuery.recordset.find(m => m.mealName === meal.name);
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
      const dbDrink = drinkQuery.recordset.find(d => d.drinkName === drink.name);
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
      .input('customerName', sql.VarChar(100), customer)
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
      const dbMeal = mealQuery.recordset.find(m => m.mealName === meal.name);
      const quantity = meal.quantity;
      const prepTime = quantity * dbMeal.mealPreparationTimeMinutes;
      if (prepTime > maxPrepTime)
        maxPrepTime = prepTime;
    }

    // Pošalji kuhinji novu narudžbu
    io.emit('newOrder', {
      orderID,
      customer,
      meals,
      drinks,
      totalAmount,
      status: 'pending',
      totalPrepTime: maxPrepTime
    });

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
    console.log(`Server pokrenut na http://localhost:${PORT}`);
  } catch (err) {
    console.error('Greška prilikom spajanja na bazu:', err);
  }
});