const { getDb, queryAll } = require('../database_module.js');

/**
 * Get all available items on the campus marketplace
 */
const getItems = async (req, res) => {
    try {
        const result = await queryAll(`
            SELECT m.id, m.title, m.description, m.price, m.condition, m.status, u.name as seller_name, m.created_at, m.seller_id
            FROM marketplace_items m
            JOIN users u ON m.seller_id = u.id
            WHERE m.status = 'available'
            ORDER BY m.created_at DESC
        `);

        const items = (result || []).map(row => ({
            id: row.id,
            title: row.title,
            description: row.description,
            price: row.price,
            condition: row.condition,
            status: row.status,
            seller_name: row.seller_name,
            created_at: row.created_at,
            seller_id: row.seller_id
        }));

        res.json({ items });
    } catch (err) {
        console.error('Marketplace error:', err.message);
        res.status(500).json({ error: 'Failed to fetch items' });
    }
};

/**
 * Add a new item to sell
 */
const addItem = async (req, res) => {
    try {
        const { title, description, price, condition } = req.body;
        if (!title || price === undefined) {
            return res.status(400).json({ error: 'Title and price are required' });
        }
        // Input validation
        if (typeof title !== 'string' || title.length > 200) {
            return res.status(400).json({ error: 'Title must be under 200 characters' });
        }
        if (typeof price !== 'number' || price < 0 || price > 100000) {
            return res.status(400).json({ error: 'Price must be between 0 and 100000' });
        }

        await queryAll(
            `INSERT INTO marketplace_items (seller_id, title, description, price, condition)
             VALUES ($1, $2, $3, $4, $5)`,
            [req.user.id, title, description || null, price, condition || 'good']
        );

        res.status(201).json({ message: 'Item listed successfully' });
    } catch (err) {
        console.error('Marketplace error:', err.message);
        res.status(500).json({ error: 'Failed to list item' });
    }
};

/**
 * Mark an item as sold
 */
const markSold = async (req, res) => {
    try {
        const itemId = req.params.id;
        if (!itemId || isNaN(parseInt(itemId))) {
            return res.status(400).json({ error: 'Valid item ID required' });
        }
        await queryAll(
            `UPDATE marketplace_items SET status = 'sold' WHERE id = $1 AND seller_id = $2`,
            [itemId, req.user.id]
        );
        res.json({ message: 'Item marked as sold' });
    } catch (err) {
        console.error('Marketplace error:', err.message);
        res.status(500).json({ error: 'Failed to update item' });
    }
};

/**
 * Delete an item completely
 */
const deleteItem = async (req, res) => {
    try {
        const itemId = req.params.id;
        if (!itemId || isNaN(parseInt(itemId))) {
            return res.status(400).json({ error: 'Valid item ID required' });
        }
        await queryAll(
            `DELETE FROM marketplace_items WHERE id = $1 AND seller_id = $2`,
            [itemId, req.user.id]
        );
        res.json({ message: 'Item permanently deleted' });
    } catch (err) {
        console.error('Marketplace delete err:', err.message);
        res.status(500).json({ error: 'Failed to delete item' });
    }
};

module.exports = {
    getItems,
    addItem,
    markSold,
    deleteItem
};
