require('dotenv').config();
const { queryAll } = require('./database_module');

async function checkConstraint() {
    try {
        const res = await queryAll(`
            SELECT pg_get_constraintdef(c.oid) AS constraint_def
            FROM pg_constraint c
            JOIN pg_class t ON t.oid = c.conrelid
            WHERE t.relname = 'notifications' AND c.conname = 'notifications_type_check';
        `);
        console.log('Constraint Definition:', res[0]?.constraint_def);
    } catch (err) {
        console.error('Error checking constraint:', err.message);
    } finally {
        process.exit();
    }
}

checkConstraint();
