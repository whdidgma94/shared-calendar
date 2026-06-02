'use strict';

const pool = require('../db/pool');

function toSession(row) {
  if (!row) return null;
  return {
    id: row.id,
    token: row.token,
    title: row.title,
    lastActiveAt: row.last_active_at,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

async function createSession({ token, title, expiresAt }) {
  const { rows } = await pool.query(
    `INSERT INTO sessions (token, title, expires_at)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [token, title, expiresAt]
  );
  return toSession(rows[0]);
}

async function findByToken(token) {
  const { rows } = await pool.query(
    'SELECT * FROM sessions WHERE token = $1',
    [token]
  );
  return toSession(rows[0] || null);
}

async function touchSession(sessionId) {
  const { rows } = await pool.query(
    `UPDATE sessions SET last_active_at = NOW() WHERE id = $1 RETURNING *`,
    [sessionId]
  );
  return toSession(rows[0]);
}

module.exports = { createSession, findByToken, touchSession };
