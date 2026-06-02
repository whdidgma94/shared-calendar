import { get, post } from './client.js';

/**
 * 새 공유 캘린더 세션을 생성한다.
 * @param {{ title: string }} body
 * @returns {Promise<Session>}
 */
export function createSession(body) {
  return post('/api/sessions', body);
}

/**
 * 토큰으로 세션 정보를 조회한다.
 * @param {string} token
 * @returns {Promise<Session>}
 */
export function getSession(token) {
  return get(`/api/sessions/${token}`);
}
