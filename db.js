const { Pool } = require('pg');

// Konfiguracija za PostgreSQL connection
const config = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  database: process.env.DB_NAME,  
  password: process.env.DB_PASSWORD,
  // SSL je obavezan za vanjske konekcije na Render
  ssl: {
    rejectUnauthorized: false
  },
  // Connection pool postavke
  max: 20, // maksimalno 20 konekcija u poolu
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Alternativno: ako koristite DATABASE_URL
// const config = {
//   connectionString: process.env.DATABASE_URL,
//   ssl: {
//     rejectUnauthorized: false
//   }
// };

const pool = new Pool(config);

// Test konekcije prilikom inicijalizacije
pool.on('connect', () => {
  console.log('Uspješno povezano na PostgreSQL bazu');
});

pool.on('error', (err) => {
  console.error('Neočekivana greška s bazom podataka', err);
  process.exit(-1);
});

module.exports = pool;