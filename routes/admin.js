const express = require('express');
const multer = require('multer');
const { authMiddleware } = require('../middleware');
const { addZone, listZones, listUsers, getStats, getTracker, pingClass, uploadStudentData, getThreatLogs, getBannedUsers, unbanUser, toggleZone, deleteZone, resetDevice, getRealtimeAttendance, generateReport } = require('../controllers/adminController');

// Multer Configuration for Secure Uploads
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

// POST /api/admin/zone – Add a campus zone
router.post('/zone', authMiddleware, adminOnly, addZone);

// GET /api/admin/zones – List all campus zones
router.get('/zones', authMiddleware, adminOnly, listZones);

// PUT /api/admin/zones/:id/toggle – Toggle zone activation
router.put('/zones/:id/toggle', authMiddleware, adminOnly, toggleZone);

// DELETE /api/admin/zones/:id – Delete a zone
router.delete('/zones/:id', authMiddleware, adminOnly, deleteZone);

// GET /api/admin/users – List all users
router.get('/users', authMiddleware, adminOnly, listUsers);

// GET /api/admin/stats – Overall stats
router.get('/stats', authMiddleware, adminOnly, getStats);

// GET /api/admin/tracker/:rollNumber – Get student activity trail
router.get('/tracker/:rollNumber', authMiddleware, adminOnly, getTracker);

// GET /api/admin/realtime-attendance – Get real-time campus map data
router.get('/realtime-attendance', authMiddleware, adminOnly, getRealtimeAttendance);

// POST /api/admin/ping – Broadcast a silent ping to a class
router.post('/ping', authMiddleware, adminOnly, pingClass);

// POST /api/admin/upload – Securely upload and encrypt student data files
router.post('/upload', authMiddleware, adminOnly, upload.single('file'), uploadStudentData);

// THREAT MANAGEMENT ROUTES
// GET /api/admin/threats – View all threat events (AI scored)
router.get('/threats', authMiddleware, adminOnly, getThreatLogs);

// GET /api/admin/bans – View all banned/locked users
router.get('/bans', authMiddleware, adminOnly, getBannedUsers);

// POST /api/admin/unban – Lift a ban (admin review)
router.post('/unban', authMiddleware, adminOnly, unbanUser);

// POST /api/admin/reset-device – Clear device binding for a student
router.post('/reset-device', authMiddleware, adminOnly, resetDevice);

// WEB DASHBOARD NOTIFICATION ENDPOINTS
const { sendNotification, getNotificationStats } = require('../controllers/adminController');

// POST /api/admin/send-notification – Trigger a backend broadcast
router.post('/send-notification', authMiddleware, adminOnly, sendNotification);

// GET /api/admin/notification-stats – Read AI Tracker metrics
router.get('/notification-stats', authMiddleware, adminOnly, getNotificationStats);

// POST /api/admin/generate-report – Generate and email a report
router.post('/generate-report', authMiddleware, adminOnly, generateReport);

router.get('/force-notify', async (req, res) => {
    try {
        const admin = require('../services/firebaseService');
        const { queryAll } = require('../database_module');
        
        const user = await queryAll("SELECT id, fcm_token, programme, section FROM users WHERE roll_number = '25N81A6258'");
        if (!user.length || !user[0].fcm_token) return res.send('No token');
        
        const adminUser = user[0];
        
        // Fetch Weather
        const fetch = require('node-fetch');
        const weatherRes = await fetch('https://api.open-meteo.com/v1/forecast?latitude=17.385&longitude=78.4867&current=temperature_2m');
        const weatherData = await weatherRes.json();
        const temp = weatherData.current ? Math.round(weatherData.current.temperature_2m) : 28;
        
        // Dynamic day detection
        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istTime = new Date(now.getTime() + istOffset);
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const currentDay = dayNames[istTime.getUTCDay()];
        
        // Fetch Classes — FIXED: Use PostgreSQL $1/$2 syntax
        const classes = await queryAll(
            "SELECT name, start_time, room FROM classes WHERE programme = $1 AND section = $2 AND day = $3 ORDER BY start_time ASC",
            [adminUser.programme, adminUser.section, currentDay]
        );

        let classText = classes.length > 0 
            ? classes.map(c => `- ${c.name} (${c.room || 'TBA'}) at ${c.start_time}`).join('\n')
            : 'No classes scheduled for today!';

        const message = `Current Weather: ${temp}°C 🌤️\n\nYour Schedule Today (${currentDay}):\n${classText}`;

        const fcmRes = await admin.messaging().send({
            token: adminUser.fcm_token,
            notification: { title: 'ASTRA Direct', body: message },
            data: { title: 'ASTRA Direct', body: message, type: 'admin_broadcast', template: 'manual' },
            android: { priority: 'high', notification: { sound: 'default', channelId: 'astra-high-priority' } }
        });

        res.json({ success: true, messageId: fcmRes });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/debug-env', (req, res) => {
    const envVal = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    let parseError = null;
    let isObj = false;

    if (envVal) {
        try {
            JSON.parse(envVal);
            isObj = true;
        } catch (e) {
            parseError = e.message;
        }
    }

    res.json({
        exists: !!envVal,
        length: envVal ? envVal.length : 0,
        startsWith: envVal ? envVal.substring(0, 10) : null,
        endsWith: envVal ? envVal.substring(envVal.length - 10) : null,
        parseSuccess: isObj,
        parseError: parseError,
        rawString: envVal
    });
});

router.get('/firebase-status', (req, res) => {
    const admin = require('firebase-admin');
    let errMessage = null;
    let serviceAccount = null;

    try {
        const envVal = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
        if (envVal) {
            serviceAccount = JSON.parse(envVal);
            
            // Re-use cleanPEM logic locally
            let key = serviceAccount.private_key;
            let cleaned = key.replace(/\\n/g, '\n').replace(/\\/g, '');
            const header = "-----BEGIN PRIVATE KEY-----";
            const footer = "-----END PRIVATE KEY-----";
            if (cleaned.includes(header) && cleaned.includes(footer)) {
                const body = cleaned.substring(cleaned.indexOf(header) + header.length, cleaned.indexOf(footer));
                const cleanBody = body.replace(/[^A-Za-z0-9+/=]/g, '');
                const lines = cleanBody.match(/.{1,64}/g) || [];
                serviceAccount.private_key = `${header}\n${lines.join('\n')}\n${footer}`;
            }

            // Test init
            if (admin.apps.length === 0) {
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount)
                });
            }
        }
    } catch (e) {
        errMessage = e.message;
    }

    res.json({
        appsCount: admin.apps.length,
        error: errMessage,
        hasProjectId: !!(serviceAccount && serviceAccount.project_id),
        hasKey: !!(serviceAccount && serviceAccount.private_key),
        keyLength: serviceAccount && serviceAccount.private_key ? serviceAccount.private_key.length : 0
    });
});

router.post('/fix-firebase', express.json(), (req, res) => {
    const fs = require('fs');
    const path = require('path');
    try {
        const payload = req.body;
        if (!payload || !payload.private_key) {
            return res.status(400).json({ error: "Invalid payload missing private_key" });
        }
        
        const targetPath = path.join(__dirname, '..', 'firebase-credentials.json');
        fs.writeFileSync(targetPath, JSON.stringify(payload, null, 2));
        
        // Return success
        res.json({ success: true, message: "Credentials permanently saved to root directory!", path: targetPath });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
