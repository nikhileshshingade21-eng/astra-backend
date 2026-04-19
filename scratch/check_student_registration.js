require('dotenv').config();
const { queryAll } = require('../database_module');

async function checkStudent(roll) {
    try {
        console.log(`[CHECK] Investigating registry for: ${roll}`);
        const registry = await queryAll('SELECT roll_number, name, programme, section FROM verified_students WHERE roll_number = $1', [roll]);
        console.log('[CHECK] Registry Result:', JSON.stringify(registry, null, 2));
        
        const existingUser = await queryAll('SELECT id, roll_number, name FROM users WHERE roll_number = $1', [roll]);
        console.log('[CHECK] User Table Result:', JSON.stringify(existingUser, null, 2));

        if (registry.length === 0) {
            console.warn('[CHECK] Student NOT FOUND in registry. They will fail verification.');
        } else {
            console.log('[CHECK] Student FOUND in registry.');
        }
    } catch (e) {
        console.error('[CHECK] Diagnostic Failed:', e.message);
    } finally {
        process.exit();
    }
}

const rollToCheck = '25N81A6228';
checkStudent(rollToCheck);
