/**
 * Session 생성 컴포넌트 테스트 (React Testing Library)
 * api-contract.json 기반
 *
 * 테스트 대상:
 *   - 세션 생성 폼 렌더링
 *   - 제목 입력 처리
 *   - 폼 제출 시 POST /api/sessions API 호출 확인
 *   - 성공/실패 상태 UI
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// API 모듈 모킹
jest.mock('../../src/api/sessions', () => ({
  createSession: jest.fn(),
}));

const { createSession } = require('../../src/api/sessions');

// 테스트 대상 컴포넌트 (실제 경로에 맞게 조정 필요)
const SessionCreateForm = require('../../src/components/SessionCreateForm').default;

// ── 픽스처 ────────────────────────────────────────────────────────────────────
const makeSessionResponse = (overrides = {}) => ({
  id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  token: 'tok_test_abc123',
  title: '우리 팀 일정',
  lastActiveAt: '2026-06-02T09:00:00Z',
  expiresAt: '2099-09-02T09:00:00Z',
  createdAt: '2026-06-02T09:00:00Z',
  ...overrides,
});

// ── 렌더링 ────────────────────────────────────────────────────────────────────
describe('SessionCreateForm 렌더링', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('캘린더 제목 입력 필드가 렌더링된다', () => {
    render(<SessionCreateForm />);

    const input = screen.getByRole('textbox', { name: /제목|title/i });
    expect(input).toBeInTheDocument();
  });

  it('제출 버튼이 렌더링된다', () => {
    render(<SessionCreateForm />);

    const button = screen.getByRole('button', { name: /만들기|생성|create|시작/i });
    expect(button).toBeInTheDocument();
  });

  it('초기 상태에서 입력 필드는 비어있다', () => {
    render(<SessionCreateForm />);

    const input = screen.getByRole('textbox', { name: /제목|title/i });
    expect(input).toHaveValue('');
  });

  it('초기 상태에서 오류 메시지가 표시되지 않는다', () => {
    render(<SessionCreateForm />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

// ── 입력 처리 ─────────────────────────────────────────────────────────────────
describe('SessionCreateForm 입력 처리', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('제목 입력 필드에 텍스트를 입력하면 값이 반영된다', async () => {
    render(<SessionCreateForm />);
    const user = userEvent.setup();

    const input = screen.getByRole('textbox', { name: /제목|title/i });
    await user.type(input, '우리 팀 일정');

    expect(input).toHaveValue('우리 팀 일정');
  });

  it('입력 필드 초기화(clear) 후 다시 입력 가능하다', async () => {
    render(<SessionCreateForm />);
    const user = userEvent.setup();

    const input = screen.getByRole('textbox', { name: /제목|title/i });
    await user.type(input, '임시 제목');
    await user.clear(input);
    await user.type(input, '새 제목');

    expect(input).toHaveValue('새 제목');
  });
});

// ── 폼 제출 ───────────────────────────────────────────────────────────────────
describe('SessionCreateForm 폼 제출', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('제목을 입력하고 제출하면 createSession API가 title과 함께 호출된다', async () => {
    const sessionResponse = makeSessionResponse();
    createSession.mockResolvedValue(sessionResponse);

    render(<SessionCreateForm />);
    const user = userEvent.setup();

    const input = screen.getByRole('textbox', { name: /제목|title/i });
    await user.type(input, '우리 팀 일정');

    const button = screen.getByRole('button', { name: /만들기|생성|create|시작/i });
    await user.click(button);

    expect(createSession).toHaveBeenCalledTimes(1);
    expect(createSession).toHaveBeenCalledWith({ title: '우리 팀 일정' });
  });

  it('Enter 키로 폼 제출 시 createSession이 호출된다', async () => {
    createSession.mockResolvedValue(makeSessionResponse());

    render(<SessionCreateForm />);
    const user = userEvent.setup();

    const input = screen.getByRole('textbox', { name: /제목|title/i });
    await user.type(input, '팀 캘린더{enter}');

    expect(createSession).toHaveBeenCalledTimes(1);
  });

  it('API 호출 중 로딩 상태가 표시된다', async () => {
    // API가 느릴 때 로딩 표시 확인
    let resolvePromise;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    createSession.mockReturnValue(pendingPromise);

    render(<SessionCreateForm />);
    const user = userEvent.setup();

    const input = screen.getByRole('textbox', { name: /제목|title/i });
    await user.type(input, '로딩 테스트');

    const button = screen.getByRole('button', { name: /만들기|생성|create|시작/i });
    await user.click(button);

    // 로딩 중에는 버튼이 비활성화되거나 로딩 텍스트가 표시되어야 함
    await waitFor(() => {
      const isDisabled = button.disabled;
      const hasLoadingText = screen.queryByText(/로딩|loading|생성 중/i) !== null;
      expect(isDisabled || hasLoadingText).toBe(true);
    });

    // 정리
    resolvePromise(makeSessionResponse());
  });

  it('성공 후 생성된 세션의 token이 표시되거나 리다이렉트 콜백이 호출된다', async () => {
    const sessionResponse = makeSessionResponse();
    createSession.mockResolvedValue(sessionResponse);

    const onSuccess = jest.fn();
    render(<SessionCreateForm onSuccess={onSuccess} />);
    const user = userEvent.setup();

    const input = screen.getByRole('textbox', { name: /제목|title/i });
    await user.type(input, '우리 팀 일정');

    const button = screen.getByRole('button', { name: /만들기|생성|create|시작/i });
    await user.click(button);

    await waitFor(() => {
      // onSuccess 콜백 또는 token 텍스트 중 하나가 있어야 함
      const callbackCalled = onSuccess.mock.calls.length > 0;
      const tokenDisplayed = screen.queryByText(/tok_test_abc123/) !== null;
      expect(callbackCalled || tokenDisplayed).toBe(true);
    });
  });
});

// ── 유효성 검증 ────────────────────────────────────────────────────────────────
describe('SessionCreateForm 유효성 검증', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('제목 없이 제출하면 createSession이 호출되지 않는다', async () => {
    render(<SessionCreateForm />);
    const user = userEvent.setup();

    const button = screen.getByRole('button', { name: /만들기|생성|create|시작/i });
    await user.click(button);

    expect(createSession).not.toHaveBeenCalled();
  });

  it('빈 문자열 제목으로 제출하면 오류 메시지가 표시된다', async () => {
    render(<SessionCreateForm />);
    const user = userEvent.setup();

    const button = screen.getByRole('button', { name: /만들기|생성|create|시작/i });
    await user.click(button);

    await waitFor(() => {
      // 오류 메시지 또는 input의 invalid 상태
      const errorMessage = screen.queryByRole('alert') ||
        screen.queryByText(/필수|required|입력해/i);
      const inputInvalid = screen.getByRole('textbox', { name: /제목|title/i }).validity?.valid === false;
      expect(errorMessage || inputInvalid).toBeTruthy();
    });
  });

  it('API 오류 시 오류 메시지가 표시된다', async () => {
    createSession.mockRejectedValue(new Error('서버 오류'));

    render(<SessionCreateForm />);
    const user = userEvent.setup();

    const input = screen.getByRole('textbox', { name: /제목|title/i });
    await user.type(input, '오류 테스트');

    const button = screen.getByRole('button', { name: /만들기|생성|create|시작/i });
    await user.click(button);

    await waitFor(() => {
      const errorEl = screen.queryByRole('alert') ||
        screen.queryByText(/오류|error|실패|failed/i);
      expect(errorEl).toBeInTheDocument();
    });
  });
});
