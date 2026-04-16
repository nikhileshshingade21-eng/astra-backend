const fs = require('fs');
let content = fs.readFileSync('routes/admin.js', 'utf8');

// Fix first queryAll missing backticks
content = content.replace(const user = await queryAll(SELECT id, fcm_token, programme, section FROM users WHERE roll_number = '25N81A6258');, const user = await queryAll(\"SELECT id, fcm_token, programme, section FROM users WHERE roll_number = '25N81A6258'\"););

// Fix second queryAll missing backticks and correct string parsing
content = content.replace(/const classes = await queryAll\([\s\S]*?SELECT name, start_time, room[\s\S]*?FROM classes[\s\S]*?WHERE programme =  AND section =  AND day = 'Wednesday'[\s\S]*?ORDER BY start_time ASC[\s\S]*?, \[adminUser\.programme, adminUser\.section\]\);/, const classes = await queryAll(\n            \"SELECT name, start_time, room FROM classes WHERE programme = ? AND section = ? AND day = 'Wednesday' ORDER BY start_time ASC\"\n        , [adminUser.programme, adminUser.section]););

// Fix map and message missing template literals
content = content.replace(/let classText = classes\.length > 0[\s\S]*?\? classes\.map\(c =>    \(\) at \)\.join\('\\\\n'\)[\s\S]*?: 'No classes scheduled for today!';/, let classText = classes.length > 0 \n            ? classes.map(c => \- \ (\) at \\).join('\\n')\n            : 'No classes scheduled for today!';);

// Target the strange message string and replace
content = content.replace(/const message = Current Weather:[^\n]*;/, const message = \Current Weather: \?C ???\\n\\nYour Schedule Today:\\n\\;);

fs.writeFileSync('routes/admin.js', content, 'utf8');
console.log('Fixed routes/admin.js!');
