require('dotenv').config();
const { queryAll } = require('./database_module');
const bcrypt = require('bcryptjs');

async function fix() {
    console.log("⚙️ Resetting passwords securely...");
    try {
        const hash = await bcrypt.hash('Astra@123', 10);
        
        // Use double quotes for the table name to avoid any keyword conflicts
        const sql = 'UPDATE "users" SET "password_hash" = $1 WHERE "roll_number" = $2';
        
        await queryAll(sql, [hash, '25N81A6258']);
        await queryAll(sql, [hash, '25N81A6243']);
        
        console.log("✅ Credentials Updated Successfully.");
        console.log("----------------------------------");
        console.log("Admin ID: 25N81A6258");
        console.log("Faculty ID: 25N81A6243");
        console.log("Password: Astra@123");
        console.log("----------------------------------");
    } catch (e) {
        console.error("❌ Fix failed:", e.message);
    }
    process.exit(0);
}

fix();
