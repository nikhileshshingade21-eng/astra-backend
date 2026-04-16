require('dotenv').config();
const { queryAll } = require('./database_module');
const fs = require('fs');
const path = require('path');

async function enhanceRegistry() {
    try {
        console.log("🔍 Scanning seed file for section mapping...");
        
        const seedPath = path.join(__dirname, 'scripts', 'seed_all_students.js');
        const content = fs.readFileSync(seedPath, 'utf8');
        
        // Extract student arrays: ['roll_number', 'name', 'dept']
        const studentRegex = /\[\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*\]/g;
        
        // Map to store roll_number -> { programme, section }
        const rollToSection = new Map();
        
        // Helper to find the section matching a line index
        const lines = content.split('\n');
        let currentProgramme = '';
        let currentSection = '';

        for (const line of lines) {
            // Find section markers like "// === AIML A1 ===" or "// === CSE C1 ==="
            const sectionMarker = line.match(/\/\/ === (.*) ===/);
            if (sectionMarker) {
                const raw = sectionMarker[1].trim();
                if (raw.includes('CSC')) {
                    currentProgramme = 'B.Tech CSC';
                    currentSection = 'CS'; // As requested by user
                } else if (raw.includes('AIML')) {
                    currentProgramme = 'B.Tech AIML';
                    currentSection = raw.replace('AIML', '').trim();
                } else if (raw.includes('CSD')) {
                    currentProgramme = 'B.Tech CSD';
                    currentSection = raw.split(' ')[1] || 'D1'; // Fallback
                } else if (raw.includes('CSE')) {
                    currentProgramme = 'B.Tech CSE';
                    currentSection = raw.split(' ')[1] || 'C1';
                } else if (raw.includes('CIVIL')) {
                    currentProgramme = 'B.Tech CIVIL';
                    currentSection = '1';
                } else if (raw.includes('ECE')) {
                    currentProgramme = 'B.Tech ECE';
                    currentSection = '1';
                }
                console.log(`📍 Found Section: ${currentProgramme} / ${currentSection}`);
            }

            // Extract students from this line
            let match;
            const innerRegex = /\[\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*\]/g;
            while ((match = innerRegex.exec(line)) !== null) {
                const roll = match[1].toUpperCase();
                rollToSection.set(roll, { programme: currentProgramme, section: currentSection });
            }
        }

        console.log(`📊 Parsed ${rollToSection.size} student assignments from seed file.`);

        // Batch Update
        const allStudents = await queryAll("SELECT roll_number FROM verified_students");
        console.log(`🔄 Updating ${allStudents.length} records in verified_students...`);

        let updated = 0;
        let skipped = 0;

        for (const s of allStudents) {
            const assignment = rollToSection.get(s.roll_number.toUpperCase());
            if (assignment && assignment.programme && assignment.section) {
                await queryAll(
                    "UPDATE verified_students SET programme = $1, section = $2 WHERE roll_number = $3",
                    [assignment.programme, assignment.section, s.roll_number]
                );
                updated++;
            } else {
                skipped++;
            }
        }

        console.log(`✅ Update Complete!`);
        console.log(`✨ Enhanced: ${updated} students`);
        console.log(`⚠️ Skipped: ${skipped} students (not in seed file or missing mapping)`);

    } catch (e) {
        console.error("❌ Migration failed:", e.message);
    }
    process.exit(0);
}

enhanceRegistry();
