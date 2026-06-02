import { get, post, put, del } from './client.js';

/**
 * 세션 이벤트 목록 조회
 * @param {string} token
 * @param {{ from?: string, to?: string }} query
 * @returns {Promise<Event[]>}
 */
export function listEvents(token, query = {}) {
  return get(`/api/sessions/${token}/events`, query);
}

/**
 * 이벤트 생성
 * @param {string} token
 * @param {object} body
 * @returns {Promise<Event>}
 */
export function createEvent(token, body) {
  return post(`/api/sessions/${token}/events`, body);
}

/**
 * 이벤트 단건 조회
 * @param {string} token
 * @param {string} eventId
 * @returns {Promise<Event>}
 */
export function getEvent(token, eventId) {
  return get(`/api/sessions/${token}/events/${eventId}`);
}

/**
 * 이벤트 수정
 * @param {string} token
 * @param {string} eventId
 * @param {object} body
 * @returns {Promise<Event>}
 */
export function updateEvent(token, eventId, body) {
  return put(`/api/sessions/${token}/events/${eventId}`, body);
}

/**
 * 이벤트 삭제
 * @param {string} token
 * @param {string} eventId
 * @returns {Promise<null>}
 */
export function deleteEvent(token, eventId) {
  return del(`/api/sessions/${token}/events/${eventId}`);
}
