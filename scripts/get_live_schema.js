require('dotenv').config();
const { Pool } = require('pg');

async function get_schema() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres.puyulkjtrmbkiljlbuqw:AstraProject2026@aws-1-ap-south-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('📊 Fetching users table schema...');
    const schema = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users'");
    console.log('✅ Columns:', schema.rows);

    const constraints = await pool.query("SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'users'::regclass");
    console.log('✅ Constraints:', constraints.rows);

  } catch (err) {
    console.error('❌ Error fetching schema:', err.message);
  } finally {
    await pool.end();
  }
}

get_schema();
