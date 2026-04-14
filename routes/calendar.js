const express = require('express');
const { authMiddleware } = require('../middleware');
const { getAllEvents, createEvent, updateEvent, deleteEvent } = require('../controllers/calendarController');

const router = express.Router();

/**
 * @route   GET /api/calendar
 * @desc    Get all academic calendar events
 * @access  Private
 */
router.get('/', authMiddleware, getAllEvents);

/**
 * @route   POST /api/calendar
 * @desc    Create a new calendar event
 * @access  Admin Only
 */
router.post('/', authMiddleware, createEvent);

/**
 * @route   PUT /api/calendar/:id
 * @desc    Update an existing calendar event
 * @access  Admin Only
 */
router.put('/:id', authMiddleware, updateEvent);

/**
 * @route   DELETE /api/calendar/:id
 * @desc    Delete a calendar event
 * @access  Admin Only
 */
router.delete('/:id', authMiddleware, deleteEvent);

module.exports = router;
