const { Pool } = require('pg');

// Initialize PostgreSQL Pool
// This will normally pick up DATABASE_URL or component env vars
let connectionStr = process.env.DATABASE_URL?.replace(/\n|\r/g, '').trim();

// Robust Validation: If DATABASE_URL is mangled (e.g. truncated by a copy-paste error or contains carriage returns), fix it
if (connectionStr) {
    connectionStr = connectionStr.replace(/\s/g, '').trim(); // Remove all mid-string spaces/newlines
}

if (connectionStr && (connectionStr.length < 30 || !connectionStr.includes('@'))) {
    console.warn('[DB] DATABASE_URL looks mangled, falling back to component variables.');
    connectionStr = null;
}

if (!connectionStr && process.env.DB_HOST) {
    // Construct connection string from stable parts (cleaned up)
    const host = process.env.DB_HOST?.trim();
    const user = process.env.DB_USER?.trim();
    const pass = process.env.DB_PASSWORD?.trim();
    const port = process.env.DB_PORT?.trim() || 5432;
    const name = process.env.DB_NAME?.trim();
    connectionStr = `postgresql://${user}:${pass}@${host}:${port}/${name}`;
}

const pool = new Pool({
    connectionString: connectionStr,
    // Always use SSL for Supabase/External DBs if host matches
    ssl: (connectionStr?.includes('supabase.com') || process.env.NODE_ENV === 'production') 
        ? { rejectUnauthorized: false } 
        : false,
    connectionTimeoutMillis: 10000, 
    query_timeout: 10000,           
    idleTimeoutMillis: 30000,       
    max: 20                         
});

// STARTUP LOGS: Verify state on Railway
if (connectionStr) {
    const host = connectionStr.split('@')[1]?.split(':')[0] || 'Unknown';
    const hasSSL = !!pool.options.ssl;
    console.log(`[DB] Connected to: ${host} | SSL: ${hasSSL} | NODE_ENV: ${process.env.NODE_ENV}`);
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
        // ENOTFOUND FIX: Log specifically if host is unreachable
        if (err.code === 'ENOTFOUND') {
            console.error(`[CRITICAL] DB_HOST Unreachable: ${pool.options.connectionString?.split('@')[1]?.split(':')[0] || 'Unknown'}. Check your Railway Variables!`);
        }
        console.error('[DB] Query Error:', err.message);
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
