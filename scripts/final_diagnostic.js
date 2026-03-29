require('dotenv').config();
const { Pool } = require('pg');

async function diagnostic() {
  console.log('--- ASTRA BACKEND DIAGNOSTIC ---');
  
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres.puyulkjtrmbkiljlbuqw:AstraProject2026@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';
  
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('1. Checking Database Connection...');
    const now = await pool.query('SELECT NOW()');
    console.log('✅ Connected. Server time:', now.rows[0].now);

    console.log('\n2. Checking "users" table columns...');
    const columns = await pool.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'users'");
    console.log('Columns found:', columns.rows.map(c => `${c.column_name} (${c.data_type}, null:${c.is_nullable})`).join('\n'));

    const requiredColumns = ['fcm_token', 'face_embedding', 'device_id', 'is_registered'];
    for (const col of requiredColumns) {
      if (!columns.rows.find(c => c.column_name === col)) {
        console.error(`❌ MISSING COLUMN: ${col}`);
      } else {
        console.log(`✅ Column exists: ${col}`);
      }
    }

    console.log('\n3. Checking Environment Variables...');
    console.log('JWT_SECRET set:', !!process.env.JWT_SECRET);
    console.log('AI_ENGINE_URL set:', process.env.AI_ENGINE_URL || 'Using default http://localhost:8000');
    console.log('GOOGLE_APPLICATION_CREDENTIALS_JSON set:', !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);

    console.log('\n4. Checking Registry for 25N81A6258...');
    const registry = await pool.query("SELECT * FROM verified_students WHERE roll_number = '25N81A6258'");
    if (registry.rows.length === 0) {
      console.error('❌ ROLL NUMBER NOT IN REGISTRY!');
    } else {
      console.log('✅ Registry entry found:', registry.rows[0].name);
    }

    const user = await pool.query("SELECT * FROM users WHERE roll_number = '25N81A6258'");
    console.log('Existing User records:', user.rows.length);

  } catch (err) {
    console.error('❌ DIAGNOSTIC FAILED:', err.message);
  } finally {
    await pool.end();
  }
}

diagnostic();
