import { useState, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { colorForName } from '../utils/colorHash.js';

/**
 * FullCalendar 래퍼 컴포넌트
 *
 * Props:
 *  - events: Event[] (api-contract Event 배열)
 *  - readOnly: boolean (EmbedPage 등 읽기 전용 모드)
 *  - onDateClick(info): 날짜 클릭 콜백 (readOnly 시 미호출)
 *  - onEventClick(info): 이벤트 클릭 콜백
 */
export default function CalendarView({
  events = [],
  readOnly = false,
  onDateClick,
  onEventClick,
}) {
  const [view, setView] = useState('dayGridMonth');
  const calendarRef = useRef(null);

  function switchView(v) {
    setView(v);
    calendarRef.current?.getApi().changeView(v);
  }

  // api-contract Event[] → FullCalendar EventInput[]
  const fcEvents = events.map((ev) => ({
    id: ev.id,
    title: ev.authorName ? `${ev.title} (${ev.authorName})` : ev.title,
    start: ev.startAt,
    end: ev.endAt,
    allDay: ev.allDay,
    backgroundColor: ev.color || colorForName(ev.authorName),
    borderColor: ev.color || colorForName(ev.authorName),
    extendedProps: { ...ev },
  }));

  return (
    <div style={styles.wrapper}>
      {!readOnly && (
        <div style={styles.toolbar}>
          <button
            onClick={() => switchView('dayGridMonth')}
            style={view === 'dayGridMonth' ? styles.activeBtn : styles.btn}
          >
            월간
          </button>
          <button
            onClick={() => switchView('timeGridWeek')}
            style={view === 'timeGridWeek' ? styles.activeBtn : styles.btn}
          >
            주간
          </button>
        </div>
      )}

      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={readOnly ? 'dayGridMonth' : view}
        locale="ko"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: '',
        }}
        buttonText={{ today: '오늘' }}
        events={fcEvents}
        height="auto"
        dateClick={!readOnly && onDateClick ? onDateClick : undefined}
        eventClick={onEventClick}
        editable={false}
        selectable={false}
        dayMaxEvents={4}
        eventTimeFormat={{
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }}
        nowIndicator={true}
      />
    </div>
  );
}

const styles = {
  wrapper: {
    flex: 1,
    padding: '0 16px 24px',
    minWidth: 0,
  },
  toolbar: {
    display: 'flex',
    gap: '8px',
    margin: '12px 0 8px',
  },
  btn: {
    padding: '6px 18px',
    background: '#fff',
    color: '#1e3a5f',
    border: '1px solid #1e3a5f',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  activeBtn: {
    padding: '6px 18px',
    background: '#1e3a5f',
    color: '#fff',
    border: '1px solid #1e3a5f',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
};
