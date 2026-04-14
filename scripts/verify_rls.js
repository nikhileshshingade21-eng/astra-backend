const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { queryAll, pool } = require('../database_module.js');

async function verifyRLS() {
    try {
        const sql = `
            SELECT 
                relname AS table_name, 
                relrowsecurity AS rls_enabled 
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public' 
            AND c.relkind = 'r' 
            ORDER BY relname;
        `;
        const results = await queryAll(sql);
        console.log('\n[SECURITY_AUDIT] RLS Status Report:');
        console.table(results);

        const unprotected = results.filter(r => !r.rls_enabled);
        if (unprotected.length === 0) {
            console.log('✅ ALL TABLES SECURED');
        } else {
            console.warn('❌ UNPROTECTED TABLES DETECTED:', unprotected.map(u => u.table_name).join(', '));
        }
    } catch (err) {
        console.error('[ERROR] Verification failed:', err.message);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

verifyRLS();
