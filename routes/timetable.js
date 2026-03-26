const express = require('express');
const { authMiddleware } = require('../middleware');
const { getTodayClasses, addClass } = require('../controllers/timetableController');

const router = express.Router();

// GET /api/timetable — Get today's classes
router.get('/', authMiddleware, getTodayClasses);
router.get('/today', authMiddleware, getTodayClasses);

// DIAGNOSTIC (Public - Debug only)
const { getDiagnostic } = require('../controllers/timetableController');
router.get('/diagnostic', getDiagnostic);

module.exports = router;
