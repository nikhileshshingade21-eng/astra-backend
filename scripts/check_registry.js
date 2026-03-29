require('dotenv').config();
const { Pool } = require('pg');

async function checkRegistry() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres.puyulkjtrmbkiljlbuqw:AstraProject2026@aws-1-ap-south-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    const roll = '25N81A6258';
    console.log(`🔍 Checking verified_students for ${roll}...`);
    const verified = await pool.query('SELECT * FROM verified_students WHERE roll_number = $1', [roll]);
    
    if (verified.rows.length === 0) {
      console.log('⚠️ Student NOT found in verified_students. Adding them now to allow registration...');
      await pool.query('INSERT INTO verified_students (roll_number, name) VALUES ($1, $2)', [roll, 'Nikhilesh shingade']);
      console.log('✅ Student added to verified_students.');
    } else {
      console.log('✅ Student is already in verified_students:', verified.rows[0]);
    }

    // Check if user table still has any reference
    const users = await pool.query("SELECT id FROM users WHERE roll_number = $1", [roll]);
    console.log(`📊 Current users table count for ${roll}:`, users.rows.length);

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

checkRegistry();
