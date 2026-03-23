const { getDb, queryAll, saveDb } = require('../database_module.js');

const addMark = async (req, res) => {
    try {
        if (req.user.role === 'student') {
            return res.status(403).json({ error: 'Only faculty or admin can add marks' });
        }

        const { user_id, class_id, exam_type, marks_obtained, total_marks } = req.body;
        if (!user_id || !exam_type || marks_obtained === undefined || total_marks === undefined) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const db = await getDb();
        await queryAll(
            `INSERT INTO marks (user_id, class_id, exam_type, marks_obtained, total_marks) VALUES ($1, $2, $3, $4, $5)`,
            [user_id, class_id || null, exam_type, marks_obtained, total_marks]
        );

        res.json({ success: true, message: 'Marks added successfully' });
    } catch (err) {
        console.error('Add mark error:', err);
        res.status(500).json({ error: 'Failed to add marks' });
    }
};

const getMyMarks = async (req, res) => {
    try {
        const db = await getDb();
        const result = await queryAll(
            `SELECT m.id, m.exam_type, m.marks_obtained, m.total_marks, m.date, c.name as class_name
             FROM marks m 
             LEFT JOIN classes c ON m.class_id = c.id
             WHERE m.user_id = $1 
             ORDER BY m.date DESC`,
            [req.user.id]
        );

        res.json({ marks: result });
    } catch (err) {
        console.error('Get marks error:', err);
        res.status(500).json({ error: 'Failed to fetch marks' });
    }
};

const getClassMarks = async (req, res) => {
    try {
        if (req.user.role === 'student') {
            return res.status(403).json({ error: 'Only faculty or admin can view class marks' });
        }
        
        const { classId } = req.params;
        const db = await getDb();
        const result = await queryAll(
            `SELECT m.id, u.name as student_name, u.roll_number, m.exam_type, m.marks_obtained, m.total_marks, m.date
             FROM marks m
             JOIN users u ON m.user_id = u.id
             WHERE m.class_id = $1
             ORDER BY u.roll_number ASC, m.date DESC`,
            [classId]
        );

        res.json({ class_id: classId, marks: result });
    } catch (err) {
        console.error('Get class marks error:', err);
        res.status(500).json({ error: 'Failed to fetch class marks' });
    }
}

module.exports = {
    addMark,
    getMyMarks,
    getClassMarks
};
