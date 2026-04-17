const { queryAll } = require('../database_module');
const bcrypt = require('bcryptjs');

async function setupAccounts() {
    try {
        const hash = bcrypt.hashSync('123', 10);

        // Remove the lowercase ones
        await queryAll(`DELETE FROM users WHERE roll_number IN ('admin', 'faculty')`);

        await queryAll(`
            INSERT INTO users (roll_number, name, role, password_hash, is_registered) 
            VALUES ('ADMIN', 'System Admin', 'admin', $1, true)
            ON CONFLICT (roll_number) DO UPDATE SET role = 'admin', password_hash = $1, is_registered = true
        `, [hash]);

        await queryAll(`
            INSERT INTO users (roll_number, name, role, password_hash, is_registered) 
            VALUES ('FACULTY', 'Dr. Demo Faculty', 'faculty', $1, true)
            ON CONFLICT (roll_number) DO UPDATE SET role = 'faculty', password_hash = $1, is_registered = true
        `, [hash]);

        console.log('\n✅ Guaranteed Accounts Provisioned (Uppercase UI-compliant):');
        console.log('Admin ID: ADMIN | Password: 123');
        console.log('Faculty ID: FACULTY | Password: 123');
    } catch (e) {
        console.error('Error:', e);
    }
    process.exit(0);
}

setupAccounts();
