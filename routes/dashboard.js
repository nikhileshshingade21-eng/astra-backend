const express = require('express');
const { authMiddleware } = require('../middleware');
const { getDashboardStats } = require('../controllers/dashboardController');

const router = express.Router();

// GET /api/dashboard — Get dashboard stats for the logged-in user
router.get('/', authMiddleware, getDashboardStats);

module.exports = router;
