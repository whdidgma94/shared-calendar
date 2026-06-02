'use strict';

const { v4: uuidv4 } = require('uuid');
const db = require('../db/db');

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
  const id = uuidv4();
  const now = new Date().toISOString();
  const expiresAtStr = expiresAt instanceof Date ? expiresAt.toISOString() : expiresAt;

  db.prepare(`
    INSERT INTO sessions (id, token, title, last_active_at, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, token, title, now, expiresAtStr, now);

  return toSession(db.prepare('SELECT * FROM sessions WHERE id = ?').get(id));
}

async function findByToken(token) {
  return toSession(db.prepare('SELECT * FROM sessions WHERE token = ?').get(token) || null);
}

async function touchSession(sessionId) {
  const now = new Date().toISOString();
  db.prepare('UPDATE sessions SET last_active_at = ? WHERE id = ?').run(now, sessionId);
  return toSession(db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId));
}

module.exports = { createSession, findByToken, touchSession };
