const { queryAll } = require('../database_module');
const { announcementSchema } = require('../contracts/apiContracts');
const { getIo } = require('../services/socketService');
const { SOCKET_EVENTS, formatSocketPayload } = require('../sockets/socketContracts');

/**
 * Announcement Controller
 * Handles college-wide and section-specific updates.
 */

// Fetch announcements
exports.getAnnouncements = async (req, res) => {
    try {
        const { section } = req.query; // Optional filter
        
        let sql = 'SELECT a.*, u.name as author FROM announcements a LEFT JOIN users u ON a.user_id = u.id ';
        const params = [];

        if (section && section !== 'All') {
            sql += 'WHERE a.section = $1 OR a.section = \'All\' ';
            params.push(section);
        }

        sql += 'ORDER BY a.created_at DESC LIMIT 50';

        const announcements = await queryAll(sql, params);
        res.success({ announcements: announcements || [] });
    } catch (error) {
        console.error('Error fetching announcements:', error);
        res.error('Server error fetching announcements', null, 500);
    }
};

// Create announcement (Teacher/Admin only)
exports.createAnnouncement = async (req, res) => {
    try {
        // Contract Validation
        const validation = announcementSchema.safeParse(req);
        if (!validation.success) {
            return res.error(validation.error.errors[0].message, null, 400);
        }

        const { title, content, category, section, image_url } = req.body;
        const userId = req.user.id;
        const userRole = req.user.role;

        // Security Check
        if (userRole !== 'faculty' && userRole !== 'admin') {
            return res.error('Only faculty and admins can post announcements', null, 403);
        }

        const sql = `
            INSERT INTO announcements (title, content, category, section, user_id, image_url)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
        const params = [title, content, category || 'General', section || 'All', userId, image_url];

        const [newAnnouncement] = await queryAll(sql, params);

        // 🚀 Real-time Broadcast: Notify all connected students
        try {
            const io = getIo();
            io.emit(SOCKET_EVENTS.LIVE_NOTIFICATION, formatSocketPayload(SOCKET_EVENTS.LIVE_NOTIFICATION, {
                title: `New Announcement: ${title}`,
                body: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
                type: 'announcement',
                category: category || 'General'
            }));
        } catch (socketErr) {
            console.error('[SOCKET] Failed to broadcast announcement:', socketErr.message);
        }

        res.success(newAnnouncement, 'Announcement created successfully');
    } catch (error) {
        console.error('Error creating announcement:', error);
        res.error('Server error creating announcement', null, 500);
    }
};

