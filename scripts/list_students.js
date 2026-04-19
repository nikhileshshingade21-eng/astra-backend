const { queryAll } = require('../database_module');
async function listStudents() {
    try {
        const students = await queryAll(`
            SELECT name, roll_number, programme, section 
            FROM users 
            WHERE role = 'student' AND is_registered = true 
            ORDER BY name ASC
        `);
        console.log('\n--- REGISTERED STUDENTS ---');
        console.table(students);
    } catch (e) {
        console.error('Error:', e);
    }
    process.exit(0);
}
listStudents();
