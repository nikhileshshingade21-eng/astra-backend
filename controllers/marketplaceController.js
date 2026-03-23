const { getDb, queryAll, saveDb } = require('../database_module.js');

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

        let items = [];
        if (result.length && result[0].values.length) {
            items = result[0].values.map(row => ({
                id: row[0],
                title: row[1],
                description: row[2],
                price: row[3],
                condition: row[4],
                status: row[5],
                seller_name: row[6],
                created_at: row[7],
                seller_id: row[8]
            }));
        }

        res.json({ items });
    } catch (err) {
        console.error('Marketplace error:', err);
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

        await queryAll(
            `INSERT INTO marketplace_items (seller_id, title, description, price, condition)
             VALUES (?, ?, ?, ?, ?)`,
            [req.user.id, title, description, price, condition || 'good']
        );
        saveDb();

        res.status(201).json({ message: 'Item listed successfully' });
    } catch (err) {
        console.error('Marketplace error:', err);
        res.status(500).json({ error: 'Failed to list item' });
    }
};

/**
 * Mark an item as sold
 */
const markSold = async (req, res) => {
    try {
        const itemId = req.params.id;
        await queryAll(
            `UPDATE marketplace_items SET status = 'sold' WHERE id = ? AND seller_id = ?`,
            [itemId, req.user.id]
        );
        saveDb();
        res.json({ message: 'Item marked as sold' });
    } catch (err) {
        console.error('Marketplace error:', err);
        res.status(500).json({ error: 'Failed to update item' });
    }
};

/**
 * Delete an item completely
 */
const deleteItem = async (req, res) => {
    try {
        const itemId = req.params.id;
        await queryAll(
            `DELETE FROM marketplace_items WHERE id = ? AND seller_id = ?`,
            [itemId, req.user.id]
        );
        res.json({ message: 'Item permanently deleted' });
    } catch (err) {
        console.error('Marketplace delete err:', err);
        res.status(500).json({ error: 'Failed to delete item' });
    }
};

module.exports = {
    getItems,
    addItem,
    markSold,
    deleteItem
};
