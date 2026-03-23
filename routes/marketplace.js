const express = require('express');
const { authMiddleware } = require('../middleware');
const { getItems, addItem, markSold, deleteItem } = require('../controllers/marketplaceController');

const router = express.Router();

// Peer-to-peer campus marketplace routes
router.get('/items', authMiddleware, getItems);
router.post('/items', authMiddleware, addItem);
router.put('/:id/sold', authMiddleware, markSold);
router.delete('/:id', authMiddleware, deleteItem);

module.exports = router;
