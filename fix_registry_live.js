require('dotenv').config();
const { queryAll } = require('./database_module');
const { validateSchema } = require('./schema_validator');

async function fix() {
    try {
        console.log('1. Ensuring table exists...');
        await validateSchema();

        const roll = '25N81A6258';
        const name = 'Nikhilesh shingade';
        
        console.log(`2. Seeding student: ${roll} / ${name}...`);
        await queryAll(`
            INSERT INTO verified_students (roll_number, name, department)
            VALUES ($1, $2, $3)
            ON CONFLICT (roll_number) DO UPDATE SET name = EXCLUDED.name
        `, [roll.toUpperCase(), name, 'CSC']);

        console.log('✅ Student synced to registry.');
        
        const check = await queryAll('SELECT * FROM verified_students WHERE roll_number = $1', [roll.toUpperCase()]);
        console.log('Verification check:', JSON.stringify(check, null, 2));

    } catch (err) {
        console.error('❌ Fix failed:', err.message);
    } finally {
        process.exit();
    }
}

fix();
