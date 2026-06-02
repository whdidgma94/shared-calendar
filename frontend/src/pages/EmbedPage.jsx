import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';

import { getSession } from '../api/sessions.js';
import { listEvents } from '../api/events.js';
import { usePolling } from '../hooks/usePolling.js';
import CalendarView from '../components/CalendarView.jsx';

/**
 * 임베드 위젯 페이지 (`/embed/:token`)
 * - 읽기 전용, 월간 뷰 고정
 * - 헤더/배너 없음 (iframe 삽입용)
 * - 30초 폴링
 */
export default function EmbedPage() {
  const { token } = useParams();

  const [session, setSession] = useState(null);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    getSession(token)
      .then((s) => {
        if (s.expiresAt && new Date(s.expiresAt) < new Date()) {
          setError('이 캘린더는 만료되었습니다.');
          return;
        }
        setSession(s);
      })
      .catch((err) => {
        if (err.status === 404) setError('캘린더를 찾을 수 없습니다.');
        else setError(err.message || '불러오기 실패');
      });
  }, [token]);

  const fetchEvents = useCallback(() => {
    if (!token) return;
    listEvents(token).then(setEvents).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (session) fetchEvents();
  }, [session, fetchEvents]);

  usePolling(fetchEvents, 30_000, !!session);

  if (error) {
    return (
      <div style={styles.errBox}>
        <p style={styles.errText}>{error}</p>
      </div>
    );
  }

  if (!session) {
    return <div style={styles.loading}>불러오는 중...</div>;
  }

  return (
    <div style={styles.page}>
      <div style={styles.titleBar}>{session.title}</div>
      <CalendarView events={events} readOnly={true} />
    </div>
  );
}

const styles = {
  page: {
    fontFamily: 'sans-serif',
    background: '#fff',
  },
  titleBar: {
    padding: '8px 14px',
    background: '#1e3a5f',
    color: '#fff',
    fontSize: '0.95rem',
    fontWeight: 600,
  },
  loading: {
    padding: '24px',
    textAlign: 'center',
    color: '#888',
  },
  errBox: {
    padding: '24px',
    textAlign: 'center',
  },
  errText: {
    color: '#e74c3c',
  },
};
