'use strict';

const express = require('express');
const router = express.Router({ mergeParams: true }); // :token 파라미터 상속
const sessionGuard = require('../middleware/sessionGuard');
const eventService = require('../services/eventService');

// 모든 이벤트 라우트에 세션 유효성 검사 적용
router.use(sessionGuard);

/**
 * GET /api/sessions/:token/events
 * 이벤트 목록 조회. from/to 범위 필터(ISO8601, 선택).
 *
 * Query: from?: ISO8601, to?: ISO8601
 * Returns: Event[] (200)
 */
router.get('/', async (req, res, next) => {
  try {
    const { from, to } = req.query;

    // ISO8601 형식 검증 (값이 있을 때만)
    if (from && isNaN(Date.parse(from))) {
      return res.status(400).json({ error: '`from` must be a valid ISO8601 datetime' });
    }
    if (to && isNaN(Date.parse(to))) {
      return res.status(400).json({ error: '`to` must be a valid ISO8601 datetime' });
    }

    const events = await eventService.listEvents(req.session.id, { from, to });
    return res.json(events);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/sessions/:token/events
 * 이벤트 생성. 성공 시 세션 lastActiveAt 갱신.
 *
 * Body: EventCreate
 * Returns: Event (201)
 */
router.post('/', async (req, res, next) => {
  try {
    const { title, startAt, endAt, allDay, description, location, color, authorName } = req.body;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({ error: '`title` is required' });
    }
    if (!startAt || isNaN(Date.parse(startAt))) {
      return res.status(400).json({ error: '`startAt` must be a valid ISO8601 datetime' });
    }
    if (!endAt || isNaN(Date.parse(endAt))) {
      return res.status(400).json({ error: '`endAt` must be a valid ISO8601 datetime' });
    }
    if (new Date(endAt) < new Date(startAt)) {
      return res.status(400).json({ error: '`endAt` must be after `startAt`' });
    }

    const event = await eventService.createEvent(req.session.id, {
      title: title.trim(),
      startAt,
      endAt,
      allDay: Boolean(allDay),
      description: description || null,
      location: location || null,
      color: color || '#3788d8',
      authorName: authorName || null,
    });

    return res.status(201).json(event);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/sessions/:token/events/:eventId
 * 단일 이벤트 조회.
 *
 * Returns: Event (200) | 404
 */
router.get('/:eventId', async (req, res, next) => {
  try {
    const event = await eventService.getEvent(req.session.id, req.params.eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    return res.json(event);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/sessions/:token/events/:eventId
 * 이벤트 수정. 성공 시 세션 lastActiveAt 및 이벤트 updatedAt 갱신.
 *
 * Body: EventUpdate (부분 업데이트 가능)
 * Returns: Event (200) | 404
 */
router.put('/:eventId', async (req, res, next) => {
  try {
    const allowed = ['title', 'startAt', 'endAt', 'allDay', 'description', 'location', 'color', 'authorName'];
    const updates = {};
    for (const key of allowed) {
      if (key in req.body) updates[key] = req.body[key];
    }

    // 날짜 필드 검증
    if ('startAt' in updates && isNaN(Date.parse(updates.startAt))) {
      return res.status(400).json({ error: '`startAt` must be a valid ISO8601 datetime' });
    }
    if ('endAt' in updates && isNaN(Date.parse(updates.endAt))) {
      return res.status(400).json({ error: '`endAt` must be a valid ISO8601 datetime' });
    }

    const event = await eventService.updateEvent(req.session.id, req.params.eventId, updates);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    return res.json(event);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/sessions/:token/events/:eventId
 * 이벤트 삭제. 성공 시 세션 lastActiveAt 갱신.
 *
 * Returns: 204 No Content | 404
 */
router.delete('/:eventId', async (req, res, next) => {
  try {
    const deleted = await eventService.deleteEvent(req.session.id, req.params.eventId);
    if (!deleted) {
      return res.status(404).json({ error: 'Event not found' });
    }
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
