require('dotenv').config();
const { queryAll } = require('../database_module');

const prog = 'B.Tech AIML';
const section = 'A1';

const classesData = [
    // MONDAY
    { code: 'DS', name: 'Data Structures', faculty_name: 'Mr. MD Afzal', room: '302', day: 'Monday', start_time: '09:00', end_time: '10:00' },
    { code: 'EDC', name: 'Electronic Devices & Circuits', faculty_name: 'Ms. Priya', room: '302', day: 'Monday', start_time: '10:10', end_time: '11:10' },
    { code: 'ODEVC', name: 'ODEVC', faculty_name: 'Dr. MD Ahmed', room: '302', day: 'Monday', start_time: '11:10', end_time: '12:10' },
    { code: 'EC', name: 'Engineering Chemistry', faculty_name: 'Dr. D Appa Rao', room: '302', day: 'Monday', start_time: '12:50', end_time: '13:50' },
    { code: 'ELCS LAB', name: 'ELCS Lab', faculty_name: 'Dr. Ashima Jose / Mr. V. Yellamanda', room: '302', day: 'Monday', start_time: '13:50', end_time: '16:00' },

    // TUESDAY
    { code: 'DS LAB', name: 'DS Lab', faculty_name: 'Mr. MD Afzal', room: '220', day: 'Tuesday', start_time: '09:00', end_time: '11:10' },
    { code: 'EC', name: 'Engineering Chemistry', faculty_name: 'Dr. D Appa Rao', room: '302', day: 'Tuesday', start_time: '11:10', end_time: '12:10' },
    { code: 'SOFT SKILLS', name: 'Soft Skills', faculty_name: 'Atoshi Roy', room: '302', day: 'Tuesday', start_time: '12:50', end_time: '16:00' },

    // WEDNESDAY
    { code: 'ODEVC', name: 'ODEVC', faculty_name: 'Dr. MD Ahmed', room: '302', day: 'Wednesday', start_time: '09:00', end_time: '10:00' },
    { code: 'LBP', name: 'Logic Based Programming', faculty_name: 'Dr. P Rammohan Rao', room: '302', day: 'Wednesday', start_time: '10:10', end_time: '12:10' },
    { code: 'ESE', name: 'Environmental Science', faculty_name: 'Dr. Ashima Jose', room: '302', day: 'Wednesday', start_time: '12:50', end_time: '13:50' },
    { code: 'EC LAB', name: 'EC Lab', faculty_name: 'Dr. D Appa Rao / Dr. R Venkanna', room: '302', day: 'Wednesday', start_time: '13:50', end_time: '16:00' },

    // THURSDAY
    { code: 'PYTHON LAB', name: 'Python Lab', faculty_name: 'Mr. Farooq', room: '320', day: 'Thursday', start_time: '09:00', end_time: '11:10' },
    { code: 'EDC', name: 'Electronic Devices & Circuits', faculty_name: 'Ms. Priya', room: '302', day: 'Thursday', start_time: '11:10', end_time: '12:10' },
    { code: 'ESE', name: 'Environmental Science', faculty_name: 'Dr. Ashima Jose', room: '302', day: 'Thursday', start_time: '12:50', end_time: '13:50' },
    { code: 'ODEVC', name: 'ODEVC', faculty_name: 'Dr. MD Ahmed', room: '302', day: 'Thursday', start_time: '13:50', end_time: '14:50' },
    { code: 'SPORTS', name: 'Sports', faculty_name: '', room: 'Ground', day: 'Thursday', start_time: '15:00', end_time: '16:00' },

    // FRIDAY
    { code: 'EC', name: 'Engineering Chemistry', faculty_name: 'Dr. D Appa Rao', room: '302', day: 'Friday', start_time: '09:00', end_time: '10:00' },
    { code: 'DS', name: 'Data Structures', faculty_name: 'Mr. MD Afzal', room: '302', day: 'Friday', start_time: '10:10', end_time: '11:10' },
    { code: 'ODEVC', name: 'ODEVC', faculty_name: 'Dr. MD Ahmed', room: '302', day: 'Friday', start_time: '11:10', end_time: '12:10' },
    { code: 'EDC', name: 'Electronic Devices & Circuits', faculty_name: 'Ms. Priya', room: '302', day: 'Friday', start_time: '12:50', end_time: '13:50' },
    { code: 'ESE', name: 'Environmental Science', faculty_name: 'Dr. Ashima Jose', room: '302', day: 'Friday', start_time: '13:50', end_time: '14:50' },
    { code: 'LIBRARY', name: 'Library', faculty_name: '', room: 'Library', day: 'Friday', start_time: '15:00', end_time: '16:00' },

    // SATURDAY
    { code: 'DS', name: 'Data Structures', faculty_name: 'Mr. MD Afzal', room: '302', day: 'Saturday', start_time: '09:00', end_time: '10:00' },
    { code: 'EWS LAB', name: 'EWS Lab', faculty_name: 'Mr. Venu Madhav Reddy', room: '302', day: 'Saturday', start_time: '10:10', end_time: '12:10' },
    { code: 'YOGA', name: 'Yoga', faculty_name: '', room: 'Yoga Hall', day: 'Saturday', start_time: '12:50', end_time: '13:50' },
    { code: 'SSLITE', name: 'SSLITE', faculty_name: '', room: '302', day: 'Saturday', start_time: '13:50', end_time: '16:00' }
];

async function run() {
    console.log('Starting AIML A1 seeding...');

    await queryAll("DELETE FROM classes WHERE programme = $1 AND section = $2", [prog, section]);

    for (const c of classesData) {
        await queryAll(
            `INSERT INTO classes (code, name, faculty_name, room, day, start_time, end_time, programme, section, zone_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [c.code, c.name, c.faculty_name, c.room, c.day, c.start_time, c.end_time, prog, section, 1]
        );
    }
    console.log('Inserted completely fresh AIML A1 timetable directly to database.');
    process.exit(0);
}

run().catch(e => {
    console.error(e);
    process.exit(1);
});
