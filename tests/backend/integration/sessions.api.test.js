/**
 * /api/sessions 통합 테스트
 * api-contract.json 기반 — supertest로 HTTP 엔드포인트 테스트
 *
 * 테스트 대상 엔드포인트:
 *   POST /api/sessions            - 세션 생성
 *   GET  /api/sessions/:token     - 세션 조회 (200 / 404 / 410)
 */

'use strict';

const request = require('supertest');

// DB 레이어 전체 모킹 (통합 테스트이지만 외부 DB 없이 실행 가능)
jest.mock('../../src/models/Session');
jest.mock('../../src/models/Event');

const app = require('../../src/app');
const SessionModel = require('../../src/models/Session');

// ── 픽스처 ────────────────────────────────────────────────────────────────────
const makeSession = (overrides = {}) => ({
  id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  token: 'tok_test_abc123',
  title: '우리 팀 일정',
  lastActiveAt: '2026-06-02T09:00:00Z',
  expiresAt: '2099-09-02T09:00:00Z',
  createdAt: '2026-06-02T09:00:00Z',
  ...overrides,
});

// ── POST /api/sessions ────────────────────────────────────────────────────────
describe('POST /api/sessions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('201: title을 전달하면 Session을 생성하고 반환한다', async () => {
    const session = makeSession();
    SessionModel.create.mockResolvedValue(session);

    const res = await request(app)
      .post('/api/sessions')
      .send({ title: '우리 팀 일정' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: session.id,
      token: session.token,
      title: session.title,
    });
    expect(res.body).toHaveProperty('expiresAt');
    expect(res.body).toHaveProperty('createdAt');
  });

  it('201: 응답에 token 필드가 포함된다 (클라이언트가 이 token으로 이후 요청)', async () => {
    const session = makeSession();
    SessionModel.create.mockResolvedValue(session);

    const res = await request(app)
      .post('/api/sessions')
      .send({ title: '테스트 캘린더' });

    expect(res.status).toBe(201);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.token.length).toBeGreaterThan(0);
  });

  it('400: title이 없으면 400을 반환한다', async () => {
    const res = await request(app)
      .post('/api/sessions')
      .send({})
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(400);
  });

  it('400: title이 빈 문자열이면 400을 반환한다', async () => {
    const res = await request(app)
      .post('/api/sessions')
      .send({ title: '' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(400);
  });

  it('500: 서버 내부 오류 시 500을 반환한다', async () => {
    SessionModel.create.mockRejectedValue(new Error('DB error'));

    const res = await request(app)
      .post('/api/sessions')
      .send({ title: '오류 유발' });

    expect(res.status).toBe(500);
  });
});

// ── GET /api/sessions/:token ──────────────────────────────────────────────────
describe('GET /api/sessions/:token', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('200: 유효한 token으로 조회하면 Session을 반환하고 lastActiveAt이 갱신된다', async () => {
    const session = makeSession();
    SessionModel.findByToken.mockResolvedValue(session);
    SessionModel.isExpired.mockReturnValue(false);
    SessionModel.updateLastActive.mockResolvedValue({
      ...session,
      lastActiveAt: new Date().toISOString(),
    });

    const res = await request(app).get(`/api/sessions/${session.token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: session.id,
      token: session.token,
      title: session.title,
    });
  });

  it('200: 응답 body에 id, token, title, expiresAt, createdAt, lastActiveAt이 포함된다', async () => {
    const session = makeSession();
    SessionModel.findByToken.mockResolvedValue(session);
    SessionModel.isExpired.mockReturnValue(false);
    SessionModel.updateLastActive.mockResolvedValue(session);

    const res = await request(app).get(`/api/sessions/${session.token}`);

    expect(res.status).toBe(200);
    ['id', 'token', 'title', 'expiresAt', 'createdAt', 'lastActiveAt'].forEach((field) => {
      expect(res.body).toHaveProperty(field);
    });
  });

  it('404: 존재하지 않는 token이면 404를 반환한다', async () => {
    SessionModel.findByToken.mockResolvedValue(null);

    const res = await request(app).get('/api/sessions/tok_nonexistent');

    expect(res.status).toBe(404);
  });

  it('410: 만료된 세션 조회 시 410(Gone)을 반환한다', async () => {
    const expiredSession = makeSession({
      expiresAt: '2020-01-01T00:00:00Z',
    });
    SessionModel.findByToken.mockResolvedValue(expiredSession);
    SessionModel.isExpired.mockReturnValue(true);

    const res = await request(app).get(`/api/sessions/${expiredSession.token}`);

    expect(res.status).toBe(410);
  });

  it('410: 만료 응답 body에 오류 메시지가 포함된다', async () => {
    const expiredSession = makeSession({
      expiresAt: '2020-01-01T00:00:00Z',
    });
    SessionModel.findByToken.mockResolvedValue(expiredSession);
    SessionModel.isExpired.mockReturnValue(true);

    const res = await request(app).get(`/api/sessions/${expiredSession.token}`);

    expect(res.status).toBe(410);
    expect(res.body).toHaveProperty('error');
  });

  it('Content-Type이 application/json 이다', async () => {
    const session = makeSession();
    SessionModel.findByToken.mockResolvedValue(session);
    SessionModel.isExpired.mockReturnValue(false);
    SessionModel.updateLastActive.mockResolvedValue(session);

    const res = await request(app).get(`/api/sessions/${session.token}`);

    expect(res.headers['content-type']).toMatch(/application\/json/);
  });
});
