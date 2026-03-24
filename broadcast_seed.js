const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, './.env') });
const { queryAll, pool } = require('./database_module.js');

const programmes = ['B.Tech CSC', 'B.Tech CS'];
const sections = ['CS', 'A', 'B'];

const classesByDay = {
    'Monday': [
        { code: 'AEP', name: 'Applied Engineering Physics', faculty: 'Mrs. T Sreevani', room: '214', start: '09:00', end: '10:00' },
        { code: 'BEE', name: 'Basic Electrical Engg.', faculty: 'K. Shashidhar', room: '214', start: '10:00', end: '11:00' },
        { code: 'ODE', name: 'Ord. Diff. Equations', faculty: 'Dr. G. Venkat Reddy', room: '214', start: '11:10', end: '12:10' }
    ],
    'Tuesday': [
        { code: 'DS', name: 'Data Structures', faculty: 'Mrs. S Vanaja', room: 'CS-6', start: '09:00', end: '11:00' },
        { code: 'BEE', name: 'Basic Electrical Engg.', faculty: 'K. Shashidhar', room: '214', start: '11:10', end: '12:10' },
        { code: 'ODE', name: 'Ord. Diff. Equations', faculty: 'Dr. G. Venkat Reddy', room: '214', start: '12:10', end: '13:10' }
    ],
    'Wednesday': [
        { code: 'PHY LAB', name: 'Engg. Physics Lab', faculty: 'Sreevani / Satish', room: 'H&S LAB', start: '09:00', end: '12:10' }
    ],
    'Thursday': [
        { code: 'PYTHON', name: 'Programming with Python', faculty: 'Mrs. S Vanaja', room: '214', start: '09:00', end: '10:00' },
        { code: 'AEP', name: 'Applied Engineering Physics', faculty: 'Mrs. T Sreevani', room: '214', start: '10:00', end: '11:00' },
        { code: 'BEE', name: 'Basic Electrical Engg.', faculty: 'K. Shashidhar', room: '214', start: '11:10', end: '13:10' }
    ],
    'Friday': [
        { code: 'ODE', name: 'Ord. Diff. Equations', faculty: 'Dr. G. Venkat Reddy', room: '214', start: '09:00', end: '10:00' },
        { code: 'PYTHON', name: 'Programming with Python', faculty: 'Mrs. S Vanaja', room: '214', start: '10:00', end: '12:10' }
    ],
    'Saturday': [
        { code: 'DS', name: 'Data Structures', faculty: 'Mrs. S Vanaja', room: '214', start: '09:00', end: '10:00' },
        { code: 'ODE', name: 'Ord. Diff. Equations', faculty: 'Dr. G. Venkat Reddy', room: '214', start: '10:00', end: '11:00' },
        { code: 'AEP', name: 'Applied Engineering Physics', faculty: 'Mrs. T Sreevani', room: '214', start: '11:10', end: '12:10' }
    ]
};

async function seed() {
    try {
        console.log('Cleaning existing classes...');
        await queryAll('DELETE FROM classes');
        
        let count = 0;
        for (const prog of programmes) {
            for (const sec of sections) {
                for (const day in classesByDay) {
                    for (const c of classesByDay[day]) {
                        await queryAll(
                            `INSERT INTO classes (code, name, faculty_name, room, day, start_time, end_time, programme, section)
                             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                            [c.code, c.name, c.faculty, c.room, day, c.start, c.end, prog, sec]
                        );
                        count++;
                    }
                }
            }
        }
        console.log(`✅ Successfully seeded ${count} classes across all sections.`);
    } catch (err) {
        console.error('Seeding error:', err.message);
    } finally {
        await pool.end();
    }
}

seed();
