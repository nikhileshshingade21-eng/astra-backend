const redis = require('redis');
require('dotenv').config();

// Construct Redis URL (Assuming REDIS_URL exists in environment or default to localhost)
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const client = redis.createClient({ url: REDIS_URL });

async function clear() {
    try {
        await client.connect();
        console.log('Connected to Redis at:', REDIS_URL);
        
        // Find all timetable keys
        const keys = await client.keys('timetable:*');
        console.log(`Found ${keys.length} timetable keys to invalidate.`);
        
        if (keys.length > 0) {
            const count = await client.del(keys);
            console.log(`Successfully invalidated ${count} cache entries.`);
        }
        
    } catch (err) {
        console.error('Redis Invalidation Error:', err.message);
    } finally {
        await client.quit();
    }
}
clear();
