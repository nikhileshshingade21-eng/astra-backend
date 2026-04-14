const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://postgres.puyulkjtrmbkiljlbuqw:AstraProject2026@aws-1-ap-south-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        // Reset the user so they can register fresh from the app
        const result = await pool.query(
            "UPDATE users SET is_registered = FALSE, device_id = NULL, password_hash = 'RESET' WHERE roll_number = '25N81A6258'"
        );
        console.log('✅ Account reset for 25N81A6258');
        console.log('   Rows updated:', result.rowCount);

        // Verify
        const check = await pool.query(
            "SELECT id, roll_number, name, is_registered, device_id FROM users WHERE roll_number = '25N81A6258'"
        );
        console.log('   Current state:', JSON.stringify(check.rows[0]));
        console.log('\n🎯 You can now REGISTER fresh in the app with roll number 25N81A6258');

        await pool.end();
    } catch (e) {
        console.error('ERROR:', e.message);
        await pool.end();
    }
})();
