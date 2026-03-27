const { queryAll } = require('../database_module');

/**
 * Announcement Controller
 * Handles college-wide and section-specific updates.
 */

// Fetch announcements
exports.getAnnouncements = async (req, res) => {
    try {
        const { section } = req.query; // Optional filter
        
        // If section is provided, get announcements for that section OR "All"
        // Otherwise, get all announcements
        let sql = 'SELECT a.*, u.name as author FROM announcements a LEFT JOIN users u ON a.user_id = u.id ';
        const params = [];

        if (section) {
            sql += 'WHERE a.section = $1 OR a.section = \'All\' ';
            params.push(section);
        }

        sql += 'ORDER BY a.created_at DESC LIMIT 50';

        const announcements = await queryAll(sql, params);
        res.json({ success: true, data: announcements });
    } catch (error) {
        console.error('Error fetching announcements:', error);
        res.status(500).json({ success: false, message: 'Server error fetching announcements' });
    }
};

// Create announcement (Teacher/Admin only)
exports.createAnnouncement = async (req, res) => {
    try {
        const { title, content, category, section, image_url } = req.body;
        const userId = req.user.id;
        const userRole = req.user.role;

        // Security Check
        if (userRole !== 'faculty' && userRole !== 'admin') {
            return res.status(403).json({ success: false, message: 'Only faculty can post announcements' });
        }

        if (!title || !content) {
            return res.status(400).json({ success: false, message: 'Title and content are required' });
        }

        const sql = `
            INSERT INTO announcements (title, content, category, section, user_id, image_url)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
        const params = [title, content, category || 'General', section || 'All', userId, image_url];

        const [newAnnouncement] = await queryAll(sql, params);

        res.status(201).json({ success: true, data: newAnnouncement });
    } catch (error) {
        console.error('Error creating announcement:', error);
        res.status(500).json({ success: false, message: 'Server error creating announcement' });
    }
};
