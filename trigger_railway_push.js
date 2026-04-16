require('dotenv').config();
const { queryAll } = require('./database_module.js');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

async function trigger() {
    try {
        // 1. Generate Admin Token for the user
        const users = await queryAll(`SELECT id, roll_number, programme, section FROM users WHERE roll_number = '25N81A6258'`);
        if (users.length === 0) throw new Error("User not found");
        const adminUser = users[0];
        const token = jwt.sign(
            { id: adminUser.id, role: 'admin' },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '1h' }
        );

        // 2. Fetch Weather
        const weatherRes = await fetch('https://api.open-meteo.com/v1/forecast?latitude=17.385&longitude=78.4867&current=temperature_2m,weather_code');
        const weatherData = await weatherRes.json();
        const temp = weatherData.current ? Math.round(weatherData.current.temperature_2m) : '28';
        
        // 3. Fetch Classes for today (Wednesday)
        // Note: Today is Wednesday
        const classes = await queryAll(`
            SELECT name, start_time, room 
            FROM classes 
            WHERE programme = $1 AND section = $2 AND day = 'Wednesday'
            ORDER BY start_time ASC
        `, [adminUser.programme, adminUser.section]);

        let classText = classes.length > 0 
            ? classes.map(c => `• ${c.name} (${c.start_time}) at ${c.room || 'TBA'}`).join('\n')
            : "No classes scheduled for today!";

        const messageBody = `Current Weather: ${temp}°C 🌤️\n\nYour Schedule Today:\n${classText}`;

        console.log("Sending Payload:", JSON.stringify({ title: "ASTRA Daily Briefing", messageBody }, null, 2));

        // 4. Hit the Railway Production API
        const response = await fetch('https://astra-backend-production-a16d.up.railway.app/api/admin/send-notification', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                targetType: 'individual',
                targetId: '25N81A6258',
                title: 'ASTRA Daily Briefing',
                message: messageBody,
                type: 'admin_broadcast'
            })
        });

        const result = await response.json();
        console.log("Railway API Response:", result);
    } catch (e) {
        console.error("Error:", e);
    } finally {
        process.exit(0);
    }
}

trigger();
