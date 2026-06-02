'use strict';

const pool = require('./pool');

async function migrate() {
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";

    CREATE TABLE IF NOT EXISTS sessions (
      id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      token          TEXT        NOT NULL UNIQUE,
      title          TEXT        NOT NULL,
      last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at     TIMESTAMPTZ NOT NULL,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_token
      ON sessions (token);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at
      ON sessions (expires_at);

    CREATE TABLE IF NOT EXISTS events (
      id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id  UUID        NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
      title       TEXT        NOT NULL,
      start_at    TIMESTAMPTZ NOT NULL,
      end_at      TIMESTAMPTZ NOT NULL,
      all_day     BOOLEAN     NOT NULL DEFAULT FALSE,
      description TEXT,
      location    TEXT,
      color       TEXT        NOT NULL DEFAULT '#3788d8',
      author_name TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_events_session_id
      ON events (session_id);
    CREATE INDEX IF NOT EXISTS idx_events_session_range
      ON events (session_id, start_at, end_at);
  `);
  console.log('[db] PostgreSQL migration complete (Neon)');
}

module.exports = { migrate };
