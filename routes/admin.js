const express = require('express');
const multer = require('multer');
const { authMiddleware } = require('../middleware');
const { addZone, listZones, listUsers, getStats, getTracker, pingClass, uploadStudentData, getThreatLogs, getBannedUsers, unbanUser, toggleZone, deleteZone, resetDevice } = require('../controllers/adminController');

// Multer Configuration for Secure Uploads (Phase 1)
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB Limit
        files: 1 // Single file only
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/pdf',
            'text/csv',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('INVALID_FILE_TYPE: Only PDF, CSV, DOCX, and XLSX are accepted.'));
        }
    }
});

const router = express.Router();

// Admin-only middleware
function adminOnly(req, res, next) {
    if (req.user.role !== 'admin' && req.user.role !== 'faculty') {
        return res.status(403).json({ error: 'Admin or faculty access required' });
    }
    next();
}

// POST /api/admin/zone — Add a campus zone
router.post('/zone', authMiddleware, adminOnly, addZone);

// GET /api/admin/zones — List all campus zones
router.get('/zones', authMiddleware, adminOnly, listZones);

// PUT /api/admin/zones/:id/toggle — Toggle zone activation
router.put('/zones/:id/toggle', authMiddleware, adminOnly, toggleZone);

// DELETE /api/admin/zones/:id — Delete a zone
router.delete('/zones/:id', authMiddleware, adminOnly, deleteZone);

// GET /api/admin/users — List all users
router.get('/users', authMiddleware, adminOnly, listUsers);

// GET /api/admin/stats — Overall stats
router.get('/stats', authMiddleware, adminOnly, getStats);

// GET /api/admin/tracker/:rollNumber — Get student activity trail
router.get('/tracker/:rollNumber', authMiddleware, adminOnly, getTracker);

// POST /api/admin/ping — Broadcast a silent ping to a class
router.post('/ping', authMiddleware, adminOnly, pingClass);

// POST /api/admin/upload — Securely upload and encrypt student data files
router.post('/upload', authMiddleware, adminOnly, upload.single('file'), uploadStudentData);

// 🛡️ THREAT MANAGEMENT ROUTES
// GET /api/admin/threats — View all threat events (AI scored)
router.get('/threats', authMiddleware, adminOnly, getThreatLogs);

// GET /api/admin/bans — View all banned/locked users
router.get('/bans', authMiddleware, adminOnly, getBannedUsers);

// POST /api/admin/unban — Lift a ban (admin review)
router.post('/unban', authMiddleware, adminOnly, unbanUser);

// POST /api/admin/reset-device — Clear device binding for a student
router.post('/reset-device', authMiddleware, adminOnly, resetDevice);

// 🚀 M3 WEB DASHBOARD NOTIFICATION ENDPOINTS
const { sendNotification, getNotificationStats } = require('../controllers/adminController');

// POST /api/admin/send-notification — Trigger a backend broadcast
router.post('/send-notification', authMiddleware, adminOnly, sendNotification);

// GET /api/admin/notification-stats — Read AI Tracker metrics
router.get('/notification-stats', authMiddleware, adminOnly, getNotificationStats);

module.exports = router;

router.get('/force-notify', async (req, res) => {
    try {
        const admin = require('firebase-admin');
        const { queryAll } = require('../database_module');
        
        const user = await queryAll(SELECT id, fcm_token, programme, section FROM users WHERE roll_number = '25N81A6258');
        if (!user.length || !user[0].fcm_token) return res.send('No token');
        
        const adminUser = user[0];
        
        // Fetch Weather
        const fetch = require('node-fetch');
        const weatherRes = await fetch('https://api.open-meteo.com/v1/forecast?latitude=17.385&longitude=78.4867&current=temperature_2m');
        const weatherData = await weatherRes.json();
        const temp = weatherData.current ? Math.round(weatherData.current.temperature_2m) : 28;
        
        // Fetch Classes
        const classes = await queryAll(
            SELECT name, start_time, room 
            FROM classes 
            WHERE programme =  AND section =  AND day = 'Wednesday'
            ORDER BY start_time ASC
        , [adminUser.programme, adminUser.section]);

        let classText = classes.length > 0 
            ? classes.map(c => �  () at ).join('\\n')
            : 'No classes scheduled for today!';

        const message = Current Weather: �C ???\\n\\nYour Schedule Today:\\n;

        const fcmRes = await admin.messaging().send({
            token: adminUser.fcm_token,
            notification: { title: 'ASTRA Direct (Railway)', body: message },
            data: { title: 'ASTRA Direct (Railway)', body: message, type: 'admin_broadcast', template: 'manual' },
            android: { priority: 'high', notification: { sound: 'default', channelId: 'astra-high-priority' } }
        });

        res.json({ success: true, messageId: fcmRes });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

