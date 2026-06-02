'use strict';

const sessionModel = require('../models/session');

async function sessionGuard(req, res, next) {
  const { token } = req.params;

  if (!token) {
    return res.status(400).json({ error: 'token parameter is required' });
  }

  try {
    const session = await sessionModel.findByToken(token);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    await sessionModel.touchSession(session.id);

    req.session = session;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = sessionGuard;
