const express = require('express');
const { authMiddleware } = require('../middleware');
const { getJobs, getRecommendations, addJob } = require('../controllers/placementController');

const router = express.Router();

// Placement routes
router.get('/', authMiddleware, getJobs);
router.get('/recommend', authMiddleware, getRecommendations);  // AI Endpoint
router.post('/', authMiddleware, addJob);                     // Admin only

module.exports = router;
