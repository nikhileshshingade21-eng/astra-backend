const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { queryAll, pool } = require('../database_module.js');
const fs = require('fs');

async function applyRLS() {
    try {
        console.log('[SECURITY_AUDIT] Initiating Row-Level Security (RLS) Lockdown...');
        
        // 1. Load the SQL script
        const sqlPath = path.join(__dirname, 'enable_rls.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // 2. Execute the RLS script
        console.log('[SECURITY_LOCKDOWN] Executing ALTER TABLE statements...');
        const results = await queryAll(sql);

        // 3. Output results
        console.log('\n[SECURITY_STATUS] Database RLS Audit:');
        console.table(results);

        const vulnerableCount = results.filter(r => !r.rls_enabled).length;
        if (vulnerableCount === 0) {
            console.log('\n[SUCCESS] All tables are now secured with RLS.');
        } else {
            console.warn(`\n[WARNING] ${vulnerableCount} tables still have RLS disabled!`);
        }

    } catch (err) {
        console.error('[CRITICAL_SECURITY_ERROR] Could not apply RLS lockdown:', err.message);
    } finally {
        if (pool) {
            await pool.end();
            console.log('[DB] Connection pool closed.');
        }
        process.exit(0);
    }
}

applyRLS();
