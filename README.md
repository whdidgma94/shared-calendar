# shared-calendar

> **세션 링크 공유 기반 (로그인 불필요) 일정 공유 캘린더**
>
> 아이디/비밀번호 없이 랜덤 토큰 URL만으로 팀 캘린더를 생성하고 공유할 수 있습니다.
> 링크를 받은 사람은 누구나 별도 가입 없이 일정을 조회·추가·수정·삭제할 수 있으며,
> iframe 위젯으로 외부 사이트에 읽기 전용 캘린더를 삽입할 수도 있습니다.

---

## 주요 기능

- **인증 불필요** — URL 토큰이 곧 접근 권한. 회원가입·로그인 화면 없음
- **즉시 캘린더 생성** — 제목 입력 후 "만들기" 클릭 한 번으로 공유 URL 발급
- **공유 링크 복사** — 버튼 한 번으로 클립보드 복사
- **이벤트 CRUD** — 제목·시작/종료 시각·종일 여부·설명·위치·색상 지원
- **월간 + 주간 뷰** — 뷰 전환 및 이전/다음/오늘 탐색
- **작성자 표시** — 입장 시 입력한 표시 이름·색상이 이벤트에 함께 표시됨
- **30초 폴링** — 별도 새로고침 없이 다른 참가자의 변경 사항 자동 반영
- **iframe 임베드 위젯** — `/embed/{token}` URL을 iframe으로 삽입해 외부 사이트에 읽기 전용 캘린더 표시
- **90일 자동 만료** — 마지막 활동일 기준 90일 미사용 시 세션 자동 만료·안내

---

## 빠른 시작

### Docker Compose (권장)

```bash
# 1. 환경 변수 설정
cp docs/.env.example .env
# .env 수정: DB_PASSWORD, ALLOWED_ORIGINS 등 실제 값 입력

# 2. 실행
docker compose -f docs/docker-compose.yml up -d --build

# 3. 브라우저에서 접속
open http://localhost
```

### 로컬 개발 (Node.js 20 필요)

```bash
# 데이터베이스 (Docker)
docker run -d --name cal_db \
  -e POSTGRES_USER=caluser -e POSTGRES_PASSWORD=devpass \
  -e POSTGRES_DB=shared_calendar -p 5432:5432 postgres:15-alpine

# 스키마 적용
psql postgresql://caluser:devpass@localhost:5432/shared_calendar \
  -f backend/src/db/schema.sql

# 백엔드
cd backend && npm install
echo "DATABASE_URL=postgresql://caluser:devpass@localhost:5432/shared_calendar" > .env
echo "NODE_ENV=development" >> .env
node app.js &

# 프론트엔드
cd ../frontend && npm install
echo "VITE_API_BASE_URL=http://localhost:3000" > .env.local
npm run dev
# → http://localhost:5173 접속
```

---

## 사용 방법

### 1. 캘린더 만들기

1. 앱 접속 → "새 캘린더 만들기" 클릭
2. 캘린더 제목 입력 후 "만들기"
3. 생성된 공유 URL (`/{token}`) 복사 → 팀원에게 전달

### 2. 캘린더 입장

- 공유 URL을 브라우저에 붙여넣기
- 표시 이름 입력 (브라우저에 저장되어 재방문 시 재사용)
- 이름 해시 기반 색상이 자동 배정됨

### 3. 이벤트 등록

- 캘린더 날짜 클릭 → 이벤트 생성 폼 열림
- 제목(필수), 시작/종료 시각, 설명, 위치, 색상 입력
- 저장 시 내 이름이 작성자로 기록됨

### 4. iframe 위젯 삽입

```html
<!-- 외부 사이트에 읽기 전용 캘린더 삽입 -->
<iframe
  src="https://your-app-domain/embed/{session-token}"
  width="800"
  height="600"
  frameborder="0"
></iframe>
```

---

## API 목록

모든 엔드포인트는 JSON을 반환합니다.
인증 헤더 불필요 — 세션 토큰이 경로 파라미터로 포함됩니다.

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `POST` | `/api/sessions` | 세션(캘린더) 생성. 바디: `{ title }`. 응답: `{ token, expiresAt, ... }` |
| `GET` | `/api/sessions/{token}` | 세션 메타 조회 (만료 검사, `last_active_at` 갱신) |
| `GET` | `/api/sessions/{token}/events` | 이벤트 목록 조회. 쿼리: `?from=ISO8601&to=ISO8601` (미지정 시 전체) |
| `POST` | `/api/sessions/{token}/events` | 이벤트 생성. 바디: `{ title, start_at, end_at, all_day?, description?, location?, color?, author_name? }` |
| `GET` | `/api/sessions/{token}/events/{eventId}` | 단일 이벤트 조회 |
| `PUT` | `/api/sessions/{token}/events/{eventId}` | 이벤트 수정 (변경 필드만 전달 가능) |
| `DELETE` | `/api/sessions/{token}/events/{eventId}` | 이벤트 삭제 → `204 No Content` |

### 오류 코드

| 상태 | 의미 |
|------|------|
| `404` | 존재하지 않는 세션 토큰 |
| `410 Gone` | 만료된 세션 토큰 |
| `400` | 유효성 검사 실패 (필수 필드 누락 등) |

---

## 기술 스택

| 계층 | 기술 |
|------|------|
| Backend | Node.js 20 + Express 4 |
| Frontend | React 18 + Vite + FullCalendar |
| DB | PostgreSQL 15 |
| 컨테이너 | Docker + docker-compose v2 |
| CI | GitHub Actions |

---

## 프로젝트 구조

```
.
├── backend/                  # Node.js/Express 서버
│   ├── app.js
│   ├── package.json
│   └── src/
│       ├── db/               # 커넥션 풀 + schema.sql
│       ├── middleware/       # sessionGuard, frameHeaders
│       ├── models/           # session.js, event.js
│       ├── routes/           # sessions.js, events.js
│       └── services/         # sessionService, eventService, tokenService
├── frontend/                 # React + Vite SPA
│   ├── package.json
│   └── src/
│       ├── api/              # client.js, sessions.js, events.js
│       ├── components/       # CalendarView, EventModal, SessionBanner
│       ├── hooks/            # usePolling.js
│       └── pages/            # CreatePage, CalendarPage, EmbedPage
├── tests/                    # 테스트 트리 (BLOCKER 수정 필요 — review.md 참조)
│   ├── backend/
│   └── frontend/
└── docs/                     # 배포 문서
    ├── Dockerfile.backend
    ├── Dockerfile.frontend
    ├── docker-compose.yml
    ├── .env.example
    ├── DEPLOY.md
    └── .github/workflows/ci.yml
```

---

## 알려진 이슈 (배포 전 해결 필요)

**BLOCKER (5건)** — 테스트 경로·메서드명 불일치로 현재 모든 백엔드/프론트엔드 테스트가 실패합니다.
자세한 내용은 `review.md` B1~B5를 참조하고, `DEPLOY.md`의 해결 방법을 따르세요.

**HIGH (2건)** — 보안 이슈로 프로덕션 배포 전 반드시 수정이 필요합니다.
- H-1: 프로덕션 DB TLS 인증서 검증 비활성화 (`backend/src/db/pool.js`)
- H-2: 임베드 CSP `unsafe-inline`/`unsafe-eval` 허용 (`backend/src/middleware/frameHeaders.js`)

자세한 내용은 `security.md` 및 `docs/DEPLOY.md`를 참조하세요.

---

## 라이선스

MIT
