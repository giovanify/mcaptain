const pool = require('./db');
const pgvector = require('pgvector/pg');

async function createTable() {
  const client = await pool.connect();
  try {
    await pgvector.registerTypes(client);

    // Enable pgvector extension (Supabase has it pre-enabled; this is a no-op if so)
    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions');
    } catch {
      try {
        await client.query('CREATE EXTENSION IF NOT EXISTS vector');
      } catch (e) {
        console.warn('Could not create vector extension:', e.message, '- it may already be enabled.');
      }
    }

    // Check if table exists
    const { rows } = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'mcaptain'
      )
    `);

    if (rows[0].exists) {
      console.log('Table "mcaptain" already exists.');
    } else {
      // Create table with vector(1536) for text-embedding-ada-002
      await client.query(`
        CREATE TABLE mcaptain (
          id BIGSERIAL PRIMARY KEY,
          text TEXT NOT NULL,
          embedding vector(1536) NOT NULL,
          source VARCHAR(255),
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      console.log('Table "mcaptain" created successfully.');

      // Optional: HNSW index for faster similarity search (cosine distance)
      await client.query(`
        CREATE INDEX mcaptain_embedding_idx ON mcaptain
        USING hnsw (embedding vector_cosine_ops)
      `);
      console.log('HNSW index on embedding created.');
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

createTable();
