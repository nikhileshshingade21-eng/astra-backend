require('dotenv').config();
const { queryAll } = require('../database_module.js');

const timetableData = [
  // MONDAY
  { day: 'Monday', code: 'AEP', name: 'Applied Engineering Physics', faculty: 'Mrs. T. Sreevani', room: '214', start: '09:00', end: '10:00' },
  { day: 'Monday', code: 'LBP', name: 'Logic Based Programming', faculty: 'Mr. T. Balachary', room: '214', start: '10:10', end: '12:10' },
  { day: 'Monday', code: 'DS', name: 'Data Structures', faculty: 'Mr. K. Praveen Kumar', room: '214', start: '12:50', end: '01:50' },
  { day: 'Monday', code: 'BEE LAB', name: 'Basic Electrical Engg Lab', faculty: 'Dr. Md Narendar Reddy', room: 'LAB', start: '01:50', end: '04:00' },

  // TUESDAY
  { day: 'Tuesday', code: 'DS', name: 'Data Structures', faculty: 'Mr. K. Praveen Kumar', room: '214', start: '09:00', end: '10:00' },
  { day: 'Tuesday', code: 'PY-LAB', name: 'Python Lab', faculty: 'Mr. Surya Narayana', room: 'G-13', start: '10:10', end: '12:10' },
  { day: 'Tuesday', code: 'AEP', name: 'Applied Engineering Physics', faculty: 'Mrs. T. Sreevani', room: '214', start: '12:50', end: '01:50' },
  { day: 'Tuesday', code: 'ODEVC', name: 'ODE & VC', faculty: 'Mrs. A. Swarnalatha', room: '214', start: '01:50', end: '02:50' },
  { day: 'Tuesday', code: 'LIB', name: 'Library', faculty: '-', room: 'LIBRARY', start: '03:00', end: '04:00' },

  // WEDNESDAY
  { day: 'Wednesday', code: 'SS', name: 'Soft Skills', faculty: 'Akshi Roy', room: '214', start: '09:00', end: '12:10' },
  { day: 'Wednesday', code: 'BEE', name: 'Basic Electrical Engg', faculty: 'Dr. Md Narendar Reddy', room: '214', start: '12:50', end: '01:50' },
  { day: 'Wednesday', code: 'AEP-LAB', name: 'Applied Physics Lab', faculty: 'Mrs. T. Sreevani / Mr. A. Sandeep', room: 'LAB', start: '01:50', end: '04:00' },

  // THURSDAY
  { day: 'Thursday', code: 'ITWS', name: 'IT Workshop', faculty: 'Mr. Trishank', room: 'G-15', start: '09:00', end: '11:10' },
  { day: 'Thursday', code: 'ODEVC', name: 'ODE & VC', faculty: 'Mrs. A. Swarnalatha', room: '214', start: '11:10', end: '12:10' },
  { day: 'Thursday', code: 'AEP', name: 'Applied Engineering Physics', faculty: 'Mrs. T. Sreevani', room: '214', start: '12:50', end: '01:50' },
  { day: 'Thursday', code: 'BEE', name: 'Basic Electrical Engg', faculty: 'Dr. Md Narendar Reddy', room: '214', start: '01:50', end: '02:50' },
  { day: 'Thursday', code: 'DS', name: 'Data Structures', faculty: 'Mr. K. Praveen Kumar', room: '214', start: '03:00', end: '04:00' },

  // FRIDAY
  { day: 'Friday', code: 'EDCAD', name: 'ED & CAD', faculty: 'Dr. K. Govardhan Reddy', room: '214', start: '09:00', end: '10:00' },
  { day: 'Friday', code: 'BEE', name: 'Basic Electrical Engg', faculty: 'Dr. Md Narendar Reddy', room: '214', start: '10:10', end: '12:10' },
  { day: 'Friday', code: 'ODEVC', name: 'ODE & VC', faculty: 'Mrs. A. Swarnalatha', room: '214', start: '11:10', end: '12:10' },
  { day: 'Friday', code: 'AEP', name: 'Applied Engineering Physics', faculty: 'Mrs. T. Sreevani', room: '214', start: '12:50', end: '01:50' },
  { day: 'Friday', code: 'DS-LAB', name: 'Data Structures Lab', faculty: 'Mr. K. Praveen Kumar', room: '220', start: '01:50', end: '04:00' },

  // SATURDAY
  { day: 'Saturday', code: 'EDCAD', name: 'ED & CAD', faculty: 'Mr. B. Naga Murali', room: '321', start: '09:00', end: '11:10' },
  { day: 'Saturday', code: 'ODEVC', name: 'ODE & VC', faculty: 'Mrs. A. Swarnalatha', room: '214', start: '11:10', end: '12:10' },
  { day: 'Saturday', code: 'SPORTS', name: 'Sports', faculty: '-', room: 'GROUND', start: '12:50', end: '01:50' },
  { day: 'Saturday', code: 'SSLITE', name: 'SS Lite', faculty: '-', room: '214', start: '01:50', end: '04:00' },
];

async function seed() {
  console.log('🚀 Seeding Timetable for CS Section...');
  
  try {
    // Clear existing (optional, but safer for first run)
    await queryAll('DELETE FROM classes WHERE section = $1', ['CS']);
    console.log('🗑️ Cleared previous CS timetable entries.');

    for (const item of timetableData) {
      await queryAll(
        `INSERT INTO classes (code, name, faculty_name, room, day, start_time, end_time, programme, section)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [item.code, item.name, item.faculty, item.room, item.day, item.start, item.end, 'B.Tech', 'CS']
      );
      console.log(`✅ Added: ${item.day} - ${item.name}`);
    }

    console.log('🎉 SEEDING COMPLETE!');
    process.exit(0);
  } catch (err) {
    console.error('❌ SEEDING FAILED:', err);
    process.exit(1);
  }
}

seed();
