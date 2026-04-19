const { queryAll } = require('../database_module.js');
const socketService = require('../services/socketService');

/**
 * Get or create a conversation between buyer and seller for a specific item
 */
const startConversation = async (req, res) => {
    try {
        const { itemId, sellerId } = req.body;
        const buyerId = req.user.id;

        if (!itemId || !sellerId) {
            return res.error('Item ID and Seller ID are required', null, 400);
        }

        if (buyerId === parseInt(sellerId)) {
            return res.error('You cannot start a chat with yourself', null, 400);
        }

        // Check if conversation already exists
        let conv = await queryAll(
            'SELECT id FROM marketplace_conversations WHERE item_id = $1 AND buyer_id = $2 AND seller_id = $3',
            [itemId, buyerId, sellerId]
        );

        if (conv.length === 0) {
            // Create new conversation
            conv = await queryAll(
                'INSERT INTO marketplace_conversations (item_id, buyer_id, seller_id) VALUES ($1, $2, $3) RETURNING id',
                [itemId, buyerId, sellerId]
            );
        }

        res.success({ conversation_id: conv[0].id });
    } catch (err) {
        console.error('Chat error:', err.message);
        res.error('Failed to start conversation', null, 500);
    }
};

/**
 * Get all conversations for the current user
 */
const getConversations = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await queryAll(`
            SELECT 
                c.id, c.item_id, m.title as item_title, m.image_url as item_image,
                u1.name as buyer_name, u2.name as seller_name,
                c.buyer_id, c.seller_id,
                (SELECT message FROM marketplace_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
                (SELECT created_at FROM marketplace_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_time
            FROM marketplace_conversations c
            JOIN marketplace_items m ON c.item_id = m.id
            JOIN users u1 ON c.buyer_id = u1.id
            JOIN users u2 ON c.seller_id = u2.id
            WHERE c.buyer_id = $1 OR c.seller_id = $1
            ORDER BY last_message_time DESC NULLS LAST
        `, [userId]);

        res.success({ conversations: result || [] });
    } catch (err) {
        console.error('Fetch conversations error:', err.message);
        res.error('Failed to fetch conversations', null, 500);
    }
};

/**
 * Get messages for a specific conversation
 */
const getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.id;

        // Verify user is part of the conversation
        const conv = await queryAll(
            'SELECT id FROM marketplace_conversations WHERE id = $1 AND (buyer_id = $2 OR seller_id = $3)',
            [conversationId, userId, userId]
        );

        if (conv.length === 0) {
            return res.error('Unauthorized access to conversation', null, 403);
        }

        const messages = await queryAll(
            'SELECT id, sender_id, message, created_at FROM marketplace_messages WHERE conversation_id = $1 ORDER BY created_at ASC',
            [conversationId]
        );

        res.success({ messages: messages || [] });
    } catch (err) {
        console.error('Fetch messages error:', err.message);
        res.error('Failed to fetch messages', null, 500);
    }
};

/**
 * Send a message within a conversation
 */
const sendMessage = async (req, res) => {
    try {
        const { conversationId, message } = req.body;
        const senderId = req.user.id;

        if (!conversationId || !message) {
            return res.error('Conversation ID and message are required', null, 400);
        }

        // Verify conversation and get recipient
        const conv = await queryAll(
            'SELECT buyer_id, seller_id FROM marketplace_conversations WHERE id = $1',
            [conversationId]
        );

        if (conv.length === 0) {
            return res.error('Conversation not found', null, 404);
        }

        const isParticipant = conv[0].buyer_id === senderId || conv[0].seller_id === senderId;
        if (!isParticipant) {
            return res.error('Unauthorized', null, 403);
        }

        const recipientId = conv[0].buyer_id === senderId ? conv[0].seller_id : conv[0].buyer_id;

        // Save to DB
        const savedMsg = await queryAll(
            'INSERT INTO marketplace_messages (conversation_id, sender_id, message) VALUES ($1, $2, $3) RETURNING *',
            [conversationId, senderId, message]
        );

        // Broadcast via Socket.io
        socketService.emitToUser(recipientId, 'marketplace_message', {
            conversation_id: conversationId,
            message: savedMsg[0]
        });

        res.success({ message: savedMsg[0] });
    } catch (err) {
        console.error('Send message error:', err.message);
        res.error('Failed to send message', null, 500);
    }
};

module.exports = {
    startConversation,
    getConversations,
    getMessages,
    sendMessage
};
