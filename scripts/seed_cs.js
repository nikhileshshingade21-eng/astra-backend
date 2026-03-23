const fs = require('fs');
const path = require('path');
const { getDb, saveDb } = require('../db');

const classesData = [
    // CS
    { code: 'AEP', name: 'AEP', faculty_name: 'Mrs. T Sreevani', room: '214', day: 'Monday', start_time: '09:00', end_time: '10:00', prog: 'B.Tech CS', section: 'CS' },
    { code: 'LBP', name: 'LBP', faculty_name: 'Mr. T Balachary', room: '214', day: 'Monday', start_time: '10:10', end_time: '12:10', prog: 'B.Tech CS', section: 'CS' },
    { code: 'DS', name: 'DS', faculty_name: 'Mr. K Praveen Kumar', room: '214', day: 'Monday', start_time: '12:50', end_time: '13:50', prog: 'B.Tech CS', section: 'CS' },
    { code: 'BEE LAB', name: 'BEE Lab', faculty_name: 'Dr. M Narendar / D Malru', room: '214', day: 'Monday', start_time: '13:50', end_time: '16:00', prog: 'B.Tech CS', section: 'CS' },

    { code: 'DS', name: 'DS', faculty_name: 'Mr. K Praveen Kumar', room: '214', day: 'Tuesday', start_time: '09:00', end_time: '10:00', prog: 'B.Tech CS', section: 'CS' },
    { code: 'PYTHON LAB', name: 'Python Lab', faculty_name: 'Mr. Surya Narayana', room: 'G-15', day: 'Tuesday', start_time: '10:10', end_time: '12:10', prog: 'B.Tech CS', section: 'CS' },
    { code: 'AEP', name: 'AEP', faculty_name: 'Mrs. T Sreevani', room: '214', day: 'Tuesday', start_time: '12:50', end_time: '13:50', prog: 'B.Tech CS', section: 'CS' },
    { code: 'ODEVC', name: 'ODEVC', faculty_name: 'Mrs. A Swarnalatha', room: '214', day: 'Tuesday', start_time: '13:50', end_time: '14:50', prog: 'B.Tech CS', section: 'CS' },
    { code: 'LIBRARY', name: 'Library', faculty_name: '', room: 'Lib', day: 'Tuesday', start_time: '15:00', end_time: '16:00', prog: 'B.Tech CS', section: 'CS' },

    { code: 'SOFT SKILLS', name: 'Soft Skills', faculty_name: 'Atoshi Roy', room: '214', day: 'Wednesday', start_time: '09:00', end_time: '12:10', prog: 'B.Tech CS', section: 'CS' },
    { code: 'BEE', name: 'BEE', faculty_name: 'Dr. M Narendar Reddy', room: '214', day: 'Wednesday', start_time: '12:50', end_time: '13:50', prog: 'B.Tech CS', section: 'CS' },
    { code: 'AEP LAB', name: 'AEP Lab', faculty_name: 'Mrs. Sreevani / Mr. Sandeep', room: '214', day: 'Wednesday', start_time: '13:50', end_time: '16:00', prog: 'B.Tech CS', section: 'CS' },

    { code: 'ITWS', name: 'ITWS', faculty_name: 'Mr. Trishank', room: 'G-15', day: 'Thursday', start_time: '09:00', end_time: '11:10', prog: 'B.Tech CS', section: 'CS' },
    { code: 'ODEVC', name: 'ODEVC', faculty_name: 'Mrs. A Swarnalatha', room: '214', day: 'Thursday', start_time: '11:10', end_time: '12:10', prog: 'B.Tech CS', section: 'CS' },
    { code: 'AEP', name: 'AEP', faculty_name: 'Mrs. T Sreevani', room: '214', day: 'Thursday', start_time: '12:50', end_time: '13:50', prog: 'B.Tech CS', section: 'CS' },
    { code: 'BEE', name: 'BEE', faculty_name: 'Dr. M Narendar Reddy', room: '214', day: 'Thursday', start_time: '13:50', end_time: '14:50', prog: 'B.Tech CS', section: 'CS' },
    { code: 'DS', name: 'DS', faculty_name: 'Mr. K Praveen Kumar', room: '214', day: 'Thursday', start_time: '15:00', end_time: '16:00', prog: 'B.Tech CS', section: 'CS' },

    { code: 'EDCAD', name: 'EDCAD', faculty_name: 'Dr. K. Govardhan Reddy', room: '214', day: 'Friday', start_time: '09:00', end_time: '10:00', prog: 'B.Tech CS', section: 'CS' },
    { code: 'BEE', name: 'BEE', faculty_name: 'Dr. M Narendar Reddy', room: '214', day: 'Friday', start_time: '10:10', end_time: '11:10', prog: 'B.Tech CS', section: 'CS' },
    { code: 'ODEVC', name: 'ODEVC', faculty_name: 'Mrs. A Swarnalatha', room: '214', day: 'Friday', start_time: '11:10', end_time: '12:10', prog: 'B.Tech CS', section: 'CS' },
    { code: 'AEP', name: 'AEP', faculty_name: 'Mrs. T Sreevani', room: '214', day: 'Friday', start_time: '12:50', end_time: '13:50', prog: 'B.Tech CS', section: 'CS' },
    { code: 'DS LAB', name: 'DS Lab', faculty_name: 'Mr. K Praveen Kumar', room: '220', day: 'Friday', start_time: '13:50', end_time: '16:00', prog: 'B.Tech CS', section: 'CS' },

    { code: 'EDCAD', name: 'EDCAD', faculty_name: 'Dr. K. Govardhan Reddy', room: '320', day: 'Saturday', start_time: '09:00', end_time: '11:10', prog: 'B.Tech CS', section: 'CS' },
    { code: 'ODEVC', name: 'ODEVC', faculty_name: 'Mrs. A Swarnalatha', room: '214', day: 'Saturday', start_time: '11:10', end_time: '12:10', prog: 'B.Tech CS', section: 'CS' },
    { code: 'SPORTS', name: 'Sports', faculty_name: '', room: 'Field', day: 'Saturday', start_time: '12:50', end_time: '13:50', prog: 'B.Tech CS', section: 'CS' },
    { code: 'SSLITE', name: 'SSLite', faculty_name: '', room: '214', day: 'Saturday', start_time: '13:50', end_time: '16:00', prog: 'B.Tech CS', section: 'CS' }
];

async function run() {
    const db = await getDb();
    console.log('Got DB connection.');

    db.run("DELETE FROM classes WHERE section = 'CS'");

    for (const c of classesData) {
        db.run(
            `INSERT INTO classes (code, name, faculty_name, room, day, start_time, end_time, programme, section, zone_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [c.code, c.name, c.faculty_name, c.room, c.day, c.start_time, c.end_time, c.prog, c.section, 1]
        );
    }
    console.log('Inserted CS timetable.');

    const stdPath = path.join(__dirname, '..', '..', 'astra-rn', 'src', 'data', 'students.js');
    let stdContent = fs.readFileSync(stdPath, 'utf-8');

    stdContent = stdContent.replace(/prog: 'B\\.Tech ECE', branch: 'ECE', section: 'ECE'/g, "prog: 'B.Tech CS', branch: 'CS', section: 'CS'");

    fs.writeFileSync(stdPath, stdContent, 'utf-8');
    console.log('Updated students.js to map ECE to CS section.');

    const fixedContent = stdContent
        .replace('export const STUDENTS = ', 'module.exports = ')
        .replace(/;?\\s*$/, '');

    const tmpPath = path.join(__dirname, 'tmp_cs_students.js');
    fs.writeFileSync(tmpPath, fixedContent, 'utf-8');

    const studentsArr = require('./tmp_cs_students');
    fs.unlinkSync(tmpPath);

    for (const st of studentsArr) {
        if (st.section === 'CS') {
            const bcrypt = require('bcryptjs');
            const hash123 = bcrypt.hashSync('123', 10);
            db.run(
                `INSERT INTO users (roll_number, name, programme, section, role, password_hash)
                 VALUES (?, ?, ?, ?, 'student', ?) ON CONFLICT (roll_number) DO NOTHING`,
                [st.id, st.name, st.prog, st.section, hash123]
            );
        }
    }
    console.log('Inserted CS students into DB');

    saveDb();
    console.log('All done for CS section!');
}

run().catch(console.error);
