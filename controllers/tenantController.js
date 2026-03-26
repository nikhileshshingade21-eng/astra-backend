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
            return res.json({
                success: true,
                data: {
                    institution_name: 'Astra Institute',
                    primary_color: '#bf00ff',
                    secondary_color: '#00f2ff',
                    logo_url: '/assets/logo.png',
                    welcome_msg: 'Welcome to the Astra Secure Session'
                }
            });
        }
        
        res.json({ success: true, data: config });
    } catch (error) {
        console.error('Error fetching tenant config:', error);
        res.status(500).json({ success: false, message: 'Server error fetching tenant config' });
    }
};

// Update tenant config (Admin only)
exports.updateTenantConfig = async (req, res) => {
    try {
        const { institution_name, primary_color, secondary_color, logo_url, welcome_msg } = req.body;
        
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }

        const sql = `
            INSERT INTO tenant_config (institution_name, primary_color, secondary_color, logo_url, welcome_msg)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const params = [institution_name, primary_color, secondary_color, logo_url, welcome_msg];

        const [newConfig] = await queryAll(sql, params);
        res.status(201).json({ success: true, data: newConfig });
    } catch (error) {
        console.error('Error updating tenant config:', error);
        res.status(500).json({ success: false, message: 'Server error updating tenant config' });
    }
};
