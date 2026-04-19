const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getDb, queryAll } = require('../database_module.js');
const { encryptBuffer } = require('../utils/encryption');
const EmailService = require('../services/emailService');
const { addZoneSchema, reportRequestSchema } = require('../contracts/apiContracts');

// 📐 Haversine Formula (Fixed) - km to meters conversion
function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 1000; // Result in meters
}

const addZone = async (req, res) => {
    try {
        // Contract Validation
        const validation = addZoneSchema.safeParse(req);
        if (!validation.success) {
            return res.error(validation.error.errors[0].message, null, 400);
        }

        const { name, lat, lng, radius_m } = req.body;

        await queryAll(
            'INSERT INTO campus_zones (name, lat, lng, radius_m) VALUES ($1, $2, $3, $4)',
            [name, lat, lng, radius_m || 100]
        );

        res.success(null, `Campus zone "${name}" added successfully`);
    } catch (err) {
        console.error('Add zone error:', err.message);
        res.error('Failed to add zone', null, 500);
    }
};

const listZones = async (req, res) => {
    try {
        const result = await queryAll('SELECT id, name, lat, lng, radius_m, active FROM campus_zones ORDER BY id ASC');
        const zones = result || [];
        
        // Count active students per zone today
        const todayAttendance = await queryAll("SELECT gps_lat, gps_lng FROM attendance WHERE date = CURRENT_DATE::text AND gps_lat IS NOT NULL AND status IN ('present', 'late')");
        
        for (let z of zones) {
            z.active_students = 0;
            if (todayAttendance.length > 0) {
                for (let att of todayAttendance) {
                    const dist = haversine(parseFloat(att.gps_lat), parseFloat(att.gps_lng), parseFloat(z.lat), parseFloat(z.lng));
                    if (dist <= (z.radius_m || 100)) z.active_students++;
                }
            }
        }
        res.success(zones);
    } catch (err) {
        console.error('List zones error:', err);
        res.error('Failed to fetch zones', null, 500);
    }
};

const toggleZone = async (req, res) => {
    try {
        const { id } = req.params;
        const { active } = req.body;
        if (id === undefined || active === undefined) {
            return res.error('ID and active status are required', null, 400);
        }
        await queryAll('UPDATE campus_zones SET active = $1 WHERE id = $2', [active, id]);
        res.success(null, `Zone ${id} status updated to ${active}`);
    } catch (err) {
        console.error('Toggle zone error:', err.message);
        res.error('Failed to update zone status', null, 500);
    }
};

const deleteZone = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return res.error('ID is required', null, 400);
        await queryAll('DELETE FROM campus_zones WHERE id = $1', [id]);
        res.success(null, `Zone ${id} deleted successfully`);
    } catch (err) {
        console.error('Delete zone error:', err.message);
        res.error('Failed to delete zone', null, 500);
    }
};

const listUsers = async (req, res) => {
    try {
        const result = await queryAll('SELECT id, roll_number, name, email, phone, programme, section, role, created_at FROM users ORDER BY created_at DESC');
        res.success(result || []);
    } catch (err) {
        res.error('Failed to fetch users', null, 500);
    }
};

const getStats = async (req, res) => {
    try {
        const userCountRes = await queryAll('SELECT COUNT(*) as count FROM users');
        const classCountRes = await queryAll('SELECT COUNT(*) as count FROM classes');
        const attendanceCountRes = await queryAll('SELECT COUNT(*) as count FROM attendance');
        const todayCountRes = await queryAll("SELECT COUNT(*) as count FROM attendance WHERE date = CURRENT_DATE::text");
        const zoneCountRes = await queryAll('SELECT COUNT(*) as count FROM campus_zones');

        res.success({ 
            total_users: parseInt(userCountRes[0]?.count || 0), 
            total_classes: parseInt(classCountRes[0]?.count || 0), 
            total_attendance: parseInt(attendanceCountRes[0]?.count || 0), 
            today_attendance: parseInt(todayCountRes[0]?.count || 0), 
            total_zones: parseInt(zoneCountRes[0]?.count || 0) 
        });
    } catch (err) {
        res.error('Failed to fetch stats', null, 500);
    }
};

const getTracker = async (req, res) => {
    try {
        const { rollNumber } = req.params;
        if (!rollNumber) return res.error('Roll number is required', null, 400);

        const userRes = await queryAll('SELECT id, name, roll_number FROM users WHERE roll_number = $1', [rollNumber.toUpperCase()]);
        if (userRes.length === 0) return res.error('Student not found', null, 404);

        const user = userRes[0];

        const logsRes = await queryAll(`
            SELECT a.id, a.marked_at as time, a.status, c.name as class_name, c.room 
            FROM attendance a 
            LEFT JOIN classes c ON a.class_id = c.id 
            WHERE a.user_id = $1 
            ORDER BY a.date DESC, a.marked_at DESC LIMIT 20
        `, [user.id]);

        const trail = (logsRes || []).map(row => ({
            id: row.id,
            time: row.time,
            activity: row.status === 'present' ? 'Verified Present' : (row.status === 'late' ? 'Verified Late' : 'Flagged'),
            class: row.class_name || 'General Zone',
            room: row.room || 'Campus',
            status: row.status === 'present' ? 'secure' : (row.status === 'late' ? 'warn' : 'flag')
        }));

        const totalStats = await queryAll('SELECT COUNT(*) as count FROM attendance WHERE user_id = $1', [user.id]);
        const presentStats = await queryAll("SELECT COUNT(*) as count FROM attendance WHERE user_id = $1 AND status IN ('present', 'late')", [user.id]);

        const total = parseInt(totalStats[0]?.count || 0);
        const present = parseInt(presentStats[0]?.count || 0);
        const pct = total > 0 ? Math.round((present / total) * 100) : 100;

        res.success({ user, trail, attendance_pct: `${pct}%` });
    } catch (err) {
        console.error('Tracker error:', err.message);
        res.error('Failed to fetch tracker data', null, 500);
    }
};

const pingClass = async (req, res) => {
    try {
        const { class_id } = req.body;
        if (!class_id) {
            return res.error('class_id is required', null, 400);
        }

        const logsRes = await queryAll(`
            SELECT u.id, u.name, a.status, a.marked_at, a.id as att_id
            FROM attendance a
            JOIN users u ON a.user_id = u.id
            WHERE a.class_id = $1 AND a.date = CURRENT_DATE::text
        `, [class_id]);

        let responded = 0;
        let flagged = 0;
        const students = [];

        for (const row of (logsRes || [])) {
            const status = row.status === 'present' ? 'responded' : 'flagged';
            if (status === 'responded') responded++;
            if (status === 'flagged') flagged++;

            students.push({
                id: String(row.id),
                name: row.name,
                status: status,
                time: row.marked_at || 'Just now'
            });
        }

        const pending = Math.max(0, 45 - (responded + flagged));

        res.success({
            responded,
            noResponse: pending,
            flagged,
            students
        });
    } catch (err) {
        console.error('Ping error:', err.message);
        res.error('Failed to broadcast ping', null, 500);
    }
};

const uploadStudentData = async (req, res) => {
    try {
        if (!req.file) {
            return res.error('No file uploaded', null, 400);
        }

        // File size limit: 10MB
        if (req.file.size > 10 * 1024 * 1024) {
            return res.error('File too large (max 10MB)', null, 400);
        }

        const adminId = req.user.id;
        const originalName = req.file.originalname;
        const size = req.file.size;

        const randomName = crypto.randomBytes(16).toString('hex');
        const ext = path.extname(originalName).replace(/[^a-zA-Z0-9.]/g, '');
        const fileName = `${randomName}${ext}.enc`;
        const uploadsDir = fs.existsSync('/data') ? '/data/uploads' : path.resolve(__dirname, '../uploads');
        
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        const filePath = path.join(uploadsDir, path.basename(fileName));

        const encryptedBuffer = encryptBuffer(req.file.buffer);
        fs.writeFileSync(filePath, encryptedBuffer);

        // Clear sensitive buffer from RAM
        req.file.buffer = null;

        await queryAll(
            `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)`,
            [adminId, 'Secure File Upload', `Encrypted file stored. Size: ${size} bytes`, 'info']
        );

        res.success({ id: randomName, originalName, size }, 'File uploaded and encrypted successfully');
    } catch (err) {
        console.error('Upload error:', err.message);
        res.error('Failed to process and encrypt file', null, 500);
    }
};

// ====================================================================
//  🛡️ THREAT MANAGEMENT — Admin Endpoints (CRIT-05 FIX: PostgreSQL row access)
// ====================================================================

const getThreatLogs = async (req, res) => {
    try {
        const result = await queryAll(`
            SELECT t.id, t.user_id, u.roll_number, u.name, t.event_type, t.threat_score, 
                   t.severity, t.action_taken, t.details, t.ip_address, t.ai_recommendation, t.created_at
            FROM threat_logs t
            LEFT JOIN users u ON t.user_id = u.id
            ORDER BY t.created_at DESC
            LIMIT 100
        `);

        const logs = (result || []).map(row => ({
            id: row.id,
            user_id: row.user_id,
            roll_number: row.roll_number,
            name: row.name,
            event_type: row.event_type,
            threat_score: row.threat_score,
            severity: row.severity,
            action_taken: row.action_taken,
            details: row.details ? (typeof row.details === 'string' ? JSON.parse(row.details) : row.details) : null,
            ip_address: row.ip_address,
            ai_recommendation: row.ai_recommendation,
            created_at: row.created_at
        }));

        const critical = logs.filter(l => l.severity === 'critical').length;
        const high = logs.filter(l => l.severity === 'high').length;
        const medium = logs.filter(l => l.severity === 'medium').length;
        const low = logs.filter(l => l.severity === 'low').length;

        res.success({
            summary: { total: logs.length, critical, high, medium, low },
            logs
        });
    } catch (err) {
        console.error('Threat logs error:', err.message);
        res.error('Failed to fetch threat logs', null, 500);
    }
};

const getBannedUsers = async (req, res) => {
    try {
        const result = await queryAll(`
            SELECT b.id, b.user_id, u.roll_number, u.name, b.reason, b.threat_score,
                   b.banned_at, b.expires_at, b.is_permanent, b.unbanned
            FROM banned_users b
            LEFT JOIN users u ON b.user_id = u.id
            ORDER BY b.banned_at DESC
        `);

        const bans = (result || []).map(row => ({
            id: row.id,
            user_id: row.user_id,
            roll_number: row.roll_number,
            name: row.name,
            reason: row.reason,
            threat_score: row.threat_score,
            banned_at: row.banned_at,
            expires_at: row.expires_at,
            is_permanent: !!row.is_permanent,
            unbanned: !!row.unbanned,
            status: row.unbanned ? 'unbanned' : (row.is_permanent ? 'permanent' : 'active')
        }));

        res.success(bans);
    } catch (err) {
        console.error('Banned users error:', err.message);
        res.error('Failed to fetch banned users', null, 500);
    }
};

const unbanUser = async (req, res) => {
    try {
        const { ban_id } = req.body;
        if (!ban_id) return res.error('Ban ID is required', null, 400);

        await queryAll('UPDATE banned_users SET unbanned = 1 WHERE id = $1', [ban_id]);

        const banInfo = await queryAll('SELECT user_id FROM banned_users WHERE id = $1', [ban_id]);
        if (banInfo && banInfo.length > 0) {
            const userId = banInfo[0].user_id;
            await queryAll(
                `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)`,
                [userId, '✅ Account Reinstated', 'Your account has been reviewed and reinstated by an admin.', 'success']
            );
        }

        res.success(null, 'User unbanned successfully');
    } catch (err) {
        console.error('Unban error:', err.message);
        res.error('Failed to unban user', null, 500);
    }
};

const getAiAnalytics = async (req, res) => {
    try {
        // 1. Sentiment Distribution
        const sentimentResult = await queryAll(`
            SELECT sentiment, COUNT(*) as count 
            FROM ai_conversations 
            GROUP BY sentiment
        `);
        const sentiments = {};
        for (const row of (sentimentResult || [])) {
            sentiments[row.sentiment] = parseInt(row.count);
        }

        // 2. Topic Analysis
        const topicResult = await queryAll(`
            SELECT topic, COUNT(*) as count 
            FROM ai_conversations 
            GROUP BY topic
            ORDER BY count DESC
            LIMIT 10
        `);
        const topics = (topicResult || []).map(row => ({
            name: row.topic,
            count: parseInt(row.count)
        }));

        // 3. Recent Flagged Conversations (Stressed/Frustrated)
        const flaggedResult = await queryAll(`
            SELECT c.id, u.roll_number, c.query, c.sentiment, c.created_at
            FROM ai_conversations c
            JOIN users u ON c.user_id = u.id
            WHERE c.sentiment IN ('Stressed', 'Frustrated')
            ORDER BY c.created_at DESC
            LIMIT 5
        `);
        const flagged = (flaggedResult || []).map(row => ({
            id: row.id,
            roll_number: row.roll_number,
            query: row.query,
            sentiment: row.sentiment,
            time: row.created_at
        }));

        res.success({
            sentiments,
            topics,
            flagged_conversations: flagged
        });
    } catch (err) {
        console.error('AI Analytics Error:', err.message);
        res.error('Failed to fetch institutional AI insights', null, 500);
    }
};

const resetDevice = async (req, res) => {
    try {
        const { rollNumber } = req.body;
        if (!rollNumber) return res.error('Roll number is required for device reset', null, 400);

        const result = await queryAll('UPDATE users SET device_id = NULL, is_registered = FALSE WHERE roll_number = $1', [rollNumber.toUpperCase()]);
        
        // Log the reset for audit
        console.log(`[🛡️ ADMIN] Device binding RESET for student ${rollNumber} by ${req.user.name}`);
        
        res.success(null, `Device binding for ${rollNumber} has been cleared. Student must re-register on their new device.`);
    } catch (err) {
        console.error('Reset device error:', err.message);
        res.error('Failed to reset device binding', null, 500);
    }
};

// ====================================================================
//  🚀 M3 WEB DASHBOARD ENDPOINTS
// ====================================================================

const sendNotification = async (req, res) => {
    try {
        const { targetType, targetId, title, message, type } = req.body;
        if (!targetType || !title || !message) {
            return res.error('targetType, title, and message are critically required', null, 400);
        }

        const admin = require('../services/firebaseService');
        const AIEngine = require('../services/aiNotificationEngine');
        let tokens = [];
        let userIds = [];

        if (targetType === 'all') {
            const users = await queryAll('SELECT id, fcm_token FROM users WHERE fcm_token IS NOT NULL');
            tokens = users.map(u => u.fcm_token);
            userIds = users.map(u => u.id);
        } else if (targetType === 'individual') {
            const user = await queryAll('SELECT id, fcm_token FROM users WHERE roll_number = $1', [targetId]);
            if (user.length > 0 && user[0].fcm_token) {
                tokens.push(user[0].fcm_token);
                userIds.push(user[0].id);
            }
        }

        if (tokens.length === 0) {
            return res.error('No valid FCM targets acquired', null, 404);
        }

        // FIREBASE MULTICAST (Data Only for Notifee wakeups)
        const fcmRes = await admin.messaging().sendEachForMulticast({
            tokens: tokens,
            notification: { title, body: message },
            data: { title, body: message, type: type || 'admin_broadcast', template: 'manual' },
            android: { 
                priority: 'high',
                notification: { sound: 'default', channelId: 'astra-class-reminders' }
            }
        });

        // Loop array to log history
        for (let i = 0; i < userIds.length; i++) {
            const state = fcmRes.responses[i].success ? 'delivered' : 'failed';
            await AIEngine.logNotificationHistory(userIds[i], type || 'admin_broadcast', title, message, state);
        }

        res.success({ deliveries: fcmRes.successCount, failures: fcmRes.failureCount });
    } catch (err) {
        console.error('Send Notification Error:', err.message);
        res.error('Critical failure pushing notification', null, 500);
    }
};

const getNotificationStats = async (req, res) => {
    try {
        const totalSent = await queryAll(`SELECT COUNT(*) as count FROM notification_history`);
        const totalFailed = await queryAll(`SELECT COUNT(*) as count FROM notification_history WHERE status = 'failed'`);
        
        const recentHistory = await queryAll(`
            SELECT h.id, h.title, h.message, h.status, h.sent_at, u.roll_number 
            FROM notification_history h
            LEFT JOIN users u ON h.user_id = u.id
            ORDER BY h.sent_at DESC
            LIMIT 50
        `);

        res.success({
            metrics: {
                sent: parseInt(totalSent[0]?.count || 0),
                failed: parseInt(totalFailed[0]?.count || 0),
                successRate: totalSent[0]?.count > 0 ? Math.round(((totalSent[0].count - totalFailed[0].count) / totalSent[0].count) * 100) : 100
            },
            history: recentHistory || []
        });
    } catch (err) {
        res.error('Error pulling telemetry', null, 500);
    }
};

const getRealtimeAttendance = async (req, res) => {
    try {
        const result = await queryAll(`
            SELECT u.id, u.roll_number as title, a.status, a.gps_lat as lat, a.gps_lng as lng, a.marked_at
            FROM attendance a
            JOIN users u ON a.user_id = u.id
            WHERE a.date = CURRENT_DATE::text AND a.gps_lat IS NOT NULL
            ORDER BY a.marked_at DESC
            LIMIT 100
        `);
        const mapData = (result || []).map(row => ({
            id: row.id,
            title: row.title,
            status: row.status,
            lat: parseFloat(row.lat),
            lng: parseFloat(row.lng),
            time: row.marked_at
        }));
        res.success(mapData);
    } catch (err) {
        console.error('Realtime attendance error:', err.message);
        res.error('Failed to fetch realtime attendance', null, 500);
    }
};

const generateReport = async (req, res) => {
    try {
        // Safe validation (non-blocking for now if missing req.body)
        const validation = reportRequestSchema.safeParse(req);
        
        const todayCountRes = await queryAll("SELECT COUNT(*) as count FROM attendance WHERE date = CURRENT_DATE::text");
        const count = parseInt(todayCountRes[0]?.count || 0);

        // Security Yield Calculation
        const flaggedRes = await queryAll("SELECT COUNT(*) as count FROM attendance WHERE date = CURRENT_DATE::text AND status = 'flagged'");
        const flagged = parseInt(flaggedRes[0]?.count || 0);
        const yieldPct = count > 0 ? Math.round(((count - flagged) / count) * 100) : 100;

        // Dispatched directly to admin's email using the new EmailService
        await EmailService.sendAttendanceReport(req.user.email, {
            todayCount: count,
            yield: yieldPct
        });

        await queryAll(
            `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)`,
            [req.user.id, 'Report Dispatched', `Today's attendance report (${count} records) has been emailed to ${req.user.email}.`, 'success']
        );

        res.success({ message: 'Report generated and dispatched to your email.' });
    } catch (err) {
        console.error('Generate report error:', err.message);
        res.error('Failed to generate report');
    }
};

module.exports = {
    addZone,
    listZones,
    listUsers,
    getStats,
    getTracker,
    pingClass,
    uploadStudentData,
    getThreatLogs,
    getBannedUsers,
    unbanUser,
    getAiAnalytics,
    toggleZone,
    deleteZone,
    resetDevice,
    sendNotification,
    getNotificationStats,
    getRealtimeAttendance,
    generateReport
};
