const { queryAll } = require('../database_module');
async function clearFakeAttendance() {
    try {
        const res = await queryAll(`DELETE FROM attendance WHERE user_id = (SELECT id FROM users WHERE roll_number = '25N81A6258') AND date = '2026-04-17' RETURNING *`);
        console.log('Successfully deleted fake attendance records count:', res.length);
    } catch (e) {
        console.error('Error:', e);
    }
    process.exit(0);
}
clearFakeAttendance();
