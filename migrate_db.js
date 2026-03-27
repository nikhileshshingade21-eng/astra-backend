const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const { Pool } = require('pg');

const DB_PATH = path.join(__dirname, 'astra.db');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'astra',
  password: process.env.DB_PASSWORD || 'astrapass',
  database: process.env.DB_NAME || 'astradb',
});

async function migrate() {
    console.log('Starting Migration from SQLite to PostgreSQL...');
    try {
        if (!fs.existsSync(DB_PATH)) {
            console.log('No astra.db found locally. Skipping migration.');
            process.exit(0);
        }
        
        const SQL = await initSqlJs();
        const buffer = fs.readFileSync(DB_PATH);
        const db = new SQL.Database(buffer);
        console.log('Loaded SQLite database.');

        // Initialize Postgres connection
        let client;
        try {
            client = await pool.connect();
        } catch (e) {
            console.error('CRITICAL: Cannot connect to PostgreSQL at localhost:5432. Make sure it is running via docker-compose up -d postgres.', e.message);
            process.exit(1);
        }
        console.log('Connected to PostgreSQL.');

        // Get all tables from SQLite
        const tablesRes = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
        if (!tablesRes.length) {
            console.log('No tables found in SQLite.');
            process.exit(0);
        }
        
        const tables = tablesRes[0].values.map(v => v[0]);
        console.log('Tables to migrate:', tables);

        // Required to initialize PG tables before migrating data
        const { getDb } = require('./database_module.js');
        await getDb(); // Initializes tables in PG if they don't exist
        
        // Truncate tables to safely migrate
        for (const table of tables) {
            try {
                await client.query(`TRUNCATE TABLE ${table} CASCADE`);
            } catch (e) {
                console.log(`Table ${table} might not exist in PG, skipping truncate.`);
            }
        }

        // Migrate data per table
        for (const table of tables) {
            const dataRes = db.exec(`SELECT * FROM ${table}`);
            if (!dataRes.length) {
                 console.log(`Skipping ${table} - No data`);
                 continue;
            }
            
            const columns = dataRes[0].columns;
            const rows = dataRes[0].values;
            
            console.log(`Migrating ${rows.length} rows for table ${table}...`);
            
            for (const row of rows) {
                const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
                const colNames = columns.join(', ');
                const query = `INSERT INTO ${table} (${colNames}) VALUES (${placeholders})`;
                try {
                    await client.query(query, row);
                } catch (e) {
                    console.error(`Error inserting into ${table}:`, e.message);
                }
            }
            
            // Update sequence for id
            if (columns.includes('id')) {
                try {
                    await client.query(`SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id)+1 FROM ${table}), 1), false)`);
                } catch (idxErr) {
                    // Ignore sequence update errors
                }
            }
        }

        console.log('Migration Completed Successfully!');
        client.release();
        process.exit(0);

    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
