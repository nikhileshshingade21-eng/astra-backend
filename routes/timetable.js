const express = require('express');
const { authMiddleware } = require('../middleware');
const { getTodayClasses, addClass } = require('../controllers/timetableController');

const router = express.Router();

// GET /api/timetable — Get today's classes
router.get('/', authMiddleware, getTodayClasses);
router.get('/today', authMiddleware, getTodayClasses);

// POST /api/timetable/class — Add a class (faculty/admin)
router.post('/class', authMiddleware, addClass);

module.exports = router;
