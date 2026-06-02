'use strict';

const express = require('express');
const router = express.Router();
const { createSession, getSessionByToken } = require('../services/sessionService');

/**
 * POST /api/sessions
 * 세션 생성. title 입력 시 token 발급, expiresAt = now + 90일.
 *
 * Body: { title: string }
 * Returns: Session (201)
 */
router.post('/', async (req, res, next) => {
  try {
    const { title } = req.body;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({ error: '`title` is required' });
    }

    const session = await createSession({ title: title.trim() });
    return res.status(201).json(session);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/sessions/:token
 * 세션 메타 조회. 만료 검사 후 lastActiveAt 갱신.
 * 만료 시 410, 미존재 시 404.
 *
 * Returns: Session (200)
 */
router.get('/:token', async (req, res, next) => {
  try {
    const { token } = req.params;
    const result = await getSessionByToken(token);

    if (result === null) {
      return res.status(404).json({ error: 'Session not found' });
    }
    if (result.expired) {
      return res.status(410).json({ error: 'Session has expired' });
    }

    return res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
