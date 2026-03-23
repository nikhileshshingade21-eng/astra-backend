const fs = require('fs');

const rawData = `
[REPLACE_WITH_USER_DATA_CONTENT]
`;

const lines = rawData.split('\n');
const students = [];
let currentBranch = '';
let currentSection = '';

const extractSection = (line) => {
    if (line.includes('Computer Science and Engineering (General)')) return 'CSE';
    if (line.includes('AI&ML')) return 'AIML';
    if (line.includes('Data Science')) return 'CSD';
    if (line.includes('Cyber Security')) return 'CSC';
    if (line.includes('Electronics and Communication Engineering')) return 'ECE';
    if (line.includes('Civil Engineering')) return 'CIVIL';
    return null;
};

let i = 0;
while (i < lines.length) {
    let line = lines[i].trim();
    
    // Update branch/section context
    const branch = extractSection(line);
    if (branch) currentBranch = branch;

    // Matching student row like: "1 25N81A0501 GAJJALA NAKSHATRA F CSE C 1"
    const match = line.match(/^(\d+)\s+([A-Z0-9]{10})\s+(.+?)\s+([MF])\s+([A-Z]+)\s+([A-Z\d ]+)/);
    
    if (match) {
        let [full, sno, roll, name, gender, dept, sectionPart] = match;
        
        // Check if name continues on next line
        if (i + 1 < lines.length && !lines[i+1].trim().match(/^\d+/) && !extractSection(lines[i+1])) {
            i++;
            name += ' ' + lines[i].trim();
        }

        students.push({
            roll_number: roll,
            name: name.trim().replace(/\s+/g, ' '),
            gender,
            branch: dept,
            section: sectionPart.trim().replace(/\s+/g, '')
        });
    }
    i++;
}

console.log(`Successfully parsed ${students.length} students.`);
// fs.writeFileSync('students_master.json', JSON.stringify(students, null, 2));
