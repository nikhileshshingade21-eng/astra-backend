const { queryAll } = require('../database_module');
const bcrypt = require('bcryptjs');

async function setupAccounts() {
    try {
        const hash = bcrypt.hashSync('123', 10);

        // 1. Check existing faculty/admin
        const existingAdmins = await queryAll(`SELECT roll_number, name, role FROM users WHERE role IN ('admin', 'faculty')`);
        console.log('--- Existing Staff Accounts ---');
        console.table(existingAdmins);

        // 2. Ensure standard demo accounts exist
        await queryAll(`
            INSERT INTO users (roll_number, name, role, password_hash) 
            VALUES ('admin', 'System Admin', 'admin', $1)
            ON CONFLICT (roll_number) DO UPDATE SET role = 'admin', password_hash = $1
        `, [hash]);

        await queryAll(`
            INSERT INTO users (roll_number, name, role, password_hash) 
            VALUES ('faculty', 'Dr. Demo Faculty', 'faculty', $1)
            ON CONFLICT (roll_number) DO UPDATE SET role = 'faculty', password_hash = $1
        `, [hash]);

        console.log('\n✅ Guaranteed Accounts Provisioned:');
        console.log('Admin ID: admin | Password: 123');
        console.log('Faculty ID: faculty | Password: 123');
    } catch (e) {
        console.error('Error:', e);
    }
    process.exit(0);
}

setupAccounts();
