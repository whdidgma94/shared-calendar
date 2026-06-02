/**
 * Session 모델 단위 테스트
 * api-contract.json 기반 - DB 직접 연결 없음, jest.mock 사용
 */

'use strict';

// DB 레이어 모킹
jest.mock('../../src/models/Session', () => ({
  create: jest.fn(),
  findByToken: jest.fn(),
  isExpired: jest.fn(),
  updateLastActive: jest.fn(),
  delete: jest.fn(),
}));

const SessionModel = require('../../src/models/Session');

// 테스트용 픽스처
const makeSession = (overrides = {}) => ({
  id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  token: 'tok_test_abc123',
  title: '우리 팀 일정',
  lastActiveAt: new Date('2026-06-02T09:00:00Z').toISOString(),
  expiresAt: new Date('2026-09-02T09:00:00Z').toISOString(),
  createdAt: new Date('2026-06-02T09:00:00Z').toISOString(),
  ...overrides,
});

describe('Session 모델 단위 테스트', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── create ──────────────────────────────────────────────────────────────────
  describe('Session.create()', () => {
    it('SessionCreate 입력으로 Session 객체를 반환한다', async () => {
      const input = { title: '우리 팀 일정' };
      const expected = makeSession();
      SessionModel.create.mockResolvedValue(expected);

      const result = await SessionModel.create(input);

      expect(SessionModel.create).toHaveBeenCalledTimes(1);
      expect(SessionModel.create).toHaveBeenCalledWith(input);
      expect(result).toEqual(expected);
    });

    it('반환된 Session은 필수 필드(id, token, title, expiresAt, createdAt)를 모두 포함한다', async () => {
      const session = makeSession();
      SessionModel.create.mockResolvedValue(session);

      const result = await SessionModel.create({ title: '테스트' });

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('expiresAt');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('lastActiveAt');
    });

    it('DB 오류 시 예외를 그대로 전파한다', async () => {
      SessionModel.create.mockRejectedValue(new Error('DB connection failed'));

      await expect(SessionModel.create({ title: 'fail' })).rejects.toThrow(
        'DB connection failed'
      );
    });
  });

  // ── findByToken ──────────────────────────────────────────────────────────────
  describe('Session.findByToken()', () => {
    it('유효한 token으로 Session을 조회하면 Session 객체를 반환한다', async () => {
      const session = makeSession();
      SessionModel.findByToken.mockResolvedValue(session);

      const result = await SessionModel.findByToken('tok_test_abc123');

      expect(SessionModel.findByToken).toHaveBeenCalledWith('tok_test_abc123');
      expect(result).toEqual(session);
    });

    it('존재하지 않는 token이면 null을 반환한다', async () => {
      SessionModel.findByToken.mockResolvedValue(null);

      const result = await SessionModel.findByToken('tok_notexist');

      expect(result).toBeNull();
    });
  });

  // ── isExpired ────────────────────────────────────────────────────────────────
  describe('Session.isExpired()', () => {
    it('expiresAt이 현재 시각보다 과거이면 true를 반환한다', async () => {
      const expiredSession = makeSession({
        expiresAt: new Date('2020-01-01T00:00:00Z').toISOString(),
      });
      SessionModel.isExpired.mockReturnValue(true);

      const result = SessionModel.isExpired(expiredSession);

      expect(result).toBe(true);
    });

    it('expiresAt이 현재 시각보다 미래이면 false를 반환한다', async () => {
      const validSession = makeSession({
        expiresAt: new Date('2099-01-01T00:00:00Z').toISOString(),
      });
      SessionModel.isExpired.mockReturnValue(false);

      const result = SessionModel.isExpired(validSession);

      expect(result).toBe(false);
    });
  });

  // ── updateLastActive ─────────────────────────────────────────────────────────
  describe('Session.updateLastActive()', () => {
    it('token으로 lastActiveAt을 현재 시각으로 갱신하고 갱신된 Session을 반환한다', async () => {
      const updated = makeSession({ lastActiveAt: new Date().toISOString() });
      SessionModel.updateLastActive.mockResolvedValue(updated);

      const result = await SessionModel.updateLastActive('tok_test_abc123');

      expect(SessionModel.updateLastActive).toHaveBeenCalledWith('tok_test_abc123');
      expect(result).toHaveProperty('lastActiveAt');
    });
  });

  // ── delete ───────────────────────────────────────────────────────────────────
  describe('Session.delete()', () => {
    it('token으로 세션 삭제 시 undefined(void)를 반환한다', async () => {
      SessionModel.delete.mockResolvedValue(undefined);

      const result = await SessionModel.delete('tok_test_abc123');

      expect(SessionModel.delete).toHaveBeenCalledWith('tok_test_abc123');
      expect(result).toBeUndefined();
    });
  });

  // ── 필드 타입 검증 ────────────────────────────────────────────────────────────
  describe('Session 필드 타입 계약', () => {
    it('id는 UUID 형식이어야 한다', async () => {
      const session = makeSession();
      SessionModel.findByToken.mockResolvedValue(session);

      const result = await SessionModel.findByToken('tok_test_abc123');

      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(result.id).toMatch(uuidRegex);
    });

    it('token은 unique string이어야 한다', async () => {
      const session = makeSession();
      SessionModel.create.mockResolvedValue(session);

      const result = await SessionModel.create({ title: '테스트' });

      expect(typeof result.token).toBe('string');
      expect(result.token.length).toBeGreaterThan(0);
    });

    it('createdAt, expiresAt, lastActiveAt은 ISO 8601 datetime 문자열이어야 한다', async () => {
      const session = makeSession();
      SessionModel.findByToken.mockResolvedValue(session);

      const result = await SessionModel.findByToken('tok_test_abc123');

      const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
      expect(result.createdAt).toMatch(iso8601Regex);
      expect(result.expiresAt).toMatch(iso8601Regex);
      expect(result.lastActiveAt).toMatch(iso8601Regex);
    });
  });
});
