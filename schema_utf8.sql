CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      roll_number TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      programme TEXT,
      section TEXT,
      role TEXT DEFAULT 'student' CHECK(role IN ('student','faculty','admin')),
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    , biometric_enrolled INTEGER DEFAULT 0, face_enrolled INTEGER DEFAULT 0, biometric_template TEXT, face_template TEXT);
CREATE TABLE sqlite_sequence(name,seq);
CREATE TABLE campus_zones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      radius_m REAL NOT NULL DEFAULT 100
    );
CREATE TABLE classes (
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
    );
CREATE TABLE attendance (
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
    );
CREATE TABLE notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      title TEXT NOT NULL,
      message TEXT,
      type TEXT DEFAULT 'info' CHECK(type IN ('info','warning','success','danger')),
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
CREATE TABLE marks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      class_id INTEGER REFERENCES classes(id),
      exam_type TEXT NOT NULL,
      marks_obtained REAL NOT NULL,
      total_marks REAL NOT NULL,
      date TEXT DEFAULT (date('now'))
    );
CREATE TABLE leave_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      reason TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
      applied_at TEXT DEFAULT (datetime('now'))
    );
CREATE TABLE threat_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      event_type TEXT NOT NULL,
      threat_score INTEGER DEFAULT 0,
      severity TEXT DEFAULT 'low' CHECK(severity IN ('low','medium','high','critical')),
      action_taken TEXT DEFAULT 'monitor',
      details TEXT,
      ip_address TEXT,
      ai_recommendation TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
CREATE TABLE banned_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      reason TEXT NOT NULL,
      threat_score INTEGER DEFAULT 0,
      banned_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT,
      is_permanent INTEGER DEFAULT 0,
      unbanned INTEGER DEFAULT 0
    );
CREATE TABLE marketplace_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seller_id INTEGER NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      condition TEXT DEFAULT 'good',
      status TEXT DEFAULT 'available',
      created_at TEXT DEFAULT (datetime('now'))
    );
CREATE TABLE jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      req_skills TEXT NOT NULL,
      min_cgpa REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
