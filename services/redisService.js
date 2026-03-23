const { createClient } = require('redis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let redisClient = null;

async function getRedisClient() {
    if (!redisClient) {
        redisClient = createClient({ 
            url: REDIS_URL,
            socket: { connectTimeout: 1000 } // Fail fast in 1s if no server
        });
        redisClient.on('error', (err) => {
             // Silence persistent error logs after initial failure
        });
        
        try {
            await redisClient.connect();
            console.log(`[🚀 REDIS CACHE] Connected to ${REDIS_URL}`);
        } catch (err) {
            console.warn('[⚠️ REDIS CACHE] Connection failed. Running in standalone DB mode.');
            redisClient = null; // Fails gracefully
        }
    }
    return redisClient;
}

/**
 * Cache middleware / wrapper for accelerating API responses
 */
async function getCachedData(key, fetchFunction, ttlSeconds = 3600) {
    const redis = await getRedisClient();
    
    // Fallback: If no Redis, just fetch directly
    if (!redis) {
        return await fetchFunction();
    }

    try {
        const cached = await redis.get(key);
        if (cached) {
            console.log(`[⚡ CACHE HIT] ${key}`);
            return JSON.parse(cached);
        }

        console.log(`[🐌 CACHE MISS] ${key} - Fetching from DB`);
        const freshData = await fetchFunction();
        
        // Save to cache
        await redis.setEx(key, ttlSeconds, JSON.stringify(freshData));
        return freshData;
    } catch (err) {
        console.error('Redis Error in getCachedData:', err);
        return await fetchFunction();
    }
}

/**
 * Clear cache by key pattern (useful after inserts/updates)
 */
async function invalidateCache(pattern) {
    const redis = await getRedisClient();
    if (!redis) return;

    try {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
            await redis.del(keys);
            console.log(`[🧹 CACHE CLEARED] ${keys.length} keys matching ${pattern}`);
        }
    } catch (err) {
        console.error('Redis Invalidate Error:', err);
    }
}

module.exports = {
    getRedisClient,
    getCachedData,
    invalidateCache
};
