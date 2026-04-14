const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getDb, queryAll } = require('../database_module.js');
const { encryptBuffer } = require('../utils/encryption');

const addZone = async (req, res) => {
    try {
        const { name, lat, lng, radius_m } = req.body;
        if (!name || lat === undefined || lat === null || lng === undefined || lng === null) {
            return res.status(400).json({ error: 'Name, lat, lng are required' });
        }
        if (typeof lat !== 'number' || typeof lng !== 'number' || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
            return res.status(400).json({ error: 'Invalid coordinates' });
        }
        if (typeof name !== 'string' || name.length > 100) {
            return res.status(400).json({ error: 'Zone name must be under 100 characters' });
        }

        await queryAll(
            'INSERT INTO campus_zones (name, lat, lng, radius_m) VALUES ($1, $2, $3, $4)',
            [name, lat, lng, radius_m || 100]
        );

        res.json({ success: true, message: `Campus zone "${name}" added` });
    } catch (err) {
        console.error('Add zone error:', err.message);
        res.status(500).json({ error: 'Failed to add zone' });
    }
};

const listZones = async (req, res) => {
    try {
        const result = await queryAll('SELECT id, name, lat, lng, radius_m, active FROM campus_zones ORDER BY id ASC');
        res.json({ zones: result || [] });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch zones' });
    }
};

const toggleZone = async (req, res) => {
    try {
        const { id } = req.params;
        const { active } = req.body;
        if (id === undefined || active === undefined) {
            return res.status(400).json({ error: 'ID and active status are required' });
        }
        await queryAll('UPDATE campus_zones SET active = $1 WHERE id = $2', [active, id]);
        res.json({ success: true, message: `Zone ${id} status updated to ${active}` });
    } catch (err) {
        console.error('Toggle zone error:', err.message);
        res.status(500).json({ error: 'Failed to update zone status' });
    }
};

const deleteZone = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ error: 'ID is required' });
        await queryAll('DELETE FROM campus_zones WHERE id = $1', [id]);
        res.json({ success: true, message: `Zone ${id} deleted` });
    } catch (err) {
        console.error('Delete zone error:', err.message);
        res.status(500).json({ error: 'Failed to delete zone' });
    }
};

const listUsers = async (req, res) => {
    try {
        const result = await queryAll('SELECT id, roll_number, name, email, phone, programme, section, role, created_at FROM users ORDER BY created_at DESC');
        res.json({ users: result || [] });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

const getStats = async (req, res) => {
    try {
        const userCountRes = await queryAll('SELECT COUNT(*) as count FROM users');
        const classCountRes = await queryAll('SELECT COUNT(*) as count FROM classes');
        const attendanceCountRes = await queryAll('SELECT COUNT(*) as count FROM attendance');
        const todayCountRes = await queryAll("SELECT COUNT(*) as count FROM attendance WHERE date = CURRENT_DATE::text");
        const zoneCountRes = await queryAll('SELECT COUNT(*) as count FROM campus_zones');

        res.json({ 
            total_users: parseInt(userCountRes[0]?.count || 0), 
            total_classes: parseInt(classCountRes[0]?.count || 0), 
            total_attendance: parseInt(attendanceCountRes[0]?.count || 0), 
            today_attendance: parseInt(todayCountRes[0]?.count || 0), 
            total_zones: parseInt(zoneCountRes[0]?.count || 0) 
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
};

const getTracker = async (req, res) => {
    try {
        const { rollNumber } = req.params;
        if (!rollNumber || typeof rollNumber !== 'string') {
            return res.status(400).json({ error: 'Roll number is required' });
        }

        const userRes = await queryAll('SELECT id, name, roll_number FROM users WHERE roll_number = $1', [rollNumber.toUpperCase()]);
        if (userRes.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }

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

        res.json({ user, trail, attendance_pct: `${pct}%` });
    } catch (err) {
        console.error('Tracker error:', err.message);
        res.status(500).json({ error: 'Failed to fetch tracker data' });
    }
};

const pingClass = async (req, res) => {
    try {
        const { class_id } = req.body;
        if (!class_id) {
            return res.status(400).json({ error: 'class_id is required' });
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

        res.json({
            success: true,
            results: {
                responded,
                noResponse: pending,
                flagged,
                students
            }
        });
    } catch (err) {
        console.error('Ping error:', err.message);
        res.status(500).json({ error: 'Failed to broadcast ping' });
    }
};

const uploadStudentData = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // File size limit: 10MB
        if (req.file.size > 10 * 1024 * 1024) {
            return res.status(400).json({ error: 'File too large (max 10MB)' });
        }

        const adminId = req.user.id;
        const originalName = req.file.originalname;
        const size = req.file.size;

        const randomName = crypto.randomBytes(16).toString('hex');
        const ext = path.extname(originalName).replace(/[^a-zA-Z0-9.]/g, '');
        const fileName = `${randomName}${ext}.enc`;
        const uploadsDir = path.resolve(__dirname, '../uploads');
        
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

        res.json({
            success: true,
            message: 'File uploaded and encrypted successfully',
            file: { id: randomName, originalName, size }
        });
    } catch (err) {
        console.error('Upload error:', err.message);
        res.status(500).json({ error: 'Failed to process and encrypt file' });
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

        res.json({
            summary: { total: logs.length, critical, high, medium, low },
            logs
        });
    } catch (err) {
        console.error('Threat logs error:', err.message);
        res.status(500).json({ error: 'Failed to fetch threat logs' });
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

        res.json({ bans });
    } catch (err) {
        console.error('Banned users error:', err.message);
        res.status(500).json({ error: 'Failed to fetch banned users' });
    }
};

const unbanUser = async (req, res) => {
    try {
        const { ban_id } = req.body;
        if (!ban_id) return res.status(400).json({ error: 'Ban ID is required' });

        await queryAll('UPDATE banned_users SET unbanned = 1 WHERE id = $1', [ban_id]);

        const banInfo = await queryAll('SELECT user_id FROM banned_users WHERE id = $1', [ban_id]);
        if (banInfo && banInfo.length > 0) {
            const userId = banInfo[0].user_id;
            await queryAll(
                `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)`,
                [userId, '✅ Account Reinstated', 'Your account has been reviewed and reinstated by an admin.', 'success']
            );
        }

        res.json({ success: true, message: 'User unbanned successfully' });
    } catch (err) {
        console.error('Unban error:', err.message);
        res.status(500).json({ error: 'Failed to unban user' });
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

        res.json({
            sentiments,
            topics,
            flagged_conversations: flagged
        });
    } catch (err) {
        console.error('AI Analytics Error:', err.message);
        res.status(500).json({ error: 'Failed to fetch institutional AI insights' });
    }
};

const resetDevice = async (req, res) => {
    try {
        const { rollNumber } = req.body;
        if (!rollNumber) return res.status(400).json({ error: 'Roll number is required for device reset' });

        const result = await queryAll('UPDATE users SET device_id = NULL, is_registered = FALSE WHERE roll_number = $1', [rollNumber.toUpperCase()]);
        
        // Log the reset for audit
        console.log(`[🛡️ ADMIN] Device binding RESET for student ${rollNumber} by ${req.user.name}`);
        
        res.json({ success: true, message: `Device binding for ${rollNumber} has been cleared. Student must re-register on their new device.` });
    } catch (err) {
        console.error('Reset device error:', err.message);
        res.status(500).json({ error: 'Failed to reset device binding' });
    }
};

// ====================================================================
//  🚀 M3 WEB DASHBOARD ENDPOINTS
// ====================================================================

const sendNotification = async (req, res) => {
    try {
        const { targetType, targetId, title, message, type } = req.body;
        if (!targetType || !title || !message) {
            return res.status(400).json({ error: 'targetType, title, and message are critically required' });
        }

        const admin = require('firebase-admin');
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
            return res.status(404).json({ error: 'No valid FCM targets acquired' });
        }

        // FIREBASE MULTICAST (Data Only for Notifee wakeups)
        const fcmRes = await admin.messaging().sendEachForMulticast({
            tokens: tokens,
            data: { title, body: message, type: type || 'admin_broadcast', template: 'manual' },
            android: { priority: 'high' }
        });

        // Loop array to log history
        for (let i = 0; i < userIds.length; i++) {
            const state = fcmRes.responses[i].success ? 'delivered' : 'failed';
            await AIEngine.logNotificationHistory(userIds[i], type || 'admin_broadcast', title, message, state);
        }

        res.json({ success: true, deliveries: fcmRes.successCount, failures: fcmRes.failureCount });
    } catch (err) {
        console.error('Send Notification Error:', err.message);
        res.status(500).json({ error: 'Critical failure pushing notification' });
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

        res.json({
            success: true,
            metrics: {
                sent: parseInt(totalSent[0]?.count || 0),
                failed: parseInt(totalFailed[0]?.count || 0),
                successRate: totalSent[0]?.count > 0 ? Math.round(((totalSent[0].count - totalFailed[0].count) / totalSent[0].count) * 100) : 100
            },
            history: recentHistory || []
        });
    } catch (err) {
        res.status(500).json({ error: 'Error pulling telemetry' });
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
    getNotificationStats
};
