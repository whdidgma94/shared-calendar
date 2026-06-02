import { useState } from 'react';

export default function SessionBanner({ session }) {
  const [copied, setCopied]           = useState(false);
  const [widgetCopied, setWidgetCopied] = useState(false);
  const [showWidget, setShowWidget]   = useState(false);

  if (!session) return null;

  const baseUrl  = import.meta.env.VITE_API_URL || window.location.origin;
  const shareUrl = `${baseUrl}/${session.token}`;
  const embedUrl = `${baseUrl}/embed/${session.token}`;
  const iframeCode = `<iframe src="${embedUrl}" width="100%" height="500" frameborder="0" style="border:none;border-radius:8px;"></iframe>`;

  async function copyText(text, setCopiedFn) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopiedFn(true);
    setTimeout(() => setCopiedFn(false), 2000);
  }

  return (
    <>
      <div style={styles.banner}>
        <h1 style={styles.title}>{session.title}</h1>

        <div style={styles.actions}>
          <span style={styles.urlText}>{shareUrl}</span>
          <button onClick={() => copyText(shareUrl, setCopied)} style={styles.btn}>
            {copied ? '복사됨!' : '공유 URL 복사'}
          </button>
          <button onClick={() => setShowWidget((v) => !v)} style={styles.btnOutline}>
            위젯 코드
          </button>
        </div>
      </div>

      {showWidget && (
        <div style={styles.widgetBar}>
          <span style={styles.widgetLabel}>iframe 임베드 코드</span>
          <code style={styles.code}>{iframeCode}</code>
          <button onClick={() => copyText(iframeCode, setWidgetCopied)} style={styles.btnSmall}>
            {widgetCopied ? '복사됨!' : '코드 복사'}
          </button>
          <a href={embedUrl} target="_blank" rel="noreferrer" style={styles.previewLink}>
            미리보기 ↗
          </a>
          <button onClick={() => setShowWidget(false)} style={styles.closeBtn}>✕</button>
        </div>
      )}
    </>
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
  title: {
    margin: 0,
    fontSize: '1.2rem',
    fontWeight: 700,
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  urlText: {
    fontSize: '0.8rem',
    opacity: 0.75,
    wordBreak: 'break-all',
    maxWidth: '240px',
  },
  btn: {
    padding: '6px 14px',
    background: '#3788d8',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    whiteSpace: 'nowrap',
  },
  btnOutline: {
    padding: '6px 14px',
    background: 'transparent',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.6)',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    whiteSpace: 'nowrap',
  },
  widgetBar: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '10px',
    padding: '10px 20px',
    background: '#162d4a',
    color: '#fff',
    fontSize: '0.82rem',
  },
  widgetLabel: {
    opacity: 0.75,
    whiteSpace: 'nowrap',
  },
  code: {
    flex: 1,
    background: 'rgba(255,255,255,0.08)',
    padding: '6px 10px',
    borderRadius: '4px',
    fontSize: '0.78rem',
    wordBreak: 'break-all',
    fontFamily: 'monospace',
  },
  btnSmall: {
    padding: '5px 12px',
    background: '#3788d8',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.82rem',
    whiteSpace: 'nowrap',
  },
  previewLink: {
    color: '#7ec8f5',
    fontSize: '0.82rem',
    whiteSpace: 'nowrap',
    textDecoration: 'none',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.6)',
    cursor: 'pointer',
    fontSize: '1rem',
    padding: '2px 6px',
  },
};
