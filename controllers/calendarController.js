const { queryAll } = require('../database_module');

/**
 * ASTRA CALENDAR CONTROLLER
 * Handles academic events and institutional holidays.
 */

const getAllEvents = async (req, res) => {
    try {
        const events = await queryAll('SELECT * FROM academic_calendar ORDER BY start_date ASC');
        res.json({ events });
    } catch (err) {
        console.error('Calendar Fetch Error:', err);
        res.status(500).json({ error: 'Failed to fetch calendar events' });
    }
};

const createEvent = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'UNAUTHORIZED', message: 'Only admins can modify the academic calendar' });
        }

        const { event_name, start_date, end_date, type, is_system_holiday } = req.body;
        if (!event_name || !start_date || !end_date) {
            return res.status(400).json({ error: 'Event name, start date, and end date are required' });
        }

        await queryAll(
            'INSERT INTO academic_calendar (event_name, start_date, end_date, type, is_system_holiday) VALUES ($1, $2, $3, $4, $5)',
            [event_name, start_date, end_date, type || 'event', is_system_holiday ? 1 : 0]
        );

        res.status(201).json({ success: true, message: 'Calendar event created successfully' });
    } catch (err) {
        console.error('Calendar Create Error:', err);
        res.status(500).json({ error: 'Failed to create calendar event' });
    }
};

const updateEvent = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'UNAUTHORIZED', message: 'Only admins can modify the academic calendar' });
        }

        const { id } = req.params;
        const { event_name, start_date, end_date, type, is_system_holiday } = req.body;

        await queryAll(
            'UPDATE academic_calendar SET event_name = $1, start_date = $2, end_date = $3, type = $4, is_system_holiday = $5 WHERE id = $6',
            [event_name, start_date, end_date, type, is_system_holiday ? 1 : 0, id]
        );

        res.json({ success: true, message: 'Calendar event updated successfully' });
    } catch (err) {
        console.error('Calendar Update Error:', err);
        res.status(500).json({ error: 'Failed to update calendar event' });
    }
};

const deleteEvent = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'UNAUTHORIZED', message: 'Only admins can modify the academic calendar' });
        }

        const { id } = req.params;
        await queryAll('DELETE FROM academic_calendar WHERE id = $1', [id]);

        res.json({ success: true, message: 'Calendar event deleted successfully' });
    } catch (err) {
        console.error('Calendar Delete Error:', err);
        res.status(500).json({ error: 'Failed to delete calendar event' });
    }
};

module.exports = {
    getAllEvents,
    createEvent,
    updateEvent,
    deleteEvent
};
