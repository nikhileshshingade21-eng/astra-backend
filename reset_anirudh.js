require('dotenv').config();
const { queryAll } = require('./database_module');

(async () => {
    try {
        console.log("🔄 Resetting device_id for Anirudh (25N81A6243)...");
        await queryAll("UPDATE users SET device_id = NULL WHERE roll_number = '25N81A6243'");
        
        const result = await queryAll("SELECT id, roll_number, name, device_id FROM users WHERE roll_number = '25N81A6243'");
        console.log("✅ Current DB State:");
        console.log(JSON.stringify(result, null, 2));
    } catch (e) {
        console.error("❌ Error:", e.message);
    }
    process.exit(0);
})();
