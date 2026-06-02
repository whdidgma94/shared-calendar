import { useState } from 'react';

/**
 * 캘린더 상단 배너: 세션 제목, 만료일, 공유 URL 복사 버튼
 */
export default function SessionBanner({ session }) {
  const [copied, setCopied] = useState(false);

  if (!session) return null;

  const baseUrl = import.meta.env.VITE_API_URL || window.location.origin;
  const shareUrl = `${baseUrl}/${session.token}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API 실패 시 fallback
      const el = document.createElement('textarea');
      el.value = shareUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const expiresLabel = session.expiresAt
    ? new Date(session.expiresAt).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <div style={styles.banner}>
      <div style={styles.left}>
        <h1 style={styles.title}>{session.title}</h1>
        {expiresLabel && (
          <span style={styles.expires}>만료: {expiresLabel}</span>
        )}
      </div>
      <div style={styles.right}>
        <span style={styles.urlText}>{shareUrl}</span>
        <button onClick={handleCopy} style={styles.copyBtn}>
          {copied ? '복사됨!' : '공유 URL 복사'}
        </button>
      </div>
    </div>
  );
}

const styles = {
  banner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 20px',
    background: '#1e3a5f',
    color: '#fff',
    flexWrap: 'wrap',
    gap: '8px',
  },
  left: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '12px',
    flexWrap: 'wrap',
  },
  title: {
    margin: 0,
    fontSize: '1.2rem',
    fontWeight: 700,
  },
  expires: {
    fontSize: '0.8rem',
    opacity: 0.75,
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  urlText: {
    fontSize: '0.8rem',
    opacity: 0.8,
    wordBreak: 'break-all',
    maxWidth: '280px',
  },
  copyBtn: {
    padding: '6px 14px',
    background: '#3788d8',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    whiteSpace: 'nowrap',
  },
};
