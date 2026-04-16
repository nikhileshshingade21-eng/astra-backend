const { getDb, queryAll } = require('../database_module.js');

const applyLeave = async (req, res) => {
    try {
        const { start_date, end_date, reason } = req.body;
        if (!start_date || !end_date) {
            return res.error('Start date and end date are required', null, 400);
        }

        // MED-03 FIX: Validate reason length and sanitize
        if (reason && (typeof reason !== 'string' || reason.length > 500)) {
            return res.error('Reason must be under 500 characters', null, 400);
        }

        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(start_date) || !dateRegex.test(end_date)) {
            return res.error('Dates must be in YYYY-MM-DD format', null, 400);
        }

        if (new Date(end_date) < new Date(start_date)) {
            return res.error('End date cannot be before start date', null, 400);
        }

        await queryAll(
            `INSERT INTO leave_requests (user_id, start_date, end_date, reason) VALUES ($1, $2, $3, $4)`,
            [req.user.id, start_date, end_date, reason || null]
        );

        res.success(null, 'Leave request submitted successfully');
    } catch (err) {
        console.error('Apply leave error:', err.message);
        res.error('Failed to submit leave request', null, 500);
    }
};

const getMyLeaves = async (req, res) => {
    try {
        const result = await queryAll(
            `SELECT id, start_date, end_date, reason, status, applied_at 
             FROM leave_requests 
             WHERE user_id = $1 
             ORDER BY applied_at DESC`,
            [req.user.id]
        );

        res.success(result || []);
    } catch (err) {
        console.error('Get leaves error:', err.message);
        res.error('Failed to fetch leave requests', null, 500);
    }
};

const getPendingLeaves = async (req, res) => {
     try {
        if (req.user.role === 'student') {
            return res.error('Only faculty or admin can view pending leaves', null, 403);
        }

        // MED-04 FIX: Faculty can only see leaves from their own section
        let result;
        if (req.user.role === 'faculty' && req.user.section) {
            result = await queryAll(
                `SELECT l.id, u.name as student_name, u.roll_number, l.start_date, l.end_date, l.reason, l.applied_at 
                 FROM leave_requests l
                 JOIN users u ON l.user_id = u.id
                 WHERE l.status = 'pending' AND u.section = $1
                 ORDER BY l.applied_at ASC`,
                [req.user.section]
            );
        } else {
            // Admin sees everything
            result = await queryAll(
                `SELECT l.id, u.name as student_name, u.roll_number, l.start_date, l.end_date, l.reason, l.applied_at 
                 FROM leave_requests l
                 JOIN users u ON l.user_id = u.id
                 WHERE l.status = 'pending'
                 ORDER BY l.applied_at ASC`
            );
        }

        res.success(result || []);
    } catch (err) {
        console.error('Get pending leaves error:', err.message);
        res.error('Failed to fetch pending leaves', null, 500);
    }
}

const updateLeaveStatus = async (req, res) => {
    try {
        if (req.user.role === 'student') {
            return res.error('Only faculty or admin can update leave status', null, 403);
        }
        
        const { id } = req.params;
        const { status } = req.body;
        
        if (!['approved', 'rejected'].includes(status)) {
             return res.error('Invalid status. Use approved or rejected.', null, 400);
        }

        // MED-04 FIX: IDOR protection — faculty can only update leaves from their section
        if (req.user.role === 'faculty' && req.user.section) {
            const leaveCheck = await queryAll(
                `SELECT l.id FROM leave_requests l
                 JOIN users u ON l.user_id = u.id
                 WHERE l.id = $1 AND u.section = $2`,
                [id, req.user.section]
            );
            if (!leaveCheck || leaveCheck.length === 0) {
                return res.error('You can only manage leaves from your section', null, 403);
            }
        }

        await queryAll(`UPDATE leave_requests SET status = $1 WHERE id = $2`, [status, id]);

        res.success(null, `Leave request ${status} successfully`);
    } catch (err) {
        console.error('Update leave error:', err.message);
        res.error('Failed to update leave status', null, 500);
    }
};

module.exports = {
    applyLeave,
    getMyLeaves,
    getPendingLeaves,
    updateLeaveStatus
};
