const express = require('express');
const { authMiddleware } = require('../middleware');
const { mark, getHistory, getLiveAttendance, manualMark, getAttendanceStats } = require('../controllers/attendanceController');

const router = express.Router();

// POST /api/attendance/mark — Mark attendance with GPS verification
router.post('/mark', authMiddleware, mark);

// POST /api/attendance/manual — Faculty manual override
router.post('/manual', authMiddleware, manualMark);

// GET /api/attendance/history — Get attendance history
router.get('/history', authMiddleware, getHistory);

// GET /api/attendance/stats — Get attendance summary stats for the user
router.get('/stats', authMiddleware, getAttendanceStats);

// GET /api/attendance/live/:classId — Get live attendance for faculty
router.get('/live/:classId', authMiddleware, getLiveAttendance);

module.exports = router;
