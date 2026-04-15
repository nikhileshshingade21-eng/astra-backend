require('dotenv').config();
const { queryAll } = require('./database_module');

async function checkProductionNotifications() {
    try {
        console.log('Checking production notifications for today (2026-04-15)...');
        // Search for notifications created today in IST (which might be recorded in UTC)
        // 8:30 AM IST is 03:00 AM UTC.
        const res = await queryAll(`
            SELECT id, user_id, title, created_at 
            FROM notifications 
            WHERE created_at >= '2026-04-15 00:00:00' 
            ORDER BY created_at DESC 
            LIMIT 10
        `);
        console.table(res);
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        process.exit();
    }
}

checkProductionNotifications();
