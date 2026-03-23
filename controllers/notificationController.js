const { getDb, queryAll } = require('../database_module.js');

const getNotifications = async (req, res) => {
    try {
        const db = await getDb();
        const result = await queryAll(
            `SELECT id, title, message, type, is_read, created_at 
             FROM notifications WHERE user_id = $1 
             ORDER BY created_at DESC LIMIT 30`,
            [req.user.id]
        );

        // Unread count
        const unreadResult = await queryAll(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = 0',
            [req.user.id]
        );
        const unread = unreadResult.length ? parseInt(unreadResult[0].count) : 0;

        res.json({ notifications: result || [], unread });
    } catch (err) {
        console.error('Notifications error:', err);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
};

const markAsRead = async (req, res) => {
    try {
        const db = await getDb();
        await queryAll('UPDATE notifications SET is_read = 1 WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update' });
    }
};

const markAllAsRead = async (req, res) => {
    try {
        const db = await getDb();
        await queryAll('UPDATE notifications SET is_read = 1 WHERE user_id = $1', [req.user.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update' });
    }
};

module.exports = {
    getNotifications,
    markAsRead,
    markAllAsRead
};
