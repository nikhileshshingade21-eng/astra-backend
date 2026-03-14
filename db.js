const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'astra.db');
let db = null;

async function getDb() {
  if (db) return db;

  const SQL = await initSqlJs();

  // Load existing DB or create new
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      roll_number TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      programme TEXT,
      section TEXT,
      role TEXT DEFAULT 'student' CHECK(role IN ('student','faculty','admin')),
      password_hash TEXT NOT NULL,
      biometric_enrolled INTEGER DEFAULT 0,
      face_enrolled INTEGER DEFAULT 0,
      biometric_template TEXT,
      face_template TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS campus_zones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      radius_m REAL NOT NULL DEFAULT 100
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      faculty_name TEXT,
      room TEXT,
      day TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      programme TEXT,
      section TEXT,
      zone_id INTEGER REFERENCES campus_zones(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      class_id INTEGER REFERENCES classes(id),
      date TEXT NOT NULL,
      status TEXT DEFAULT 'present' CHECK(status IN ('present','absent','late')),
      gps_lat REAL,
      gps_lng REAL,
      distance_m REAL,
      method TEXT DEFAULT 'gps+biometric',
      marked_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      title TEXT NOT NULL,
      message TEXT,
      type TEXT DEFAULT 'info' CHECK(type IN ('info','warning','success','danger')),
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS marks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      class_id INTEGER REFERENCES classes(id),
      exam_type TEXT NOT NULL,
      marks_obtained REAL NOT NULL,
      total_marks REAL NOT NULL,
      date TEXT DEFAULT (date('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS leave_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      reason TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
      applied_at TEXT DEFAULT (datetime('now'))
    )
  `);

  saveDb();
  return db;
}

function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// Helper to execute parameterized queries returning result array format 
function queryAll(sql, params = []) {
  if (!db) return [];
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const result = { columns: stmt.getColumnNames(), values: [] };
  while (stmt.step()) {
    result.values.push(stmt.get());
  }
  stmt.free();
  return result.values.length > 0 ? [result] : [];
}

// Auto-save every 5 seconds
setInterval(saveDb, 5000);

module.exports = { getDb, saveDb, queryAll };
