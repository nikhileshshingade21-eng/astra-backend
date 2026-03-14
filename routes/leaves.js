const express = require('express');
const { authMiddleware } = require('../middleware');
const { applyLeave, getMyLeaves, getPendingLeaves, updateLeaveStatus } = require('../controllers/leaveController');

const router = express.Router();

router.post('/apply', authMiddleware, applyLeave);
router.get('/me', authMiddleware, getMyLeaves);
router.get('/pending', authMiddleware, getPendingLeaves);
router.put('/:id/status', authMiddleware, updateLeaveStatus);

module.exports = router;
