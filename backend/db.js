const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('strong', 'showed_up', 'bare_minimum', 'missed')),
    what_i_did TEXT DEFAULT '',
    next_step TEXT DEFAULT '',
    feeling TEXT DEFAULT '',
    thought TEXT DEFAULT '',
    free_write TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK(type IN ('today', 'tomorrow')),
    content TEXT DEFAULT '',
    completed INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT DEFAULT ''
  );
`);

// Initialize default settings if not present
const existingPhase = db.prepare("SELECT value FROM settings WHERE key = 'current_phase'").get();
if (!existingPhase) {
  db.prepare("INSERT INTO settings (key, value) VALUES ('current_phase', '1')").run();
}

module.exports = db;
