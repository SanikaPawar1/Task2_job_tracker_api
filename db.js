const path = require('path');
const Database = require('better-sqlite3');

// Keep the database beside the application so it is easy to locate and back up.
const database = new Database(path.join(__dirname, 'jobtracker.db'));

// SQLite does not enforce foreign keys unless this setting is enabled per connection.
database.pragma('foreign_keys = ON');

// Create the schema when the application starts; existing tables are left unchanged.
database.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    company TEXT NOT NULL,
    role TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'applied',
    applied_date TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

module.exports = database;
