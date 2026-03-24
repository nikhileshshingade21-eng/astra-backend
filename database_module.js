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
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 10000, // 10s timeout to establish connection
    query_timeout: 10000,           // 10s timeout for individual queries
    idleTimeoutMillis: 30000,       // 30s before closing idle clients
    max: 20                         // Max 20 concurrent connections
});

// DIAGNOSTIC LOG (SAFE): Log the host name to verify if we are on Railway or Supabase
if (connectionStr) {
    const host = connectionStr.split('@')[1]?.split(':')[0] || 'Unknown';
    console.log(`[DB] Production Pool initialized for: ${host}`);
}

pool.on('error', (err) => {
    console.error('[DB] Unexpected error on idle client:', err.message);
});

async function getDb() {
    return pool;
}

// Wrapper to mimic the old SQLite API structure
async function queryAll(sql, params = []) {
    let client;
    try {
        client = await pool.connect();
        const res = await client.query({
            text: sql,
            values: params,
            timeout: 10000 // 10s per-query timeout
        });
        return res.rows || [];
    } catch (err) {
        // HIGH-05 FIX: Never log params (may contain passwords, biometric data)
        console.error('[DB] Query Error:', err.message, '\nSQL:', sql);
        throw err;
    } finally {
        if (client) client.release();
    }
}

function saveDb() {
    // No-op for Postgres.
}

// Ensure clean shutdown
process.on('SIGINT', async () => {
    console.log('[DB] Closing DB pool...');
    await pool.end();
    process.exit();
});

module.exports = { getDb, saveDb, queryAll, pool };
