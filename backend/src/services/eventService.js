'use strict';

const eventModel = require('../models/event');
const { touchById } = require('./sessionService');

/**
 * 세션에 속한 이벤트 목록 조회
 * @param {string} sessionId
 * @param {{ from?: string, to?: string }} range
 * @returns {Promise<object[]>}
 */
async function listEvents(sessionId, range) {
  return eventModel.findBySession(sessionId, range);
}

/**
 * 단일 이벤트 조회
 * @param {string} sessionId
 * @param {string} eventId
 * @returns {Promise<object|null>}
 */
async function getEvent(sessionId, eventId) {
  return eventModel.findOne(sessionId, eventId);
}

/**
 * 이벤트 생성 + 세션 lastActiveAt 갱신
 * @param {string} sessionId
 * @param {object} data
 * @returns {Promise<object>}
 */
async function createEvent(sessionId, data) {
  const event = await eventModel.createEvent(sessionId, data);
  await touchById(sessionId);
  return event;
}

/**
 * 이벤트 수정 + 세션 lastActiveAt 갱신
 * @param {string} sessionId
 * @param {string} eventId
 * @param {object} updates
 * @returns {Promise<object|null>}
 */
async function updateEvent(sessionId, eventId, updates) {
  const event = await eventModel.updateEvent(sessionId, eventId, updates);
  if (event) await touchById(sessionId);
  return event;
}

/**
 * 이벤트 삭제 + 세션 lastActiveAt 갱신
 * @param {string} sessionId
 * @param {string} eventId
 * @returns {Promise<boolean>}
 */
async function deleteEvent(sessionId, eventId) {
  const deleted = await eventModel.deleteEvent(sessionId, eventId);
  if (deleted) await touchById(sessionId);
  return deleted;
}

module.exports = { listEvents, getEvent, createEvent, updateEvent, deleteEvent };
