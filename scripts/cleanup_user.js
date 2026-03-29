require('dotenv').config();
const { Pool } = require('pg');

async function cleanup() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres.puyulkjtrmbkiljlbuqw:AstraProject2026@aws-1-ap-south-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔍 Searching for user: Nikhilesh...');
    const searchRes = await pool.query("SELECT id, roll_number, name, email FROM users WHERE name ILIKE '%Nikhilesh%' OR email ILIKE 'e341%'");
    
    if (searchRes.rows.length > 0) {
      console.log('✅ Found matches:', searchRes.rows);
      for (const user of searchRes.rows) {
        console.log(`🗑️ Deleting user ID: ${user.id} (${user.name})...`);
        await pool.query('DELETE FROM users WHERE id = $1', [user.id]);
      }
      console.log('✨ Cleanup complete.');
    } else {
      console.log('ℹ️ No matching users found.');
    }

  } catch (err) {
    console.error('❌ Error during cleanup:', err.message);
  } finally {
    await pool.end();
  }
}

cleanup();
