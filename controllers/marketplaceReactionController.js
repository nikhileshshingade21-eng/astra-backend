const { queryAll } = require('../database_module.js');

/**
 * Toggle reaction (like) on a marketplace item
 */
const toggleReaction = async (req, res) => {
    try {
        const { itemId } = req.body;
        const userId = req.user.id;

        if (!itemId) {
            return res.error('Item ID is required', null, 400);
        }

        // Check if reaction exists
        const existing = await queryAll(
            'SELECT id FROM marketplace_reactions WHERE item_id = $1 AND user_id = $2',
            [itemId, userId]
        );

        if (existing.length > 0) {
            // Remove it (unlike)
            await queryAll(
                'DELETE FROM marketplace_reactions WHERE item_id = $1 AND user_id = $2',
                [itemId, userId]
            );
            return res.success({ has_reacted: false }, 'Reaction removed');
        } else {
            // Add it (like)
            await queryAll(
                'INSERT INTO marketplace_reactions (item_id, user_id) VALUES ($1, $2)',
                [itemId, userId]
            );
            return res.success({ has_reacted: true }, 'Reaction added');
        }
    } catch (err) {
        console.error('Reaction error:', err.message);
        res.error('Failed to update reaction', null, 500);
    }
};

module.exports = {
    toggleReaction
};
