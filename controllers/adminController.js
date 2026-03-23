const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getDb, queryAll, saveDb } = require('../database_module.js');
const { encryptBuffer } = require('../utils/encryption');

const addZone = async (req, res) => {
// ... existing code ...
    try {
        const { name, lat, lng, radius_m } = req.body;
        if (!name || lat === undefined || lat === null || lng === undefined || lng === null) {
            return res.status(400).json({ error: 'Name, lat, lng are required' });
        }
        if (typeof lat !== 'number' || typeof lng !== 'number' || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
            return res.status(400).json({ error: 'Invalid coordinates' });
        }

        const db = await getDb();
        await queryAll(
            'INSERT INTO campus_zones (name, lat, lng, radius_m) VALUES ($1, $2, $3, $4)',
            [name, lat, lng, radius_m || 100]
        );
        saveDb();

        res.json({ success: true, message: `Campus zone "${name}" added` });
    } catch (err) {
        console.error('Add zone error:', err);
        res.status(500).json({ error: 'Failed to add zone' });
    }
};

const listZones = async (req, res) => {
    try {
        const db = await getDb();
        const result = await queryAll('SELECT id, name, lat, lng, radius_m FROM campus_zones');
        res.json({ zones: result });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch zones' });
    }
};

const listUsers = async (req, res) => {
    try {
        const db = await getDb();
        const result = await queryAll('SELECT id, roll_number, name, email, phone, programme, section, role, created_at FROM users ORDER BY created_at DESC');
        res.json({ users: result });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

const getStats = async (req, res) => {
    try {
        const db = await getDb();
        const userCountRes = await queryAll('SELECT COUNT(*) as count FROM users');
        const classCountRes = await queryAll('SELECT COUNT(*) as count FROM classes');
        const attendanceCountRes = await queryAll('SELECT COUNT(*) as count FROM attendance');
        const todayCountRes = await queryAll("SELECT COUNT(*) as count FROM attendance WHERE date = CURRENT_DATE::text");
        const zoneCountRes = await queryAll('SELECT COUNT(*) as count FROM campus_zones');

        res.json({ 
            total_users: parseInt(userCountRes[0].count), 
            total_classes: parseInt(classCountRes[0].count), 
            total_attendance: parseInt(attendanceCountRes[0].count), 
            today_attendance: parseInt(todayCountRes[0].count), 
            total_zones: parseInt(zoneCountRes[0].count) 
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
};

const getTracker = async (req, res) => {
    try {
        const { rollNumber } = req.params;
        const db = await getDb();

        // Find user by roll check
        const userRes = await queryAll('SELECT id, name, roll_number FROM users WHERE roll_number = $1', [rollNumber.toUpperCase()]);
        if (userRes.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }

        const user = userRes[0];

        // Fetch attendance logs for user
        const logsRes = await queryAll(`
            SELECT a.id, a.marked_at as time, a.status, c.name as class_name, c.room 
            FROM attendance a 
            LEFT JOIN classes c ON a.class_id = c.id 
            WHERE a.user_id = $1 
            ORDER BY a.date DESC, a.marked_at DESC LIMIT 20
        `, [user.id]);

        const trail = logsRes.map(row => ({
            id: row.id,
            time: row.time,
            activity: row.status === 'present' ? 'Verified Present' : (row.status === 'late' ? 'Verified Late' : 'Flagged'),
            class: row.class_name || 'General Zone',
            room: row.room || 'Campus',
            status: row.status === 'present' ? 'secure' : (row.status === 'late' ? 'warn' : 'flag')
        }));

        let totalStats = await queryAll('SELECT COUNT(*) as count FROM attendance WHERE user_id = $1', [user.id]);
        let presentStats = await queryAll('SELECT COUNT(*) as count FROM attendance WHERE user_id = $1 AND status IN (\'present\', \'late\')', [user.id]);

        const total = totalStats.length ? parseInt(totalStats[0].count) : 0;
        const present = presentStats.length ? parseInt(presentStats[0].count) : 0;
        const pct = total > 0 ? Math.round((present / total) * 100) : 100;

        res.json({ user, trail, attendance_pct: `${pct}%` });
    } catch (err) {
        console.error('Tracker error:', err);
        res.status(500).json({ error: 'Failed to fetch tracker data' });
    }
};

const pingClass = async (req, res) => {
    try {
        const { class_id } = req.body;
        const db = await getDb();

        // This simulates gathering instant responses, but in reality 
        // we will fetch who is currently marked present for this class today.

        const logsRes = await queryAll(`
            SELECT u.id, u.name, a.status, a.marked_at, a.id as att_id
            FROM attendance a
            JOIN users u ON a.user_id = u.id
            WHERE a.class_id = $1 AND a.date = CURRENT_DATE::text
        `, [class_id || 1]);

        let responded = 0;
        let flagged = 0;
        let pending = 0; // Simulate some absent students
        const students = [];

        if (logsRes.length && logsRes[0].values.length) {
            for (const row of logsRes[0].values) {
                const status = row[2] === 'present' ? 'responded' : 'flagged';
                if (status === 'responded') responded++;
                if (status === 'flagged') flagged++;

                students.push({
                    id: String(row[0]),
                    name: row[1],
                    status: status,
                    time: row[3] || 'Just now'
                });
            }
        }

        // Simulated pending/absent count
        pending = Math.max(0, 45 - (responded + flagged));

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
        console.error('Ping error:', err);
        res.status(500).json({ error: 'Failed to broadcast ping' });
    }
};

const uploadStudentData = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const adminId = req.user.id;
        const originalName = req.file.originalname;
        const mimeType = req.file.mimetype;
        const size = req.file.size;

        // Phase 2: Encryption and Storage
        const randomName = crypto.randomBytes(16).toString('hex');
        const ext = path.extname(originalName).replace(/[^a-zA-Z0-9.]/g, ''); // Sanitize extension
        const fileName = `${randomName}${ext}.enc`;
        const uploadsDir = path.resolve(__dirname, '../uploads');
        
        // Ensure uploads directory exists
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        // Path traversal prevention
        const filePath = path.join(uploadsDir, path.basename(fileName));

        // Encrypt the RAM buffer
        const encryptedBuffer = encryptBuffer(req.file.buffer);

        // Save to disk
        fs.writeFileSync(filePath, encryptedBuffer);

        // Clear sensitive buffer from RAM
        req.file.buffer = null;

        // Log the event (Simulated audit log in DB)
        const db = await getDb();
        await queryAll(
            `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)`,
            [adminId, 'Secure File Upload', `Encrypted file ${originalName} stored as ${fileName}. Size: ${size} bytes`, 'info']
        );
        saveDb();

        res.json({
            success: true,
            message: 'File uploaded and encrypted successfully',
            file: {
                id: randomName,
                originalName: originalName,
                size: size
            }
        });
    } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ error: 'Failed to process and encrypt file' });
    }
};

// ====================================================================
//  🛡️ THREAT MANAGEMENT — Admin Endpoints
// ====================================================================

const getThreatLogs = async (req, res) => {
    try {
        const db = await getDb();
        const result = await queryAll(`
            SELECT t.id, t.user_id, u.roll_number, u.name, t.event_type, t.threat_score, 
                   t.severity, t.action_taken, t.details, t.ip_address, t.ai_recommendation, t.created_at
            FROM threat_logs t
            LEFT JOIN users u ON t.user_id = u.id
            ORDER BY t.created_at DESC
            LIMIT 100
        `);

        const logs = [];
        if (result.length && result[0].values.length) {
            for (const row of result[0].values) {
                logs.push({
                    id: row[0], user_id: row[1], roll_number: row[2], name: row[3],
                    event_type: row[4], threat_score: row[5], severity: row[6],
                    action_taken: row[7], details: row[8] ? JSON.parse(row[8]) : null,
                    ip_address: row[9], ai_recommendation: row[10], created_at: row[11]
                });
            }
        }

        // Summary stats
        const critical = logs.filter(l => l.severity === 'critical').length;
        const high = logs.filter(l => l.severity === 'high').length;
        const medium = logs.filter(l => l.severity === 'medium').length;
        const low = logs.filter(l => l.severity === 'low').length;

        res.json({
            summary: { total: logs.length, critical, high, medium, low },
            logs
        });
    } catch (err) {
        console.error('Threat logs error:', err);
        res.status(500).json({ error: 'Failed to fetch threat logs' });
    }
};

const getBannedUsers = async (req, res) => {
    try {
        const db = await getDb();
        const result = await queryAll(`
            SELECT b.id, b.user_id, u.roll_number, u.name, b.reason, b.threat_score,
                   b.banned_at, b.expires_at, b.is_permanent, b.unbanned
            FROM banned_users b
            LEFT JOIN users u ON b.user_id = u.id
            ORDER BY b.banned_at DESC
        `);

        const bans = [];
        if (result.length && result[0].values.length) {
            for (const row of result[0].values) {
                bans.push({
                    id: row[0], user_id: row[1], roll_number: row[2], name: row[3],
                    reason: row[4], threat_score: row[5], banned_at: row[6],
                    expires_at: row[7], is_permanent: !!row[8], unbanned: !!row[9],
                    status: row[9] ? 'unbanned' : (row[8] ? 'permanent' : 'active')
                });
            }
        }

        res.json({ bans });
    } catch (err) {
        console.error('Banned users error:', err);
        res.status(500).json({ error: 'Failed to fetch banned users' });
    }
};

const unbanUser = async (req, res) => {
    try {
        const { ban_id } = req.body;
        if (!ban_id) return res.status(400).json({ error: 'Ban ID is required' });

        const db = await getDb();
        await queryAll('UPDATE banned_users SET unbanned = 1 WHERE id = $1', [ban_id]);
        saveDb();

        // Notify the user
        const banInfo = await queryAll('SELECT user_id FROM banned_users WHERE id = $1', [ban_id]);
        if (banInfo.length && banInfo[0].values.length) {
            const userId = banInfo[0].values[0][0];
            await queryAll(
                `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)`,
                [userId, '✅ Account Reinstated', 'Your account has been reviewed and reinstated by an admin.', 'success']
            );
            saveDb();
        }

        res.json({ success: true, message: 'User unbanned successfully' });
    } catch (err) {
        console.error('Unban error:', err);
        res.status(500).json({ error: 'Failed to unban user' });
    }
};

const getAiAnalytics = async (req, res) => {
    try {
        const db = await getDb();
        
        // 1. Sentiment Distribution
        const sentimentResult = await queryAll(`
            SELECT sentiment, COUNT(*) as count 
            FROM ai_conversations 
            GROUP BY sentiment
        `);
        const sentiments = {};
        if (sentimentResult.length && sentimentResult[0].values.length) {
            for (const row of sentimentResult[0].values) {
                sentiments[row[0]] = row[1];
            }
        }

        // 2. Topic Analysis
        const topicResult = await queryAll(`
            SELECT topic, COUNT(*) as count 
            FROM ai_conversations 
            GROUP BY topic
            ORDER BY count DESC
            LIMIT 10
        `);
        const topics = [];
        if (topicResult.length && topicResult[0].values.length) {
            for (const row of topicResult[0].values) {
                topics.push({ name: row[0], count: row[1] });
            }
        }

        // 3. Recent Flagged Conversations (Stressed/Frustrated)
        const flaggedResult = await queryAll(`
            SELECT c.id, u.roll_number, c.query, c.sentiment, c.created_at
            FROM ai_conversations c
            JOIN users u ON c.user_id = u.id
            WHERE c.sentiment IN ('Stressed', 'Frustrated')
            ORDER BY c.created_at DESC
            LIMIT 5
        `);
        const flagged = [];
        if (flaggedResult.length && flaggedResult[0].values.length) {
            for (const row of flaggedResult[0].values) {
                flagged.push({ id: row[0], roll_number: row[1], query: row[2], sentiment: row[3], time: row[4] });
            }
        }

        res.json({
            sentiments,
            topics,
            flagged_conversations: flagged
        });
    } catch (err) {
        console.error('AI Analytics Error:', err);
        res.status(500).json({ error: 'Failed to fetch institutional AI insights' });
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
    getAiAnalytics
};
