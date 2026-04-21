/**
 * ASTRA V4 Debounce Service
 * ==========================
 * Prevents database thrashing from rapid offline/online reconnect attempts
 * and location ping surges. Uses in-memory Maps with TTL expiry.
 *
 * Design:
 * - Each event key (e.g., "online:userId") has a configurable cooldown window
 * - Events within the window are silently dropped
 * - Location pings are buffered and flushed periodically to batch DB writes
 * - Memory-safe: auto-prunes entries older than 1 hour
 */

// ─── Debounce State ─────────────────────────────────────────────────────────

const debounceMap = new Map();     // key → { timestamp, data }
const locationBuffer = new Map();  // userId → { lat, lng, timestamp }

// Configurable cooldown windows (milliseconds)
const DEBOUNCE_WINDOWS = {
    online_status:  10 * 1000,     // 10s — ignore rapid online/offline flicker
    app_background: 5 * 1000,      // 5s — ignore rapid background/foreground toggle
    app_resume:     5 * 1000,      // 5s — same
    location_ping:  30 * 1000,     // 30s — buffer rapid GPS pings
    activity_ping:  60 * 1000,     // 60s — heartbeat dedup
    login_event:    5 * 60 * 1000, // 5min — prevent login event spam
};

const PRUNE_INTERVAL = 10 * 60 * 1000; // Prune stale entries every 10 minutes
const MAX_AGE = 60 * 60 * 1000;        // Remove entries older than 1 hour

// ─── Core Debounce Check ────────────────────────────────────────────────────

/**
 * Returns true if the event should be PROCESSED (not debounced).
 * Returns false if the event should be SKIPPED (within cooldown window).
 *
 * @param {string} eventType — one of the DEBOUNCE_WINDOWS keys
 * @param {string|number} entityId — user ID or unique identifier
 * @param {object} data — optional payload to store with the debounce entry
 * @returns {boolean} — true = process this event, false = skip it
 */
function shouldProcess(eventType, entityId, data = null) {
    const key = `${eventType}:${entityId}`;
    const now = Date.now();
    const window = DEBOUNCE_WINDOWS[eventType] || 10000;

    const existing = debounceMap.get(key);
    if (existing && (now - existing.timestamp) < window) {
        return false; // Still within cooldown — skip
    }

    // Allow processing + update timestamp
    debounceMap.set(key, { timestamp: now, data });
    return true;
}

// ─── Location Ping Buffer ───────────────────────────────────────────────────

/**
 * Buffers a location ping. Returns the buffer contents only when flush is called.
 * This prevents per-ping DB writes for students with rapid GPS updates.
 */
function bufferLocationPing(userId, lat, lng) {
    locationBuffer.set(userId, {
        lat, lng,
        timestamp: Date.now(),
        userId
    });
}

/**
 * Returns all buffered locations and clears the buffer.
 * Called by the sweeper cron to batch-write locations.
 */
function flushLocationBuffer() {
    const entries = Array.from(locationBuffer.values());
    locationBuffer.clear();
    return entries;
}

/**
 * Get the size of the current location buffer (for monitoring).
 */
function getLocationBufferSize() {
    return locationBuffer.size;
}

// ─── Memory Pruning ─────────────────────────────────────────────────────────

function pruneStaleEntries() {
    const now = Date.now();
    let pruned = 0;

    for (const [key, entry] of debounceMap) {
        if (now - entry.timestamp > MAX_AGE) {
            debounceMap.delete(key);
            pruned++;
        }
    }

    // Also prune very old location pings (shouldn't happen, but safety net)
    for (const [userId, entry] of locationBuffer) {
        if (now - entry.timestamp > MAX_AGE) {
            locationBuffer.delete(userId);
            pruned++;
        }
    }

    if (pruned > 0) {
        console.log(`[DEBOUNCE] Pruned ${pruned} stale entries. Active: ${debounceMap.size} debounce, ${locationBuffer.size} locations`);
    }
}

// Auto-prune on interval
setInterval(pruneStaleEntries, PRUNE_INTERVAL).unref();

// ─── Stats (for health endpoint) ────────────────────────────────────────────

function getStats() {
    return {
        debounce_entries: debounceMap.size,
        location_buffer: locationBuffer.size,
        windows: { ...DEBOUNCE_WINDOWS }
    };
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = {
    shouldProcess,
    bufferLocationPing,
    flushLocationBuffer,
    getLocationBufferSize,
    getStats,
    DEBOUNCE_WINDOWS,
};
