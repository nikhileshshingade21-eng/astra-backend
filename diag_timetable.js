const { Pool } = require('pg');
require('dotenv').config();

async function test() {
    let connectionStr = process.env.DATABASE_URL;
    if (!connectionStr && process.env.DB_HOST) {
        connectionStr = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;
    }

    const pool = new Pool({
        connectionString: connectionStr,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('--- ASTRA API Diagnostic ---');
        
        // 1. Check User Profile
        const userRes = await pool.query("SELECT id, name, programme, section FROM users WHERE name LIKE '%Nikhilesh%' LIMIT 1");
        if (userRes.rows.length === 0) {
            console.log('❌ User not found');
            return;
        }
        const user = userRes.rows[0];
        console.log(`👤 User: ${user.name} | Programme: ${user.programme} | Section: ${user.section}`);

        // 2. Mock Controller Logic for Tuesday
        const targetDay = 'Tuesday';
        const programme = user.programme;
        const section = user.section;

        const results = await pool.query(
            "SELECT id, code, name, day, programme, section FROM classes WHERE day = $1 AND programme = $2 AND section = $3",
            [targetDay, programme, section]
        );

        console.log(`📅 Found ${results.rows.length} classes for Tuesday`);
        results.rows.forEach(c => {
            console.log(`   - [${c.code}] ${c.name} (ID: ${c.id})`);
        });

        if (results.rows.length === 0) {
            console.log('⚠️ Warning: No classes match the user profile. Checking ALL classes for Tuesday...');
            const allRes = await pool.query("SELECT code, programme, section FROM classes WHERE day = 'Tuesday'");
            allRes.rows.forEach(r => {
                console.log(`   - Available: [${r.code}] Proj: ${r.programme} Sec: ${r.section}`);
            });
        }

    } catch (err) {
        console.error('❌ Diagnostic failed:', err.message);
    } finally {
        await pool.end();
    }
}

test();
