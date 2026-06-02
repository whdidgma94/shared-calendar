import { useState, useEffect, useRef } from 'react';

/**
 * 이벤트 생성/수정/삭제 모달
 *
 * Props:
 *  - mode: 'create' | 'edit'
 *  - initialData: 이벤트 초기값 (create 시 { startAt, endAt, allDay })
 *  - authorName: 현재 사용자 표시 이름
 *  - onSave(data): 저장 콜백
 *  - onDelete(): 삭제 콜백 (edit 모드만)
 *  - onClose(): 닫기 콜백
 */
export default function EventModal({
  mode,
  initialData,
  authorName,
  onSave,
  onDelete,
  onClose,
}) {
  const isEdit = mode === 'edit';

  const [title, setTitle] = useState(initialData?.title || '');
  const [startAt, setStartAt] = useState(
    toLocalDatetimeStr(initialData?.startAt) || ''
  );
  const [endAt, setEndAt] = useState(
    toLocalDatetimeStr(initialData?.endAt) || ''
  );
  const [allDay, setAllDay] = useState(initialData?.allDay ?? false);
  const [description, setDescription] = useState(initialData?.description || '');
  const [location, setLocation] = useState(initialData?.location || '');
  const [color, setColor] = useState(initialData?.color || '#3788d8');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const composingRef = useRef(false);

  // allDay 토글 시 시간 부분 초기화
  useEffect(() => {
    if (allDay && startAt) {
      setStartAt(startAt.slice(0, 10));
      setEndAt(endAt ? endAt.slice(0, 10) : startAt.slice(0, 10));
    }
  }, [allDay]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('제목을 입력해 주세요.');
      return;
    }
    if (!startAt || !endAt) {
      setError('시작/종료 시간을 입력해 주세요.');
      return;
    }

    const startIso = allDay ? `${startAt}T00:00:00.000Z` : new Date(startAt).toISOString();
    const endIso = allDay ? `${endAt}T23:59:59.999Z` : new Date(endAt).toISOString();

    if (new Date(startIso) > new Date(endIso)) {
      setError('종료 시간이 시작 시간보다 앞설 수 없습니다.');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        title: trimmedTitle,
        startAt: startIso,
        endAt: endIso,
        allDay,
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        color,
        authorName,
      });
    } catch (err) {
      setError(err.message || '저장에 실패했습니다.');
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setSaving(true);
    try {
      await onDelete();
    } catch (err) {
      setError(err.message || '삭제에 실패했습니다.');
      setSaving(false);
    }
  }

  return (
    <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.heading}>{isEdit ? '일정 수정' : '새 일정'}</h2>
          <button onClick={onClose} style={styles.closeBtn} aria-label="닫기">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={styles.label}>
            제목 <span style={styles.req}>*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => { if (!composingRef.current) { setTitle(e.target.value); setError(''); } }}
            onCompositionStart={() => { composingRef.current = true; }}
            onCompositionEnd={(e) => { composingRef.current = false; setTitle(e.target.value); setError(''); }}
            style={styles.input}
            placeholder="일정 제목"
            maxLength={200}
            autoFocus
          />

          <div style={styles.row}>
            <label style={styles.checkLabel}>
              <input
                type="checkbox"
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
                style={{ marginRight: '6px' }}
              />
              하루 종일
            </label>
          </div>

          <div style={styles.timeRow}>
            <div style={styles.timeField}>
              <label style={styles.label}>시작</label>
              <input
                type={allDay ? 'date' : 'datetime-local'}
                value={startAt}
                onChange={(e) => { setStartAt(e.target.value); setError(''); }}
                style={styles.input}
              />
            </div>
            <div style={styles.timeField}>
              <label style={styles.label}>종료</label>
              <input
                type={allDay ? 'date' : 'datetime-local'}
                value={endAt}
                onChange={(e) => { setEndAt(e.target.value); setError(''); }}
                style={styles.input}
              />
            </div>
          </div>

          <label style={styles.label}>장소</label>
          <input
            type="text"
            value={location}
            onChange={(e) => { if (!composingRef.current) setLocation(e.target.value); }}
            onCompositionStart={() => { composingRef.current = true; }}
            onCompositionEnd={(e) => { composingRef.current = false; setLocation(e.target.value); }}
            style={styles.input}
            placeholder="장소 (선택)"
            maxLength={200}
          />

          <label style={styles.label}>설명</label>
          <textarea
            value={description}
            onChange={(e) => { if (!composingRef.current) setDescription(e.target.value); }}
            onCompositionStart={() => { composingRef.current = true; }}
            onCompositionEnd={(e) => { composingRef.current = false; setDescription(e.target.value); }}
            style={{ ...styles.input, height: '72px', resize: 'vertical' }}
            placeholder="메모 (선택)"
            maxLength={2000}
          />

          <div style={styles.colorRow}>
            <label style={styles.label}>색상</label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              style={styles.colorPicker}
            />
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <div style={styles.actions}>
            {isEdit && (
              <button
                type="button"
                onClick={handleDelete}
                style={confirmDelete ? styles.confirmDeleteBtn : styles.deleteBtn}
                disabled={saving}
              >
                {confirmDelete ? '정말 삭제' : '삭제'}
              </button>
            )}
            <button type="submit" style={styles.saveBtn} disabled={saving}>
              {saving ? '저장 중...' : isEdit ? '수정 완료' : '추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Date/string을 datetime-local input 값 형식으로 변환 */
function toLocalDatetimeStr(val) {
  if (!val) return '';
  const d = typeof val === 'string' ? new Date(val) : val;
  if (isNaN(d)) return '';
  // "YYYY-MM-DDTHH:mm" (local time, no seconds)
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '16px',
  },
  modal: {
    background: '#fff',
    borderRadius: '8px',
    padding: '24px 24px 20px',
    width: '100%',
    maxWidth: '460px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  heading: {
    margin: 0,
    fontSize: '1.2rem',
    color: '#1e3a5f',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '1.1rem',
    cursor: 'pointer',
    color: '#666',
    lineHeight: 1,
    padding: '4px',
  },
  label: {
    display: 'block',
    fontSize: '0.85rem',
    color: '#444',
    marginBottom: '4px',
    marginTop: '12px',
  },
  req: {
    color: '#e74c3c',
  },
  input: {
    width: '100%',
    padding: '8px 10px',
    fontSize: '0.95rem',
    border: '1px solid #ccc',
    borderRadius: '4px',
    boxSizing: 'border-box',
  },
  row: {
    marginTop: '12px',
  },
  checkLabel: {
    fontSize: '0.9rem',
    color: '#444',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  timeRow: {
    display: 'flex',
    gap: '12px',
  },
  timeField: {
    flex: 1,
  },
  colorRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  colorPicker: {
    width: '40px',
    height: '32px',
    padding: '0',
    border: '1px solid #ccc',
    borderRadius: '4px',
    cursor: 'pointer',
    marginTop: '12px',
  },
  error: {
    color: '#e74c3c',
    fontSize: '0.85rem',
    margin: '8px 0 0',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '20px',
  },
  saveBtn: {
    padding: '9px 22px',
    background: '#1e3a5f',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.95rem',
    cursor: 'pointer',
  },
  deleteBtn: {
    padding: '9px 18px',
    background: '#fff',
    color: '#e74c3c',
    border: '1px solid #e74c3c',
    borderRadius: '4px',
    fontSize: '0.95rem',
    cursor: 'pointer',
  },
  confirmDeleteBtn: {
    padding: '9px 18px',
    background: '#e74c3c',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.95rem',
    cursor: 'pointer',
  },
};
