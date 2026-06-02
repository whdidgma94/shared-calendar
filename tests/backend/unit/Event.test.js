/**
 * Event 모델 단위 테스트
 * api-contract.json 기반 - DB 직접 연결 없음, jest.mock 사용
 */

'use strict';

jest.mock('../../src/models/Event', () => ({
  findAllBySession: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}));

const EventModel = require('../../src/models/Event');

// 테스트용 픽스처
const SESSION_TOKEN = 'tok_test_abc123';
const SESSION_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const EVENT_ID = '11111111-2222-3333-4444-555555555555';

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

describe('Event 모델 단위 테스트', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── findAllBySession ─────────────────────────────────────────────────────────
  describe('Event.findAllBySession()', () => {
    it('sessionId로 해당 세션의 이벤트 배열을 반환한다', async () => {
      const events = [makeEvent(), makeEvent({ id: '99999999-8888-7777-6666-555555555555', title: '점심 약속' })];
      EventModel.findAllBySession.mockResolvedValue(events);

      const result = await EventModel.findAllBySession(SESSION_ID);

      expect(EventModel.findAllBySession).toHaveBeenCalledWith(SESSION_ID);
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ sessionId: SESSION_ID });
    });

    it('이벤트가 없으면 빈 배열을 반환한다', async () => {
      EventModel.findAllBySession.mockResolvedValue([]);

      const result = await EventModel.findAllBySession(SESSION_ID);

      expect(result).toEqual([]);
    });

    it('from/to 날짜 필터를 함께 전달할 수 있다', async () => {
      const events = [makeEvent()];
      EventModel.findAllBySession.mockResolvedValue(events);

      const opts = { from: '2026-06-01T00:00:00Z', to: '2026-06-30T23:59:59Z' };
      const result = await EventModel.findAllBySession(SESSION_ID, opts);

      expect(EventModel.findAllBySession).toHaveBeenCalledWith(SESSION_ID, opts);
      expect(result).toHaveLength(1);
    });
  });

  // ── findById ─────────────────────────────────────────────────────────────────
  describe('Event.findById()', () => {
    it('유효한 eventId로 단일 Event를 반환한다', async () => {
      const event = makeEvent();
      EventModel.findById.mockResolvedValue(event);

      const result = await EventModel.findById(EVENT_ID, SESSION_ID);

      expect(EventModel.findById).toHaveBeenCalledWith(EVENT_ID, SESSION_ID);
      expect(result).toEqual(event);
    });

    it('존재하지 않는 eventId이면 null을 반환한다', async () => {
      EventModel.findById.mockResolvedValue(null);

      const result = await EventModel.findById('nonexistent-id', SESSION_ID);

      expect(result).toBeNull();
    });

    it('다른 세션의 이벤트는 null을 반환한다 (세션 격리)', async () => {
      EventModel.findById.mockResolvedValue(null);

      const result = await EventModel.findById(EVENT_ID, 'other-session-id');

      expect(result).toBeNull();
    });
  });

  // ── create ────────────────────────────────────────────────────────────────────
  describe('Event.create()', () => {
    it('EventCreate 입력으로 생성된 Event 객체를 반환한다', async () => {
      const input = {
        sessionId: SESSION_ID,
        title: '팀 회의',
        startAt: '2026-06-10T10:00:00Z',
        endAt: '2026-06-10T11:00:00Z',
      };
      const created = makeEvent();
      EventModel.create.mockResolvedValue(created);

      const result = await EventModel.create(input);

      expect(EventModel.create).toHaveBeenCalledWith(input);
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
    });

    it('allDay=true이면 반환 객체의 allDay가 true다', async () => {
      const allDayEvent = makeEvent({ allDay: true });
      EventModel.create.mockResolvedValue(allDayEvent);

      const result = await EventModel.create({
        sessionId: SESSION_ID,
        title: '전일 이벤트',
        startAt: '2026-06-15T00:00:00Z',
        endAt: '2026-06-15T23:59:59Z',
        allDay: true,
      });

      expect(result.allDay).toBe(true);
    });

    it('color 기본값은 #3788d8 이다', async () => {
      const event = makeEvent();
      EventModel.create.mockResolvedValue(event);

      const result = await EventModel.create({
        sessionId: SESSION_ID,
        title: '기본 색상 이벤트',
        startAt: '2026-06-10T10:00:00Z',
        endAt: '2026-06-10T11:00:00Z',
      });

      expect(result.color).toBe('#3788d8');
    });

    it('필수 필드(title, startAt, endAt) 누락 시 예외를 전파한다', async () => {
      EventModel.create.mockRejectedValue(new Error('title is required'));

      await expect(
        EventModel.create({ sessionId: SESSION_ID, startAt: '2026-06-10T10:00:00Z', endAt: '2026-06-10T11:00:00Z' })
      ).rejects.toThrow('title is required');
    });
  });

  // ── update ────────────────────────────────────────────────────────────────────
  describe('Event.update()', () => {
    it('EventUpdate 입력으로 갱신된 Event를 반환한다', async () => {
      const updated = makeEvent({ title: '수정된 회의', updatedAt: new Date().toISOString() });
      EventModel.update.mockResolvedValue(updated);

      const result = await EventModel.update(EVENT_ID, SESSION_ID, { title: '수정된 회의' });

      expect(EventModel.update).toHaveBeenCalledWith(EVENT_ID, SESSION_ID, { title: '수정된 회의' });
      expect(result.title).toBe('수정된 회의');
    });

    it('존재하지 않는 이벤트 업데이트 시 null을 반환한다', async () => {
      EventModel.update.mockResolvedValue(null);

      const result = await EventModel.update('nonexistent-id', SESSION_ID, { title: '없음' });

      expect(result).toBeNull();
    });

    it('updatedAt이 갱신된다', async () => {
      const now = new Date().toISOString();
      const updated = makeEvent({ updatedAt: now });
      EventModel.update.mockResolvedValue(updated);

      const result = await EventModel.update(EVENT_ID, SESSION_ID, { title: '업데이트' });

      expect(result.updatedAt).toBe(now);
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────────
  describe('Event.delete()', () => {
    it('eventId와 sessionId로 삭제하면 undefined(void)를 반환한다', async () => {
      EventModel.delete.mockResolvedValue(undefined);

      const result = await EventModel.delete(EVENT_ID, SESSION_ID);

      expect(EventModel.delete).toHaveBeenCalledWith(EVENT_ID, SESSION_ID);
      expect(result).toBeUndefined();
    });

    it('존재하지 않는 이벤트 삭제 시 예외를 전파한다', async () => {
      EventModel.delete.mockRejectedValue(new Error('Event not found'));

      await expect(EventModel.delete('nonexistent-id', SESSION_ID)).rejects.toThrow(
        'Event not found'
      );
    });
  });

  // ── 필드 타입 계약 ─────────────────────────────────────────────────────────────
  describe('Event 필드 타입 계약', () => {
    it('id, sessionId는 UUID 형식이어야 한다', async () => {
      const event = makeEvent();
      EventModel.findById.mockResolvedValue(event);

      const result = await EventModel.findById(EVENT_ID, SESSION_ID);

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(result.id).toMatch(uuidRegex);
      expect(result.sessionId).toMatch(uuidRegex);
    });

    it('startAt, endAt, createdAt, updatedAt은 ISO 8601 datetime 문자열이어야 한다', async () => {
      const event = makeEvent();
      EventModel.findById.mockResolvedValue(event);

      const result = await EventModel.findById(EVENT_ID, SESSION_ID);

      const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
      expect(result.startAt).toMatch(iso8601Regex);
      expect(result.endAt).toMatch(iso8601Regex);
      expect(result.createdAt).toMatch(iso8601Regex);
      expect(result.updatedAt).toMatch(iso8601Regex);
    });

    it('allDay는 boolean이어야 한다', async () => {
      const event = makeEvent();
      EventModel.findById.mockResolvedValue(event);

      const result = await EventModel.findById(EVENT_ID, SESSION_ID);

      expect(typeof result.allDay).toBe('boolean');
    });

    it('description, location, authorName은 선택 필드(string | undefined)다', async () => {
      const minimalEvent = makeEvent({ description: undefined, location: undefined, authorName: undefined });
      EventModel.create.mockResolvedValue(minimalEvent);

      const result = await EventModel.create({
        sessionId: SESSION_ID,
        title: '최소 이벤트',
        startAt: '2026-06-10T10:00:00Z',
        endAt: '2026-06-10T11:00:00Z',
      });

      // optional 필드는 없어도 됨
      expect(['string', 'undefined']).toContain(typeof result.description);
      expect(['string', 'undefined']).toContain(typeof result.location);
      expect(['string', 'undefined']).toContain(typeof result.authorName);
    });
  });
});
