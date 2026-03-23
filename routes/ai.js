const express = require('express');
const multer = require('multer');
const { authMiddleware } = require('../middleware');
const { getAiReport, verifyIdentity, chat, uploadFile } = require('../controllers/aiController');

// Configure static local storage for multer before proxying
const upload = multer({ dest: 'uploads/' });

const router = express.Router();

router.get('/report/:rollNumber', authMiddleware, getAiReport);
router.post('/verify', verifyIdentity);
router.post('/chat', authMiddleware, chat);
router.post('/upload', authMiddleware, upload.single('file'), uploadFile);

module.exports = router;
