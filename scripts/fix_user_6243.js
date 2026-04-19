require('dotenv').config();
const { queryAll } = require('../database_module');
const bcrypt = require('bcryptjs');

async function fixUser6243() {
    try {
        console.log('--- FIXING ACCOUNT 25N81A6243 ---');
        
        // 1. Correct the Role and Trim Name
        await queryAll(
            'UPDATE users SET role = $1, name = $2 WHERE roll_number = $3',
            ['student', 'Cherala Anirudh sai', '25N81A6243']
        );
        console.log('✅ Role set to [student] and Name trimmed.');

        // 2. Sync with Verified Registry (ensure section/programme are correct)
        const registry = await queryAll('SELECT programme, section FROM verified_students WHERE roll_number = $1', ['25N81A6243']);
        if (registry.length > 0) {
            await queryAll(
                'UPDATE users SET programme = $1, section = $2 WHERE roll_number = $3',
                [registry[0].programme, registry[0].section, '25N81A6243']
            );
            console.log(`✅ Synced with Registry: ${registry[0].programme} - ${registry[0].section}`);
        }

        // 3. Reset Password to standard Astra@123 for recovery
        const hash = await bcrypt.hash('Astra@123', 10);
        await queryAll(
            'UPDATE users SET password_hash = $1 WHERE roll_number = $2',
            [hash, '25N81A6243']
        );
        console.log('✅ Password reset to [Astra@123].');

        console.log('---------------------------------');
        console.log('User is now ready to login as STUDENT.');
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Error during fix:', err.message);
        process.exit(1);
    }
}

fixUser6243();
