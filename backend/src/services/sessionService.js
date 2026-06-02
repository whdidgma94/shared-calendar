'use strict';

const sessionModel = require('../models/session');
const { generateToken } = require('./tokenService');

const SESSION_EXPIRES_DAYS = parseInt(process.env.SESSION_EXPIRES_DAYS || '90', 10);

/**
 * 새 세션 생성
 * @param {{ title: string }} param0
 * @returns {Promise<object>} Session
 */
async function createSession({ title }) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
  return sessionModel.createSession({ token, title, expiresAt });
}

/**
 * 토큰으로 세션 조회.
 * - 미존재: null 반환 (호출측에서 404 처리)
 * - 만료: { expired: true } 반환 (호출측에서 410 처리)
 * - 정상: lastActiveAt 갱신 후 Session 반환
 *
 * @param {string} token
 * @returns {Promise<object|null|{expired:true}>}
 */
async function getSessionByToken(token) {
  const session = await sessionModel.findByToken(token);
  if (!session) return null;

  if (new Date(session.expiresAt) < new Date()) {
    return { expired: true };
  }

  // lastActiveAt 갱신
  return sessionModel.touchSession(session.id);
}

/**
 * 세션 존재·유효성 검증 후 Session 객체를 반환.
 * sessionGuard 미들웨어와 서비스 계층 양쪽에서 재사용한다.
 *
 * @param {string} token
 * @returns {Promise<{ session?: object, notFound?: boolean, expired?: boolean }>}
 */
async function resolveSession(token) {
  const session = await sessionModel.findByToken(token);
  if (!session) return { notFound: true };
  if (new Date(session.expiresAt) < new Date()) return { expired: true };
  return { session };
}

/**
 * session_id 기준으로 lastActiveAt만 갱신 (이벤트 write 후 호출)
 * @param {string} sessionId UUID
 */
async function touchById(sessionId) {
  return sessionModel.touchSession(sessionId);
}

module.exports = { createSession, getSessionByToken, resolveSession, touchById };
