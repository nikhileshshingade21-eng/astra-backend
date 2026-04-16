const { getDb, queryAll } = require('../database_module.js');
const { getCachedData } = require('../services/redisService');
const { getLocalDate } = require('../utils/dateUtils');

const getTodayClasses = async (req, res) => {
    try {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const now = new Date();
        const targetDayName = (req.query.day || days[now.getDay()]).trim();
        
        // Calculate the actual DATE for the requested weekday in the current week
        // We anchor to the current week (Monday-based stack)
        const dayOfWeek = now.getDay();
        const mondayOffset = dayOfWeek === 0 ? 1 : -(dayOfWeek - 1);
        const MondayDate = new Date(now);
        MondayDate.setDate(now.getDate() + mondayOffset);
        
        const targetDayIndex = days.indexOf(targetDayName);
        const targetOffset = targetDayIndex === 0 ? 6 : targetDayIndex - 1; // 0=Mon, 5=Sat
        const targetDateObj = new Date(MondayDate);
        targetDateObj.setDate(MondayDate.getDate() + targetOffset);
        const targetDate = targetDateObj.toISOString().split('T')[0];

        // CHECK ACADEMIC CALENDAR (dates are TEXT in DB, cast for proper comparison)
        // Prioritize holidays over instruction periods by ordering is_system_holiday DESC
        const calendarEvents = await queryAll(
            'SELECT event_name, type, is_system_holiday FROM academic_calendar WHERE CAST($1 AS DATE) BETWEEN CAST(start_date AS DATE) AND CAST(end_date AS DATE) ORDER BY is_system_holiday DESC LIMIT 1',
            [targetDate]
        );
        const calendarEvent = calendarEvents.length > 0 ? calendarEvents[0] : null;

        const programme = (req.query.programme || req.user.programme || 'all').trim();
        const section = (req.query.section || req.user.section || 'all').trim();

        console.log(`[CHRONO_SYNC] Target: ${targetDayName} | P: ${programme} | S: ${section}`);

        const cacheKey = `timetable:${targetDayName}:${programme}:${section}`;
        const shouldRefresh = req.query.refresh === 'true';
        
        const fetchScheduleFromDb = async () => {
             // 🛡️ ASTRA V2 SMART_MATCH: Match by section OR (if section is null/all) by programme
             // This ensures students in "CS" get classes marked "CS" or "B.Tech CSC"
             console.log(`[DB_QUERY] Fetching for ${targetDayName} | S: ${section} | P: ${programme}`);
             
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
                 [targetDayName, section, programme]
             );

             if (!result || result.length === 0) {
                 console.log(`[CHRONO_FALLBACK] specific match failed for ${targetDayName}. Doing broad search.`);
                 return await queryAll(
                     `SELECT c.id, c.code, c.name, c.faculty_name, c.room, c.start_time, c.end_time
                      FROM classes c 
                      WHERE TRIM(LOWER(c.day)) = TRIM(LOWER($1)) 
                      ORDER BY c.start_time`,
                     [targetDayName]
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
            await invalidateCache(`timetable:${targetDayName}:*`);
            console.log(`[CACHE_SWEEP] Invalidated: ${cacheKey} and timetable:${targetDayName}:*`);
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
                    [req.user.id, row.id, targetDate]
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

        res.success({ 
            day: targetDayName, 
            date: targetDate, 
            classes,
            calendar_event: calendarEvent
        });
    } catch (err) {
        console.error('Timetable error:', err);
        res.error('Failed to fetch timetable', null, 500);
    }
};

const addClass = async (req, res) => {
    try {
        if (req.user.role === 'student') {
            return res.error('Only faculty or admin can add classes', null, 403);
        }

        const { code, name, faculty_name, room, day, start_time, end_time, programme, section } = req.body;
        if (!code || !name || !day || !start_time || !end_time) {
            return res.error('Code, name, day, start_time, end_time are required', null, 400);
        }

        const db = await getDb();
        await queryAll(
            `INSERT INTO classes (code, name, faculty_name, room, day, start_time, end_time, programme, section)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [code, name, faculty_name || null, room || null, day, start_time, end_time, programme || null, section || null]
        );

        res.success(null, 'Class added successfully');
    } catch (err) {
        console.error('Add class error:', err);
        res.error('Failed to add class', null, 500);
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
        
        res.success({ day: targetDay, count: result.length, classes: result });
    } catch (err) {
        res.error(err.message, null, 500);
    }
};

module.exports = {
    getTodayClasses,
    addClass,
    getDiagnostic
};
