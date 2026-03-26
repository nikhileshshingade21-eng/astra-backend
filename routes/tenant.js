const express = require('express');
const router = express.Router();
const { getTenantConfig, updateTenantConfig } = require('../controllers/tenantController');
const { authMiddleware: protect } = require('../middleware');

// Public route to get branding for login screen
router.get('/config', getTenantConfig);

// Protected route to update config
router.post('/config', protect, updateTenantConfig);

module.exports = router;
