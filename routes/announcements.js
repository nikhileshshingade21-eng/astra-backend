const express = require('express');
const router = express.Router();
const { getAnnouncements, createAnnouncement } = require('../controllers/announcementController');
const { authMiddleware, adminMiddleware } = require('../middleware');

// GET /api/announcements
router.get('/', authMiddleware, getAnnouncements);

// POST /api/announcements (Admin Only)
router.post('/', authMiddleware, adminMiddleware, createAnnouncement);

module.exports = router;
