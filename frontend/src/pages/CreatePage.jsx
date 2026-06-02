import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSession } from '../api/sessions.js';

export default function CreatePage() {
  const navigate = useNavigate();

  const [title, setTitle]         = useState('');
  const [createError, setCreateError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  const [joinInput, setJoinInput] = useState('');
  const [joinError, setJoinError] = useState('');

  const composingRef = useRef(false);

  async function handleCreate(e) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) { setCreateError('캘린더 이름을 입력해 주세요.'); return; }
    setCreateLoading(true);
    setCreateError('');
    try {
      const session = await createSession({ title: trimmed });
      navigate(`/${session.token}`);
    } catch (err) {
      setCreateError(err.message || '생성에 실패했습니다. 잠시 후 다시 시도하세요.');
      setCreateLoading(false);
    }
  }

  function handleJoin(e) {
    e.preventDefault();
    const raw = joinInput.trim();
    if (!raw) { setJoinError('공유 URL 또는 토큰을 입력해 주세요.'); return; }

    // URL 전체 입력 시 토큰만 추출, 아니면 그대로 사용
    let token = raw;
    try {
      const url = new URL(raw);
      // pathname = "/{token}" → 앞 슬래시 제거
      token = url.pathname.replace(/^\//, '').split('/')[0];
    } catch {
      // URL이 아니면 입력값을 토큰으로 사용
    }

    if (!token) { setJoinError('올바른 URL 또는 토큰을 입력해 주세요.'); return; }
    navigate(`/${token}`);
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>📅</div>
        <h1 style={styles.heading}>공유 캘린더</h1>
        <p style={styles.sub}>
          로그인 없이 링크 하나로 일정을 함께 관리하세요.
        </p>

        {/* 새 캘린더 만들기 */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>새 캘린더 만들기</h2>
          <form onSubmit={handleCreate} style={styles.form}>
            <input
              type="text"
              value={title}
              onChange={(e) => { if (!composingRef.current) { setTitle(e.target.value); setCreateError(''); } }}
              onCompositionStart={() => { composingRef.current = true; }}
              onCompositionEnd={(e) => { composingRef.current = false; setTitle(e.target.value); setCreateError(''); }}
              placeholder="캘린더 이름 (예: 우리 팀 일정)"
              style={styles.input}
              maxLength={100}
              autoFocus
              disabled={createLoading}
            />
            {createError && <p style={styles.error}>{createError}</p>}
            <button type="submit" style={styles.btnPrimary} disabled={createLoading}>
              {createLoading ? '생성 중...' : '캘린더 만들기'}
            </button>
          </form>
        </section>

        <div style={styles.divider}><span style={styles.dividerText}>또는</span></div>

        {/* 기존 캘린더 참여 */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>기존 캘린더 참여</h2>
          <form onSubmit={handleJoin} style={styles.form}>
            <input
              type="text"
              value={joinInput}
              onChange={(e) => { if (!composingRef.current) { setJoinInput(e.target.value); setJoinError(''); } }}
              onCompositionStart={() => { composingRef.current = true; }}
              onCompositionEnd={(e) => { composingRef.current = false; setJoinInput(e.target.value); setJoinError(''); }}
              placeholder="공유 URL 또는 토큰 입력"
              style={styles.input}
            />
            {joinError && <p style={styles.error}>{joinError}</p>}
            <button type="submit" style={styles.btnSecondary}>
              참여하기
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1e3a5f 0%, #2980b9 100%)',
    padding: '24px',
  },
  card: {
    background: '#fff',
    borderRadius: '12px',
    padding: '40px 36px',
    width: '100%',
    maxWidth: '440px',
    boxShadow: '0 16px 48px rgba(0,0,0,0.2)',
    textAlign: 'center',
  },
  logo: { fontSize: '3rem', marginBottom: '8px' },
  heading: { margin: '0 0 8px', fontSize: '1.6rem', color: '#1e3a5f' },
  sub: { margin: '0 0 24px', fontSize: '0.9rem', color: '#666', lineHeight: 1.6 },
  section: { textAlign: 'left' },
  sectionTitle: {
    margin: '0 0 12px',
    fontSize: '0.95rem',
    fontWeight: 700,
    color: '#1e3a5f',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '0' },
  input: {
    padding: '12px 14px',
    fontSize: '1rem',
    border: '1.5px solid #ccc',
    borderRadius: '6px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  error: {
    color: '#e74c3c',
    fontSize: '0.85rem',
    margin: '6px 0 0',
  },
  btnPrimary: {
    marginTop: '12px',
    padding: '13px',
    background: '#1e3a5f',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
  },
  btnSecondary: {
    marginTop: '12px',
    padding: '13px',
    background: '#fff',
    color: '#1e3a5f',
    border: '2px solid #1e3a5f',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
  },
  divider: {
    position: 'relative',
    textAlign: 'center',
    margin: '24px 0',
    borderTop: '1px solid #e0e0e0',
  },
  dividerText: {
    position: 'relative',
    top: '-11px',
    background: '#fff',
    padding: '0 12px',
    fontSize: '0.85rem',
    color: '#aaa',
  },
};
