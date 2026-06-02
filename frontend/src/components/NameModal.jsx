import { useState, useRef } from 'react';

/**
 * 표시 이름 입력 모달
 * onConfirm(name) 호출 시 닫힌다.
 */
export default function NameModal({ onConfirm }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const composingRef = useRef(false);

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('이름을 입력해 주세요.');
      return;
    }
    onConfirm(trimmed);
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2 style={styles.heading}>캘린더 입장</h2>
        <p style={styles.desc}>
          일정에 표시될 이름을 입력하세요. 이 이름은 브라우저에 저장되어
          재방문 시 재사용됩니다.
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="표시 이름 (예: 홍길동)"
            value={name}
            onChange={(e) => { if (!composingRef.current) { setName(e.target.value); setError(''); } }}
            onCompositionStart={() => { composingRef.current = true; }}
            onCompositionEnd={(e) => { composingRef.current = false; setName(e.target.value); setError(''); }}
            style={styles.input}
            autoFocus
            maxLength={50}
          />
          {error && <p style={styles.error}>{error}</p>}
          <button type="submit" style={styles.btn}>
            입장하기
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#fff',
    borderRadius: '8px',
    padding: '32px 28px',
    width: '100%',
    maxWidth: '380px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
  },
  heading: {
    margin: '0 0 8px',
    fontSize: '1.3rem',
    color: '#1e3a5f',
  },
  desc: {
    margin: '0 0 20px',
    fontSize: '0.9rem',
    color: '#555',
    lineHeight: 1.5,
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '1rem',
    border: '1px solid #ccc',
    borderRadius: '4px',
    boxSizing: 'border-box',
    outline: 'none',
  },
  error: {
    color: '#e74c3c',
    fontSize: '0.85rem',
    margin: '6px 0 0',
  },
  btn: {
    marginTop: '16px',
    width: '100%',
    padding: '11px',
    background: '#1e3a5f',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '1rem',
    cursor: 'pointer',
  },
};
