require('dotenv').config();
const { queryAll } = require('./database_module.js');

async function checkUsers() {
    try {
        const users = await queryAll('SELECT id, roll_number, name, is_registered, password_hash FROM users');
        console.log('Total users:', users.length);
        
        const stuckUsers = users.filter(u => !u.is_registered && u.password_hash !== '123' && u.password_hash !== 'password123');
        console.log('Stuck users (registered but is_registered is false):', stuckUsers.length);
        
        stuckUsers.forEach(u => {
            console.log(`- ${u.roll_number}: ${u.name}`);
        });

        if (stuckUsers.length > 0) {
            console.log('\nSuggested FIX: UPDATE users SET is_registered = TRUE WHERE is_registered = FALSE OR is_registered IS NULL;');
        }
    } catch (err) {
        console.error('Error checking users:', err.message);
    } finally {
        process.exit();
    }
}

checkUsers();
