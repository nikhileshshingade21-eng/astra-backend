require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false }
});

async function resetUser() {
  try {
    const res = await pool.query("DELETE FROM users WHERE roll_number = '25N81A6258' RETURNING *");
    if (res.rows.length > 0) {
      console.log('User deleted completely. They can now re-register.');
    } else {
      console.log('User not found. They are already deleted or do not exist.');
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    pool.end();
  }
}

resetUser();
