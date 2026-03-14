const { getDb, queryAll } = require('../db');

const applyLeave = async (req, res) => {
    try {
        const { start_date, end_date, reason } = req.body;
        if (!start_date || !end_date) {
            return res.status(400).json({ error: 'Start date and end date are required' });
        }

        const db = await getDb();
        db.run(
            `INSERT INTO leave_requests (user_id, start_date, end_date, reason) VALUES (?, ?, ?, ?)`,
            [req.user.id, start_date, end_date, reason || null]
        );
        require('../db').saveDb();

        res.json({ success: true, message: 'Leave request submitted' });
    } catch (err) {
        console.error('Apply leave error:', err);
        res.status(500).json({ error: 'Failed to submit leave request' });
    }
};

const getMyLeaves = async (req, res) => {
    try {
        const db = await getDb();
        const result = queryAll(
            `SELECT id, start_date, end_date, reason, status, applied_at 
             FROM leave_requests 
             WHERE user_id = ? 
             ORDER BY applied_at DESC`,
            [req.user.id]
        );

        const leaves = [];
        if (result.length && result[0].values.length) {
            for (const row of result[0].values) {
                leaves.push({
                    id: row[0], start_date: row[1], end_date: row[2],
                    reason: row[3], status: row[4], applied_at: row[5]
                });
            }
        }

        res.json({ leaves });
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
        const result = queryAll(
            `SELECT l.id, u.name, u.roll_number, l.start_date, l.end_date, l.reason, l.applied_at 
             FROM leave_requests l
             JOIN users u ON l.user_id = u.id
             WHERE l.status = 'pending'
             ORDER BY l.applied_at ASC`
        );

        const leaves = [];
        if (result.length && result[0].values.length) {
            for (const row of result[0].values) {
                leaves.push({
                    id: row[0], student_name: row[1], roll_number: row[2],
                    start_date: row[3], end_date: row[4], reason: row[5], applied_at: row[6]
                });
            }
        }

        res.json({ leaves });
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
        db.run(`UPDATE leave_requests SET status = ? WHERE id = ?`, [status, id]);
        require('../db').saveDb();

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
