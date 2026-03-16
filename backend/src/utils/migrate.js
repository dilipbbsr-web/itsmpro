'use strict';
/**
 * ITSM Pro — Database Migration
 * Usage: node src/utils/migrate.js
 */
require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const { pool, testConnection } = require('../config/db');

async function migrate() {
  console.log('🔄 Running ITSM Pro database migration...\n');

  await testConnection();

  const schema = fs.readFileSync(
    path.join(__dirname, '../config/schema.sql'),
    'utf8'
  );

  const client = await pool.connect();
  try {
    await client.query(schema);
    console.log('✅ Schema created successfully');
  } catch (err) {
    // If tables already exist, that's OK in idempotent mode
    if (err.code === '42P07') {
      console.log('ℹ️  Tables already exist — skipping');
    } else {
      throw err;
    }
  } finally {
    client.release();
  }

  console.log('\n✅ Migration complete!');
  await pool.end();
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
