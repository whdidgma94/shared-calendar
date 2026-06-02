'use strict';

const { resolveSession } = require('../services/sessionService');
const sessionModel = require('../models/session');

/**
 * sessionGuard 미들웨어
 *
 * :token 경로 파라미터를 가진 모든 라우트에서 세션 유효성을 검증한다.
 * 검증 성공 시 req.session에 Session 객체를 주입하고 next()를 호출한다.
 *
 * 실패 응답:
 *  - 404 Not Found  : 토큰에 해당하는 세션 없음
 *  - 410 Gone       : 세션이 만료됨
 */
async function sessionGuard(req, res, next) {
  const { token } = req.params;

  if (!token) {
    return res.status(400).json({ error: 'token parameter is required' });
  }

  try {
    const { session, notFound, expired } = await resolveSession(token);

    if (notFound) {
      return res.status(404).json({ error: 'Session not found' });
    }
    if (expired) {
      return res.status(410).json({ error: 'Session has expired' });
    }

    // lastActiveAt 갱신
    await sessionModel.touchSession(session.id);

    req.session = session;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = sessionGuard;
