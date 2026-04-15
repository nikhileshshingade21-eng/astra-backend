require('dotenv').config();
const { queryAll } = require('./database_module');

async function testInsertion() {
    try {
        console.log('Attempting to insert notification with type: success...');
        const res = await queryAll(
            "INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4) RETURNING *",
            [11, "Test Notification", "Checking if success type works", "success"]
        );
        console.log('Success! Inserted row:', res[0]);
    } catch (err) {
        console.error('FAILED! Error:', err.message);
    } finally {
        process.exit();
    }
}

testInsertion();
