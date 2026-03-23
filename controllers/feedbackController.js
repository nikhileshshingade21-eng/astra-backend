const { queryAll } = require('../database_module.js');

const submitFeedback = async (req, res) => {
    try {
        const { type, message } = req.body;
        const userId = req.user.id;

        if (!type || !message) {
            return res.status(400).json({ error: 'Type and message are required' });
        }

        if (!['bug', 'feature', 'general'].includes(type)) {
            return res.status(400).json({ error: 'Invalid feedback type' });
        }

        await queryAll(
            'INSERT INTO feedback (user_id, type, message) VALUES ($1, $2, $3)',
            [userId, type, message]
        );

        res.json({ success: true, message: 'Feedback submitted successfully. Thank you!' });
    } catch (err) {
        console.error('Feedback submit error:', err);
        res.status(500).json({ error: 'Failed to submit feedback' });
    }
};

const getAllFeedback = async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'faculty') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const result = await queryAll(
            `SELECT f.*, u.roll_number, u.name as user_name 
             FROM feedback f 
             LEFT JOIN users u ON f.user_id = u.id 
             ORDER BY f.created_at DESC`
        );

        res.json({ feedback: result });
    } catch (err) {
        console.error('Fetch feedback error:', err);
        res.status(500).json({ error: 'Failed to fetch feedback' });
    }
};

module.exports = {
    submitFeedback,
    getAllFeedback
};
