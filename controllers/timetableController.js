const { getDb, queryAll, saveDb } = require('../database_module.js');
const { getCachedData } = require('../services/redisService');

const getTodayClasses = async (req, res) => {
    try {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const targetDay = req.query.day || days[new Date().getDay()];
        const todayDate = new Date().toISOString().split('T')[0];
        const programme = req.user.programme || 'all';
        const section = req.user.section || 'all';

        console.log(`Fetching classes for: ${targetDay}, Programme: ${programme}, Section: ${section}`);

        // 🚀 REDIS CACHE STRATEGY: 
        // Cache the raw schedule for 24 hours based on Day + Programme + Section
        const cacheKey = `timetable:${targetDay}:${programme}:${section}`;
        
        const fetchScheduleFromDb = async () => {
             let result;
             if (programme !== 'all' && section !== 'all') {
                 result = await queryAll(
                     `SELECT c.id, c.code, c.name, c.faculty_name, c.room, c.start_time, c.end_time
                      FROM classes c
                      WHERE c.day = $1 AND c.programme = $2 AND c.section = $3
                      ORDER BY c.start_time`,
                     [targetDay, programme, section]
                 );
             } else {
                 result = await queryAll(
                     `SELECT c.id, c.code, c.name, c.faculty_name, c.room, c.start_time, c.end_time
                      FROM classes c WHERE c.day = $1 ORDER BY c.start_time`,
                     [targetDay]
                 );
             }
             return result;
        };

        // Get data (from cache or DB)
        const result = await getCachedData(cacheKey, 86400, fetchScheduleFromDb); // 24h caching
        
        let classes = [];
        if (result && result.length > 0) {
            console.log(`Found ${result.length} classes for timetable`);
            for (const row of result) {
                // Check if attendance already marked (User specific, cannot be globally cached)
                const att = await queryAll(
                    'SELECT status FROM attendance WHERE user_id = $1 AND class_id = $2 AND date = $3',
                    [req.user.id, row.id, todayDate]
                );
                const attended = att.length > 0 ? att[0].status : null;

                classes.push({
                    id: row.id, code: row.code, name: row.name, faculty: row.faculty_name,
                    room: row.room, start_time: row.start_time, end_time: row.end_time,
                    attendance_status: attended
                });
            }
        } else {
            console.log('No classes found for this criteria');
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
        await queryAll(
            `INSERT INTO classes (code, name, faculty_name, room, day, start_time, end_time, programme, section)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [code, name, faculty_name || null, room || null, day, start_time, end_time, programme || null, section || null]
        );

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
