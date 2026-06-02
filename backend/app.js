'use strict';

require('dotenv').config();

const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const fs       = require('fs');

const { initDb }        = require('./src/db/init');
const frameHeaders      = require('./src/middleware/frameHeaders');
const sessionsRouter    = require('./src/routes/sessions');
const eventsRouter      = require('./src/routes/events');

// ─── DB 초기화 (서버 시작 시 테이블 생성) ──────────────────────────────────────
initDb();

const app  = express();
const PORT = parseInt(process.env.PORT || '4000', 10);

// ─── CORS ──────────────────────────────────────────────────────────────────────
// CORS_ORIGIN 미설정(개발) 시 전체 허용. 프로덕션에선 환경변수로 제한.
const corsOrigin = process.env.CORS_ORIGIN;
app.use(
  cors(
    corsOrigin
      ? {
          origin: corsOrigin.split(',').map((o) => o.trim()),
          methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
          allowedHeaders: ['Content-Type'],
        }
      : { origin: '*' }
  )
);

// ─── Body Parser ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

// ─── Frame / CSP 헤더 (/embed/:token 허용, 나머지 SAMEORIGIN) ─────────────────
app.use(frameHeaders);

// ─── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

// ─── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/sessions', sessionsRouter);
app.use('/api/sessions/:token/events', eventsRouter);

// ─── 프론트엔드 정적 파일 서빙 ─────────────────────────────────────────────────
// 빌드된 React 앱(frontend/dist)이 있으면 같은 서버에서 서빙.
// 로컬 개발 시 frontend/dist가 없으면 이 블록은 건너뜀.
const distPath = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  // SPA 히스토리 모드 fallback — /api, /health 를 제외한 모든 경로
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health') return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  app.use((_req, res) => res.status(404).json({ error: 'Not Found' }));
}

// ─── Global Error Handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const isDev = process.env.NODE_ENV !== 'production';
  console.error('[error]', err.message, isDev ? err.stack : '');

  if (err.message?.startsWith('CORS policy:'))
    return res.status(403).json({ error: err.message });
  if (err.type === 'entity.parse.failed')
    return res.status(400).json({ error: 'Invalid JSON body' });

  res.status(500).json({
    error: 'Internal Server Error',
    ...(isDev ? { detail: err.message } : {}),
  });
});

// ─── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[shared-calendar] listening on http://localhost:${PORT}`);
  console.log(`[shared-calendar] NODE_ENV=${process.env.NODE_ENV || 'development'}`);
  console.log(`[shared-calendar] frontend: ${fs.existsSync(distPath) ? distPath : 'dev mode (no dist)'}`);
});

module.exports = app;
