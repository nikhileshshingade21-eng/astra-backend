require('dotenv').config();
const { queryAll } = require('./database_module');

async function run() {
    try {
        const rollNumber = '25N81A6258';
        const users = await queryAll("SELECT id, programme, section FROM users WHERE roll_number = $1 OR email ILIKE '%' || $1 || '%'", [rollNumber]);
        if (users.length === 0) {
            console.log(`Student with roll number / email ${rollNumber} not found.`);
            process.exit(0);
        }
        
        const user = users[0];
        console.log(`Student Found -> ID: ${user.id}, Programme: ${user.programme}, Section: ${user.section}`);
        
        const classes = await queryAll(`
            SELECT name as subject, start_time, end_time, room 
            FROM classes 
            WHERE programme = $1 AND section = $2 AND day = 'Wednesday'
            ORDER BY start_time ASC
        `, [user.programme, user.section]);
        
        if (classes.length === 0) {
            console.log("No classes scheduled for today (Wednesday).");
        } else {
            console.log("\n--- Wednesday Schedule ---");
            console.table(classes);
            
            console.log("\nNotification Schedule Preview (IST):");
            classes.forEach(c => {
                const [h, m] = c.start_time.split(':').map(Number);
                let startMins = h * 60 + m;
                
                const format = (mins) => {
                    let hh = Math.floor(mins / 60);
                    let mm = mins % 60;
                    return `${hh.toString().padStart(2,'0')}:${mm.toString().padStart(2,'0')}`;
                };
                
                console.log(`[${c.subject}] 10-Min Warning: ${format(startMins - 10)}`);
                console.log(`[${c.subject}] 5-Min Warning:  ${format(startMins - 5)}`);
                console.log(`[${c.subject}] Class Starts:   ${format(startMins)}`);
                console.log('-------------------------------------------');
            });
        }
        process.exit(0);
    } catch (e) {
        console.error("DB Error:", e.message);
        process.exit(1);
    }
}
run();
