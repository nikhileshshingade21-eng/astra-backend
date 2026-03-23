const express = require('express');
const router = express.Router();
const { createApprovalRequest, getPendingApprovals, respondToApproval } = require('../controllers/aiApprovalController');
const { authMiddleware } = require('../middleware');

router.post('/request', authMiddleware, createApprovalRequest);
router.get('/pending', authMiddleware, getPendingApprovals);
router.post('/respond', authMiddleware, respondToApproval);

module.exports = router;
