const fs = require('fs');
const students = JSON.parse(fs.readFileSync('../students_master.json', 'utf8'));

let sql = `-- ASTRA Verified Students Master Seed (Phase 4 Rollout)\n`;
sql += `CREATE TABLE IF NOT EXISTS verified_students (\n`;
sql += `    roll_number TEXT PRIMARY KEY,\n`;
sql += `    full_name TEXT NOT NULL,\n`;
sql += `    gender CHAR(1),\n`;
sql += `    branch TEXT,\n`;
sql += `    section TEXT,\n`;
sql += `    is_registered BOOLEAN DEFAULT FALSE,\n`;
sql += `    created_at TIMESTAMPTZ DEFAULT NOW()\n`;
sql += `);\n\n`;

sql += `INSERT INTO verified_students (roll_number, full_name, gender, branch, section)\nVALUES\n`;

const values = students.map(s => `('${s.roll}', '${s.name.replace(/'/g, "''")}', '${s.gender}', '${s.branch}', '${s.section}')`).join(',\n');

sql += values + `\nON CONFLICT (roll_number) DO UPDATE SET \n`;
sql += `    full_name = EXCLUDED.full_name, \n`;
sql += `    gender = EXCLUDED.gender, \n`;
sql += `    branch = EXCLUDED.branch, \n`;
sql += `    section = EXCLUDED.section;\n`;

fs.writeFileSync('seed_verified_students.sql', sql);
console.log(`Generated SQL Seed for ${students.length} students.`);
