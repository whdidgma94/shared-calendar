# 배포 가이드 — shared-calendar

> session_id: `20260602-shared-calendar`
> 스택: Node.js/Express + React/Vite + PostgreSQL 15

---

## 배포 전 필수 해결 항목

> 아래 항목은 **배포 전에 반드시 해결하세요.**
> 코드 리뷰(review.md) 및 보안 리뷰(security.md) 결과를 기반으로 추출한 항목입니다.

### BLOCKER — 테스트 경로 불일치 (5건)

| # | 대상 | 문제 | 해결 방법 |
|---|------|------|-----------|
| B1 | `tests/backend/**/*.test.js` | `require('../../src/app')` 등 경로가 실제 파일 구조(`backend/app.js`, `backend/src/models/session.js`)와 불일치 | 테스트 파일의 `require`/`import` 경로를 실제 파일 위치에 맞게 수정 |
| B2 | `tests/backend/unit/Event.test.js` 외 | EventModel 메서드 `findAllBySession/findById/create/update/delete` 호출 — 실제 export는 `findBySession/findOne/createEvent/updateEvent/deleteEvent` | 테스트의 모킹 대상 메서드명을 실제 구현에 맞게 일치시킴 |
| B3 | `tests/backend/unit/Session.test.js` 외 | SessionModel 메서드 `isExpired/updateLastActive/create` 호출 — 실제 export는 `createSession/findByToken/touchSession` | 테스트의 SessionModel 모킹을 실제 메서드명으로 수정; `isExpired` 로직은 `sessionService.resolveSession`에서 테스트 |
| B4 | `tests/frontend/Event.test.jsx` | `src/components/EventList` 및 API `getEvents` 참조 — 실제로는 `CalendarView.jsx` / `listEvents` | 테스트 대상 컴포넌트를 `CalendarView`로, API 함수를 `listEvents`로 교체 |
| B5 | `tests/frontend/Session.test.jsx` | `src/components/SessionCreateForm` 참조 — 세션 생성 UI는 `pages/CreatePage.jsx` | 테스트 대상을 `CreatePage`로 변경 |

CI의 테스트 스텝은 BLOCKER 수정 전까지 비활성화 상태입니다 (`.github/workflows/ci.yml` 주석 참조).

---

### HIGH — 보안 (2건, 즉시 해결 권장)

#### H-1. 프로덕션 DB TLS 인증서 검증 비활성화

- **파일**: `backend/src/db/pool.js`
- **현재 코드**: `ssl: { rejectUnauthorized: false }`
- **위험**: 프로덕션 DB 연결 중간자(MITM) 공격으로 전체 세션·이벤트 데이터 노출 가능
- **해결**: 관리형 DB의 CA 인증서를 발급받아 아래와 같이 설정

  ```js
  // backend/src/db/pool.js
  ssl: process.env.NODE_ENV === 'production'
    ? {
        rejectUnauthorized: true,
        ca: require('fs').readFileSync(process.env.DB_SSL_CA_PATH)
      }
    : false,
  ```

  그리고 `.env`에 `DB_SSL_CA_PATH=/path/to/ca-certificate.crt` 추가.

#### H-2. 임베드 CSP `unsafe-inline` / `unsafe-eval` 허용

- **파일**: `backend/src/middleware/frameHeaders.js`
- **현재 코드**: `"frame-ancestors *; default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:;"`
- **위험**: CSP가 XSS를 방어하지 못하며, 임베드 경로 CSP가 Express 응답에만 적용되고 실제 프론트엔드 HTML(Vite/nginx 서빙)에는 미적용되는 구조적 불일치
- **해결**:
  1. nginx `default.conf`의 `/embed/` 경로에 CSP를 직접 추가:
     ```nginx
     location / {
         add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'nonce-RUNTIME_NONCE'; frame-ancestors *;" always;
     }
     ```
  2. `unsafe-inline`/`unsafe-eval`을 제거하고 nonce 또는 hash 기반 스타일/스크립트만 허용
  3. Express `frameHeaders.js`의 CSP 헤더 범위를 API 응답 전용으로 좁히거나 제거

---

## 사전 요구사항

- Docker 24+ 및 Docker Compose v2
- (선택) Node.js 20 LTS — 로컬 개발 시

---

## 빠른 시작 (Docker Compose)

```bash
# 1. 저장소 루트로 이동
cd shared-calendar

# 2. 환경 변수 설정
cp docs/.env.example .env
# .env 파일을 열어 DB_PASSWORD, ALLOWED_ORIGINS 등 실제 값 입력

# 3. 컨테이너 빌드 및 실행
docker compose -f docs/docker-compose.yml up -d --build

# 4. 서비스 상태 확인
docker compose -f docs/docker-compose.yml ps

# 5. 로그 확인
docker compose -f docs/docker-compose.yml logs -f backend
```

서비스 접속:
- 앱 (프론트엔드): http://localhost
- 백엔드 API: http://localhost:3000
- PostgreSQL: localhost:5432

---

## 로컬 개발 환경 (Docker 없이)

### 1. 데이터베이스 준비

```bash
# PostgreSQL 실행 (로컬 또는 Docker 단독)
docker run -d \
  --name shared_calendar_db \
  -e POSTGRES_USER=caluser \
  -e POSTGRES_PASSWORD=devpassword \
  -e POSTGRES_DB=shared_calendar \
  -p 5432:5432 \
  postgres:15-alpine

# 스키마 적용
psql postgresql://caluser:devpassword@localhost:5432/shared_calendar \
  -f backend/src/db/schema.sql
```

### 2. 백엔드 실행

```bash
cd backend
cp ../.env.example .env
# .env 수정: DATABASE_URL=postgresql://caluser:devpassword@localhost:5432/shared_calendar
#            NODE_ENV=development, PORT=3000
npm install
node app.js
```

### 3. 프론트엔드 실행

```bash
cd frontend
# .env.local 파일 생성
echo "VITE_API_BASE_URL=http://localhost:3000" > .env.local
npm install
npm run dev
# → http://localhost:5173 에서 실행
```

---

## DB 스키마 마이그레이션

초기 스키마는 `backend/src/db/schema.sql`을 참조합니다.
Docker Compose 환경에서는 `docker-entrypoint-initdb.d/`에 마운트되어 최초 볼륨 초기화 시 자동 적용됩니다.

이후 변경 시:
```bash
psql $DATABASE_URL -f backend/src/db/schema.sql
```

---

## 컨테이너 종료 및 데이터 삭제

```bash
# 컨테이너 중지 (데이터 볼륨 보존)
docker compose -f docs/docker-compose.yml down

# 컨테이너 + 볼륨 모두 삭제 (데이터 소멸)
docker compose -f docs/docker-compose.yml down -v
```

---

## CI/CD

`.github/workflows/ci.yml`이 push/PR 시 아래 순서로 실행됩니다:

1. **backend-lint** → ESLint
2. **backend-test** → Jest + Supertest (BLOCKER B1~B3 수정 후 활성화)
3. **backend-build** → Docker 이미지 빌드 확인
4. **frontend-lint** → ESLint
5. **frontend-test** → Jest + Testing Library (BLOCKER B4~B5 수정 후 활성화)
6. **frontend-build** → `npm run build` 성공 여부

테스트 BLOCKER 수정 후 `ci.yml`의 주석 처리된 `npm test` 스텝을 활성화하세요.

---

## 환경 변수 참조

| 변수 | 필수 | 설명 | 예시 |
|------|------|------|------|
| `NODE_ENV` | 권장 | 실행 환경 | `production` |
| `PORT` | 선택 | 백엔드 수신 포트 | `3000` |
| `DATABASE_URL` | 필수 | PostgreSQL 연결 문자열 | `postgresql://...` |
| `DB_USER` | 필수 | PostgreSQL 사용자 | `caluser` |
| `DB_PASSWORD` | 필수 | PostgreSQL 비밀번호 (강력한 값 사용) | — |
| `DB_NAME` | 필수 | 데이터베이스 이름 | `shared_calendar` |
| `ALLOWED_ORIGINS` | 필수 | CORS 허용 오리진 (쉼표 구분) | `https://example.com` |
| `VITE_API_BASE_URL` | 필수 | 프론트엔드 API 엔드포인트 (빌드 타임) | `https://api.example.com` |
| `DB_SSL_CA_PATH` | H-1 해결 시 | DB TLS CA 인증서 경로 | `/certs/ca.crt` |
