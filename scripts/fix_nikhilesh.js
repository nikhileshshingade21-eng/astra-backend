const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
    connectionString: 'postgresql://postgres.puyulkjtrmbkiljlbuqw:AstraProject2026@aws-1-ap-south-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        // Step 1: Check current state
        const before = await pool.query(
            "SELECT id, roll_number, name, is_registered, device_id, password_hash FROM users WHERE roll_number = '25N81A6258'"
        );
        console.log('BEFORE:', JSON.stringify(before.rows[0], null, 2));

        // Step 2: Hash a new known password
        const knownPassword = 'astra2026';
        const hash = await bcrypt.hash(knownPassword, 10);
        
        // Step 3: Reset device_id to NULL so any device can bind,
        //         keep is_registered = TRUE so LOGIN works,
        //         set the known password
        const result = await pool.query(
            "UPDATE users SET device_id = NULL, password_hash = $1 WHERE roll_number = '25N81A6258' RETURNING id, roll_number, name, is_registered, device_id",
            [hash]
        );
        console.log('\nAFTER UPDATE:', JSON.stringify(result.rows[0], null, 2));

        // Step 4: Verify the change stuck
        const verify = await pool.query(
            "SELECT id, roll_number, name, is_registered, device_id FROM users WHERE roll_number = '25N81A6258'"
        );
        console.log('\nVERIFY:', JSON.stringify(verify.rows[0], null, 2));
        
        console.log('\n✅ DONE. Login with:');
        console.log('   Roll Number: 25N81A6258');
        console.log('   Password: astra2026');
        
        await pool.end();
    } catch (e) {
        console.error('ERROR:', e.message);
        await pool.end();
    }
})();
