const { getDb, queryAll, saveDb } = require('../database_module.js');

const applyLeave = async (req, res) => {
    try {
        const { start_date, end_date, reason } = req.body;
        if (!start_date || !end_date) {
            return res.status(400).json({ error: 'Start date and end date are required' });
        }

        const db = await getDb();
        await queryAll(
            `INSERT INTO leave_requests (user_id, start_date, end_date, reason) VALUES ($1, $2, $3, $4)`,
            [req.user.id, start_date, end_date, reason || null]
        );

        res.json({ success: true, message: 'Leave request submitted' });
    } catch (err) {
        console.error('Apply leave error:', err);
        res.status(500).json({ error: 'Failed to submit leave request' });
    }
};

const getMyLeaves = async (req, res) => {
    try {
        const db = await getDb();
        const result = await queryAll(
            `SELECT id, start_date, end_date, reason, status, applied_at 
             FROM leave_requests 
             WHERE user_id = $1 
             ORDER BY applied_at DESC`,
            [req.user.id]
        );

        res.json({ leaves: result });
    } catch (err) {
        console.error('Get leaves error:', err);
        res.status(500).json({ error: 'Failed to fetch leave requests' });
    }
};

const getPendingLeaves = async (req, res) => {
     try {
        if (req.user.role === 'student') {
            return res.status(403).json({ error: 'Only faculty or admin can view pending leaves' });
        }
        const db = await getDb();
        const result = await queryAll(
            `SELECT l.id, u.name as student_name, u.roll_number, l.start_date, l.end_date, l.reason, l.applied_at 
             FROM leave_requests l
             JOIN users u ON l.user_id = u.id
             WHERE l.status = 'pending'
             ORDER BY l.applied_at ASC`
        );

        res.json({ leaves: result });
    } catch (err) {
        console.error('Get pending leaves error:', err);
        res.status(500).json({ error: 'Failed to fetch pending leaves' });
    }
}

const updateLeaveStatus = async (req, res) => {
    try {
        if (req.user.role === 'student') {
            return res.status(403).json({ error: 'Only faculty or admin can update leave status' });
        }
        
        const { id } = req.params;
        const { status } = req.body;
        
        if (!['approved', 'rejected'].includes(status)) {
             return res.status(400).json({ error: 'Invalid status. Use approved or rejected.' });
        }

        const db = await getDb();
        await queryAll(`UPDATE leave_requests SET status = $1 WHERE id = $2`, [status, id]);

        res.json({ success: true, message: `Leave request ${status}` });
    } catch (err) {
        console.error('Update leave error:', err);
        res.status(500).json({ error: 'Failed to update leave status' });
    }
};

module.exports = {
    applyLeave,
    getMyLeaves,
    getPendingLeaves,
    updateLeaveStatus
};
