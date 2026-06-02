import { useSearchParams, Link } from 'react-router-dom';

const MESSAGES = {
  expired: {
    title: '캘린더가 만료되었습니다',
    desc: '이 공유 캘린더의 유효 기간이 끝났습니다. 캘린더 소유자에게 새 링크를 요청하세요.',
    icon: '⏰',
  },
  notfound: {
    title: '캘린더를 찾을 수 없습니다',
    desc: 'URL을 다시 확인하거나, 캘린더 소유자에게 올바른 링크를 요청하세요.',
    icon: '🔍',
  },
  default: {
    title: '접근할 수 없는 캘린더입니다',
    desc: '잘못된 링크이거나 이미 삭제된 캘린더일 수 있습니다.',
    icon: '❌',
  },
};

export default function ErrorPage() {
  const [params] = useSearchParams();
  const reason = params.get('reason') || 'default';
  const msg = MESSAGES[reason] || MESSAGES.default;

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.icon}>{msg.icon}</div>
        <h1 style={styles.title}>{msg.title}</h1>
        <p style={styles.desc}>{msg.desc}</p>
        <Link to="/" style={styles.link}>
          새 캘린더 만들기
        </Link>
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
    textAlign: 'center',
    maxWidth: '400px',
    width: '100%',
    boxShadow: '0 16px 48px rgba(0,0,0,0.2)',
  },
  icon: {
    fontSize: '3rem',
    marginBottom: '12px',
  },
  title: {
    margin: '0 0 12px',
    fontSize: '1.4rem',
    color: '#1e3a5f',
  },
  desc: {
    margin: '0 0 28px',
    fontSize: '0.9rem',
    color: '#666',
    lineHeight: 1.6,
  },
  link: {
    display: 'inline-block',
    padding: '11px 28px',
    background: '#1e3a5f',
    color: '#fff',
    borderRadius: '6px',
    textDecoration: 'none',
    fontSize: '0.95rem',
    fontWeight: 600,
  },
};
