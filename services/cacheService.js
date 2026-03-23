const { createClient } = require('redis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
let redisClient = null;

async function getCacheClient() {
    if (!redisClient) {
        redisClient = createClient({ url: REDIS_URL });
        redisClient.on('error', (err) => console.error('Redis Client Error', err));
        
        try {
            await redisClient.connect();
            console.log('✅ Connected to Redis cache');
        } catch (e) {
            console.warn('⚠️ Could not connect to Redis, proceeding without cache:', e.message);
            redisClient = null;
        }
    }
    return redisClient;
}

/**
 * Gets a value from cache or executes fetch function and caches result
 * @param {string} key Cache key
 * @param {number} ttl Expiration time in seconds
 * @param {Function} fetchFn Async function to fetch data if not in cache
 */
async function getOrSetCache(key, ttl, fetchFn) {
    const client = await getCacheClient();
    if (!client) {
        return await fetchFn();
    }

    try {
        const cached = await client.get(key);
        if (cached) {
            return JSON.parse(cached);
        }

        const freshData = await fetchFn();
        if (freshData !== undefined && freshData !== null) {
            await client.setEx(key, ttl, JSON.stringify(freshData));
        }
        return freshData;
    } catch (e) {
        console.error('Cache operation failed:', e);
        return await fetchFn();
    }
}

async function invalidateCache(keyPattern) {
    const client = await getCacheClient();
    if (!client) return;

    try {
        const keys = await client.keys(keyPattern);
        if (keys.length > 0) {
            await client.del(keys);
        }
    } catch (e) {
        console.error('Cache invalidation failed:', e);
    }
}

module.exports = {
    getCacheClient,
    getOrSetCache,
    invalidateCache
};
