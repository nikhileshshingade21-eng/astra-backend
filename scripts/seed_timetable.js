const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { queryAll, pool } = require('../database_module.js');

const PROG = 'B.Tech CSC';
const SEC = 'CS';

const timetable = [
    // ===== MONDAY =====
    { day: 'Monday', code: 'AEP', name: 'Applied Engineering Physics', faculty: 'Mrs. T Sreevani', room: '214', start: '09:00', end: '10:00' },
    { day: 'Monday', code: 'LBP', name: 'Logic Based Programming', faculty: 'Mr. T Balachary', room: '214', start: '11:10', end: '12:10' },
    { day: 'Monday', code: 'DS', name: 'Data Structures', faculty: 'Mr. K Praveen Kumar', room: '214', start: '12:50', end: '13:50' },
    { day: 'Monday', code: 'BEE-LAB', name: 'BEE Lab', faculty: 'Dr. M Narendar Reddy', room: 'BEE Lab', start: '15:00', end: '16:00' },

    // ===== TUESDAY =====
    { day: 'Tuesday', code: 'DS', name: 'Data Structures', faculty: 'Mr. K Praveen Kumar', room: '214', start: '09:00', end: '10:00' },
    { day: 'Tuesday', code: 'PY-LAB', name: 'Python Lab', faculty: 'Mr. Surya Narayana', room: 'G-15', start: '10:10', end: '12:10' },
    { day: 'Tuesday', code: 'AEP', name: 'Applied Engineering Physics', faculty: 'Mrs. T Sreevani', room: '214', start: '12:50', end: '13:50' },
    { day: 'Tuesday', code: 'ODEVC', name: 'ODE & Vector Calculus', faculty: 'Mrs. A Swarnalatha', room: '214', start: '13:50', end: '14:50' },
    { day: 'Tuesday', code: 'LIB', name: 'Library', faculty: 'Self Study', room: 'Library', start: '15:00', end: '16:00' },

    // ===== WEDNESDAY =====
    { day: 'Wednesday', code: 'SS', name: 'Soft Skills', faculty: 'Atoshi Roy', room: '214', start: '10:10', end: '12:10' },
    { day: 'Wednesday', code: 'AEP', name: 'Applied Engineering Physics', faculty: 'Mrs. T Sreevani', room: '214', start: '12:50', end: '13:50' },
    { day: 'Wednesday', code: 'BEE', name: 'Basic Electrical Engineering', faculty: 'Dr. M Narendar Reddy', room: '214', start: '14:00', end: '15:00' },

    // ===== THURSDAY =====
    { day: 'Thursday', code: 'ITWS', name: 'IT Workshop', faculty: 'Mr. Trishank', room: 'G-15', start: '09:00', end: '11:10' },
    { day: 'Thursday', code: 'ODEVC', name: 'ODE & Vector Calculus', faculty: 'Mrs. A Swarnalatha', room: '214', start: '11:10', end: '12:10' },
    { day: 'Thursday', code: 'BEE', name: 'Basic Electrical Engineering', faculty: 'Dr. M Narendar Reddy', room: '214', start: '12:50', end: '13:50' },
    { day: 'Thursday', code: 'AEP', name: 'Applied Engineering Physics', faculty: 'Mrs. T Sreevani', room: '214', start: '13:50', end: '14:50' },
    { day: 'Thursday', code: 'DS', name: 'Data Structures', faculty: 'Mr. K Praveen Kumar', room: '214', start: '15:00', end: '16:00' },

    // ===== FRIDAY =====
    { day: 'Friday', code: 'EDCAD', name: 'Engineering Drawing & CAD', faculty: 'Dr. K Govardhan Reddy', room: '214', start: '09:00', end: '10:00' },
    { day: 'Friday', code: 'BEE', name: 'Basic Electrical Engineering', faculty: 'Dr. M Narendar Reddy', room: '214', start: '10:10', end: '11:10' },
    { day: 'Friday', code: 'ODEVC', name: 'ODE & Vector Calculus', faculty: 'Mrs. A Swarnalatha', room: '214', start: '11:10', end: '12:10' },
    { day: 'Friday', code: 'AEP', name: 'Applied Engineering Physics', faculty: 'Mrs. T Sreevani', room: '214', start: '12:50', end: '13:50' },
    { day: 'Friday', code: 'DS', name: 'Data Structures', faculty: 'Mr. K Praveen Kumar', room: '214', start: '15:00', end: '16:00' },

    // ===== SATURDAY =====
    { day: 'Saturday', code: 'EDCAD', name: 'Engineering Drawing & CAD', faculty: 'Dr. K Govardhan Reddy', room: '220', start: '09:00', end: '10:00' },
    { day: 'Saturday', code: 'ODEVC', name: 'ODE & Vector Calculus', faculty: 'Mrs. A Swarnalatha', room: '214', start: '11:10', end: '12:10' },
    { day: 'Saturday', code: 'AEP', name: 'Applied Engineering Physics', faculty: 'Mrs. T Sreevani', room: '214', start: '12:50', end: '13:50' },
    { day: 'Saturday', code: 'DS-LAB', name: 'DS Lab', faculty: 'Mr. K Praveen Kumar', room: '220', start: '13:50', end: '16:00' },
];

async function seedTimetable() {
    try {
        console.log('🏫 Seeding Timetable for section: CS, programme: B.Tech CSC');

        // Clear existing classes for this section
        await queryAll("DELETE FROM classes WHERE section = $1 AND programme = $2", [SEC, PROG]);
        console.log('🗑️  Cleared old classes.');

        // Insert all classes using 24h format for easier parsing by the app
        for (const cls of timetable) {
            await queryAll(
                `INSERT INTO classes (code, name, faculty_name, room, start_time, end_time, day, programme, section)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [cls.code, cls.name, cls.faculty, cls.room, cls.start, cls.end, cls.day, PROG, SEC]
            );
        }

        console.log(`✅ Seeded ${timetable.length} classes.`);
        process.exit(0);
    } catch (err) {
        console.error('ERROR:', err.message);
        process.exit(1);
    }
}

seedTimetable();
