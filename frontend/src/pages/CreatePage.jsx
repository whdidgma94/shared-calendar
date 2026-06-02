import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSession } from '../api/sessions.js';

/**
 * 홈 페이지: 공유 캘린더 제목 입력 → 세션 생성 → /{token} 이동
 */
export default function CreatePage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setError('캘린더 제목을 입력해 주세요.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const session = await createSession({ title: trimmed });
      navigate(`/${session.token}`);
    } catch (err) {
      setError(err.message || '세션 생성에 실패했습니다. 잠시 후 다시 시도하세요.');
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>📅</div>
        <h1 style={styles.heading}>공유 캘린더 만들기</h1>
        <p style={styles.sub}>
          링크 하나로 여러 사람이 함께 일정을 관리합니다.
          <br />
          로그인 없이 바로 시작할 수 있어요.
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="text"
            value={title}
            onChange={(e) => { setTitle(e.target.value); setError(''); }}
            placeholder="캘린더 이름 (예: 우리 팀 일정)"
            style={styles.input}
            maxLength={100}
            autoFocus
            disabled={loading}
          />
          {error && <p style={styles.error}>{error}</p>}
          <button type="submit" style={styles.btn} disabled={loading}>
            {loading ? '생성 중...' : '캘린더 만들기'}
          </button>
        </form>

        <p style={styles.hint}>
          생성된 URL을 공유하면 누구나 일정을 추가하고 확인할 수 있습니다.
        </p>
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
    padding: '48px 40px',
    width: '100%',
    maxWidth: '440px',
    boxShadow: '0 16px 48px rgba(0,0,0,0.2)',
    textAlign: 'center',
  },
  logo: {
    fontSize: '3rem',
    marginBottom: '8px',
  },
  heading: {
    margin: '0 0 10px',
    fontSize: '1.6rem',
    color: '#1e3a5f',
  },
  sub: {
    margin: '0 0 28px',
    fontSize: '0.9rem',
    color: '#666',
    lineHeight: 1.6,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
  },
  input: {
    padding: '12px 14px',
    fontSize: '1rem',
    border: '1.5px solid #ccc',
    borderRadius: '6px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  error: {
    color: '#e74c3c',
    fontSize: '0.85rem',
    margin: '6px 0 0',
    textAlign: 'left',
  },
  btn: {
    marginTop: '16px',
    padding: '13px',
    background: '#1e3a5f',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '1.05rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  hint: {
    marginTop: '20px',
    fontSize: '0.8rem',
    color: '#999',
    lineHeight: 1.5,
  },
};
