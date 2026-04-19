const { getDb, queryAll } = require('../database_module.js');

/**
 * Get all available items on the campus marketplace with reaction data
 */
const getItems = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await queryAll(`
            SELECT 
                m.id, m.title, m.description, m.price, m.condition, m.status, 
                u.name as seller_name, m.created_at, m.seller_id, m.image_url, m.category,
                (SELECT COUNT(*) FROM marketplace_reactions WHERE item_id = m.id) as reaction_count,
                (SELECT COUNT(*) FROM marketplace_reactions WHERE item_id = m.id AND user_id = $1) > 0 as has_reacted
            FROM marketplace_items m
            JOIN users u ON m.seller_id = u.id
            WHERE m.status = 'available'
            ORDER BY m.created_at DESC
        `, [userId]);

        const items = rows.map(row => {
            let parsedImages = [];
            try {
                if (row.image_url && row.image_url.startsWith('[')) {
                    parsedImages = JSON.parse(row.image_url);
                } else if (row.image_url) {
                    parsedImages = [row.image_url];
                }
            } catch (e) {}

            return {
                id: row.id,
                title: row.title,
                description: row.description,
                price: parseFloat(row.price),
                condition: row.condition,
                status: row.status,
                created_at: row.created_at,
                seller_id: row.seller_id,
                seller_name: row.seller_name,
                image_urls: parsedImages, // Added for gallery support
                image_url: parsedImages[0] || null, // Legacy fallback
                category: row.category,
                reaction_count: parseInt(row.reaction_count || 0),
                has_reacted: !!row.has_reacted
            };
        });

        res.success({ items });
    } catch (err) {
        console.error('Marketplace error:', err.message);
        res.error('Failed to fetch items', null, 500);
    }
};

/**
 * Add a new item to sell with optional image
 */
const addItem = async (req, res) => {
    try {
        const { title, description, price, condition, category, image_urls, image_url } = req.body;
        if (!title || price === undefined) {
            return res.error('Title and price are required', null, 400);
        }
        // Input validation
        if (typeof title !== 'string' || title.length > 200) {
            return res.error('Title must be under 200 characters', null, 400);
        }
        if (isNaN(parseFloat(price)) || price < 0 || price > 100000) {
            return res.error('Price must be between 0 and 100000', null, 400);
        }

        // Merge legacy image_url or new array image_urls
        let finalImageStr = null;
        if (image_urls && Array.isArray(image_urls) && image_urls.length > 0) {
            finalImageStr = JSON.stringify(image_urls);
        } else if (image_url) {
            finalImageStr = image_url;
        }

        await queryAll(
            `INSERT INTO marketplace_items (seller_id, title, description, price, condition, category, image_url)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [req.user.id, title, description || null, price, condition || 'good', category || 'Others', finalImageStr]
        );

        res.success(null, 'Item listed successfully');
    } catch (err) {
        console.error('Marketplace error:', err.message);
        res.error('Failed to list item', null, 500);
    }
};

/**
 * Mark an item as sold
 */
const markSold = async (req, res) => {
    try {
        const itemId = req.params.id;
        if (!itemId || isNaN(parseInt(itemId))) {
            return res.error('Valid item ID required', null, 400);
        }
        await queryAll(
            `UPDATE marketplace_items SET status = 'sold' WHERE id = $1 AND seller_id = $2`,
            [itemId, req.user.id]
        );
        res.success(null, 'Item marked as sold');
    } catch (err) {
        console.error('Marketplace error:', err.message);
        res.error('Failed to update item', null, 500);
    }
};

/**
 * Delete an item completely
 */
const deleteItem = async (req, res) => {
    try {
        const itemId = req.params.id;
        if (!itemId || isNaN(parseInt(itemId))) {
            return res.error('Valid item ID required', null, 400);
        }
        const result = await queryAll(
            `DELETE FROM marketplace_items WHERE id = $1 AND seller_id = $2 RETURNING id`,
            [itemId, req.user.id]
        );

        if (result && result.length > 0) {
            // Manually cascade delete messages and conversations to keep DB clean
            await queryAll(
                `DELETE FROM marketplace_messages WHERE conversation_id IN (SELECT id FROM marketplace_conversations WHERE item_id = $1)`,
                [itemId]
            );
            await queryAll(
                `DELETE FROM marketplace_conversations WHERE item_id = $1`,
                [itemId]
            );
        }

        res.success(null, 'Item permanently deleted');
    } catch (err) {
        console.error('Marketplace delete err:', err.message);
        res.error('Failed to delete item', null, 500);
    }
};

module.exports = {
    getItems,
    addItem,
    markSold,
    deleteItem
};
