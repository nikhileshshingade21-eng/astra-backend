const { getDb, queryAll, saveDb } = require('../database_module.js');

exports.createApprovalRequest = async (req, res) => {
    try {
        const { user_id, action_type, details } = req.body;
        
        await queryAll(
            'INSERT INTO ai_approvals (user_id, action_type, details) VALUES ($1, $2, $3)',
            [user_id, action_type, JSON.stringify(details)]
        );
        
        res.success(null, 'Approval request created.');
    } catch (err) {
        res.error(err.message, null, 500);
    }
};

exports.getPendingApprovals = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await queryAll(
            'SELECT * FROM ai_approvals WHERE user_id = $1 AND status = $2 ORDER BY created_at DESC',
            [userId, 'pending']
        );
        
        const approvals = (result || []).map(row => ({
            id: row.id,
            user_id: row.user_id,
            action_type: row.action_type,
            details: typeof row.details === 'string' ? JSON.parse(row.details) : row.details,
            status: row.status,
            created_at: row.created_at
        }));

        res.success(approvals);
    } catch (err) {
        res.error(err.message, null, 500);
    }
};

exports.respondToApproval = async (req, res) => {
    try {
        const { approval_id, status } = req.body; // status: approved, rejected
        const userId = req.user.id;
        
        // Ensure the approval belongs to the user
        const check = await queryAll('SELECT id FROM ai_approvals WHERE id = $1 AND user_id = $2', [approval_id, userId]);
        if (!check || check.length === 0) {
            return res.error('Unauthorized or approval not found.', null, 403);
        }

        await queryAll('UPDATE ai_approvals SET status = $1 WHERE id = $2', [status, approval_id]);
        
        // If approved, trigger the actual action service
        if (status === 'approved') {
            console.log(`[ASTRA V3] Action Approved: ${approval_id}. Triggering execution...`);
        }

        res.success(null, `Action ${status} successfully.`);
    } catch (err) {
        res.error(err.message, null, 500);
    }
};
