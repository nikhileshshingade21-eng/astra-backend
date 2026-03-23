const fs = require('fs');
const path = require('path');
const { getDb, saveDb } = require('../db');

/**
 * ASTRA STUDENT ONBOARDING TOOL
 * ----------------------------
 * This script parses raw student lists and generates:
 * 1. full_verified_students.sql (For Supabase)
 * 2. Updated students.js (For Mobile App)
 * 3. Local database records (For Railway consistency)
 */

async function runOnboarding() {
    const rawPath = path.join(__dirname, 'raw_student_data.txt');
    
    if (!fs.existsSync(rawPath)) {
        console.error('Error: raw_student_data.txt not found. Please create it and paste your student lists.');
        process.exit(1);
    }

    const rawText = fs.readFileSync(rawPath, 'utf-8');
    const lines = rawText.split('\n');
    const students = [];

    console.log('--- ASTRA ONBOARDING ENGINE START ---');

    // Adaptive Regex: Matches sno, roll, name, gender, branch, section
    const regex = /^(\d+)\s+([A-Z0-9]{10})\s+(.+?)\s+([MF])\s+([A-Z\d ]+)\s+([A-Z\d ]+)$/i;

    for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        const match = line.match(regex);
        if (match) {
            const [, sno, roll, name, gender, branchPart, sectionPart] = match;
            
            // Normalize branch and section
            const branch = branchPart.trim().toUpperCase();
            const section = sectionPart.trim().toUpperCase().replace(/\s+/g, '');

            students.push({
                roll_number: roll.toUpperCase(),
                name: name.trim().replace(/\s+/g, ' '),
                gender: gender.toUpperCase(),
                branch: branch,
                section: section
            });
        }
    }

    if (students.length === 0) {
        console.warn('Warning: No students parsed. Check your raw_student_data.txt format.');
        return;
    }

    console.log(`Successfully parsed ${students.length} students.`);

    // 1. GENERATE SQL SEED
    let sql = `-- ASTRA Verified Students FULL Master Seed\n`;
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
    
    const sqlValues = students.map(s => 
        `('${s.roll_number}', '${s.name.replace(/'/g, "''")}', '${s.gender}', '${s.branch}', '${s.section}')`
    ).join(',\n');
    
    sql += sqlValues + `\nON CONFLICT (roll_number) DO UPDATE SET \n`;
    sql += `    full_name = EXCLUDED.full_name, \n`;
    sql += `    branch = EXCLUDED.branch, \n`;
    sql += `    section = EXCLUDED.section;\n`;

    fs.writeFileSync(path.join(__dirname, 'full_verified_students.sql'), sql);
    console.log('Generated: full_verified_students.sql');

    // 2. UPDATE MOBILE APP (students.js)
    const stdPath = path.join(__dirname, '..', '..', 'astra-rn', 'src', 'data', 'students.js');
    const appData = students.map(s => ({
        id: s.roll_number,
        name: s.name,
        prog: 'B.Tech ' + s.branch,
        branch: s.branch,
        section: s.section,
        att: Math.floor(Math.random() * 20) + 80 // Placeholder for sync
    }));

    const exportStr = `export const STUDENTS = ${JSON.stringify(appData, null, 4)};\n`;
    fs.writeFileSync(stdPath, exportStr, 'utf-8');
    console.log('Updated: Mobile app students.js');

    // 3. SEED LOCAL DB
    try {
        const db = await getDb();
        console.log('Syncing records to local SQLite database...');
        
        for (const st of students) {
            db.run(
                `INSERT OR IGNORE INTO verified_students (roll_number, full_name, gender, branch, section)
                 VALUES (?, ?, ?, ?, ?)`,
                [st.roll_number, st.name, st.gender, st.branch, st.section]
            );
        }
        saveDb();
        console.log('Local DB Sync: SUCCESS');
    } catch (err) {
        console.warn('Local DB Sync skipped (Railway environment likely).');
    }

    console.log('--- ONBOARDING COMPLETE ! ---');
    console.log(`Total Identities Loaded: ${students.length}`);
    console.log('ACTION: Please run the generated full_verified_students.sql in your Supabase SQL Editor.');
}

runOnboarding().catch(console.error);
