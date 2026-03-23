const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');
const { getDb, queryAll } = require('../database_module.js');
const axios = require('axios');

const REDIS_URL = process.env.REDIS_URL; // Only connect if this is provided

let connection = null;
let intelQueue = { add: async () => console.warn('[REDIS] BullMQ Offline: Skipping job.') };
let worker = null;

if (REDIS_URL) {
    try {
        console.log('[REDIS] Initializing connection to:', REDIS_URL);
        connection = new Redis(REDIS_URL, {
            maxRetriesPerRequest: null,
            enableOfflineQueue: false,
            connectTimeout: 5000,
            retryStrategy: () => null // Stop after first failure
        });

        connection.on('error', (err) => {
            console.warn('[REDIS] Connection Error:', err.message);
        });

        intelQueue = new Queue('astra-intelligence', { connection });
        intelQueue.on('error', (err) => console.warn('[REDIS] Queue Error:', err.message));

        worker = new Worker('astra-intelligence', async job => {
            console.log(`[ASTRA V3] Executing Job: ${job.name}`);
            if (job.name === 'attendance-risk-check') return await handleAttendanceRisk();
            if (job.name === 'weekly-report-gen') return await handleWeeklyReports();
        }, { connection });

        worker.on('error', (err) => console.warn('[REDIS] Worker Error:', err.message));
        
        console.log('[REDIS] BullMQ Stack Ready.');
    } catch (err) {
        console.warn('[REDIS] Initial BullMQ setup failed:', err.message);
        connection = null;
    }
} else {
    console.log('[REDIS] No REDIS_URL provided. Background jobs disabled (Offline Mode).');
}

// --- Autonomous Handlers (PostgreSQL Compatible) ---

async function handleAttendanceRisk() {
    try {
        const rows = await queryAll(`
            SELECT u.id, u.name, u.roll_number
            FROM users u
            JOIN (
                SELECT user_id, AVG(CASE WHEN status IN ('present', 'late') THEN 1 ELSE 0 END) as avg_att
                FROM (
                    SELECT user_id, status, 
                           ROW_NUMBER() OVER(PARTITION BY user_id ORDER BY date DESC) as rn
                    FROM attendance
                ) t
                WHERE rn <= 3
                GROUP BY user_id
            ) att_stats ON u.id = att_stats.user_id
            WHERE att_stats.avg_att < 0.50
        `);

        if (rows && rows.length) {
            for (const student of rows) {
                console.log(`[ASTRA V3] Proactive Alert for: ${student.roll_number}`);
                const aiResponse = await axios.post(`${process.env.AI_ENGINE_URL || 'http://localhost:8000'}/api/chat`, {
                    user_id: student.id,
                    message: `SYSTEM_ALERT: Student has critically low attendance. Generate a supportive 1-sentence intervention.`
                }).catch(() => ({ data: { response: 'Keep going! Consistency is key to your success.' } }));

                await queryAll(
                    `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)`,
                    [student.id, '🛡️ ASTRA Proactive Support', aiResponse.data.response, 'warning']
                );
            }
        }
        return { success: true, count: rows.length };
    } catch (err) {
        console.error('Attendance Risk Worker Error:', err.message);
        return { success: false, error: err.message };
    }
}

async function handleWeeklyReports() {
    try {
        const students = await queryAll('SELECT id, name, roll_number FROM users WHERE role = $1', ['student']);
        for (const student of students) {
            const attRows = await queryAll(`SELECT count(*) as count FROM attendance WHERE user_id = $1 AND date > CURRENT_DATE - INTERVAL '7 days'`, [student.id]);
            const marksRows = await queryAll('SELECT AVG(marks_obtained / total_marks) as avg_marks FROM marks WHERE user_id = $1', [student.id]);
            
            const stats = {
                attendance_count: attRows[0]?.count || 0,
                avg_marks: marksRows[0]?.avg_marks || 0
            };

            const aiResponse = await axios.post(`${process.env.AI_ENGINE_URL || 'http://localhost:8000'}/api/chat`, {
                user_id: student.id,
                message: `SYSTEM_WEEKLY_REPORT: Stats: ${JSON.stringify(stats)}. Generate a supportive 1-sentence weekly encouragement.`
            }).catch(() => ({ data: { response: 'Great work this week! Check your stats in the app.' } }));

            await queryAll(
                'INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)',
                [student.id, '📈 Your ASTRA Weekly Report', aiResponse.data.response, 'success']
            );
        }
        return { success: true, count: students.length };
    } catch (err) {
        console.error('Weekly Report Worker Error:', err.message);
        return { success: false, error: err.message };
    }
}

async function scheduleV3Jobs() {
    if (!connection || !intelQueue || typeof intelQueue.add !== 'function') return;
    try {
        await intelQueue.add('attendance-risk-check', {}, { 
            repeat: { cron: '0 * * * *' },
            jobId: 'daily-att-risk'
        });
        console.log('[ASTRA V3] Autonomous Schedules Active.');
    } catch (err) {
        console.error('[ASTRA V3] Scheduling failed:', err.message);
    }
}

module.exports = { intelQueue, scheduleV3Jobs };
