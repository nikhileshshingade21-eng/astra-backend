/**
 * ASTRA V4 Schema Migration
 * ==========================
 * Adds predictive event-driven columns and tables:
 * - users: is_online, expected_return, risk_persona, risk_score, last_active_at, grace_period_minutes
 * - user_habit_matrix: hourly usage heatmaps per user
 * - event_predictions: dual-write shadow mode for training predictions
 * - B-Tree indexes for efficient sweeper cron queries
 *
 * Safe to run multiple times — all statements use IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
 */

const { queryAll } = require('../database_module');

async function migrateV4Schema() {
    console.log('[V4 MIGRATION] Starting ASTRA V4 schema migration...');

    // ─── 1. Add V4 columns to users table ───────────────────────────────
    const userColumns = [
        { name: 'is_online', definition: 'BOOLEAN DEFAULT false' },
        { name: 'expected_return', definition: 'TIMESTAMP' },
        { name: 'risk_persona', definition: "VARCHAR(32) DEFAULT 'neutral'" },
        { name: 'risk_score', definition: 'INTEGER DEFAULT 50' },
        { name: 'last_active_at', definition: 'TIMESTAMP' },
        { name: 'grace_period_minutes', definition: 'INTEGER DEFAULT 30' },
    ];

    for (const col of userColumns) {
        try {
            await queryAll(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${col.name} ${col.definition}`);
            console.log(`  ✅ users.${col.name} — OK`);
        } catch (err) {
            if (err.message.includes('already exists') || err.message.includes('duplicate column')) {
                console.log(`  ⏭️  users.${col.name} — already exists`);
            } else {
                console.error(`  ❌ users.${col.name} — FAILED:`, err.message);
            }
        }
    }

    // ─── 2. Create user_habit_matrix table ──────────────────────────────
    try {
        await queryAll(`
            CREATE TABLE IF NOT EXISTS user_habit_matrix (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                hour_bucket INTEGER NOT NULL CHECK (hour_bucket >= 0 AND hour_bucket <= 23),
                day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
                activity_count INTEGER DEFAULT 0,
                avg_duration_mins REAL DEFAULT 0,
                last_updated TIMESTAMP DEFAULT NOW(),
                UNIQUE(user_id, hour_bucket, day_of_week)
            )
        `);
        console.log('  ✅ user_habit_matrix table — OK');
    } catch (err) {
        if (err.message.includes('already exists')) {
            console.log('  ⏭️  user_habit_matrix table — already exists');
        } else {
            console.error('  ❌ user_habit_matrix table — FAILED:', err.message);
        }
    }

    // ─── 3. Create event_predictions table (dual-write shadow mode) ─────
    try {
        await queryAll(`
            CREATE TABLE IF NOT EXISTS event_predictions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                event_type VARCHAR(64) NOT NULL,
                predicted_at TIMESTAMP NOT NULL,
                actual_at TIMESTAMP,
                accuracy_delta_mins REAL,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('  ✅ event_predictions table — OK');
    } catch (err) {
        if (err.message.includes('already exists')) {
            console.log('  ⏭️  event_predictions table — already exists');
        } else {
            console.error('  ❌ event_predictions table — FAILED:', err.message);
        }
    }

    // ─── 4. Create B-Tree indexes for efficient sweeper ─────────────────
    const indexes = [
        {
            name: 'idx_users_expected_return',
            sql: 'CREATE INDEX IF NOT EXISTS idx_users_expected_return ON users(expected_return) WHERE expected_return IS NOT NULL'
        },
        {
            name: 'idx_users_is_online',
            sql: 'CREATE INDEX IF NOT EXISTS idx_users_is_online ON users(is_online) WHERE is_online = true'
        },
        {
            name: 'idx_users_risk_persona',
            sql: 'CREATE INDEX IF NOT EXISTS idx_users_risk_persona ON users(risk_persona)'
        },
        {
            name: 'idx_habit_matrix_user',
            sql: 'CREATE INDEX IF NOT EXISTS idx_habit_matrix_user ON user_habit_matrix(user_id, hour_bucket)'
        },
        {
            name: 'idx_event_predictions_user',
            sql: 'CREATE INDEX IF NOT EXISTS idx_event_predictions_user ON event_predictions(user_id, event_type)'
        },
    ];

    for (const idx of indexes) {
        try {
            await queryAll(idx.sql);
            console.log(`  ✅ Index ${idx.name} — OK`);
        } catch (err) {
            if (err.message.includes('already exists')) {
                console.log(`  ⏭️  Index ${idx.name} — already exists`);
            } else {
                console.error(`  ❌ Index ${idx.name} — FAILED:`, err.message);
            }
        }
    }

    // ─── 5. Ensure app_state table exists (used by weather state persistence) ──
    try {
        await queryAll(`
            CREATE TABLE IF NOT EXISTS app_state (
                key TEXT PRIMARY KEY,
                value TEXT,
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('  ✅ app_state table — OK');
    } catch (err) {
        if (err.message.includes('already exists')) {
            console.log('  ⏭️  app_state table — already exists');
        } else {
            console.error('  ❌ app_state table — FAILED:', err.message);
        }
    }

    // ─── 6. Ensure user_preferences table exists (quiet hours) ──────────
    try {
        await queryAll(`
            CREATE TABLE IF NOT EXISTS user_preferences (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL UNIQUE,
                quiet_hours_start VARCHAR(8) DEFAULT '22:00',
                quiet_hours_end VARCHAR(8) DEFAULT '07:00',
                notification_enabled BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('  ✅ user_preferences table — OK');
    } catch (err) {
        if (err.message.includes('already exists')) {
            console.log('  ⏭️  user_preferences table — already exists');
        } else {
            console.error('  ❌ user_preferences table — FAILED:', err.message);
        }
    }

    // ─── 7. Ensure user_behavior_logs table exists (AI engine) ──────────
    try {
        await queryAll(`
            CREATE TABLE IF NOT EXISTS user_behavior_logs (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                action VARCHAR(64) NOT NULL,
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('  ✅ user_behavior_logs table — OK');
    } catch (err) {
        if (err.message.includes('already exists')) {
            console.log('  ⏭️  user_behavior_logs table — already exists');
        } else {
            console.error('  ❌ user_behavior_logs table — FAILED:', err.message);
        }
    }

    // ─── 8. Ensure notification_history table exists (AI engine) ────────
    try {
        await queryAll(`
            CREATE TABLE IF NOT EXISTS notification_history (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                type VARCHAR(64),
                title TEXT,
                message TEXT,
                status VARCHAR(32) DEFAULT 'delivered',
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('  ✅ notification_history table — OK');
    } catch (err) {
        if (err.message.includes('already exists')) {
            console.log('  ⏭️  notification_history table — already exists');
        } else {
            console.error('  ❌ notification_history table — FAILED:', err.message);
        }
    }

    console.log('[V4 MIGRATION] ✅ Schema migration complete.');
}

// Allow both direct execution and import
if (require.main === module) {
    migrateV4Schema()
        .then(() => process.exit(0))
        .catch(err => {
            console.error('[V4 MIGRATION] Fatal error:', err.message);
            process.exit(1);
        });
}

module.exports = { migrateV4Schema };
