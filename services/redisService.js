// 🛡️ ASTRA Hardened Cache Bridge
// Redirects legacy redisService calls to the new, resilient cacheService.js
const cache = require('./cacheService');

module.exports = {
    getCachedData: cache.getOrSetCache,
    invalidateCache: cache.invalidateCache
};
