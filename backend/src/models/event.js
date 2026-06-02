'use strict';

const pool = require('../db/pool');

function toEvent(row) {
  if (!row) return null;
  return {
    id: row.id,
    sessionId: row.session_id,
    title: row.title,
    startAt: row.start_at,
    endAt: row.end_at,
    allDay: row.all_day,
    description: row.description,
    location: row.location,
    color: row.color,
    authorName: row.author_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function findBySession(sessionId, { from, to } = {}) {
  const params = [sessionId];
  let where = 'session_id = $1';
  if (from) { params.push(from); where += ` AND end_at > $${params.length}`; }
  if (to)   { params.push(to);   where += ` AND start_at < $${params.length}`; }

  const { rows } = await pool.query(
    `SELECT * FROM events WHERE ${where} ORDER BY start_at ASC`,
    params
  );
  return rows.map(toEvent);
}

async function findOne(sessionId, eventId) {
  const { rows } = await pool.query(
    'SELECT * FROM events WHERE id = $1 AND session_id = $2',
    [eventId, sessionId]
  );
  return toEvent(rows[0] || null);
}

async function createEvent(
  sessionId,
  { title, startAt, endAt, allDay = false, description, location, color = '#3788d8', authorName }
) {
  const { rows } = await pool.query(
    `INSERT INTO events
       (session_id, title, start_at, end_at, all_day, description, location, color, author_name)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [sessionId, title, startAt, endAt, allDay,
     description || null, location || null, color, authorName || null]
  );
  return toEvent(rows[0]);
}

async function updateEvent(sessionId, eventId, updates) {
  const fieldMap = {
    title: 'title', startAt: 'start_at', endAt: 'end_at', allDay: 'all_day',
    description: 'description', location: 'location', color: 'color', authorName: 'author_name',
  };
  const setClauses = [];
  const params = [];

  for (const [jsKey, dbCol] of Object.entries(fieldMap)) {
    if (!(jsKey in updates)) continue;
    params.push(updates[jsKey] === undefined ? null : updates[jsKey]);
    setClauses.push(`${dbCol} = $${params.length}`);
  }
  if (setClauses.length === 0) return findOne(sessionId, eventId);

  setClauses.push(`updated_at = NOW()`);
  params.push(eventId, sessionId);

  const { rows } = await pool.query(
    `UPDATE events SET ${setClauses.join(', ')}
     WHERE id = $${params.length - 1} AND session_id = $${params.length}
     RETURNING *`,
    params
  );
  return toEvent(rows[0] || null);
}

async function deleteEvent(sessionId, eventId) {
  const { rowCount } = await pool.query(
    'DELETE FROM events WHERE id = $1 AND session_id = $2',
    [eventId, sessionId]
  );
  return rowCount > 0;
}

module.exports = { findBySession, findOne, createEvent, updateEvent, deleteEvent };
