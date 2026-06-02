'use strict';

const { v4: uuidv4 } = require('uuid');
const db = require('../db/db');

function toEvent(row) {
  if (!row) return null;
  return {
    id: row.id,
    sessionId: row.session_id,
    title: row.title,
    startAt: row.start_at,
    endAt: row.end_at,
    allDay: row.all_day === 1 || row.all_day === true,
    description: row.description,
    location: row.location,
    color: row.color,
    authorName: row.author_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function findBySession(sessionId, { from, to } = {}) {
  let sql = 'SELECT * FROM events WHERE session_id = ?';
  const params = [sessionId];
  if (from) { sql += ' AND end_at > ?';   params.push(from); }
  if (to)   { sql += ' AND start_at < ?'; params.push(to); }
  sql += ' ORDER BY start_at ASC';
  return db.prepare(sql).all(...params).map(toEvent);
}

async function findOne(sessionId, eventId) {
  return toEvent(
    db.prepare('SELECT * FROM events WHERE id = ? AND session_id = ?').get(eventId, sessionId) || null
  );
}

async function createEvent(
  sessionId,
  { title, startAt, endAt, allDay = false, description, location, color = '#3788d8', authorName }
) {
  const id  = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO events
      (id, session_id, title, start_at, end_at, all_day, description, location, color, author_name, created_at, updated_at)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, sessionId, title, startAt, endAt, allDay ? 1 : 0,
         description || null, location || null, color, authorName || null, now, now);

  return toEvent(db.prepare('SELECT * FROM events WHERE id = ?').get(id));
}

async function updateEvent(sessionId, eventId, updates) {
  const fieldMap = {
    title:       'title',
    startAt:     'start_at',
    endAt:       'end_at',
    allDay:      'all_day',
    description: 'description',
    location:    'location',
    color:       'color',
    authorName:  'author_name',
  };

  const setClauses = [];
  const params     = [];

  for (const [jsKey, dbCol] of Object.entries(fieldMap)) {
    if (!(jsKey in updates)) continue;
    let val = updates[jsKey] === undefined ? null : updates[jsKey];
    if (jsKey === 'allDay') val = val ? 1 : 0;
    params.push(val);
    setClauses.push(`${dbCol} = ?`);
  }

  if (setClauses.length === 0) return findOne(sessionId, eventId);

  setClauses.push('updated_at = ?');
  params.push(new Date().toISOString(), eventId, sessionId);

  db.prepare(`
    UPDATE events SET ${setClauses.join(', ')}
    WHERE id = ? AND session_id = ?
  `).run(...params);

  return findOne(sessionId, eventId);
}

async function deleteEvent(sessionId, eventId) {
  const result = db.prepare(
    'DELETE FROM events WHERE id = ? AND session_id = ?'
  ).run(eventId, sessionId);
  return result.changes > 0;
}

module.exports = { findBySession, findOne, createEvent, updateEvent, deleteEvent };
