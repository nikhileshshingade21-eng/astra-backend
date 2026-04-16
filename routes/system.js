const express = require('express');
const router = express.Router();
const { checkVersion } = require('../controllers/versionController');
const { authMiddleware } = require('../middleware');
const { queryAll } = require('../database_module');

// GET /api/system/version (used to be /api/version but we can map the generic route)
router.get('/version', checkVersion);

// POST /api/system/fcm-token
router.post('/user/fcm-token', authMiddleware, async (req, res) => {
    try {
        const { fcm_token } = req.body;
        if (!fcm_token) return res.error('fcm_token required', null, 400);
        await queryAll('UPDATE users SET fcm_token = $1 WHERE id = $2', [fcm_token, req.user.id]);
        res.success(null, 'FCM token synced globally');
    } catch (e) {
        console.error('[FCM] Token save error:', e.message);
        res.error('Failed to save token', null, 500);
    }
});

module.exports = router;
