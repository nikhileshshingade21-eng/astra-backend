require('dotenv').config();
const { queryAll } = require('./database_module.js');
const { Pool } = require('pg');
const admin = require('./services/firebaseService.js');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false }
});

async function trigger() {
    try {
        const users = await queryAll(`SELECT id, roll_number, fcm_token FROM users WHERE roll_number = '25N81A6258'`);
        if (users.length === 0) throw new Error("User not found in DB.");
        const user = users[0];
        
        if (!user.fcm_token) {
            throw new Error("No FCM token found for user! They need to register and log in on the new APK first.");
        }

        const messageBody = "GOOD MRG FROM PRODUCTION SERVER";
        console.log(`Sending Push directly via Firebase Admin to FCM Token: ${user.fcm_token.substring(0, 15)}...`);
        
        // 1. Send via Firebase Admin directly
        const payload = {
            notification: {
                title: 'ASTRA',
                body: messageBody
            },
            data: {
                title: 'ASTRA',
                body: messageBody,
                type: 'admin_broadcast'
            },
            android: {
                priority: "high",
                notification: {
                    channelId: 'astra-class-reminders',
                    sound: 'default'
                }
            },
            token: user.fcm_token
        };
        
        const response = await admin.messaging().send(payload);
        console.log("Firebase Push Success!", response);

        // 2. Wait a moment
        console.log("Waiting 5 seconds to let notification deliver cleanly...");
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // 3. Cleanup from Postgres
        console.log("Cleaning up any local notification records...");
        const delRes = await pool.query(`DELETE FROM notifications WHERE user_id = $1 AND message = $2`, [user.id, messageBody]);
        console.log(`Successfully deleted ${delRes.rowCount} notification(s) from the database.`);
        
    } catch (e) {
        console.error("Error:", e.message);
    } finally {
        pool.end();
        process.exit(0);
    }
}

trigger();
