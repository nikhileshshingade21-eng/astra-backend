const { getDb, saveDb, queryAll } = require('../db');

const getNotifications = async (req, res) => {
    try {
        const db = await getDb();
        const result = queryAll(
            `SELECT id, title, message, type, is_read, created_at 
       FROM notifications WHERE user_id = ? 
       ORDER BY created_at DESC LIMIT 30`,
            [req.user.id]
        );

        const notifications = [];
        if (result.length && result[0].values.length) {
            for (const row of result[0].values) {
                notifications.push({
                    id: row[0], title: row[1], message: row[2],
                    type: row[3], is_read: !!row[4], created_at: row[5]
                });
            }
        }

        // Unread count
        const unreadResult = queryAll(
            'SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0',
            [req.user.id]
        );
        const unread = unreadResult.length ? unreadResult[0].values[0][0] : 0;

        res.json({ notifications, unread });
    } catch (err) {
        console.error('Notifications error:', err);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
};

const markAsRead = async (req, res) => {
    try {
        const db = await getDb();
        db.run('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        saveDb();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update' });
    }
};

const markAllAsRead = async (req, res) => {
    try {
        const db = await getDb();
        db.run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
        saveDb();
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
