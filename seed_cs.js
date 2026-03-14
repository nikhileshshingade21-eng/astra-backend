const { getDb, saveDb } = require('./db.js');
const bcrypt = require('bcryptjs');

async function seed() {
    const db = await getDb();
    
    // 1. Migrate schema to add biometric/face storage flags
    console.log('Migrating schema...');
    try {
        db.run('ALTER TABLE users ADD COLUMN biometric_enrolled INTEGER DEFAULT 0');
    } catch(e) { console.log('Column biometric_enrolled likely exists'); }
    try {
        db.run('ALTER TABLE users ADD COLUMN face_enrolled INTEGER DEFAULT 0');
    } catch(e) { console.log('Column face_enrolled likely exists'); }

    // 2. Clear existing CS students/classes if we want a fresh state (optional)
    // We'll leave existing data but specifically add/update these ones.

    const students = [
        { r: '25N81A6201', n: 'TANGIRALA VIJAYA SHANMUKHA SRIVALLI' },
        { r: '25N81A6202', n: 'PAGADALA SHIVANI' },
        { r: '25N81A6203', n: 'SHIGA VAISHNAVI' },
        { r: '25N81A6204', n: 'AMBATI PRANATHI' },
        { r: '25N81A6205', n: 'MEKALA JHANSI' },
        { r: '25N81A6206', n: 'GOLI HARSHA PRIYA' },
        { r: '25N81A6207', n: 'DANDOTHKAR GAYATRI AISHWARYA' },
        { r: '25N81A6208', n: 'DASARI ANUGNA' },
        { r: '25N81A6209', n: 'POLOJU SPOORTHI' },
        { r: '25N81A6210', n: 'GADDE GAYATRI' },
        { r: '25N81A6211', n: 'GATLA AMULYA' },
        { r: '25N81A6212', n: 'MANSURABAD DEEKSHITHA' },
        { r: '25N81A6213', n: 'NASA HASINI' },
        { r: '25N81A6214', n: 'VEMULA DRAKSHAYANI' },
        { r: '25N81A6215', n: 'GAJA KANISHKA' },
        { r: '25N81A6216', n: 'KAMERA BHAVANA' },
        { r: '25N81A6217', n: 'AMBOTHU NAGARANI' },
        { r: '25N81A6218', n: 'GOVATHOTI SONI' },
        { r: '25N81A6219', n: 'A RUTHVIKA' },
        { r: '25N81A6220', n: 'DAKSHAYA' },
        { r: '25N81A6221', n: 'THOTA SAMPADA' },
        { r: '25N81A6222', n: 'Y SRAVANI' },
        { r: '25N81A6223', n: 'M. SPARSHIKA' },
        { r: '25N81A6224', n: 'B ANUGNA' },
        { r: '25N81A6225', n: 'AMBARRESH DUBEY' },
        { r: '25N81A6226', n: 'SURJKANTH KUMAR RAI' },
        { r: '25N81A6227', n: 'BATHINI RUDRAKSH GOUD' },
        { r: '25N81A6228', n: 'PAGIDEPALLY BALAJI' },
        { r: '25N81A6229', n: 'GURRAM JASHWANTH REDDY' },
        { r: '25N81A6230', n: 'VEDYA AITHARAJU' },
        { r: '25N81A6231', n: 'MASHETTY RAGHAVENDRA' },
        { r: '25N81A6232', n: 'LINGA SAI PRANEETH' },
        { r: '25N81A6233', n: 'GOLLA ROHITH' }, { r: '25N81A6234', n: 'ROLLEBOINA SIDDHARTHA' },
        { r: '25N81A6235', n: 'MANCHALA ROHITH' }, { r: '25N81A6236', n: 'NEVURI RAHUL SAI' },
        { r: '25N81A6237', n: 'MOHAMMAD UMAR' }, { r: '25N81A6238', n: 'PANDULA AKSHAY GOUD' },
        { r: '25N81A6239', n: 'KETHAVATH CHARAN TEJ' }, { r: '25N81A6240', n: 'MADDALA SRI RATHNA SAI' },
        { r: '25N81A6241', n: 'KONDAMADUGU YASHWANTH SAI' }, { r: '25N81A6242', n: 'JANNE THULASI KUMAR' },
        { r: '25N81A6243', n: 'CHERALA ANIRUDH SAI' }, { r: '25N81A6244', n: 'MOHAMMED MISBAH UDDIN' },
        { r: '25N81A6245', n: 'SHAIK MUBEEN' }, { r: '25N81A6246', n: 'DHANAVATH SHIVA' },
        { r: '25N81A6247', n: 'PULLA KEVIN' }, { r: '25N81A6248', n: 'M SAI SAMEER' },
        { r: '25N81A6249', n: 'SHARAD VALLABHA VALVAI' }, { r: '25N81A6250', n: 'GADDALA RAGHU' },
        { r: '25N81A6251', n: 'BAVANDLA AMBEDKAR' }, { r: '25N81A6252', n: 'ENEPALLI SIDDARTHA' },
        { r: '25N81A6253', n: 'U ARUN SAI' }, { r: '25N81A6254', n: 'M BALAJI REDDY' },
        { r: '25N81A6255', n: 'C MOHANA KRISHNA' }, { r: '25N81A6256', n: 'DESAI SUMEDH' },
        { r: '25N81A6257', n: 'SHAIK IZAZ AHMED' }, { r: '25N81A6258', n: 'NIKHILESH SHENGADE' },
        { r: '25N81A6259', n: 'P GOWTHAM' }, { r: '25N81A6260', n: 'K ANAJANEYULU' },
        { r: '25N81A6261', n: 'UPPALA CHARAN' }, { r: '25N81A6262', n: 'K BHANU PRASAD' },
        { r: '25N81A6263', n: 'CH. SHANKAR PRASAD' }, { r: '25N81A6264', n: 'B. VENKATA SATISH REDDY' }
    ];

    console.log('Seeding CS Students...');
    const hashed = await bcrypt.hash('password123', 10);
    const insertUser = db.prepare(`
        INSERT OR IGNORE INTO users (roll_number, name, programme, section, role, password_hash)
        VALUES (?, ?, 'B.Tech CSC', 'CS', 'student', ?)
    `);

    for(const s of students) {
        insertUser.run([s.r, s.n, hashed]);
    }
    insertUser.free();

    // 3. Clear existing classes for CS and insert accurate ones
    db.run("DELETE FROM classes WHERE section='CS'");
    
    const csClasses = [
        ['Monday', '09:00', '10:00', 'AEP', 'Mrs. T Sreevani'], 
        ['Monday', '10:10', '12:10', 'LBP', 'Mr. T Balachari'], 
        ['Monday', '12:50', '14:50', 'DS', 'Mr. K Praveen Kumar'], 
        ['Monday', '15:00', '16:00', 'BEE LAB', 'Dr. M Narender Reddy'],
        ['Tuesday', '09:00', '10:00', 'DS', 'Mr. K Praveen Kumar'], 
        ['Tuesday', '10:10', '12:10', 'PYTHON LAB', 'Mr. Surya Narayana'],
        ['Tuesday', '12:50', '13:50', 'AEP', 'Mrs. T Sreevani'], 
        ['Tuesday', '13:50', '14:50', 'ODEVC', 'Mrs. A Swarnalatha'], 
        ['Tuesday', '15:00', '16:00', 'LIBRARY', 'Librarian'],
        ['Wednesday', '09:00', '12:10', 'SOFT SKILLS', 'Ms. Aloshi Roy'], 
        ['Wednesday', '12:50', '13:50', 'BEE', 'Dr. M Narender Reddy'], 
        ['Wednesday', '13:50', '16:00', 'AEP LAB', 'Mrs. T Sreevani'],
        ['Thursday', '09:00', '11:10', 'ITWS', 'Mr. Trishank'], 
        ['Thursday', '11:10', '12:10', 'ODEVC', 'Mrs. A Swarnalatha'], 
        ['Thursday', '12:50', '13:50', 'AEP', 'Mrs. T Sreevani'], 
        ['Thursday', '13:50', '14:50', 'BEE', 'Dr. M Narender Reddy'], 
        ['Thursday', '15:00', '16:00', 'DS', 'Mr. K Praveen Kumar'],
        ['Friday', '09:00', '10:00', 'EDCAD', 'Dr. K Govardhan Reddy'], 
        ['Friday', '10:10', '11:10', 'BEE', 'Dr. M Narender Reddy'], 
        ['Friday', '11:10', '12:10', 'ODEVC', 'Mrs. A Swarnalatha'], 
        ['Friday', '12:50', '13:50', 'AEP', 'Mrs. T Sreevani'], 
        ['Friday', '13:50', '16:00', 'DS LAB', 'Mr. K Praveen Kumar'],
        ['Saturday', '09:00', '11:10', 'EDCAD', 'Dr. K Govardhan Reddy'], 
        ['Saturday', '11:10', '12:10', 'ODEVC', 'Mrs. A Swarnalatha'], 
        ['Saturday', '12:50', '13:50', 'SPORTS', 'Coach'], 
        ['Saturday', '13:50', '16:00', 'SSLITE', 'Instructor']
    ];

    console.log('Seeding CS Timetable...');
    const insertClass = db.prepare(`
        INSERT INTO classes (code, name, faculty_name, room, day, start_time, end_time, programme, section)
        VALUES (?, ?, ?, '214', ?, ?, ?, 'B.Tech CSC', 'CS')
    `);

    for(const c of csClasses) {
        insertClass.run([c[3], c[3], c[4], c[0], c[1], c[2]]);
    }
    insertClass.free();

    console.log('Seeding Faculty Accounts...');
    const hashedFaculty = await bcrypt.hash('admin123', 10);
    const insertFaculty = db.prepare(`
        INSERT OR REPLACE INTO users (roll_number, name, role, password_hash)
        VALUES (?, ?, 'faculty', ?)
    `);
    
    insertFaculty.run(['F-SREEVANI', 'Mrs. T Sreevani', hashedFaculty]);
    insertFaculty.run(['F-PRAVEEN', 'Mr. K Praveen Kumar', hashedFaculty]);
    insertFaculty.run(['F-NARENDER', 'Dr. M Narender Reddy', hashedFaculty]);
    insertFaculty.free();

    // 4. Create Campus Zone for Room 214 (for testing)
    const insertZone = db.prepare("INSERT OR IGNORE INTO campus_zones (name, lat, lng, radius_m) VALUES ('Room 214', 17.547, 78.382, 50)");
    insertZone.run();
    insertZone.free();

    saveDb();
    console.log('Seed complete!');
}

seed().catch(console.error);
