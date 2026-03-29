/**
 * Migration Script: Add fcm_token column to users table
 * Run this to ensure the database schema is ready for push notifications.
 */
require('dotenv').config();
const { Pool } = require('pg');

async function migrate() {
  let pool;
  const connectionString = process.env.DATABASE_URL || 
    `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

  try {
    console.log('🚀 Starting migration: Adding fcm_token to users table...');
    
    // Attempt 1: With SSL
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false }
    });
    
    // Simple query to test connection
    await pool.query('SELECT 1');
    console.log('✅ Connected with SSL.');
  } catch (err) {
    if (err.message.includes('SSL') || err.message.includes('not support SSL')) {
      console.warn('⚠️ SSL connection failed, trying without SSL...');
      if (pool) await pool.end();
      pool = new Pool({
        connectionString,
        ssl: false
      });
    } else {
      throw err;
    }
  }

  try {
    const checkRes = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'fcm_token'
    `);

    if (checkRes.rows.length === 0) {
      console.log('📝 Column fcm_token missing. Adding it now...');
      await pool.query('ALTER TABLE users ADD COLUMN fcm_token TEXT');
      console.log('✅ Column fcm_token added successfully.');
    } else {
      console.log('ℹ️ Column fcm_token already exists. Skipping.');
    }

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();
