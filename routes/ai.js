const express = require('express');
const { authMiddleware } = require('../middleware');
const { getAiReport, verifyIdentity } = require('../controllers/aiController');

const router = express.Router();

router.get('/report/:rollNumber', authMiddleware, getAiReport);
router.post('/verify', verifyIdentity);

module.exports = router;
