const express = require('express');
const { authMiddleware } = require('../middleware');
const { getItems, addItem, markSold, deleteItem } = require('../controllers/marketplaceController');
const { toggleReaction } = require('../controllers/marketplaceReactionController');
const { startConversation, getConversations, getMessages, sendMessage } = require('../controllers/marketplaceChatController');
const { uploadItemImage } = require('../controllers/marketplaceUploadController');

const router = express.Router();

// Peer-to-peer campus marketplace routes
router.get('/items', authMiddleware, getItems);
router.post('/items', authMiddleware, addItem);
router.post('/upload', authMiddleware, uploadItemImage);
router.put('/:id/sold', authMiddleware, markSold);
router.delete('/:id', authMiddleware, deleteItem);

// Reactions
router.post('/items/react', authMiddleware, toggleReaction);

// Chat (P2P)
router.post('/chat/start', authMiddleware, startConversation);
router.get('/chat/conversations', authMiddleware, getConversations);
router.get('/chat/messages/:conversationId', authMiddleware, getMessages);
router.post('/chat/send', authMiddleware, sendMessage);

module.exports = router;
