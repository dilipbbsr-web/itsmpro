'use strict';
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'itsmpro',
  user:     process.env.DB_USER     || 'itsmpro_user',
  password: process.env.DB_PASSWORD,
  min:      parseInt(process.env.DB_POOL_MIN) || 2,
  max:      parseInt(process.env.DB_POOL_MAX) || 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err.message);
});

// Test connection
async function testConnection() {
  let client;
  try {
    client = await pool.connect();
    const res = await client.query('SELECT version()');
    console.log('✅ PostgreSQL connected:', res.rows[0].version.split(' ').slice(0,2).join(' '));
  } catch (err) {
    console.error('❌ PostgreSQL connection failed:', err.message);
    throw err;
  } finally {
    if (client) client.release();
  }
}

// Generic query helper
async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log('Query:', { text: text.substring(0,60), duration, rows: result.rowCount });
    }
    return result;
  } catch (err) {
    console.error('Query error:', { text: text.substring(0,80), error: err.message });
    throw err;
  }
}

// Transaction helper
async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, withTransaction, testConnection };
