const { getDb, queryAll } = require('../database_module.js');

const getNotifications = async (req, res) => {
    try {
        const db = await getDb();
        
        // 🧹 Auto-delete notifications older than 7 days
        await queryAll(
            `DELETE FROM notifications WHERE user_id = $1 AND created_at < NOW() - INTERVAL '7 days'`,
            [req.user.id]
        );

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

        res.success({ notifications: result || [], unread });
    } catch (err) {
        console.error('Notifications error:', err);
        res.error('Failed to fetch notifications', null, 500);
    }
};

const markAsRead = async (req, res) => {
    try {
        const db = await getDb();
        await queryAll('UPDATE notifications SET is_read = 1 WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
        res.success(null, 'Notification marked as read');
    } catch (err) {
        res.error('Failed to update notification', null, 500);
    }
};

const markAllAsRead = async (req, res) => {
    try {
        const db = await getDb();
        await queryAll('UPDATE notifications SET is_read = 1 WHERE user_id = $1', [req.user.id]);
        res.success(null, 'All notifications marked as read');
    } catch (err) {
        res.error('Failed to update notifications', null, 500);
    }
};

module.exports = {
    getNotifications,
    markAsRead,
    markAllAsRead
};
