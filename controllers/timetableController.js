const { getDb, queryAll } = require('../db');

const getTodayClasses = async (req, res) => {
    try {
        const db = await getDb();
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        // Use query param 'day' if provided, otherwise default to today
        const targetDay = req.query.day || days[new Date().getDay()];
        const todayDate = new Date().toISOString().split('T')[0];

        console.log(`Fetching classes for: ${targetDay}, Programme: ${req.user.programme}, Section: ${req.user.section}`);
        
        let classes = [];
        let result;
        if (req.user.programme && req.user.section) {
            result = queryAll(
                `SELECT c.id, c.code, c.name, c.faculty_name, c.room, c.start_time, c.end_time
          FROM classes c
          WHERE c.day = ? AND c.programme = ? AND c.section = ?
          ORDER BY c.start_time`,
                [targetDay, req.user.programme, req.user.section]
            );
        } else {
            console.log('No programme/section in user session, fetching all classes for the day');
            result = queryAll(
                `SELECT c.id, c.code, c.name, c.faculty_name, c.room, c.start_time, c.end_time
          FROM classes c WHERE c.day = ? ORDER BY c.start_time`,
                [targetDay]
            );
        }

        if (result.length && result[0].values.length) {
            console.log(`Found ${result[0].values.length} classes`);
            for (const row of result[0].values) {
                // Check if attendance already marked
                const att = queryAll(
                    'SELECT status FROM attendance WHERE user_id = ? AND class_id = ? AND date = ?',
                    [req.user.id, row[0], todayDate]
                );
                const attended = att.length && att[0].values.length ? att[0].values[0][0] : null;

                classes.push({
                    id: row[0], code: row[1], name: row[2], faculty: row[3],
                    room: row[4], start_time: row[5], end_time: row[6],
                    attendance_status: attended
                });
            }
        } else {
            console.log('No classes found in DB for this criteria');
        }

        res.json({ day: targetDay, date: todayDate, classes });
    } catch (err) {
        console.error('Timetable error:', err);
        res.status(500).json({ error: 'Failed to fetch timetable' });
    }
};

const addClass = async (req, res) => {
    try {
        if (req.user.role === 'student') {
            return res.status(403).json({ error: 'Only faculty or admin can add classes' });
        }

        const { code, name, faculty_name, room, day, start_time, end_time, programme, section } = req.body;
        if (!code || !name || !day || !start_time || !end_time) {
            return res.status(400).json({ error: 'Code, name, day, start_time, end_time are required' });
        }

        const db = await getDb();
        db.run(
            `INSERT INTO classes (code, name, faculty_name, room, day, start_time, end_time, programme, section)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [code, name, faculty_name || null, room || null, day, start_time, end_time, programme || null, section || null]
        );
        require('../db').saveDb();

        res.json({ success: true, message: 'Class added' });
    } catch (err) {
        console.error('Add class error:', err);
        res.status(500).json({ error: 'Failed to add class' });
    }
};

module.exports = {
    getTodayClasses,
    addClass
};
