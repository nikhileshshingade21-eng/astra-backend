const express = require('express');
const { authMiddleware } = require('../middleware');
const { getNotifications, markAsRead, markAllAsRead } = require('../controllers/notificationController');

const router = express.Router();

// GET /api/notifications — Get user notifications
router.get('/', authMiddleware, getNotifications);

// PUT /api/notifications/read/:id — Mark as read
router.put('/read/:id', authMiddleware, markAsRead);

// PUT /api/notifications/read-all — Mark all as read
router.put('/read-all', authMiddleware, markAllAsRead);

module.exports = router;
