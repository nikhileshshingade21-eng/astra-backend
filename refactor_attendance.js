const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'controllers', 'attendanceController.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add imports at the very beginning
const imports = `const { SOCKET_EVENTS } = require('../sockets/socketContracts');
const { sendNotification } = require('../services/notificationEngine');
`;
if (!content.includes('SOCKET_EVENTS')) {
    content = imports + content;
}

// 2. Replace all res.status(403).json(...) with res.error(..., ..., 403)
content = content.replace(/return res\.status\(403\)\.json\(\{\s*error:\s*'([^']+)'(?:,\s*message:\s*'([^']+)')?(.*?)\s*\}\);/g, (match, err, msg, rest) => {
    return `return res.error('${err}'${msg ? ` + ' - ' + '${msg}' : ''}, { message: '${msg || ''}' ${rest.replace(/^,/, '')} }, 403);`; // Note: naive regex might fail if backticks are used. Let's do a safer string replace.
});

// A safer approach: parse the code and use standard regex
content = content.replace(/return res.status\(403\).json\(\{[\s\S]*?\}\);/g, match => {
    // extract everything inside json()
    const inner = match.substring(match.indexOf('json(') + 5, match.lastIndexOf(')'));
    // we want to return res.error('Error Code', { full payload }, 403)
    return `return res.error('Access Denied', ${inner}, 403);`;
});

content = content.replace(/return res.status\(400\).json\(\{[\s\S]*?\}\);/g, match => {
    const inner = match.substring(match.indexOf('json(') + 5, match.lastIndexOf(')'));
    return `return res.error('Bad Request', ${inner}, 400);`;
});

content = content.replace(/res.status\(500\).json\(\{[\s\S]*?\}\);/g, match => {
    const inner = match.substring(match.indexOf('json(') + 5, match.lastIndexOf(')'));
    return `res.error('Internal Server Error', ${inner}, 500);`;
});

// Remove lines 131-133 because Zod handles req.body validation now
content = content.replace(/if \(gps_lat === undefined \|\| gps_lat === null \|\| gps_lng === undefined \|\| gps_lng === null\) \{[\s\S]*?GPS coordinates are required[\s\S]*?\}/g, '');

// Fix success responses
content = content.replace(/return res.json\(\{([\s\S]*?success: true,[\s\S]*?)\}\);/g, match => {
    const inner = match.substring(match.indexOf('json(') + 5, match.lastIndexOf(')'));
    return `return res.success(${inner});`;
});
content = content.replace(/res.json\(\{([\s\S]*?success: true,[\s\S]*?)\}\);/g, match => {
    const inner = match.substring(match.indexOf('json(') + 5, match.lastIndexOf(')'));
    return `res.success(${inner});`;
});
content = content.replace(/res.json\(\{([\s\S]*?records: result[\s\S]*?)\}\);/g, match => {
    const inner = match.substring(match.indexOf('json(') + 5, match.lastIndexOf(')'));
    return `res.success(${inner});`;
});
content = content.replace(/res.json\(result\);/g, 'res.success(result);');

// Replace Socket Broadcast signature
content = content.replace(/socketService.broadcastToClass\(class_id, 'ATTENDANCE_MARKED'/g, "socketService.broadcastToClass(class_id, SOCKET_EVENTS.ATTENDANCE_MARKED");

// Add notification push
const pushNotificationCode = `
        // Push Notification using Centralized notification engine
        if (class_id) {
            const classInfo = await queryAll('SELECT name FROM classes WHERE id = $1', [class_id]);
            if (classInfo.length > 0) {
                sendNotification(req.user.id, 'ATTENDANCE_SUCCESS', { class_name: classInfo[0].name });
            }
        }`;

// Insert just before the final res.success in mark
content = content.replace(/res\.success\(\{\s*success: true,\s*status,/g, match => {
    return pushNotificationCode + '\n        ' + match;
});

fs.writeFileSync(filePath, content, 'utf8');
console.log('Refactoring complete.');
