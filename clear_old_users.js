require('dotenv').config();
const { queryAll } = require('./database_module.js');

async function run() {
    try {
        console.log('Connecting to database to clear old user records...');
        // Delete all users that do not have a face_embedding so they can re-register
        const deleted = await queryAll('DELETE FROM users WHERE face_embedding IS NULL RETURNING roll_number, name');
        console.log(`Successfully deleted ${deleted.length} legacy users without face biometrics.`);
        if (deleted.length > 0) {
            console.log('Deleted Roll Numbers:', deleted.map(d => d.roll_number).join(', '));
        }
    } catch (err) {
        console.error('Database Error:', err);
    }
    process.exit(0);
}

run();
