const fs = require('fs');
const path = require('path');
const { getDb, saveDb } = require('../db');

// Read the raw text from the user's prompt (saved to a file)
const rawText = fs.readFileSync(path.join(__dirname, 'raw_students.txt'), 'utf-8');

async function run() {
    const db = await getDb();
    console.log('Got DB connection.');

    const lines = rawText.split('\n');
    const students = [];

    // Parse the text
    for (let line of lines) {
        line = line.trim();
        // Match pattern: S.No HallTicket Name... Gender Branch Section
        // Example: 1 25N81A0501 GAJJALA NAKSHATRA F CSE C 1
        // Example: 33 25N81A0533 BHOSKAR LOKESH M CSE C 1
        // Example: 29 25N81A0529 MAMILLAPALLY SHIVA SAHITH M CSE C 1 (Note: sometimes names wrap, but we'll do our best with a regex)

        // Let's use a regex that looks for the Hall Ticket number to anchor the line
        const match = line.match(/^(\d+)\s+([A-Z0-9]{10})\s+(.+?)\s+([MF])\s+([A-Z]+)\s+(.+)$/);

        if (match) {
            const [, sno, id, name, gender, branch, sectionRaw] = match;

            // Normalize section names based on previous patterns
            // "C 1" -> "CSE-1", "A 1" -> "AIML-1", "D 1" -> "CSD-1", "CS" -> "CS", "CIV" -> "CIV"
            let section = sectionRaw.trim();
            if (section.startsWith('C ')) section = section.replace('C ', 'CSE-');
            if (section.startsWith('A ')) section = section.replace('A ', 'AIML-');
            if (section.startsWith('D ')) section = section.replace('D ', 'CSD-');

            // Determine Programme based on Branch
            let prog = 'B.Tech ' + branch;
            if (branch === 'CIVIL') prog = 'B.Tech CIVIL';

            students.push({
                name: name.trim(),
                id: id.trim(),
                prog: prog,
                branch: branch.trim(),
                section: section,
                gender: gender.trim(),
                att: Math.floor(Math.random() * 30) + 70, // random 70-100%
                week: 4,
                status: 'present'
            });
        }
    }

    console.log(`Parsed ${students.length} students from the raw text.`);

    // First, clear existing students to avoid duplicates or old placeholder data mixed with real data
    // We only want to keep admins.
    db.run("DELETE FROM users WHERE role = 'student'");
    console.log('Cleared old student records from database.');

    // Insert new students into DB
    for (const st of students) {
        // Set status based on random attendance
        if (st.att >= 90) st.status = 'perfect';
        else if (st.att >= 75) st.status = 'present';
        else st.status = 'at-risk';

       const bcrypt = require('bcryptjs');
        const hash123 = bcrypt.hashSync('123', 10);
        db.run(
            `INSERT INTO users (roll_number, name, programme, section, role, password_hash)
             VALUES (?, ?, ?, ?, 'student', ?)`,
            [st.id, st.name, st.prog, st.section, hash123]
        );
    }
    console.log('Inserted new students into DB.');

    // Generate new students.js content for the frontend
    const stdPath = path.join(__dirname, '..', '..', 'astra-rn', 'src', 'data', 'students.js');
    const exportStr = `export const STUDENTS = ${JSON.stringify(students, null, 4)};\n`;
    fs.writeFileSync(stdPath, exportStr, 'utf-8');
    console.log('Successfully generated new students.js for the app.');

    saveDb();
    console.log('All done!');
}

run().catch(console.error);
