const { createClient } = require('redis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
let redisClient = null;
let isRedisOffline = false;
let isConnecting = false;
let lastRetryTime = 0;
const RETRY_INTERVAL = 5 * 60 * 1000; // 5 Minutes before trying Redis again

// Local memory fallback for when Redis is dead
const localCache = new Map();
const localExpiries = new Map();

async function getCacheClient() {
    const now = Date.now();
    
    // 1. If we know Redis is offline, don't even try until the retry interval passes
    if (isRedisOffline && (now - lastRetryTime < RETRY_INTERVAL)) {
        return null;
    }

    // 2. If we are already trying to connect, don't start another attempt
    if (isConnecting) return null;

    if (!redisClient) {
        lastRetryTime = now;
        isConnecting = true;
        
        console.log(`[📡 CACHE] Attempting Redis connection to ${REDIS_URL.substring(0, 15)}...`);
        
        const client = createClient({ 
            url: REDIS_URL,
            socket: {
                connectTimeout: 2000 // Force 2s timeout at the socket level
            }
        });
        
        client.on('error', (err) => {
            if (!isRedisOffline) console.warn('⚠️ [CACHE] Redis Error:', err.message);
            isRedisOffline = true;
            isConnecting = false;
            redisClient = null;
        });
        
        try {
            // Force a hard timeout on the connect promise
            await Promise.race([
                client.connect(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Connect Timeout')), 2500))
            ]);
            console.log('✅ [CACHE] Connected to Redis');
            redisClient = client;
            isRedisOffline = false;
            isConnecting = false;
        } catch (e) {
            if (!isRedisOffline) console.warn(`⚠️ [CACHE] Redis Unavailable (${e.message}). Using Local Fallback.`);
            isRedisOffline = true;
            isConnecting = false;
            redisClient = null;
            // Ensure client is closed
            try { await client.disconnect(); } catch (ignore) {}
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
    
    // 1. TRY REDIS (Primary)
    if (client) {
        try {
            const cached = await client.get(key);
            if (cached) return JSON.parse(cached);

            const freshData = await fetchFn();
            if (freshData !== undefined && freshData !== null) {
                await client.setEx(key, ttl, JSON.stringify(freshData));
            }
            return freshData;
        } catch (e) {
            console.error('Redis operation failed:', e.message);
            isRedisOffline = true; // Trip the circuit
        }
    }

    // 2. TRY LOCAL MEMORY (Permanent Fallback)
    const now = Date.now();
    const expiry = localExpiries.get(key);
    
    if (expiry && now < expiry) {
        const cached = localCache.get(key);
        if (cached) return JSON.parse(cached);
    }

    // Fetch and store locally
    const freshData = await fetchFn();
    if (freshData !== undefined && freshData !== null) {
        localCache.set(key, JSON.stringify(freshData));
        localExpiries.set(key, now + (ttl * 1000));
    }
    return freshData;
}

async function invalidateCache(keyPattern) {
    const client = await getCacheClient();
    
    // Invalidate Redis
    if (client) {
        try {
            const keys = await client.keys(keyPattern);
            if (keys.length > 0) await client.del(keys);
        } catch (e) {
            console.error('Redis invalidation failed:', e.message);
        }
    }

    // Invalidate Local (Clear all to be safe, or regex match keys)
    localCache.clear();
    localExpiries.clear();
}

module.exports = {
    getCacheClient,
    getOrSetCache,
    invalidateCache
};
