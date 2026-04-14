const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://postgres.puyulkjtrmbkiljlbuqw:AstraProject2026@aws-1-ap-south-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        // Step 1: Check verified_students registry
        const check = await pool.query(
            "SELECT * FROM verified_students WHERE roll_number = '25N81A6258'"
        );
        console.log('Registry check:', check.rows.length, 'found');

        if (check.rows.length === 0) {
            await pool.query(
                "INSERT INTO verified_students (roll_number, full_name, gender, branch, section) VALUES ('25N81A6258', 'Nikhilesh Shingade', 'M', 'CSC', 'CS') ON CONFLICT (roll_number) DO NOTHING"
            );
            console.log('✅ INSERTED into verified_students');
        } else {
            console.log('✅ Already in registry:', JSON.stringify(check.rows[0]));
        }

        // Step 2: Check users table
        const userCheck = await pool.query(
            "SELECT id, roll_number, name, is_registered, device_id FROM users WHERE roll_number = '25N81A6258'"
        );
        console.log('Users table:', userCheck.rows.length, 'found');
        if (userCheck.rows.length > 0) {
            console.log('User:', JSON.stringify(userCheck.rows[0]));
            // Reset device binding so the new APK can register fresh
            await pool.query("UPDATE users SET device_id = NULL, is_registered = FALSE WHERE roll_number = '25N81A6258'");
            console.log('✅ Reset device binding for fresh registration');
        }

        console.log('\n🎯 DONE. You can now REGISTER in the app with roll number 25N81A6258');
        await pool.end();
    } catch (e) {
        console.error('ERROR:', e.message);
        await pool.end();
    }
})();
