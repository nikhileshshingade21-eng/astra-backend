const express = require('express');
const { authMiddleware } = require('../middleware');
const { addMark, getMyMarks, getClassMarks } = require('../controllers/marksController');

const router = express.Router();

router.post('/', authMiddleware, addMark);
router.get('/me', authMiddleware, getMyMarks);
router.get('/class/:classId', authMiddleware, getClassMarks);

module.exports = router;
