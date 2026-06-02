import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { getSession } from '../api/sessions.js';
import { listEvents, createEvent, updateEvent, deleteEvent } from '../api/events.js';
import { colorForName } from '../utils/colorHash.js';
import { usePolling } from '../hooks/usePolling.js';

import CalendarView from '../components/CalendarView.jsx';
import SessionBanner from '../components/SessionBanner.jsx';
import NameModal from '../components/NameModal.jsx';
import EventModal from '../components/EventModal.jsx';

const LS_NAME_KEY = 'sharedcal_author_name';

export default function CalendarPage() {
  const { token } = useParams();
  const navigate = useNavigate();

  // --- 세션 상태 ---
  const [session, setSession] = useState(null);
  const [sessionError, setSessionError] = useState(null);

  // --- 이름 모달 ---
  const [authorName, setAuthorName] = useState(() => localStorage.getItem(LS_NAME_KEY) || '');
  const [showNameModal, setShowNameModal] = useState(!localStorage.getItem(LS_NAME_KEY));

  // --- 이벤트 목록 ---
  const [events, setEvents] = useState([]);

  // --- 이벤트 모달 ---
  const [eventModal, setEventModal] = useState(null);
  // { mode: 'create'|'edit', initialData: {...} }

  // --- 초기 세션 로드 ---
  useEffect(() => {
    getSession(token)
      .then((s) => {
        setSession(s);
      })
      .catch((err) => {
        if (err.status === 404) navigate('/error?reason=notfound');
        else setSessionError(err.message || '세션을 불러올 수 없습니다.');
      });
  }, [token, navigate]);

  // --- 이벤트 목록 fetch ---
  const fetchEvents = useCallback(() => {
    if (!token) return;
    listEvents(token)
      .then(setEvents)
      .catch(() => {}); // 폴링 중 네트워크 오류는 조용히 무시
  }, [token]);

  useEffect(() => {
    if (session) fetchEvents();
  }, [session, fetchEvents]);

  // 30초 폴링 (세션 로드 후 & 이름 확인 후에만 활성화)
  usePolling(fetchEvents, 30_000, !!session && !!authorName);

  // --- 이름 확인 ---
  function handleNameConfirm(name) {
    localStorage.setItem(LS_NAME_KEY, name);
    setAuthorName(name);
    setShowNameModal(false);
  }

  // --- 날짜 클릭 → 생성 모달 ---
  function handleDateClick(info) {
    const startAt = info.date.toISOString();
    const endAt = new Date(info.date.getTime() + 60 * 60 * 1000).toISOString();
    setEventModal({
      mode: 'create',
      initialData: { startAt, endAt, allDay: info.allDay, color: colorForName(authorName) },
    });
  }

  // --- 이벤트 클릭 → 수정 모달 ---
  function handleEventClick(info) {
    const ev = info.event.extendedProps;
    setEventModal({
      mode: 'edit',
      initialData: {
        id: info.event.id,
        title: info.event.title.replace(/ \(.*\)$/, ''), // authorName 접미사 제거
        startAt: info.event.start?.toISOString(),
        endAt: info.event.end?.toISOString(),
        allDay: info.event.allDay,
        description: ev.description,
        location: ev.location,
        color: ev.color,
        authorName: ev.authorName,
      },
    });
  }

  // --- 이벤트 저장 ---
  async function handleEventSave(data) {
    if (eventModal.mode === 'create') {
      const created = await createEvent(token, data);
      setEvents((prev) => [...prev, created]);
    } else {
      const updated = await updateEvent(token, eventModal.initialData.id, data);
      setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    }
    setEventModal(null);
  }

  // --- 이벤트 삭제 ---
  async function handleEventDelete() {
    await deleteEvent(token, eventModal.initialData.id);
    setEvents((prev) => prev.filter((e) => e.id !== eventModal.initialData.id));
    setEventModal(null);
  }

  // --- 오류 상태 ---
  if (sessionError) {
    return (
      <div style={styles.errPage}>
        <p style={styles.errText}>{sessionError}</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* 상단 배너 */}
      <SessionBanner session={session} />

      {/* 이름 입력 모달 */}
      {showNameModal && <NameModal onConfirm={handleNameConfirm} />}

      {/* 캘린더 */}
      {session && (
        <CalendarView
          events={events}
          onDateClick={handleDateClick}
          onEventClick={handleEventClick}
        />
      )}

      {/* 이벤트 생성/수정 모달 */}
      {eventModal && (
        <EventModal
          mode={eventModal.mode}
          initialData={eventModal.initialData}
          authorName={authorName}
          onSave={handleEventSave}
          onDelete={eventModal.mode === 'edit' ? handleEventDelete : undefined}
          onClose={() => setEventModal(null)}
        />
      )}
    </div>
  );
}

const styles = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    background: '#f5f7fa',
  },
  errPage: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: '#f5f7fa',
  },
  errText: {
    color: '#e74c3c',
    fontSize: '1rem',
  },
};
