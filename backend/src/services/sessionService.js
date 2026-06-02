'use strict';

const sessionModel = require('../models/session');
const { generateToken } = require('./tokenService');

async function createSession({ title }) {
  const token = generateToken();
  // expires_at 컬럼은 유지하되 만료 체크는 하지 않음 — 먼 미래로 설정
  const expiresAt = new Date('2999-12-31T00:00:00.000Z');
  return sessionModel.createSession({ token, title, expiresAt });
}

async function getSessionByToken(token) {
  const session = await sessionModel.findByToken(token);
  if (!session) return null;
  return sessionModel.touchSession(session.id);
}

async function resolveSession(token) {
  const session = await sessionModel.findByToken(token);
  if (!session) return { notFound: true };
  return { session };
}

async function touchById(sessionId) {
  return sessionModel.touchSession(sessionId);
}

module.exports = { createSession, getSessionByToken, resolveSession, touchById };
