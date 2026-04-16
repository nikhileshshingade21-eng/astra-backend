const { queryAll } = require('../database_module');

/**
 * Tenant Controller
 * Manages institutional branding and configuration.
 */

// Get current tenant config
exports.getTenantConfig = async (req, res) => {
    try {
        const sql = 'SELECT * FROM tenant_config WHERE is_active = TRUE ORDER BY updated_at DESC LIMIT 1';
        const [config] = await queryAll(sql);
        
        if (!config) {
            // Default fallback if no config exists
            return res.success({
                institution_name: 'Astra Institute',
                primary_color: '#bf00ff',
                secondary_color: '#00f2ff',
                logo_url: '/assets/logo.png',
                welcome_msg: 'Welcome to the Astra Secure Session'
            });
        }
        
        res.success(config);
    } catch (error) {
        console.error('Error fetching tenant config:', error);
        res.error('Server error fetching tenant config', null, 500);
    }
};

// Update tenant config (Admin only)
exports.updateTenantConfig = async (req, res) => {
    try {
        const { institution_name, primary_color, secondary_color, logo_url, welcome_msg } = req.body;
        
        if (req.user.role !== 'admin') {
            return res.error('Admin access required', null, 403);
        }

        const sql = `
            INSERT INTO tenant_config (institution_name, primary_color, secondary_color, logo_url, welcome_msg)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const params = [institution_name, primary_color, secondary_color, logo_url, welcome_msg];

        const [newConfig] = await queryAll(sql, params);
        res.success(newConfig, 'Tenant configuration updated');
    } catch (error) {
        console.error('Error updating tenant config:', error);
        res.error('Server error updating tenant config', null, 500);
    }
};
