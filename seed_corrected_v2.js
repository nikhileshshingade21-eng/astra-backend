const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, './.env') });
const { queryAll, pool } = require('./database_module.js');

const programme = 'B.Tech CSC';
const section = 'CS';

// Time slots from header:
// 09:00-10:00 | 10:00-10:10(BREAK) | 10:10-11:10 | 11:10-12:10 | 12:10-12:50(LUNCH) | 12:50-13:50 | 13:50-14:50 | 14:50-15:00(BREAK) | 15:00-16:00

const classes = [
    // === MONDAY ===
    // AEP | BREAK | ---LBP--- | LUNCH | DS | -----BEE LAB-----
    { day: 'Monday', code: 'AEP', name: 'Applied Engineering Physics', faculty: 'Mrs. T Sreevani', room: '214', start: '09:00', end: '10:00' },
    { day: 'Monday', code: 'LBP', name: 'Logic Based Programming', faculty: 'Mr. T Balachary', room: '214', start: '10:10', end: '12:10' },
    { day: 'Monday', code: 'DS', name: 'Data Structures', faculty: 'Mr. K Praveen Kumar', room: '214', start: '12:50', end: '13:50' },
    { day: 'Monday', code: 'BEE LAB', name: 'BEE Lab', faculty: 'Dr. M Narendar Reddy / Mr. D Matru', room: 'BEE Lab', start: '13:50', end: '16:00' },

    // === TUESDAY ===
    // DS | BREAK | ---PYTHON LAB(G-15)--- | LUNCH | AEP | ODEVC | BREAK | LIBRARY
    { day: 'Tuesday', code: 'DS', name: 'Data Structures', faculty: 'Mr. K Praveen Kumar', room: '214', start: '09:00', end: '10:00' },
    { day: 'Tuesday', code: 'PYTHON LAB', name: 'Python Lab', faculty: 'Mr. Surya Narayana', room: 'G-15', start: '10:10', end: '12:10' },
    { day: 'Tuesday', code: 'AEP', name: 'Applied Engineering Physics', faculty: 'Mrs. T Sreevani', room: '214', start: '12:50', end: '13:50' },
    { day: 'Tuesday', code: 'ODEVC', name: 'ODE & Vector Calculus', faculty: 'Mrs. A Swarnalatha', room: '214', start: '13:50', end: '14:50' },
    { day: 'Tuesday', code: 'LIBRARY', name: 'Library', faculty: 'Librarian', room: 'Library', start: '15:00', end: '16:00' },

    // === WEDNESDAY ===
    // --------SOFT SKILLS-------- | LUNCH | BEE | -----AEP LAB-----
    { day: 'Wednesday', code: 'SOFT SKILLS', name: 'Soft Skills', faculty: 'Atoshi Roy', room: 'Seminar Hall', start: '09:00', end: '12:10' },
    { day: 'Wednesday', code: 'BEE', name: 'Basic Electrical Engg.', faculty: 'Dr. M Narendar Reddy', room: '214', start: '12:50', end: '13:50' },
    { day: 'Wednesday', code: 'AEP LAB', name: 'AEP Lab', faculty: 'Mrs. T Sreevani / Mr. A Sandeep', room: 'H&S Lab', start: '13:50', end: '16:00' },

    // === THURSDAY ===
    // ---ITWS(G-15)--- | ODEVC | LUNCH | AEP | BEE | BREAK | DS
    { day: 'Thursday', code: 'ITWS', name: 'IT Workshop', faculty: 'Mr. Trishank', room: 'G-15', start: '09:00', end: '11:10' },
    { day: 'Thursday', code: 'ODEVC', name: 'ODE & Vector Calculus', faculty: 'Mrs. A Swarnalatha', room: '214', start: '11:10', end: '12:10' },
    { day: 'Thursday', code: 'AEP', name: 'Applied Engineering Physics', faculty: 'Mrs. T Sreevani', room: '214', start: '12:50', end: '13:50' },
    { day: 'Thursday', code: 'BEE', name: 'Basic Electrical Engg.', faculty: 'Dr. M Narendar Reddy', room: '214', start: '13:50', end: '14:50' },
    { day: 'Thursday', code: 'DS', name: 'Data Structures', faculty: 'Mr. K Praveen Kumar', room: '214', start: '15:00', end: '16:00' },

    // === FRIDAY ===
    // EDCAD | BREAK | BEE | ODEVC | LUNCH | AEP | ---DS LAB(220)---
    { day: 'Friday', code: 'EDCAD', name: 'ED & CAD', faculty: 'Dr. K Govardhan Reddy / Mr. B Naga Murali', room: '214', start: '09:00', end: '10:00' },
    { day: 'Friday', code: 'BEE', name: 'Basic Electrical Engg.', faculty: 'Dr. M Narendar Reddy', room: '214', start: '10:10', end: '11:10' },
    { day: 'Friday', code: 'ODEVC', name: 'ODE & Vector Calculus', faculty: 'Mrs. A Swarnalatha', room: '214', start: '11:10', end: '12:10' },
    { day: 'Friday', code: 'AEP', name: 'Applied Engineering Physics', faculty: 'Mrs. T Sreevani', room: '214', start: '12:50', end: '13:50' },
    { day: 'Friday', code: 'DS LAB', name: 'Data Structures Lab', faculty: 'Mr. K Praveen Kumar', room: '220', start: '13:50', end: '16:00' },

    // === SATURDAY ===
    // ---EDCAD(320)--- | ODEVC | LUNCH | SPORTS | BREAK | SSLITE
    { day: 'Saturday', code: 'EDCAD', name: 'ED & CAD Lab', faculty: 'Dr. K Govardhan Reddy / Mr. B Naga Murali', room: '320', start: '09:00', end: '11:10' },
    { day: 'Saturday', code: 'ODEVC', name: 'ODE & Vector Calculus', faculty: 'Mrs. A Swarnalatha', room: '214', start: '11:10', end: '12:10' },
    { day: 'Saturday', code: 'SPORTS', name: 'Sports', faculty: 'Sports In-charge', room: 'Ground', start: '12:50', end: '13:50' },
    { day: 'Saturday', code: 'SSLITE', name: 'Soft Skills Lite', faculty: 'Atoshi Roy', room: 'Seminar Hall', start: '15:00', end: '16:00' }
];

async function seed() {
    try {
        console.log('Clearing ALL existing classes...');
        await queryAll('DELETE FROM classes');
        
        let count = 0;
        for (const c of classes) {
            await queryAll(
                `INSERT INTO classes (code, name, faculty_name, room, day, start_time, end_time, programme, section)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [c.code, c.name, c.faculty, c.room, c.day, c.start, c.end, programme, section]
            );
            count++;
        }
        console.log(`✅ Seeded ${count} classes. Corrections applied:`);
        console.log('  - TUE DS: 09:00-10:00 (was 09:00-10:10)');
        console.log('  - SAT EDCAD: 09:00-11:10 (was 09:00-12:10)');
        console.log('  - SAT ODEVC: 11:10-12:10 MORNING (was 12:50 afternoon)');
        console.log('  - SAT SPORTS: 12:50-13:50 (was 13:50-14:50)');
    } catch (err) {
        console.error('Seeding error:', err.message);
    } finally {
        await pool.end();
    }
}

seed();
