/**
 * 이벤트 모달/목록 컴포넌트 테스트 (React Testing Library)
 * api-contract.json 기반 — mock 데이터 사용
 *
 * 테스트 대상:
 *   - EventList: 이벤트 목록 렌더링
 *   - EventModal: 이벤트 생성/수정 모달
 *   - 이벤트 삭제 동작
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// API 모듈 모킹
jest.mock('../../src/api/events', () => ({
  getEvents: jest.fn(),
  createEvent: jest.fn(),
  updateEvent: jest.fn(),
  deleteEvent: jest.fn(),
}));

const { getEvents, createEvent, updateEvent, deleteEvent } = require('../../src/api/events');

// 테스트 대상 컴포넌트
const EventList = require('../../src/components/EventList').default;
const EventModal = require('../../src/components/EventModal').default;

// ── 픽스처 ────────────────────────────────────────────────────────────────────
const SESSION_TOKEN = 'tok_test_abc123';
const SESSION_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

const makeEvent = (overrides = {}) => ({
  id: '11111111-2222-3333-4444-555555555555',
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

const MOCK_EVENTS = [
  makeEvent(),
  makeEvent({
    id: '22222222-3333-4444-5555-666666666666',
    title: '점심 약속',
    startAt: '2026-06-11T12:00:00Z',
    endAt: '2026-06-11T13:00:00Z',
    location: '강남역 1번 출구',
    authorName: '이영희',
  }),
  makeEvent({
    id: '33333333-4444-5555-6666-777777777777',
    title: '전일 이벤트',
    startAt: '2026-06-12T00:00:00Z',
    endAt: '2026-06-12T23:59:59Z',
    allDay: true,
    color: '#e74c3c',
  }),
];

// ── EventList 렌더링 ───────────────────────────────────────────────────────────
describe('EventList 렌더링', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('mock 이벤트 목록이 모두 렌더링된다', async () => {
    getEvents.mockResolvedValue(MOCK_EVENTS);

    render(<EventList token={SESSION_TOKEN} />);

    await waitFor(() => {
      expect(screen.getByText('팀 회의')).toBeInTheDocument();
      expect(screen.getByText('점심 약속')).toBeInTheDocument();
      expect(screen.getByText('전일 이벤트')).toBeInTheDocument();
    });
  });

  it('이벤트가 없으면 빈 상태 메시지가 표시된다', async () => {
    getEvents.mockResolvedValue([]);

    render(<EventList token={SESSION_TOKEN} />);

    await waitFor(() => {
      const emptyMsg = screen.queryByText(/이벤트가 없|no events|일정이 없/i);
      expect(emptyMsg).toBeInTheDocument();
    });
  });

  it('각 이벤트 아이템에 제목이 표시된다', async () => {
    getEvents.mockResolvedValue(MOCK_EVENTS);

    render(<EventList token={SESSION_TOKEN} />);

    await waitFor(() => {
      MOCK_EVENTS.forEach((event) => {
        expect(screen.getByText(event.title)).toBeInTheDocument();
      });
    });
  });

  it('컴포넌트 마운트 시 getEvents API가 호출된다', async () => {
    getEvents.mockResolvedValue([]);

    render(<EventList token={SESSION_TOKEN} />);

    await waitFor(() => {
      expect(getEvents).toHaveBeenCalledTimes(1);
      expect(getEvents).toHaveBeenCalledWith(SESSION_TOKEN, expect.any(Object));
    });
  });

  it('로딩 중에 로딩 표시가 렌더링된다', () => {
    // API가 resolve 되기 전 로딩 상태 확인
    getEvents.mockReturnValue(new Promise(() => {})); // 영구 pending

    render(<EventList token={SESSION_TOKEN} />);

    const loading = screen.queryByText(/로딩|loading/i) ||
      screen.queryByRole('progressbar') ||
      screen.queryByLabelText(/loading/i);
    expect(loading).toBeInTheDocument();
  });

  it('API 오류 시 오류 메시지가 표시된다', async () => {
    getEvents.mockRejectedValue(new Error('네트워크 오류'));

    render(<EventList token={SESSION_TOKEN} />);

    await waitFor(() => {
      const errorEl = screen.queryByRole('alert') ||
        screen.queryByText(/오류|error|실패|네트워크/i);
      expect(errorEl).toBeInTheDocument();
    });
  });

  it('allDay 이벤트에 전일 표시가 있다', async () => {
    getEvents.mockResolvedValue([makeEvent({ allDay: true, title: '전일 이벤트' })]);

    render(<EventList token={SESSION_TOKEN} />);

    await waitFor(() => {
      const allDayIndicator = screen.queryByText(/전일|all.?day/i);
      expect(allDayIndicator).toBeInTheDocument();
    });
  });
});

// ── EventModal 렌더링 ─────────────────────────────────────────────────────────
describe('EventModal 렌더링', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('모달이 열리면 제목 입력 필드가 렌더링된다', () => {
    render(<EventModal isOpen={true} token={SESSION_TOKEN} onClose={jest.fn()} />);

    const titleInput = screen.getByRole('textbox', { name: /제목|title/i });
    expect(titleInput).toBeInTheDocument();
  });

  it('모달이 열리면 시작 시간 입력 필드가 렌더링된다', () => {
    render(<EventModal isOpen={true} token={SESSION_TOKEN} onClose={jest.fn()} />);

    // datetime-local input 또는 레이블로 찾기
    const startInput =
      screen.queryByLabelText(/시작|start/i) ||
      screen.queryByDisplayValue(/2026/);
    expect(startInput).toBeInTheDocument();
  });

  it('모달이 열리면 종료 시간 입력 필드가 렌더링된다', () => {
    render(<EventModal isOpen={true} token={SESSION_TOKEN} onClose={jest.fn()} />);

    const endInput = screen.queryByLabelText(/종료|end/i);
    expect(endInput).toBeInTheDocument();
  });

  it('isOpen=false이면 모달 콘텐츠가 렌더링되지 않는다', () => {
    render(<EventModal isOpen={false} token={SESSION_TOKEN} onClose={jest.fn()} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('기존 이벤트를 전달하면 편집 모드로 필드가 채워진다', () => {
    const event = makeEvent();
    render(
      <EventModal
        isOpen={true}
        token={SESSION_TOKEN}
        event={event}
        onClose={jest.fn()}
      />
    );

    const titleInput = screen.getByRole('textbox', { name: /제목|title/i });
    expect(titleInput).toHaveValue(event.title);
  });

  it('닫기 버튼 클릭 시 onClose 콜백이 호출된다', async () => {
    const onClose = jest.fn();
    render(<EventModal isOpen={true} token={SESSION_TOKEN} onClose={onClose} />);
    const user = userEvent.setup();

    const closeButton = screen.getByRole('button', { name: /닫기|close|취소|cancel/i });
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ── EventModal 이벤트 생성 ────────────────────────────────────────────────────
describe('EventModal 이벤트 생성', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('필수 정보 입력 후 저장하면 createEvent API가 호출된다', async () => {
    const created = makeEvent({ title: '새 이벤트' });
    createEvent.mockResolvedValue(created);
    const onSave = jest.fn();

    render(
      <EventModal
        isOpen={true}
        token={SESSION_TOKEN}
        onClose={jest.fn()}
        onSave={onSave}
      />
    );
    const user = userEvent.setup();

    const titleInput = screen.getByRole('textbox', { name: /제목|title/i });
    await user.type(titleInput, '새 이벤트');

    // 시작/종료 시각 입력
    const startInput = screen.queryByLabelText(/시작|start/i);
    if (startInput) {
      fireEvent.change(startInput, { target: { value: '2026-06-10T10:00' } });
    }
    const endInput = screen.queryByLabelText(/종료|end/i);
    if (endInput) {
      fireEvent.change(endInput, { target: { value: '2026-06-10T11:00' } });
    }

    const saveButton = screen.getByRole('button', { name: /저장|save|확인|submit/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(createEvent).toHaveBeenCalledTimes(1);
    });
    expect(createEvent).toHaveBeenCalledWith(
      SESSION_TOKEN,
      expect.objectContaining({ title: '새 이벤트' })
    );
  });

  it('저장 성공 후 onSave 콜백이 생성된 이벤트와 함께 호출된다', async () => {
    const created = makeEvent({ title: '새 이벤트' });
    createEvent.mockResolvedValue(created);
    const onSave = jest.fn();

    render(
      <EventModal
        isOpen={true}
        token={SESSION_TOKEN}
        onClose={jest.fn()}
        onSave={onSave}
      />
    );
    const user = userEvent.setup();

    const titleInput = screen.getByRole('textbox', { name: /제목|title/i });
    await user.type(titleInput, '새 이벤트');

    const saveButton = screen.getByRole('button', { name: /저장|save|확인|submit/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(created);
    });
  });
});

// ── EventModal 이벤트 수정 ────────────────────────────────────────────────────
describe('EventModal 이벤트 수정', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('기존 이벤트 수정 후 저장하면 updateEvent API가 호출된다', async () => {
    const event = makeEvent();
    const updated = makeEvent({ title: '수정된 회의' });
    updateEvent.mockResolvedValue(updated);
    const onSave = jest.fn();

    render(
      <EventModal
        isOpen={true}
        token={SESSION_TOKEN}
        event={event}
        onClose={jest.fn()}
        onSave={onSave}
      />
    );
    const user = userEvent.setup();

    const titleInput = screen.getByRole('textbox', { name: /제목|title/i });
    await user.clear(titleInput);
    await user.type(titleInput, '수정된 회의');

    const saveButton = screen.getByRole('button', { name: /저장|save|확인|submit/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(updateEvent).toHaveBeenCalledTimes(1);
    });
    expect(updateEvent).toHaveBeenCalledWith(
      SESSION_TOKEN,
      event.id,
      expect.objectContaining({ title: '수정된 회의' })
    );
  });
});

// ── 이벤트 삭제 ───────────────────────────────────────────────────────────────
describe('EventList 이벤트 삭제', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('이벤트 삭제 버튼 클릭 시 deleteEvent API가 호출된다', async () => {
    const events = [makeEvent()];
    getEvents.mockResolvedValue(events);
    deleteEvent.mockResolvedValue(undefined);

    render(<EventList token={SESSION_TOKEN} />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('팀 회의')).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole('button', { name: /삭제|delete|제거|remove/i });
    await user.click(deleteButton);

    await waitFor(() => {
      expect(deleteEvent).toHaveBeenCalledWith(SESSION_TOKEN, events[0].id);
    });
  });

  it('삭제 후 해당 이벤트가 목록에서 사라진다', async () => {
    const events = [makeEvent()];
    getEvents.mockResolvedValue(events);
    deleteEvent.mockResolvedValue(undefined);

    render(<EventList token={SESSION_TOKEN} />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('팀 회의')).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole('button', { name: /삭제|delete|제거|remove/i });
    await user.click(deleteButton);

    await waitFor(() => {
      expect(screen.queryByText('팀 회의')).not.toBeInTheDocument();
    });
  });
});

// ── 이벤트 필드 표시 ──────────────────────────────────────────────────────────
describe('EventList 이벤트 필드 표시', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('이벤트의 위치(location) 정보가 표시된다', async () => {
    getEvents.mockResolvedValue([makeEvent({ location: '회의실 A' })]);

    render(<EventList token={SESSION_TOKEN} />);

    await waitFor(() => {
      expect(screen.getByText(/회의실 A/)).toBeInTheDocument();
    });
  });

  it('이벤트의 작성자(authorName)가 표시된다', async () => {
    getEvents.mockResolvedValue([makeEvent({ authorName: '김철수' })]);

    render(<EventList token={SESSION_TOKEN} />);

    await waitFor(() => {
      expect(screen.getByText(/김철수/)).toBeInTheDocument();
    });
  });

  it('이벤트 색상(color)이 UI 요소에 적용된다', async () => {
    const event = makeEvent({ color: '#e74c3c' });
    getEvents.mockResolvedValue([event]);

    render(<EventList token={SESSION_TOKEN} />);

    await waitFor(() => {
      // color가 style 또는 data 속성에 반영되어야 함
      const coloredEl = document.querySelector(`[style*="#e74c3c"], [data-color="#e74c3c"]`);
      expect(coloredEl).not.toBeNull();
    });
  });
});
