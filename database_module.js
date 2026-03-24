const { Pool } = require('pg');

// Initialize PostgreSQL Pool
// This will normally pick up DATABASE_URL or component env vars
let connectionStr = process.env.DATABASE_URL;

if (!connectionStr && process.env.DB_HOST && process.env.DB_USER) {
    // Construct connection string from parts
    connectionStr = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME}`;
}

const pool = new Pool({
    connectionString: connectionStr,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test connection on boot
pool.on('connect', () => {
    // Connection established
});

pool.on('error', (err) => {
    console.error('[DB] Unexpected error on idle client', err);
    // VULN-015 FIX: Don't exit process on idle errors in production
    // process.exit(-1);
});

async function getDb() {
    return pool;
}

// Wrapper to mimic the old SQLite API structure so we don't have to rewrite 100% of queries immediately
// Note: SQL syntax itself (like ? vs $1) will need updating in the models/controllers
async function queryAll(sql, params = []) {
    try {
        const client = await pool.connect();
        try {
            const res = await client.query(sql, params);
            return res.rows || [];
        } finally {
            client.release();
        }
    } catch (err) {
        // HIGH-05 FIX: Never log params (may contain passwords, biometric data)
        console.error('[DB] Query Error:', err.message, '\nSQL:', sql);
        throw err;
    }
}

function saveDb() {
    // No-op for Postgres. Data is immediately persisted.
}

// Ensure clean shutdown
process.on('SIGINT', async () => {
    console.log('[DB] Closing DB pool...');
    await pool.end();
    process.exit();
});

module.exports = { getDb, saveDb, queryAll, pool };
