require('dotenv').config();
const { queryAll } = require('../database_module');
const bcrypt = require('bcryptjs');

async function setupBalaji() {
    const roll = '25N81A6228';
    const name = 'BALAJI';
    const programme = 'B.Tech CSC';
    const section = 'CS';
    const tempPass = 'Astra@2026';
    const role = 'student';

    try {
        console.log(`[SETUP] Pre-registering student: ${roll}`);
        
        // 1. Hash password
        const password_hash = await bcrypt.hash(tempPass, 10);
        
        // 2. Check if user already exists
        const existing = await queryAll('SELECT id FROM users WHERE roll_number = $1', [roll]);
        
        if (existing.length > 0) {
            console.log('[SETUP] User already exists in users table. Updating credentials...');
            await queryAll(
                `UPDATE users SET name = $1, programme = $2, section = $3, password_hash = $4, is_registered = TRUE WHERE roll_number = $5`,
                [name, programme, section, password_hash, roll]
            );
        } else {
            console.log('[SETUP] Creating new user record...');
            await queryAll(
                `INSERT INTO users (roll_number, name, role, programme, section, password_hash, is_registered) 
                 VALUES ($1, $2, $3, $4, $5, $6, TRUE)`,
                [roll, name, role, programme, section, password_hash]
            );
        }

        // 3. Sync registry name
        await queryAll('UPDATE verified_students SET name = $1 WHERE roll_number = $2', [name, roll]);

        console.log('[SETUP] SUCCESS: Balaji is now registered. Password: ' + tempPass);
    } catch (e) {
        console.error('[SETUP] FAILED:', e.message);
    } finally {
        process.exit();
    }
}

setupBalaji();
