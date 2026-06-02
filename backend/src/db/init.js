'use strict';

const db = require('./db');

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id             TEXT PRIMARY KEY,
      token          TEXT NOT NULL UNIQUE,
      title          TEXT NOT NULL,
      last_active_at TEXT NOT NULL,
      expires_at     TEXT NOT NULL,
      created_at     TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_token
      ON sessions (token);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at
      ON sessions (expires_at);

    CREATE TABLE IF NOT EXISTS events (
      id          TEXT    PRIMARY KEY,
      session_id  TEXT    NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      title       TEXT    NOT NULL,
      start_at    TEXT    NOT NULL,
      end_at      TEXT    NOT NULL,
      all_day     INTEGER NOT NULL DEFAULT 0,
      description TEXT,
      location    TEXT,
      color       TEXT    NOT NULL DEFAULT '#3788d8',
      author_name TEXT,
      created_at  TEXT    NOT NULL,
      updated_at  TEXT    NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_events_session_id
      ON events (session_id);
    CREATE INDEX IF NOT EXISTS idx_events_session_range
      ON events (session_id, start_at, end_at);
  `);
  console.log('[db] SQLite initialized:', db.name);
}

module.exports = { initDb };
