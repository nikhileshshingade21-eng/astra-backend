const { queryAll } = require('../database_module.js');
const { sendFeedbackEmail } = require('../services/emailService');

const submitFeedback = async (req, res) => {
    try {
        const { type, message } = req.body;
        const userId = req.user.id;

        if (!type || !message) {
            return res.error('Type and message are required', null, 400);
        }

        if (!['bug', 'feature', 'general'].includes(type)) {
            return res.error('Invalid feedback type', null, 400);
        }

        await queryAll(
            'INSERT INTO feedback (user_id, type, message) VALUES ($1, $2, $3)',
            [userId, type, message]
        );

        // Async dispatch for email forwarding (don't block the user response)
        const userRoll = req.user.roll_number || 'UNKNOWN';
        sendFeedbackEmail(userId, userRoll, type, message).catch(console.error);

        res.success(null, 'Feedback submitted successfully. Forwarded to Admin Gmail.');
    } catch (err) {
        console.error('Feedback submit error:', err);
        res.error('Failed to submit feedback', null, 500);
    }
};

const getAllFeedback = async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'faculty') {
            return res.error('Unauthorized access to feedback', null, 403);
        }

        const result = await queryAll(
            `SELECT f.*, u.roll_number, u.name as user_name 
             FROM feedback f 
             LEFT JOIN users u ON f.user_id = u.id 
             ORDER BY f.created_at DESC`
        );

        res.success(result);
    } catch (err) {
        console.error('Fetch feedback error:', err);
        res.error('Failed to fetch feedback', null, 500);
    }
};

module.exports = {
    submitFeedback,
    getAllFeedback
};
