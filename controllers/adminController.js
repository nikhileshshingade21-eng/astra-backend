const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getDb, saveDb, queryAll } = require('../db');
const { encryptBuffer } = require('../utils/encryption');

const addZone = async (req, res) => {
// ... existing code ...
    try {
        const { name, lat, lng, radius_m } = req.body;
        if (!name || !lat || !lng) {
            return res.status(400).json({ error: 'Name, lat, lng are required' });
        }

        const db = await getDb();
        db.run(
            'INSERT INTO campus_zones (name, lat, lng, radius_m) VALUES (?, ?, ?, ?)',
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
        const result = queryAll('SELECT id, name, lat, lng, radius_m FROM campus_zones');
        const zones = [];
        if (result.length && result[0].values.length) {
            for (const row of result[0].values) {
                zones.push({ id: row[0], name: row[1], lat: row[2], lng: row[3], radius_m: row[4] });
            }
        }
        res.json({ zones });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch zones' });
    }
};

const listUsers = async (req, res) => {
    try {
        const db = await getDb();
        const result = queryAll('SELECT id, roll_number, name, email, phone, programme, section, role, created_at FROM users ORDER BY created_at DESC');
        const users = [];
        if (result.length && result[0].values.length) {
            for (const row of result[0].values) {
                users.push({
                    id: row[0], roll_number: row[1], name: row[2], email: row[3],
                    phone: row[4], programme: row[5], section: row[6], role: row[7], created_at: row[8]
                });
            }
        }
        res.json({ users });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

const getStats = async (req, res) => {
    try {
        const db = await getDb();
        const userCount = queryAll('SELECT COUNT(*) FROM users')[0]?.values[0][0] || 0;
        const classCount = queryAll('SELECT COUNT(*) FROM classes')[0]?.values[0][0] || 0;
        const attendanceCount = queryAll('SELECT COUNT(*) FROM attendance')[0]?.values[0][0] || 0;
        const todayCount = queryAll("SELECT COUNT(*) FROM attendance WHERE date = date('now')")[0]?.values[0][0] || 0;
        const zoneCount = queryAll('SELECT COUNT(*) FROM campus_zones')[0]?.values[0][0] || 0;

        res.json({ total_users: userCount, total_classes: classCount, total_attendance: attendanceCount, today_attendance: todayCount, total_zones: zoneCount });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
};

const getTracker = async (req, res) => {
    try {
        const { rollNumber } = req.params;
        const db = await getDb();

        // Find user by roll check
        const userRes = queryAll('SELECT id, name, roll_number FROM users WHERE roll_number = ?', [rollNumber.toUpperCase()]);
        if (!userRes.length || !userRes[0].values.length) {
            return res.status(404).json({ error: 'Student not found' });
        }

        const user = {
            id: userRes[0].values[0][0],
            name: userRes[0].values[0][1],
            roll_number: userRes[0].values[0][2]
        };

        // Fetch attendance logs for user
        const logsRes = queryAll(`
            SELECT a.id, a.marked_at, a.status, c.name, c.room 
            FROM attendance a 
            LEFT JOIN classes c ON a.class_id = c.id 
            WHERE a.user_id = ? 
            ORDER BY a.date DESC, a.marked_at DESC LIMIT 20
        `, [user.id]);

        const trail = [];
        if (logsRes.length && logsRes[0].values.length) {
            for (const row of logsRes[0].values) {
                trail.push({
                    id: row[0],
                    time: row[1],
                    activity: row[2] === 'present' ? 'Verified Present' : (row[2] === 'late' ? 'Verified Late' : 'Flagged'),
                    class: row[3] || 'General Zone',
                    room: row[4] || 'Campus',
                    status: row[2] === 'present' ? 'secure' : (row[2] === 'late' ? 'warn' : 'flag')
                });
            }
        }

        let totalStats = queryAll('SELECT COUNT(*) FROM attendance WHERE user_id = ?', [user.id]);
        let presentStats = queryAll('SELECT COUNT(*) FROM attendance WHERE user_id = ? AND status IN ("present", "late")', [user.id]);

        const total = totalStats.length ? totalStats[0].values[0][0] : 0;
        const present = presentStats.length ? presentStats[0].values[0][0] : 0;
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

        const logsRes = queryAll(`
            SELECT u.id, u.name, a.status, a.marked_at, a.id as att_id
            FROM attendance a
            JOIN users u ON a.user_id = u.id
            WHERE a.class_id = ? AND a.date = date('now')
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
        const ext = path.extname(originalName);
        const fileName = `${randomName}${ext}.enc`;
        const filePath = path.join(__dirname, '../uploads', fileName);

        // Encrypt the RAM buffer
        const encryptedBuffer = encryptBuffer(req.file.buffer);

        // Save to disk
        fs.writeFileSync(filePath, encryptedBuffer);

        // Clear sensitive buffer from RAM
        req.file.buffer = null;

        // Log the event (Simulated audit log in DB)
        const db = await getDb();
        db.run(
            `INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)`,
            [adminId, 'Secure File Upload', `Encrypted file ${originalName} stored as ${fileName}. Size: ${size} bytes`, 'info']
        );
        saveDb();

        res.json({
            success: true,
            message: 'File uploaded and encrypted successfully',
            file: {
                name: fileName,
                originalName: originalName,
                path: `/uploads/${fileName}`
            }
        });
    } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ error: 'Failed to process and encrypt file' });
    }
};

module.exports = {
    addZone,
    listZones,
    listUsers,
    getStats,
    getTracker,
    pingClass,
    uploadStudentData
};
