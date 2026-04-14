require('dotenv').config();
const { queryAll, pool } = require('../database_module');

const events = [
    { name: 'II Semester Class work 1st spell Instruction', start: '2026-01-27', end: '2026-03-14', type: 'instruction', holiday: 0 },
    { name: 'Sports meet', start: '2026-02-10', end: '2026-02-11', type: 'event', holiday: 1 },
    { name: 'Annual Day Celebrations', start: '2026-02-14', end: '2026-02-14', type: 'event', holiday: 1 },
    { name: 'Holi', start: '2026-03-03', end: '2026-03-03', type: 'holiday', holiday: 1 },
    { name: 'MID Term-I', start: '2026-03-09', end: '2026-03-13', type: 'holiday', holiday: 1 },
    { name: '2 Sem 1st Mid Exams', start: '2026-03-16', end: '2026-03-23', type: 'exam', holiday: 1 },
    { name: 'Ugadi', start: '2026-03-19', end: '2026-03-19', type: 'holiday', holiday: 1 },
    { name: 'Ramzan', start: '2026-03-21', end: '2026-03-21', type: 'holiday', holiday: 1 },
    { name: '2nd Spell Instructions', start: '2026-03-24', end: '2026-05-30', type: 'instruction', holiday: 0 },
    { name: 'Rama Navami', start: '2026-03-27', end: '2026-03-27', type: 'holiday', holiday: 1 },
    { name: 'Good Friday', start: '2026-04-03', end: '2026-04-03', type: 'holiday', holiday: 1 },
    { name: 'babu jagjeevan rao jayanthi', start: '2026-04-05', end: '2026-04-05', type: 'holiday', holiday: 1 },
    { name: 'ambedkar jayanti', start: '2026-04-14', end: '2026-04-14', type: 'holiday', holiday: 1 },
    { name: 'Summer Vacation', start: '2026-05-10', end: '2026-05-24', type: 'holiday', holiday: 1 },
    { name: '2nd Mid Exams', start: '2026-06-01', end: '2026-06-06', type: 'exam', holiday: 1 },
    { name: 'Preparation holidays and Practical exams', start: '2026-06-08', end: '2026-06-13', type: 'holiday', holiday: 1 },
    { name: 'End semester Examination', start: '2026-06-15', end: '2026-06-24', type: 'exam', holiday: 1 },
];

async function seed() {
    try {
        console.log('🌱 Seeding Academic Calendar...');
        
        // Clear existing to avoid duplicates if re-run
        await pool.query('DELETE FROM academic_calendar');
        
        for (const e of events) {
            await pool.query(
                'INSERT INTO academic_calendar (event_name, start_date, end_date, type, is_system_holiday) VALUES ($1, $2, $3, $4, $5)',
                [e.name, e.start, e.end, e.type, e.holiday]
            );
            console.log(`  ✅ Inserted: ${e.name}`);
        }
        
        console.log('🎯 Seeding Complete.');
    } catch (err) {
        console.error('❌ Seeding Failed:', err.message);
    } finally {
        await pool.end();
    }
}

seed();
