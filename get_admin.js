require('dotenv').config();
const { queryAll } = require('./database_module.js');
const bcrypt = require('bcryptjs');

async function checkOrSetAdmin() {
    try {
        let adminId = 'ADMIN123';
        console.log("Creating a default admin account...");
        
        // 1 = true, 0 = false for SQLite/Postgres compatibility in this schema
        const password_hash = await bcrypt.hash('adminPASS', 10);
        await queryAll(
            `INSERT INTO users (roll_number, name, role, password_hash, is_registered, biometric_enrolled) 
             VALUES ('ADMIN123', 'System Administrator', 'admin', $1, true, 0)
             ON CONFLICT (roll_number) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
            [password_hash]
        );
        console.log("Created/Updated User: ADMIN123");
        console.log("Password is: adminPASS");
        
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
checkOrSetAdmin();
