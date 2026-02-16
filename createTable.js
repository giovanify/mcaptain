const pool = require('./db');

async function createTable() {
  try {
    const connection = await pool.getConnection();

    try {
      const [rows] = await connection.query(
        `SELECT COUNT(*) AS cnt FROM information_schema.tables
         WHERE table_schema = DATABASE() AND table_name = 'mcaptain'`
      );

      if (rows[0].cnt > 0) {
        console.log('Table "mcaptain" already exists.');
      } else {
        await connection.query(`
          CREATE TABLE mcaptain (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            text TEXT NOT NULL,
            vector BLOB NOT NULL,
            source VARCHAR(255),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        console.log('Table "mcaptain" created successfully.');
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

createTable();
