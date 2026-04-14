/**
 * ASTRA SMART NOTIFICATION ENGINE v1.0
 * ======================================
 * Production-grade notification system with:
 * - Weather alerts (rain, extreme heat, storms)
 * - Class reminders (10min, 5min, started)
 * - Attendance nudges (low attendance, missed classes)
 * - Engagement triggers (streaks, inactivity, achievements)
 * - Personalized Gen-Z copy with FOMO/urgency/humor
 * 
 * Architecture: Rule Engine → Copy Generator → Delivery Pipeline (DB + Socket.IO + FCM)
 * Anti-spam: Max 5 notifications/day, dedup, cooldown windows
 */

const { queryAll } = require('../database_module');
const socketService = require('./socketService');
const { getLocalDate } = require('../utils/dateUtils');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin SDK for background push notifications
let firebaseReady = false;
const credPath = path.join(__dirname, '..', 'firebase-credentials.json');
if (fs.existsSync(credPath)) {
    try {
        const serviceAccount = require(credPath);
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n').replace(/\r/g, '').trim();
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }
        firebaseReady = true;
    } catch (e) {
        console.error('[NOTIFY_ENGINE] Firebase Init Error:', e.message);
    }
}

// ─── HELPER: Check if today is a system holiday ─────────────────────────────

async function isHolidayToday() {
    try {
        const today = getLocalDate();
        const events = await queryAll(
            'SELECT id FROM academic_calendar WHERE $1 BETWEEN start_date AND end_date AND is_system_holiday = 1 LIMIT 1',
            [today]
        );
        return events.length > 0;
    } catch (err) {
        console.error('[CALENDAR] Holiday check failed:', err.message);
        return false;
    }
}

// ─── NOTIFICATION COPY TEMPLATES (Gen-Z Style) ─────────────────────────────

const COPY = {
    // Weather alerts
    weather_rain: [
        { title: "🌧️ Rain incoming!", body: "Carry an umbrella unless you wanna look like you swam to class 💀" },
        { title: "☔ Bro it's about to pour", body: "Don't get caught in the rain like a main character without a plot 🎬" },
        { title: "🌧️ Weather alert fr", body: "Heavy rain expected. Maybe grab that umbrella you always forget 😭" },
    ],
    weather_storm: [
        { title: "⛈️ STORM WARNING", body: "Thunderstorm alert on campus. Stay indoors, this isn't an anime training arc ⚡" },
        { title: "🌪️ Bruh the weather is ANGRY", body: "Severe weather incoming. Skip the outdoor plans. Seriously." },
    ],
    weather_extreme_heat: [
        { title: "🔥 It's giving OVEN outside", body: "{temp}°C today. Hydrate or diedrate fr 💧" },
        { title: "☀️ Hot girl summer? More like survival mode", body: "{temp}°C. Stay in shade, carry water, don't pass out in class 😵" },
        { title: "🥵 Campus is COOKING today", body: "{temp}°C — sunscreen + water bottle = survival kit. Your skin will thank you later." },
    ],
    weather_cold: [
        { title: "🥶 BRRR it's freezing", body: "{temp}°C. Layer up or freeze up, your choice bestie 🧣" },
    ],
    weather_nice: [
        { title: "🌤️ Perfect campus weather!", body: "{temp}°C with clear skies. Touch grass era activated 🌿" },
    ],

    // Class reminders
    class_10min: [
        { title: "📚 {subject} in 10 mins", body: "Room {room} is calling. Don't be that person who walks in late 💀" },
        { title: "⏰ Heads up!", body: "{subject} starts in 10. Room {room}. Move it or lose it 🏃" },
        { title: "🎯 Class alert", body: "{subject} in 10 mins at {room}. Your seat is getting cold 🪑" },
    ],
    class_5min: [
        { title: "🏃 You should be WALKING", body: "{subject} starts in 5 mins. Room {room}. NOW." },
        { title: "⚡ 5 MIN WARNING", body: "{subject} @ {room}. If you're still in bed, it's over 😭" },
    ],
    class_started: [
        { title: "🔔 {subject} has STARTED", body: "Class is live at {room}. Mark your attendance before it's too late! ✅" },
        { title: "💀 Bro your class started", body: "{subject} @ {room}. Clock is ticking on attendance 🕐" },
    ],

    // Attendance nudges
    attendance_low: [
        { title: "📉 Your attendance is crying", body: "{percentage}% attendance rn. You need {needed} more classes to survive 75%. Don't fumble this 😤" },
        { title: "🚨 Attendance check", body: "You're at {percentage}%. The 75% threshold is looking at you with disappointment 👁️" },
        { title: "😬 This is NOT giving", body: "Your {percentage}% attendance entered the danger zone. Time to be present — literally." },
    ],
    attendance_critical: [
        { title: "🆘 CRITICAL: Attendance alert", body: "You're at {percentage}%. Detention arc unlocked if you don't attend {needed} more classes NOW." },
        { title: "⛔ Bro this is BAD bad", body: "{percentage}% attendance = academic probation zone. Every class matters from here." },
    ],
    attendance_perfect: [
        { title: "👑 PERFECT attendance!", body: "You haven't missed a single class. That's main character energy fr 🔥" },
    ],
    attendance_safe: [
        { title: "✅ You can chill (a bit)", body: "You can safely skip {safe} more classes and stay above 75%. Use wisely 🧠" },
    ],

    // Engagement & streaks
    streak_3: [
        { title: "🔥 3-day streak!", body: "3 days of showing up. That's better than 80% of students. Keep going!" },
    ],
    streak_7: [
        { title: "🏆 WEEK WARRIOR!", body: "7-day attendance streak! You're literally built different 💪" },
    ],
    streak_14: [
        { title: "⭐ LEGENDARY 14-day streak", body: "2 weeks of perfect attendance. Campus legend status unlocked 🌟" },
    ],
    streak_lost: [
        { title: "💔 Streak broken", body: "Your {streak}-day streak just ended. Start a new one today! 🔄" },
    ],

    // Inactivity
    inactive_2d: [
        { title: "👀 We miss you", body: "Haven't seen you in 2 days. Everything ok? Your timetable misses you." },
        { title: "📱 ASTRA is lonely", body: "2 days without opening the app? Don't ghost us bestie 😢" },
    ],
    inactive_5d: [
        { title: "🚨 5 days MIA", body: "You've been gone 5 days. Your attendance is probably not vibing rn. Check in?" },
    ],
    inactive_7d: [
        { title: "📢 Missing person: YOU", body: "7 days without ASTRA? Your classes are happening without you. Come back! 🫠" },
    ],

    // Morning motivation
    morning: [
        { title: "☀️ Good morning!", body: "You have {classCount} classes today. First one at {firstClass}. Let's get this bread 🍞" },
        { title: "🌅 Rise and grind", body: "{classCount} sessions today starting {firstClass}. Today's attendance matters!" },
    ],

    // Night summary
    night_summary: [
        { title: "🌙 Day summary", body: "Today: {attended}/{total} classes attended. {message} Rest up for tomorrow! 💤" },
    ],

    // Achievement notifications
    first_attendance: [
        { title: "🎉 First attendance marked!", body: "Welcome to ASTRA! Your academic journey begins now. Let's keep this going 🚀" },
    ],
    milestone_50: [
        { title: "🏅 50 classes attended!", body: "Half-century! You're showing up and it shows. Keep the momentum 💫" },
    ],
    milestone_100: [
        { title: "💯 100 CLASSES!", body: "You've attended 100 classes. That's dedication. That's discipline. That's YOU 🔥" },
    ],
};

// ─── HELPER: Pick random copy from template ─────────────────────────────────

function pickCopy(templateKey, vars = {}) {
    const templates = COPY[templateKey];
    if (!templates || templates.length === 0) return null;
    const template = templates[Math.floor(Math.random() * templates.length)];
    
    let title = template.title;
    let body = template.body;
    
    for (const [key, value] of Object.entries(vars)) {
        title = title.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
        body = body.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
    }
    
    return { title, body };
}

// ─── ANTI-SPAM: Notification throttling ──────────────────────────────────────

const dailyCounts = new Map(); // userId → { date, count }
const cooldowns = new Map();   // `userId:category` → timestamp

const MAX_DAILY = 5;
const COOLDOWN_MS = {
    weather: 4 * 60 * 60 * 1000,     // 4 hours between weather alerts
    class: 5 * 60 * 1000,            // 5 minutes between class alerts
    attendance: 12 * 60 * 60 * 1000, // 12 hours between attendance nudges
    engagement: 24 * 60 * 60 * 1000, // 24 hours between engagement notifications
    morning: 24 * 60 * 60 * 1000,    // 1 per day
    night: 24 * 60 * 60 * 1000,      // 1 per day
};

function canSendNotification(userId, category) {
    const today = new Date().toISOString().split('T')[0];
    
    // Check daily limit
    const userDay = dailyCounts.get(userId);
    if (userDay && userDay.date === today && userDay.count >= MAX_DAILY) {
        return false;
    }
    
    // Check cooldown
    const cooldownKey = `${userId}:${category}`;
    const lastSent = cooldowns.get(cooldownKey);
    if (lastSent) {
        const cooldownMs = COOLDOWN_MS[category] || 60 * 60 * 1000;
        if (Date.now() - lastSent < cooldownMs) return false;
    }
    
    return true;
}

function recordNotificationSent(userId, category) {
    const today = new Date().toISOString().split('T')[0];
    const userDay = dailyCounts.get(userId) || { date: today, count: 0 };
    if (userDay.date !== today) {
        userDay.date = today;
        userDay.count = 0;
    }
    userDay.count++;
    dailyCounts.set(userId, userDay);
    cooldowns.set(`${userId}:${category}`, Date.now());
}

// ─── CORE: Send notification (DB + Socket.IO + FCM) ─────────────────────────

async function sendSmartNotification(userId, templateKey, vars = {}, category = 'engagement', type = 'info') {
    if (!canSendNotification(userId, category)) return false;
    
    const copy = pickCopy(templateKey, vars);
    if (!copy) return false;
    
    try {
        // 1. Persist to DB
        await queryAll(
            `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)`,
            [userId, copy.title, copy.body, type]
        );
        
        // 2. Real-time push via Socket.IO (instant in-app)
        socketService.emitToUser(userId, 'LIVE_NOTIFICATION', {
            title: copy.title,
            body: copy.body,
            type: category,
            template: templateKey,
            timestamp: new Date().toISOString()
        });
        
        // 3. FCM push (Real background push notifications)
        if (firebaseReady) {
            try {
                const userQuery = await queryAll('SELECT fcm_token FROM users WHERE id = $1', [userId]);
                if (userQuery.length > 0 && userQuery[0].fcm_token) {
                    const fcmRes = await admin.messaging().send({
                        notification: { title: copy.title, body: copy.body },
                        data: { type: category, template: templateKey },
                        token: userQuery[0].fcm_token,
                        android: {
                            priority: 'high',
                            notification: { sound: 'default', channelId: 'astra-class-reminders' },
                        }
                    });
                    console.log(`[FCM] Firebase Message Auth: OK -> ${fcmRes}`);
                } else {
                    console.log(`[FCM] Missing FCM Token for user ${userId}`);
                }
            } catch (fcmErr) {
                console.error(`[FCM] Push failed for user ${userId}:`, fcmErr.message);
            }
        } else {
            console.log(`[FCM] Skiped because firebaseReady is false`);
        }
        
        recordNotificationSent(userId, category);
        console.log(`[NOTIFY] → ${userId}: [${category}] ${copy.title}`);
        return true;
    } catch (err) {
        console.error(`[NOTIFY] Failed for user ${userId}:`, err.message);
        return false;
    }
}


// ─── WEATHER ALERTS ENGINE ──────────────────────────────────────────────────

async function checkWeatherAlerts() {
    try {
        const axios = require('axios');
        const response = await axios.get(
            'https://api.open-meteo.com/v1/forecast?latitude=17.385&longitude=78.4867&current=temperature_2m,weather_code,relative_humidity_2m&timezone=Asia%2FKolkata',
            { timeout: 8000 }
        );
        
        const current = response.data?.current;
        if (!current) return;
        
        const temp = Math.round(current.temperature_2m);
        const code = current.weather_code;
        const humidity = current.relative_humidity_2m;
        
        let alertTemplate = null;
        let alertType = 'info';
        
        // Thunderstorm (codes 95-99)
        if (code >= 95) {
            alertTemplate = 'weather_storm';
            alertType = 'danger';
        }
        // Heavy rain (codes 63-82)
        else if (code >= 63 || (code >= 80 && code <= 82)) {
            alertTemplate = 'weather_rain';
            alertType = 'warning';
        }
        // Light rain/drizzle (codes 51-61)
        else if (code >= 51 && code <= 61) {
            alertTemplate = 'weather_rain';
            alertType = 'warning';
        }
        // Extreme heat (40°C+)
        else if (temp >= 40) {
            alertTemplate = 'weather_extreme_heat';
            alertType = 'warning';
        }
        // Hot (35°C+)
        else if (temp >= 35) {
            alertTemplate = 'weather_extreme_heat';
            alertType = 'info';
        }
        // Cold (<10°C)
        else if (temp < 10) {
            alertTemplate = 'weather_cold';
            alertType = 'info';
        }
        
        if (!alertTemplate) return; // No alert needed
        
        console.log(`[WEATHER ALERT] Triggered: ${alertTemplate} (code=${code}, temp=${temp}°C)`);
        
        // Send to ALL students
        const students = await queryAll("SELECT id FROM users WHERE role = 'student'");
        let sent = 0;
        
        for (const student of students) {
            const didSend = await sendSmartNotification(
                student.id, alertTemplate, { temp, humidity }, 'weather', alertType
            );
            if (didSend) sent++;
        }
        
        console.log(`[WEATHER ALERT] Sent to ${sent}/${students.length} students`);
    } catch (err) {
        console.error('[WEATHER ALERT] Check failed:', err.message);
    }
}

// ─── CLASS NOTIFICATION ENGINE ──────────────────────────────────────────────

async function checkClassNotifications() {
    try {
        if (await isHolidayToday()) {
            console.log('[CLASS NOTIFY] Skipping: Today is a system holiday/exam day.');
            return;
        }

        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istTime = new Date(now.getTime() + istOffset);
        const currentMinutes = istTime.getUTCHours() * 60 + istTime.getUTCMinutes();
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const currentDay = dayNames[istTime.getUTCDay()];
        
        if (currentDay === 'Sunday') return; // No classes on Sunday
        
        // Get all classes for today with student info
        const rows = await queryAll(`
            SELECT u.id as user_id, c.name as subject, c.start_time, c.end_time, c.room, c.code
            FROM users u
            JOIN classes c ON (u.programme = c.programme AND u.section = c.section)
            WHERE u.role = 'student' AND c.day = $1
        `, [currentDay]);
        
        let sent = 0;
        
        for (const row of rows) {
            const classStartMinutes = parseTimeToMinutes(row.start_time);
            const diff = classStartMinutes - currentMinutes;
            const vars = { subject: row.subject, room: row.room || 'TBA', code: row.code };
            
            // 10-minute warning
            if (diff >= 8 && diff <= 12) {
                const didSend = await sendSmartNotification(row.user_id, 'class_10min', vars, 'class', 'info');
                if (didSend) sent++;
            }
            // 5-minute warning  
            else if (diff >= 3 && diff <= 7) {
                const didSend = await sendSmartNotification(row.user_id, 'class_5min', vars, 'class', 'warning');
                if (didSend) sent++;
            }
            // Class started (0-3 min ago)
            else if (diff >= -3 && diff <= 0) {
                const didSend = await sendSmartNotification(row.user_id, 'class_started', vars, 'class', 'warning');
                if (didSend) sent++;
            }
        }
        
        if (sent > 0) console.log(`[CLASS NOTIFY] Sent ${sent} class notifications`);
    } catch (err) {
        console.error('[CLASS NOTIFY] Error:', err.message);
    }
}

// ─── ATTENDANCE NUDGES ENGINE ───────────────────────────────────────────────

async function checkAttendanceNudges() {
    try {
        // Get all students with their attendance stats
        const students = await queryAll(`
            SELECT u.id, u.name, u.programme, u.section,
                   COUNT(a.id) as total,
                   COUNT(CASE WHEN a.status IN ('present', 'late') THEN 1 END) as attended
            FROM users u
            LEFT JOIN attendance a ON u.id = a.user_id
            WHERE u.role = 'student'
            GROUP BY u.id, u.name, u.programme, u.section
        `);
        
        let sent = 0;
        
        for (const student of students) {
            const total = parseInt(student.total) || 0;
            const attended = parseInt(student.attended) || 0;
            
            if (total === 0) continue; // No data yet
            
            const percentage = Math.round((attended / total) * 100);
            const needed = Math.max(0, Math.ceil((0.75 * total - attended) / 0.25));
            const safe = Math.max(0, Math.floor(attended / 0.75 - total));
            
            let templateKey = null;
            let type = 'info';
            
            if (percentage < 60) {
                templateKey = 'attendance_critical';
                type = 'danger';
            } else if (percentage < 75) {
                templateKey = 'attendance_low';
                type = 'warning';
            } else if (percentage === 100 && total >= 10) {
                templateKey = 'attendance_perfect';
                type = 'success';
            } else if (safe >= 3 && percentage >= 80) {
                templateKey = 'attendance_safe';
                type = 'success';
            }
            
            if (templateKey) {
                const didSend = await sendSmartNotification(
                    student.id, templateKey, { percentage, needed, safe }, 'attendance', type
                );
                if (didSend) sent++;
            }
            
            // Milestone checks
            if (attended === 1) {
                await sendSmartNotification(student.id, 'first_attendance', {}, 'engagement', 'success');
            } else if (attended === 50) {
                await sendSmartNotification(student.id, 'milestone_50', {}, 'engagement', 'success');
            } else if (attended === 100) {
                await sendSmartNotification(student.id, 'milestone_100', {}, 'engagement', 'success');
            }
        }
        
        if (sent > 0) console.log(`[ATTENDANCE NUDGE] Sent ${sent} attendance notifications`);
    } catch (err) {
        console.error('[ATTENDANCE NUDGE] Error:', err.message);
    }
}

// ─── MORNING DIGEST ENGINE ─────────────────────────────────────────────────

async function sendMorningDigest() {
    try {
        if (await isHolidayToday()) {
            console.log('[MORNING DIGEST] Skipping: Today is a system holiday/exam day.');
            return;
        }

        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istTime = new Date(now.getTime() + istOffset);
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const currentDay = dayNames[istTime.getUTCDay()];
        
        if (currentDay === 'Sunday') return;
        
        const students = await queryAll(`
            SELECT DISTINCT u.id, u.programme, u.section
            FROM users u WHERE u.role = 'student'
        `);
        
        let sent = 0;
        
        for (const student of students) {
            const classes = await queryAll(`
                SELECT start_time, name FROM classes 
                WHERE programme = $1 AND section = $2 AND day = $3
                ORDER BY start_time ASC
            `, [student.programme, student.section, currentDay]);
            
            if (classes.length === 0) continue;
            
            const firstClass = formatTime(classes[0].start_time);
            const classCount = classes.length;
            
            const didSend = await sendSmartNotification(
                student.id, 'morning', { classCount, firstClass }, 'morning', 'info'
            );
            if (didSend) sent++;
        }
        
        console.log(`[MORNING DIGEST] Sent to ${sent} students`);
    } catch (err) {
        console.error('[MORNING DIGEST] Error:', err.message);
    }
}

// ─── STREAK ENGINE ──────────────────────────────────────────────────────────

async function checkStreaks() {
    try {
        const students = await queryAll(`
            SELECT u.id, u.name FROM users u WHERE u.role = 'student'
        `);
        
        for (const student of students) {
            const dates = await queryAll(`
                SELECT DISTINCT date FROM attendance 
                WHERE user_id = $1 ORDER BY date DESC LIMIT 30
            `, [student.id]);
            
            if (dates.length === 0) continue;
            
            // Calculate current streak
            let streak = 0;
            const today = new Date();
            for (let i = 0; i < dates.length; i++) {
                const expected = new Date(today);
                expected.setDate(expected.getDate() - i);
                const expectedStr = expected.toISOString().split('T')[0];
                if (dates[i].date === expectedStr) {
                    streak++;
                } else {
                    break;
                }
            }
            
            // Send streak notifications at milestones
            if (streak === 3) {
                await sendSmartNotification(student.id, 'streak_3', {}, 'engagement', 'success');
            } else if (streak === 7) {
                await sendSmartNotification(student.id, 'streak_7', {}, 'engagement', 'success');
            } else if (streak === 14) {
                await sendSmartNotification(student.id, 'streak_14', {}, 'engagement', 'success');
            }
        }
    } catch (err) {
        console.error('[STREAK ENGINE] Error:', err.message);
    }
}

// ─── INACTIVITY DETECTOR ────────────────────────────────────────────────────

async function checkInactiveUsers() {
    try {
        // Find students who haven't had any attendance in X days
        const students = await queryAll(`
            SELECT u.id, u.name, 
                   MAX(a.date) as last_active,
                   CURRENT_DATE - MAX(a.date)::date as days_inactive
            FROM users u
            LEFT JOIN attendance a ON u.id = a.user_id
            WHERE u.role = 'student'
            GROUP BY u.id, u.name
            HAVING MAX(a.date) IS NOT NULL
        `);
        
        for (const student of students) {
            const days = parseInt(student.days_inactive) || 0;
            
            if (days === 2) {
                await sendSmartNotification(student.id, 'inactive_2d', {}, 'engagement', 'info');
            } else if (days === 5) {
                await sendSmartNotification(student.id, 'inactive_5d', {}, 'engagement', 'warning');
            } else if (days === 7) {
                await sendSmartNotification(student.id, 'inactive_7d', {}, 'engagement', 'warning');
            }
        }
    } catch (err) {
        console.error('[INACTIVITY] Error:', err.message);
    }
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

function parseTimeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.split(':').map(Number);
    return (parts[0] || 0) * 60 + (parts[1] || 0);
}

function formatTime(timeStr) {
    if (!timeStr) return 'N/A';
    const [h, m] = timeStr.split(':');
    let hours = parseInt(h);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${m} ${ampm}`;
}

// ─── EXPORTS ────────────────────────────────────────────────────────────────

module.exports = {
    sendSmartNotification,
    checkWeatherAlerts,
    checkClassNotifications,
    checkAttendanceNudges,
    sendMorningDigest,
    checkStreaks,
    checkInactiveUsers,
    pickCopy,
    COPY,
};
