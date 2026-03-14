const { getDb, queryAll } = require('../db');

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
        db.run(
            `INSERT INTO marks (user_id, class_id, exam_type, marks_obtained, total_marks) VALUES (?, ?, ?, ?, ?)`,
            [user_id, class_id || null, exam_type, marks_obtained, total_marks]
        );
        require('../db').saveDb();

        res.json({ success: true, message: 'Marks added successfully' });
    } catch (err) {
        console.error('Add mark error:', err);
        res.status(500).json({ error: 'Failed to add marks' });
    }
};

const getMyMarks = async (req, res) => {
    try {
        const db = await getDb();
        const result = queryAll(
            `SELECT m.id, m.exam_type, m.marks_obtained, m.total_marks, m.date, c.name as class_name
             FROM marks m 
             LEFT JOIN classes c ON m.class_id = c.id
             WHERE m.user_id = ? 
             ORDER BY m.date DESC`,
            [req.user.id]
        );

        const marks = [];
        if (result.length && result[0].values.length) {
            for (const row of result[0].values) {
                marks.push({
                    id: row[0], exam_type: row[1], marks_obtained: row[2],
                    total_marks: row[3], date: row[4], class_name: row[5] || 'General'
                });
            }
        }

        res.json({ marks });
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
        const result = queryAll(
            `SELECT m.id, u.name as student_name, u.roll_number, m.exam_type, m.marks_obtained, m.total_marks, m.date
             FROM marks m
             JOIN users u ON m.user_id = u.id
             WHERE m.class_id = ?
             ORDER BY u.roll_number ASC, m.date DESC`,
            [classId]
        );

        const marks = [];
        if (result.length && result[0].values.length) {
            for (const row of result[0].values) {
                marks.push({
                    id: row[0], student_name: row[1], roll_number: row[2],
                    exam_type: row[3], marks_obtained: row[4], total_marks: row[5], date: row[6]
                });
            }
        }

        res.json({ class_id: classId, marks });
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
