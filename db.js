require('dotenv').config();
const { Pool } = require('pg');
const pgvector = require('pgvector/pg');

// Support both DATABASE_URL and POSTGRES_URL (Vercel uses POSTGRES_URL for some integrations)
const rawUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!rawUrl) {
  throw new Error('DATABASE_URL or POSTGRES_URL is required. Set it in Vercel Project Settings → Environment Variables → Production.');
}

// For Supabase transaction pooler (port 6543): append params if missing (required for serverless)
let connectionString = rawUrl.trim();
if (connectionString.includes('pooler.supabase.com') && !connectionString.includes('pgbouncer')) {
  connectionString += connectionString.includes('?') ? '&pgbouncer=true' : '?pgbouncer=true';
}

// Safety: never connect to localhost in production (Vercel has no local DB)
if (process.env.VERCEL && (connectionString.includes('localhost') || connectionString.includes('127.0.0.1'))) {
  throw new Error('DATABASE_URL must point to Supabase, not localhost. Check Vercel env vars.');
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
  max: 3,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000
});

// Register pgvector types on new connections (needed for vector columns)
pool.on('connect', async (client) => {
  await pgvector.registerTypes(client);
});

module.exports = pool;
