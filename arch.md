# 아키텍처 설계 — 세션 토큰 기반 공유 캘린더

## 기술 스택 후보

### 후보 A — Node/Express + React + PostgreSQL (권장)
- **Backend**: Node.js + Express
- **Frontend**: React (Vite, FullCalendar 라이브러리)
- **DB**: PostgreSQL
- **적합성**: 이벤트 CRUD·폴링 같은 단순 REST 패턴에 Express가 가볍고, React는 월간/주간 캘린더 UI 생태계(FullCalendar)가 풍부하다. PostgreSQL은 `events`의 시간 범위 조회와 인덱싱이 안정적이며 `build-apk`(Capacitor)와도 호환된다.

### 후보 B — Node/Fastify + Vue + SQLite
- **Backend**: Node.js + Fastify
- **Frontend**: Vue 3 (Vite, vue-cal 라이브러리)
- **DB**: SQLite
- **적합성**: 인증 없는 경량 단일 인스턴스 MVP에 SQLite는 운영 부담이 거의 없고 임베드 위젯 같은 소규모 트래픽에 충분하다. Fastify는 스키마 기반 검증이 내장되어 입력 검증 부담을 줄인다. 다만 다중 인스턴스 수평 확장에는 부적합.

### 후보 C — Python/FastAPI + React + PostgreSQL
- **Backend**: Python + FastAPI
- **Frontend**: React (Vite, FullCalendar)
- **DB**: PostgreSQL
- **적합성**: FastAPI의 Pydantic 모델로 Session/Event 검증과 OpenAPI 문서화가 자동화되어 계약 일관성이 높다. 향후 일정 추천·알림 같은 Python 생태계 기능 확장에 유리. 풀스택 언어가 분리되어 1인 개발자의 컨텍스트 전환 비용은 다소 증가.

---

## 확정 스택

**후보 A 확정** (체크포인트 #1 사용자 선택)
- **Backend**: Node.js + Express
- **Frontend**: React (Vite, FullCalendar)
- **DB**: PostgreSQL

---

## DB 스키마

### sessions 테이블
세션 토큰이 곧 접근 키. 인증 없음. 90일 만료.

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | UUID | PK, default gen_random_uuid() | 내부 식별자 |
| token | TEXT | UNIQUE, NOT NULL | 접근 키 (URL/embed 경로에 노출되는 공유 토큰) |
| title | TEXT | NOT NULL | 캘린더 제목 |
| last_active_at | TIMESTAMPTZ | NOT NULL, default now() | 마지막 활동 시각 (이벤트 접근 시 갱신) |
| expires_at | TIMESTAMPTZ | NOT NULL | 만료 시각 (생성 시 now() + 90일) |
| created_at | TIMESTAMPTZ | NOT NULL, default now() | 생성 시각 |

인덱스:
- `UNIQUE INDEX idx_sessions_token ON sessions(token)` — 토큰 조회(매 요청)
- `INDEX idx_sessions_expires_at ON sessions(expires_at)` — 만료 정리 배치 스캔

### events 테이블
세션에 종속. 세션 삭제 시 cascade.

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | UUID | PK, default gen_random_uuid() | 이벤트 식별자 |
| session_id | UUID | FK→sessions(id) ON DELETE CASCADE, NOT NULL | 소속 세션 |
| title | TEXT | NOT NULL | 이벤트 제목 |
| start_at | TIMESTAMPTZ | NOT NULL | 시작 시각 |
| end_at | TIMESTAMPTZ | NOT NULL | 종료 시각 |
| all_day | BOOLEAN | NOT NULL, default false | 종일 이벤트 여부 |
| description | TEXT | NULL | 상세 설명 |
| location | TEXT | NULL | 장소 |
| color | TEXT | NULL, default '#3788d8' | 표시 색상 (hex) |
| author_name | TEXT | NULL | 작성자 표시명 (인증 없으므로 자유 입력) |
| created_at | TIMESTAMPTZ | NOT NULL, default now() | 생성 시각 |
| updated_at | TIMESTAMPTZ | NOT NULL, default now() | 수정 시각 |

인덱스:
- `INDEX idx_events_session_id ON events(session_id)` — 세션별 조회
- `INDEX idx_events_session_range ON events(session_id, start_at, end_at)` — 월간/주간 뷰 범위 조회 복합 인덱스

---

## REST API 엔드포인트

모든 이벤트 관련 경로는 세션 토큰을 경로 파라미터로 받는다. 인증 헤더 없음 — 토큰 보유 = 접근 권한.

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/sessions` | 세션 생성 (title 입력 → token 발급, expires_at = now+90d) |
| GET | `/api/sessions/{token}` | 세션 메타 조회 (만료 검사, last_active_at 갱신) |
| GET | `/api/sessions/{token}/events` | 이벤트 목록 조회 (?from=&to= 범위 필터, 폴링 대상) |
| POST | `/api/sessions/{token}/events` | 이벤트 생성 |
| GET | `/api/sessions/{token}/events/{eventId}` | 단일 이벤트 조회 |
| PUT | `/api/sessions/{token}/events/{eventId}` | 이벤트 수정 |
| DELETE | `/api/sessions/{token}/events/{eventId}` | 이벤트 삭제 |

### 동작 규칙
- 만료된 세션(`expires_at < now()`) 접근 시 모든 엔드포인트는 `410 Gone` 반환.
- 존재하지 않는 토큰은 `404 Not Found`.
- 이벤트 조회/생성/수정/삭제 성공 시 해당 세션의 `last_active_at`를 `now()`로 갱신.
- `GET /events`의 `from`/`to` 쿼리는 ISO8601, 미지정 시 전체 반환. 월간/주간 뷰 및 30초 폴링이 동일 엔드포인트를 사용.

### 임베드 위젯 (프론트엔드 라우트)
- `/embed/{token}` — 읽기 전용 캘린더 위젯 페이지. iframe 삽입용.
- 백엔드는 이 경로에 한해 `X-Frame-Options`를 제거하고 `Content-Security-Policy: frame-ancestors *` 헤더를 적용하여 외부 사이트 iframe 임베드를 허용한다. (메인 앱 경로는 `SAMEORIGIN` 유지)

---

## 디렉토리 구조

### backend/ (Node/Express — 후보 A)
```
backend/
├── src/
│   ├── models/
│   │   ├── session.js          ← sessions 테이블 쿼리
│   │   └── event.js            ← events 테이블 쿼리
│   ├── routes/
│   │   ├── sessions.js         ← /api/sessions, /api/sessions/{token}
│   │   └── events.js           ← /api/sessions/{token}/events*
│   ├── services/
│   │   ├── tokenService.js     ← 토큰 생성/검증
│   │   ├── sessionService.js   ← 세션 만료·활동 갱신 로직
│   │   └── eventService.js     ← 이벤트 CRUD 비즈니스 로직
│   ├── middleware/
│   │   ├── sessionGuard.js     ← 토큰 존재·만료 검사 (404/410)
│   │   └── frameHeaders.js     ← X-Frame-Options / CSP 임베드 허용
│   ├── db/
│   │   ├── pool.js             ← PostgreSQL 커넥션 풀
│   │   └── schema.sql          ← 테이블 + 인덱스 DDL
│   └── app.js                  ← Express 앱 진입점
├── package.json
└── .env.example
```

### frontend/ (React + Vite — 후보 A)
```
frontend/
├── src/
│   ├── components/
│   │   ├── CalendarView.jsx    ← FullCalendar 래퍼 (월간/주간 토글)
│   │   ├── EventModal.jsx      ← 이벤트 생성/수정 폼
│   │   └── SessionBanner.jsx   ← 제목·만료일 표시
│   ├── pages/
│   │   ├── CreatePage.jsx      ← 세션 생성 화면
│   │   ├── CalendarPage.jsx    ← 메인 캘린더 (/{token})
│   │   └── EmbedPage.jsx       ← 읽기 전용 위젯 (/embed/{token})
│   ├── api/
│   │   ├── client.js           ← fetch 래퍼 (base URL)
│   │   ├── sessions.js         ← 세션 API 호출
│   │   └── events.js           ← 이벤트 API 호출
│   ├── hooks/
│   │   └── usePolling.js       ← 30초 폴링 훅
│   ├── App.jsx
│   └── main.jsx
├── package.json
└── vite.config.js
```
