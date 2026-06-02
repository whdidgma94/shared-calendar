'use strict';

require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

const { migrate }    = require('./src/db/migrate');
const frameHeaders   = require('./src/middleware/frameHeaders');
const sessionsRouter = require('./src/routes/sessions');
const eventsRouter   = require('./src/routes/events');

const app  = express();
const PORT = parseInt(process.env.PORT || '4000', 10);

// ─── CORS ──────────────────────────────────────────────────────────────────────
const corsOrigin = process.env.CORS_ORIGIN;
app.use(
  cors(
    corsOrigin
      ? { origin: corsOrigin.split(',').map((o) => o.trim()), methods: ['GET','POST','PUT','DELETE','OPTIONS'], allowedHeaders: ['Content-Type'] }
      : { origin: '*' }
  )
);

// ─── Body Parser ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

// ─── Frame / CSP 헤더 ─────────────────────────────────────────────────────────
app.use(frameHeaders);

// ─── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ─── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/sessions', sessionsRouter);
app.use('/api/sessions/:token/events', eventsRouter);

// ─── 프론트엔드 정적 파일 서빙 ─────────────────────────────────────────────────
const distPath = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
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
  if (err.message?.startsWith('CORS policy:')) return res.status(403).json({ error: err.message });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });
  res.status(500).json({ error: 'Internal Server Error', ...(isDev ? { detail: err.message } : {}) });
});

// ─── Start (DB 마이그레이션 후 서버 시작) ──────────────────────────────────────
async function start() {
  await migrate();
  app.listen(PORT, () => {
    console.log(`[shared-calendar] listening on http://localhost:${PORT}`);
    console.log(`[shared-calendar] NODE_ENV=${process.env.NODE_ENV || 'development'}`);
    console.log(`[shared-calendar] frontend: ${fs.existsSync(distPath) ? distPath : 'dev mode'}`);
  });
}

start().catch((err) => {
  console.error('[startup] failed:', err.message);
  process.exit(1);
});

module.exports = app;
