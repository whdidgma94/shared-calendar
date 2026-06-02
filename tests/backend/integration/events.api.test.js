/**
 * /api/sessions/:token/events 통합 테스트
 * api-contract.json 기반 — supertest로 HTTP 엔드포인트 테스트
 *
 * 테스트 대상 엔드포인트:
 *   GET    /api/sessions/:token/events              - 이벤트 목록 조회 (from/to 필터 포함)
 *   POST   /api/sessions/:token/events              - 이벤트 생성
 *   GET    /api/sessions/:token/events/:eventId     - 단일 이벤트 조회
 *   PUT    /api/sessions/:token/events/:eventId     - 이벤트 수정
 *   DELETE /api/sessions/:token/events/:eventId     - 이벤트 삭제
 */

'use strict';

const request = require('supertest');

jest.mock('../../src/models/Session');
jest.mock('../../src/models/Event');

const app = require('../../src/app');
const SessionModel = require('../../src/models/Session');
const EventModel = require('../../src/models/Event');

// ── 픽스처 ────────────────────────────────────────────────────────────────────
const VALID_TOKEN = 'tok_test_abc123';
const SESSION_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const EVENT_ID = '11111111-2222-3333-4444-555555555555';

const makeSession = (overrides = {}) => ({
  id: SESSION_ID,
  token: VALID_TOKEN,
  title: '우리 팀 일정',
  lastActiveAt: '2026-06-02T09:00:00Z',
  expiresAt: '2099-09-02T09:00:00Z',
  createdAt: '2026-06-02T09:00:00Z',
  ...overrides,
});

const makeEvent = (overrides = {}) => ({
  id: EVENT_ID,
  sessionId: SESSION_ID,
  title: '팀 회의',
  startAt: '2026-06-10T10:00:00Z',
  endAt: '2026-06-10T11:00:00Z',
  allDay: false,
  description: '주간 스프린트 회의',
  location: '회의실 A',
  color: '#3788d8',
  authorName: '김철수',
  createdAt: '2026-06-02T09:00:00Z',
  updatedAt: '2026-06-02T09:00:00Z',
  ...overrides,
});

// 세션이 유효한 상태로 모킹하는 헬퍼
const mockValidSession = (overrides = {}) => {
  const session = makeSession(overrides);
  SessionModel.findByToken.mockResolvedValue(session);
  SessionModel.isExpired.mockReturnValue(false);
  SessionModel.updateLastActive.mockResolvedValue(session);
  return session;
};

// ── GET /api/sessions/:token/events ───────────────────────────────────────────
describe('GET /api/sessions/:token/events', () => {
  beforeEach(() => jest.clearAllMocks());

  it('200: 이벤트 목록(배열)을 반환한다', async () => {
    mockValidSession();
    const events = [makeEvent(), makeEvent({ id: '22222222-3333-4444-5555-666666666666', title: '점심 약속' })];
    EventModel.findAllBySession.mockResolvedValue(events);

    const res = await request(app).get(`/api/sessions/${VALID_TOKEN}/events`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
  });

  it('200: 이벤트가 없으면 빈 배열을 반환한다', async () => {
    mockValidSession();
    EventModel.findAllBySession.mockResolvedValue([]);

    const res = await request(app).get(`/api/sessions/${VALID_TOKEN}/events`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('200: from/to 쿼리 파라미터를 전달하면 해당 범위의 이벤트를 반환한다', async () => {
    mockValidSession();
    const events = [makeEvent()];
    EventModel.findAllBySession.mockResolvedValue(events);

    const res = await request(app)
      .get(`/api/sessions/${VALID_TOKEN}/events`)
      .query({ from: '2026-06-01T00:00:00Z', to: '2026-06-30T23:59:59Z' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it('200: from만 전달해도 동작한다 (to는 optional)', async () => {
    mockValidSession();
    EventModel.findAllBySession.mockResolvedValue([]);

    const res = await request(app)
      .get(`/api/sessions/${VALID_TOKEN}/events`)
      .query({ from: '2026-06-01T00:00:00Z' });

    expect(res.status).toBe(200);
  });

  it('404: 존재하지 않는 token이면 404를 반환한다', async () => {
    SessionModel.findByToken.mockResolvedValue(null);

    const res = await request(app).get('/api/sessions/tok_nonexistent/events');

    expect(res.status).toBe(404);
  });

  it('410: 만료된 세션이면 410을 반환한다', async () => {
    const expired = makeSession({ expiresAt: '2020-01-01T00:00:00Z' });
    SessionModel.findByToken.mockResolvedValue(expired);
    SessionModel.isExpired.mockReturnValue(true);

    const res = await request(app).get(`/api/sessions/${VALID_TOKEN}/events`);

    expect(res.status).toBe(410);
  });
});

// ── POST /api/sessions/:token/events ──────────────────────────────────────────
describe('POST /api/sessions/:token/events', () => {
  beforeEach(() => jest.clearAllMocks());

  it('201: 필수 필드로 이벤트를 생성하고 Event 객체를 반환한다', async () => {
    mockValidSession();
    const created = makeEvent();
    EventModel.create.mockResolvedValue(created);

    const res = await request(app)
      .post(`/api/sessions/${VALID_TOKEN}/events`)
      .send({
        title: '팀 회의',
        startAt: '2026-06-10T10:00:00Z',
        endAt: '2026-06-10T11:00:00Z',
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: EVENT_ID,
      title: '팀 회의',
      sessionId: SESSION_ID,
    });
  });

  it('201: 선택 필드(description, location, color, authorName, allDay)도 함께 전달 가능하다', async () => {
    mockValidSession();
    const fullEvent = makeEvent({ allDay: true, color: '#ff0000' });
    EventModel.create.mockResolvedValue(fullEvent);

    const res = await request(app)
      .post(`/api/sessions/${VALID_TOKEN}/events`)
      .send({
        title: '전일 이벤트',
        startAt: '2026-06-15T00:00:00Z',
        endAt: '2026-06-15T23:59:59Z',
        allDay: true,
        description: '설명',
        location: '서울',
        color: '#ff0000',
        authorName: '이영희',
      });

    expect(res.status).toBe(201);
    expect(res.body.allDay).toBe(true);
  });

  it('400: title이 없으면 400을 반환한다', async () => {
    mockValidSession();

    const res = await request(app)
      .post(`/api/sessions/${VALID_TOKEN}/events`)
      .send({ startAt: '2026-06-10T10:00:00Z', endAt: '2026-06-10T11:00:00Z' });

    expect(res.status).toBe(400);
  });

  it('400: startAt이 없으면 400을 반환한다', async () => {
    mockValidSession();

    const res = await request(app)
      .post(`/api/sessions/${VALID_TOKEN}/events`)
      .send({ title: '테스트', endAt: '2026-06-10T11:00:00Z' });

    expect(res.status).toBe(400);
  });

  it('400: endAt이 없으면 400을 반환한다', async () => {
    mockValidSession();

    const res = await request(app)
      .post(`/api/sessions/${VALID_TOKEN}/events`)
      .send({ title: '테스트', startAt: '2026-06-10T10:00:00Z' });

    expect(res.status).toBe(400);
  });

  it('404: 존재하지 않는 token이면 404를 반환한다', async () => {
    SessionModel.findByToken.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/sessions/tok_nonexistent/events')
      .send({ title: '테스트', startAt: '2026-06-10T10:00:00Z', endAt: '2026-06-10T11:00:00Z' });

    expect(res.status).toBe(404);
  });

  it('410: 만료된 세션이면 410을 반환한다', async () => {
    const expired = makeSession({ expiresAt: '2020-01-01T00:00:00Z' });
    SessionModel.findByToken.mockResolvedValue(expired);
    SessionModel.isExpired.mockReturnValue(true);

    const res = await request(app)
      .post(`/api/sessions/${VALID_TOKEN}/events`)
      .send({ title: '테스트', startAt: '2026-06-10T10:00:00Z', endAt: '2026-06-10T11:00:00Z' });

    expect(res.status).toBe(410);
  });
});

// ── GET /api/sessions/:token/events/:eventId ──────────────────────────────────
describe('GET /api/sessions/:token/events/:eventId', () => {
  beforeEach(() => jest.clearAllMocks());

  it('200: 유효한 eventId로 단일 이벤트를 반환한다', async () => {
    mockValidSession();
    const event = makeEvent();
    EventModel.findById.mockResolvedValue(event);

    const res = await request(app).get(`/api/sessions/${VALID_TOKEN}/events/${EVENT_ID}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: EVENT_ID, title: '팀 회의' });
  });

  it('200: 반환된 이벤트의 sessionId가 현재 세션의 id와 일치한다', async () => {
    mockValidSession();
    EventModel.findById.mockResolvedValue(makeEvent());

    const res = await request(app).get(`/api/sessions/${VALID_TOKEN}/events/${EVENT_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.sessionId).toBe(SESSION_ID);
  });

  it('404: 존재하지 않는 eventId이면 404를 반환한다', async () => {
    mockValidSession();
    EventModel.findById.mockResolvedValue(null);

    const res = await request(app).get(`/api/sessions/${VALID_TOKEN}/events/nonexistent-event`);

    expect(res.status).toBe(404);
  });

  it('404: 다른 세션의 이벤트 조회 시 404를 반환한다 (세션 격리)', async () => {
    mockValidSession();
    EventModel.findById.mockResolvedValue(null); // 다른 세션 이벤트 → null

    const res = await request(app).get(`/api/sessions/${VALID_TOKEN}/events/${EVENT_ID}`);

    expect(res.status).toBe(404);
  });

  it('404: 존재하지 않는 token이면 404를 반환한다', async () => {
    SessionModel.findByToken.mockResolvedValue(null);

    const res = await request(app).get(`/api/sessions/tok_nonexistent/events/${EVENT_ID}`);

    expect(res.status).toBe(404);
  });
});

// ── PUT /api/sessions/:token/events/:eventId ──────────────────────────────────
describe('PUT /api/sessions/:token/events/:eventId', () => {
  beforeEach(() => jest.clearAllMocks());

  it('200: 이벤트를 수정하고 갱신된 Event를 반환한다', async () => {
    mockValidSession();
    const updated = makeEvent({ title: '수정된 회의', updatedAt: '2026-06-03T10:00:00Z' });
    EventModel.update.mockResolvedValue(updated);

    const res = await request(app)
      .put(`/api/sessions/${VALID_TOKEN}/events/${EVENT_ID}`)
      .send({ title: '수정된 회의' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('수정된 회의');
  });

  it('200: 일부 필드만 전달해도 부분 업데이트가 된다', async () => {
    mockValidSession();
    const updated = makeEvent({ color: '#ff0000' });
    EventModel.update.mockResolvedValue(updated);

    const res = await request(app)
      .put(`/api/sessions/${VALID_TOKEN}/events/${EVENT_ID}`)
      .send({ color: '#ff0000' });

    expect(res.status).toBe(200);
    expect(res.body.color).toBe('#ff0000');
  });

  it('200: 응답에 updatedAt 필드가 포함된다', async () => {
    mockValidSession();
    const updated = makeEvent({ updatedAt: '2026-06-03T10:00:00Z' });
    EventModel.update.mockResolvedValue(updated);

    const res = await request(app)
      .put(`/api/sessions/${VALID_TOKEN}/events/${EVENT_ID}`)
      .send({ title: '업데이트' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('updatedAt');
  });

  it('404: 존재하지 않는 eventId이면 404를 반환한다', async () => {
    mockValidSession();
    EventModel.update.mockResolvedValue(null);

    const res = await request(app)
      .put(`/api/sessions/${VALID_TOKEN}/events/nonexistent-event`)
      .send({ title: '없음' });

    expect(res.status).toBe(404);
  });

  it('404: 존재하지 않는 token이면 404를 반환한다', async () => {
    SessionModel.findByToken.mockResolvedValue(null);

    const res = await request(app)
      .put(`/api/sessions/tok_nonexistent/events/${EVENT_ID}`)
      .send({ title: '테스트' });

    expect(res.status).toBe(404);
  });

  it('410: 만료된 세션이면 410을 반환한다', async () => {
    const expired = makeSession({ expiresAt: '2020-01-01T00:00:00Z' });
    SessionModel.findByToken.mockResolvedValue(expired);
    SessionModel.isExpired.mockReturnValue(true);

    const res = await request(app)
      .put(`/api/sessions/${VALID_TOKEN}/events/${EVENT_ID}`)
      .send({ title: '수정' });

    expect(res.status).toBe(410);
  });
});

// ── DELETE /api/sessions/:token/events/:eventId ───────────────────────────────
describe('DELETE /api/sessions/:token/events/:eventId', () => {
  beforeEach(() => jest.clearAllMocks());

  it('204: 이벤트를 삭제하면 204 No Content를 반환한다', async () => {
    mockValidSession();
    EventModel.delete.mockResolvedValue(undefined);
    // delete 전 findById 검증 모킹
    EventModel.findById.mockResolvedValue(makeEvent());

    const res = await request(app).delete(`/api/sessions/${VALID_TOKEN}/events/${EVENT_ID}`);

    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
  });

  it('404: 존재하지 않는 eventId이면 404를 반환한다', async () => {
    mockValidSession();
    EventModel.findById.mockResolvedValue(null);

    const res = await request(app).delete(`/api/sessions/${VALID_TOKEN}/events/nonexistent-event`);

    expect(res.status).toBe(404);
  });

  it('404: 존재하지 않는 token이면 404를 반환한다', async () => {
    SessionModel.findByToken.mockResolvedValue(null);

    const res = await request(app).delete(`/api/sessions/tok_nonexistent/events/${EVENT_ID}`);

    expect(res.status).toBe(404);
  });

  it('410: 만료된 세션이면 410을 반환한다', async () => {
    const expired = makeSession({ expiresAt: '2020-01-01T00:00:00Z' });
    SessionModel.findByToken.mockResolvedValue(expired);
    SessionModel.isExpired.mockReturnValue(true);

    const res = await request(app).delete(`/api/sessions/${VALID_TOKEN}/events/${EVENT_ID}`);

    expect(res.status).toBe(410);
  });

  it('DELETE 이후 같은 eventId로 GET 하면 404를 반환해야 한다 (삭제 검증 시나리오)', async () => {
    // 1단계: 삭제
    mockValidSession();
    EventModel.findById.mockResolvedValueOnce(makeEvent());
    EventModel.delete.mockResolvedValue(undefined);

    const deleteRes = await request(app).delete(`/api/sessions/${VALID_TOKEN}/events/${EVENT_ID}`);
    expect(deleteRes.status).toBe(204);

    // 2단계: 삭제 후 조회 → 404
    mockValidSession();
    EventModel.findById.mockResolvedValueOnce(null);

    const getRes = await request(app).get(`/api/sessions/${VALID_TOKEN}/events/${EVENT_ID}`);
    expect(getRes.status).toBe(404);
  });
});
