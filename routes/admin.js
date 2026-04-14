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

module.exports = router;
