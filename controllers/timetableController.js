const { getDb, queryAll } = require('../database_module.js');
const { getCachedData } = require('../services/redisService');
const { getLocalDate } = require('../utils/dateUtils');

const getTodayClasses = async (req, res) => {
    try {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const targetDay = (req.query.day || days[new Date().getDay()]).trim();
        const todayDate = getLocalDate();
        
        // 🛡️ ASTRA V2: Prioritize query overrides with robust trimming
        const programme = (req.query.programme || req.user.programme || 'all').trim();
        const section = (req.query.section || req.user.section || 'all').trim();

        console.log(`[CHRONO_SYNC] Target: ${targetDay} | P: ${programme} | S: ${section}`);

        const cacheKey = `timetable:${targetDay}:${programme}:${section}`;
        const shouldRefresh = req.query.refresh === 'true';
        
        const fetchScheduleFromDb = async () => {
             // 🛡️ ASTRA V2 SMART_MATCH: Match by section OR (if section is null/all) by programme
             // This ensures students in "CS" get classes marked "CS" or "B.Tech CSC"
             console.log(`[DB_QUERY] Fetching for ${targetDay} | S: ${section} | P: ${programme}`);
             
             const result = await queryAll(
                 `SELECT c.id, c.code, c.name, c.faculty_name, c.room, c.start_time, c.end_time, c.section, c.programme
                  FROM classes c
                  WHERE TRIM(LOWER(c.day)) = TRIM(LOWER($1))
                  AND (
                      -- Strict Section Match
                      TRIM(LOWER(c.section)) = TRIM(LOWER($2))
                      OR 
                      -- Smart Fallback: Match programme if section is generic or null
                      (
                          TRIM(LOWER(c.programme)) = TRIM(LOWER($3)) 
                          AND (c.section IS NULL OR c.section = '' OR c.section = 'all' OR c.section = 'CS')
                      )
                  )
                  ORDER BY c.start_time`,
                 [targetDay, section, programme]
             );

             if (!result || result.length === 0) {
                 console.log(`[CHRONO_FALLBACK] specific match failed for ${targetDay}. Doing broad search.`);
                 return await queryAll(
                     `SELECT c.id, c.code, c.name, c.faculty_name, c.room, c.start_time, c.end_time
                      FROM classes c 
                      WHERE TRIM(LOWER(c.day)) = TRIM(LOWER($1)) 
                      ORDER BY c.start_time`,
                     [targetDay]
                 );
             }
             return result;
        };

        // Get data (from cache or DB)
        // If refresh=true, we skip getCachedData and fetch directly, then manually update cache if needed.
        // Or simpler: just reduce TTL to 3600 and depend on the bridge to handle it if I add a 'force' param to it.
        // For now, I'll just reduce the TTL and if refresh=true, I'll invalidate the key first.
        
        if (shouldRefresh) {
            const { invalidateCache } = require('../services/redisService');
            // Sweep BOTH the specific key and the day pattern to ensure no stale overlaps persist
            await invalidateCache(cacheKey);
            await invalidateCache(`timetable:${targetDay}:*`);
            console.log(`[CACHE_SWEEP] Invalidated: ${cacheKey} and timetable:${targetDay}:*`);
        }

        const result = await getCachedData(cacheKey, 3600, fetchScheduleFromDb);
        
        // 🧪 CACHE HEALING: If results are empty, don't keep them cached for 1h (likely wrong day or transient DB error)
        if (!result || result.length === 0) {
            const { invalidateCache } = require('../services/redisService');
            await invalidateCache(cacheKey); // Wipe the empty cache entry
        }
        
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

const getDiagnostic = async (req, res) => {
    try {
        const { day, programme, section } = req.query;
        const targetDay = (day || 'Thursday').trim();
        const p = (programme || 'B.Tech CSC').trim();
        const s = (section || 'CS').trim();
        
        console.log(`[DIAGNOSTIC] Day: ${targetDay} | P: ${p} | S: ${s}`);
        
        const result = await queryAll(
            `SELECT c.id, c.code, c.name, c.faculty_name, c.room, c.start_time, c.end_time, c.section, c.programme, c.day
             FROM classes c
             WHERE TRIM(LOWER(c.day)) = TRIM(LOWER($1))
             AND (
                 TRIM(LOWER(c.section)) = TRIM(LOWER($2))
                 OR 
                 (TRIM(LOWER(c.programme)) = TRIM(LOWER($3)) AND (c.section IS NULL OR c.section = '' OR c.section = 'all' OR c.section = 'CS'))
             )
             ORDER BY c.start_time`,
            [targetDay, s, p]
        );
        
        res.json({ day: targetDay, count: result.length, classes: result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    getTodayClasses,
    addClass,
    getDiagnostic
};
