require('dotenv').config();
const { queryAll } = require('../database_module.js');

async function run() {
    try {
        console.log('--- Programme Hex Audit ---');
        const progs = await queryAll("SELECT DISTINCT programme FROM classes");
        for (const p of progs) {
            const hex = Buffer.from(p.programme || '').toString('hex');
            console.log(`Prog: "${p.programme}", Hex: ${hex}`);
        }

        const uProgs = await queryAll("SELECT DISTINCT programme FROM users WHERE roll_number = '25N81A6258'");
        for (const p of uProgs) {
            const hex = Buffer.from(p.programme || '').toString('hex');
            console.log(`User Prog: "${p.programme}", Hex: ${hex}`);
        }
        process.exit(0);
    } catch (e) {
        console.error('Audit failed:', e.message);
        process.exit(1);
    }
}

run();
