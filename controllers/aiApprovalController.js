const { getDb, queryAll, saveDb } = require('../database_module.js');

exports.createApprovalRequest = async (req, res) => {
    try {
        const { user_id, action_type, details } = req.body;
        
        await getDb().query(
            'INSERT INTO ai_approvals (user_id, action_type, details) VALUES ($1, $2, $3)',
            [user_id, action_type, JSON.stringify(details)]
        );
        
        res.status(201).json({ message: 'Approval request created.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getPendingApprovals = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await queryAll(
            'SELECT * FROM ai_approvals WHERE user_id = ? AND status = ? ORDER BY created_at DESC',
            [userId, 'pending']
        );
        
        const approvals = result.length ? result[0].values.map(row => ({
            id: row[0],
            user_id: row[1],
            action_type: row[2],
            details: JSON.parse(row[3]),
            status: row[4],
            created_at: row[5]
        })) : [];

        res.json(approvals);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.respondToApproval = async (req, res) => {
    try {
        const { approval_id, status } = req.body; // status: approved, rejected
        const userId = req.user.id;
        
        // Ensure the approval belongs to the user
        const check = await queryAll('SELECT id FROM ai_approvals WHERE id = ? AND user_id = ?', [approval_id, userId]);
        if (!check.length || !check[0].values.length) {
            return res.status(403).json({ error: 'Unauthorized or approval not found.' });
        }

        await pool.query('UPDATE ai_approvals SET status = $1 WHERE id = $2', [status, approval_id]);
        
        // If approved, trigger the actual action service (e.g., Placement Service, Notification Service)
        if (status === 'approved') {
            console.log(`[ASTRA V3] Action Approved: ${approval_id}. Triggering execution...`);
            // Execution logic would go here
        }

        res.json({ message: `Action ${status}.` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
