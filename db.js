require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.SINGLESTORE_HOST,
  port: process.env.SINGLESTORE_PORT,
  user: process.env.SINGLESTORE_USER,
  password: process.env.SINGLESTORE_PASSWORD,
  database: process.env.SINGLESTORE_DATABASE,
  
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

module.exports = pool;