const express = require('express');
const { authMiddleware } = require('../middleware');
const { getDashboardStats } = require('../controllers/dashboardController');

const router = express.Router();

// GET /api/dashboard/stats — Get dashboard stats (matches frontend call)
router.get('/stats', authMiddleware, getDashboardStats);

// GET /api/dashboard — Alias for stats
router.get('/', authMiddleware, getDashboardStats);

module.exports = router;
