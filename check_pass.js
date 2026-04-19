require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false }
});

async function checkUser() {
  const res = await pool.query("SELECT roll_number, password_hash, is_registered FROM users WHERE roll_number = '25N81A6258'");
  if (res.rows.length === 0) {
    console.log("User 25N81A6258 not found in database.");
  } else {
    console.log("User found:", res.rows[0]);
    // Let's reset the password to 'password123' so the user can test
    const newHash = await bcrypt.hash('password123', 10);
    await pool.query("UPDATE users SET password_hash = $1 WHERE roll_number = '25N81A6258'", [newHash]);
    console.log("Password reset successfully. You can now log in with the password 'password123'.");
  }
  pool.end();
}

checkUser();
