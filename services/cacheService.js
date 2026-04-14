const { createClient } = require('redis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
let redisClient = null;
let isRedisOffline = false;
let isConnecting = false;
let lastRetryTime = 0;
const RETRY_INTERVAL = 10 * 60 * 1000; // 10 Minutes

// Local memory fallback (Fastest)
const localCache = new Map();
const localExpiries = new Map();

/**
 * Initializes Redis connection in the background.
 * Never blocks the main thread.
 */
function initRedis() {
    if (isConnecting || redisClient) return;
    
    isConnecting = true;
    const client = createClient({ 
        url: REDIS_URL,
        socket: { connectTimeout: 2000 }
    });

    client.on('error', (err) => {
        if (!isRedisOffline) console.warn('⚠️ [CACHE] Redis Offline:', err.message);
        isRedisOffline = true;
        isConnecting = false;
        redisClient = null;
    });

    client.connect()
        .then(() => {
            console.log('✅ [CACHE] Redis Connected (Background)');
            redisClient = client;
            isRedisOffline = false;
            isConnecting = false;
        })
        .catch((e) => {
            isRedisOffline = true;
            isConnecting = false;
            redisClient = null;
        });
}

// Start connection attempt immediately (non-blocking)
initRedis();

async function getOrSetCache(key, ttl, fetchFn) {
    const now = Date.now();

    // 1. TRY LOCAL MEMORY (Instant)
    const localExpiry = localExpiries.get(key);
    if (localExpiry && now < localExpiry) {
        const cached = localCache.get(key);
        if (cached) return JSON.parse(cached);
    }

    // 2. TRY REDIS (Distributed)
    if (redisClient && !isRedisOffline) {
        try {
            const redisData = await redisClient.get(key);
            if (redisData) {
                // Update Local Memory
                localCache.set(key, redisData);
                localExpiries.set(key, now + (ttl * 1000));
                return JSON.parse(redisData);
            }
        } catch (e) {
            console.warn('[CACHE] Redis Read Failed:', e.message);
            isRedisOffline = true;
        }
    }

    // 3. FETCH FRESH DATA
    const freshData = await fetchFn();
    // Don't cache empty arrays — prevents stale "no classes" from persisting
    if (freshData !== undefined && freshData !== null && !(Array.isArray(freshData) && freshData.length === 0)) {
        const stringData = JSON.stringify(freshData);
        
        // VULN-026 FIX: Prevent Memory Leak by pruning local cache
        if (localCache.size > 1000) {
            console.log('⚡ [CACHE] Local Memory Pruning (Max 1000 reached)');
            localCache.clear();
            localExpiries.clear();
        }

        // Update Local
        localCache.set(key, stringData);
        localExpiries.set(key, now + (ttl * 1000));

        // 4. SYNC TO REDIS (Background - Non-blocking)
        if (redisClient && !isRedisOffline) {
            redisClient.setEx(key, ttl, stringData).catch(e => {
                console.warn('[CACHE] Redis Sync Failed:', e.message);
                isRedisOffline = true;
                lastRetryTime = Date.now();
                redisClient = null;
            });
        } else if (now - lastRetryTime > RETRY_INTERVAL) {
            initRedis(); // Try to reconnect in background
        }
    }
    return freshData;
}

async function invalidateCache(keyPattern) {
    // Clear Local
    if (keyPattern.includes('*')) {
        // Simple wipe for patterns
        localCache.clear();
        localExpiries.clear();
    } else {
        localCache.delete(keyPattern);
        localExpiries.delete(keyPattern);
    }

    // Invalidate Redis (Background)
    if (redisClient && !isRedisOffline) {
        try {
            const keys = await redisClient.keys(keyPattern);
            if (keys.length > 0) redisClient.del(keys).catch(() => {});
        } catch (e) {
            isRedisOffline = true;
            lastRetryTime = Date.now();
        }
    }
}

async function flushAll() {
    console.log('[CACHE] Flushing ALL cache...');
    localCache.clear();
    localExpiries.clear();
    if (redisClient && !isRedisOffline) {
        try {
            await redisClient.flushAll();
            console.log('[CACHE] Redis flushed successfully');
        } catch (e) {
            console.warn('[CACHE] Redis flush failed:', e.message);
        }
    }
}

function isRedisConnected() {
    return !!redisClient && !isRedisOffline;
}

module.exports = {
    getOrSetCache,
    invalidateCache,
    flushAll,
    isRedisConnected,
    getRedisClient: () => redisClient
};
