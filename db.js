require('dotenv').config();
const { Pool } = require('pg');
const pgvector = require('pgvector/pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

// Register pgvector types on new connections (needed for vector columns)
pool.on('connect', async (client) => {
  await pgvector.registerTypes(client);
});

module.exports = pool;
