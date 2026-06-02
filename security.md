# 보안 리뷰 — 20260602-shared-calendar

> 검토 기준: OWASP Top 10 (2021)
> 대상: backend (Node.js/Express + PostgreSQL), frontend (React/Vite)
> 검토 범위: 인증·인가, 인젝션, 민감 데이터 노출, 보안 설정, 입력 검증, 의존성

## 요약

| 심각도 | 건수 |
|--------|------|
| CRITICAL | 0 |
| HIGH | 2 |
| MEDIUM | 5 |
| LOW | 4 |

전반적으로 SQL 파라미터화·토큰 생성·React 자동 이스케이프 등 기본기는 견고하다.
가장 시급한 항목은 **프로덕션 DB TLS 인증서 검증 비활성화(HIGH)** 와 **임베드 CSP의 `unsafe-inline`/`unsafe-eval` 허용(HIGH)** 이다.

---

## 상세 결과

### HIGH

#### H-1. 프로덕션 PostgreSQL TLS 인증서 검증 비활성화 (A02, A05)
**위치**: `backend/src/db/pool.js:14-17`
```js
ssl: process.env.NODE_ENV === 'production'
  ? { rejectUnauthorized: false }
  : false,
```
프로덕션에서 `rejectUnauthorized: false`로 설정되어 DB 연결의 서버 인증서를 검증하지 않는다. 중간자(MITM) 공격자가 DB 트래픽을 가로채거나 위장 DB로 리다이렉트할 수 있으며, 이 경로로 전체 세션·이벤트 데이터가 평문 노출될 수 있다. 관리형 DB의 CA 인증서를 지정(`ssl: { ca: ... }`)하거나 `rejectUnauthorized: true`로 변경해야 한다.

#### H-2. 임베드 CSP에 `unsafe-inline` / `unsafe-eval` 및 `frame-ancestors *` 허용 (A05)
**위치**: `backend/src/middleware/frameHeaders.js:19-22`
```js
res.setHeader('Content-Security-Policy',
  "frame-ancestors *; default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:;");
```
임베드 경로 응답에 `'unsafe-inline'`·`'unsafe-eval'`을 허용하여 CSP가 XSS를 거의 방어하지 못하는 상태가 된다. 또한 `frame-ancestors *`로 임의 사이트의 iframe 삽입을 허용하므로 clickjacking 표면이 확대된다.
- 임베드 위젯에 실제로 필요한 지시문만 최소 허용(`script-src 'self'`, 스타일은 nonce/해시 기반)으로 좁혀야 한다.
- 추가 주의: 이 미들웨어는 `req.path.startsWith('/embed/')`로 분기하지만, `/embed/:token`은 **프론트엔드 SPA 라우트**이며 백엔드(Express)는 해당 경로를 서빙하지 않는다. 즉 의도한 임베드 CSP 완화가 실제 렌더링 HTML(Vite/정적 호스트)에는 적용되지 않고, API 응답에만 조건부로 영향을 줄 수 있는 구조적 불일치가 있다. 프론트엔드 호스팅 계층(또는 정적 서버)에서 CSP/`X-Frame-Options`를 설정하도록 재설계 필요.

---

### MEDIUM

#### M-1. Rate Limiting 부재 (A04 - 안전하지 않은 설계)
**위치**: `backend/app.js` (전역), `backend/src/routes/sessions.js`, `events.js`
세션 생성(`POST /api/sessions`)과 모든 이벤트 쓰기 엔드포인트에 속도 제한이 없다. 인증이 없는 공개 API이므로 무제한 세션 생성으로 DB를 고갈시키거나, 토큰 보유 후 대량 이벤트 생성으로 자원을 소모시키는 남용이 가능하다. `express-rate-limit` 등을 도입해 IP/경로별 제한을 권장한다.

#### M-2. CORS가 origin 없는 요청을 무조건 허용 + credentials 활성화 (A05)
**위치**: `backend/app.js:22-31`
```js
if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
...
credentials: true,
```
`!origin`일 때(서버-서버, 일부 샌드박스/네이티브 클라이언트) 무조건 허용한다. 동시에 `credentials: true`로 설정되어 있으나 본 앱은 토큰을 URL 경로로 전달하고 쿠키/인증 헤더를 사용하지 않으므로 `credentials`는 불필요하며, 허용 origin 정책과 결합 시 혼란·오설정 위험이 있다. credentials를 비활성화하고, origin 없는 요청 허용 여부를 명시적으로 제한하는 것을 권장한다.

#### M-3. 접근 토큰이 URL 경로에 노출 (A01 - 접근 제어)
**위치**: 설계 전반 (`/api/sessions/{token}/...`, 공유 URL `window.location.origin/{token}`)
인증이 없고 토큰=접근 권한인 설계상, 토큰이 URL에 그대로 들어간다. 서버 액세스 로그, 브라우저 히스토리, 프록시 로그, 그리고 외부 리소스 요청 시 `Referer` 헤더를 통해 토큰이 유출될 수 있다(특히 임베드 iframe 컨텍스트). 최소한 `Referrer-Policy: no-referrer` 헤더 설정과, 가능하면 토큰을 경로 대신 헤더/POST 바디로 전달하는 방식을 검토할 것.

#### M-4. 서버측 입력 검증 미흡 — 길이/형식 제한 부재 (A03)
**위치**: `backend/src/routes/events.js:44-72`, `sessions.js:14-27`, `backend/src/models/event.js`
서버는 `title`/`startAt`/`endAt`의 존재·날짜 유효성만 검증한다. `title`, `description`, `location`, `authorName`, `session.title`은 길이 상한이 없고(프론트의 `maxLength`는 우회 가능), `color`는 hex 형식 검증 없이 TEXT 컬럼에 그대로 저장된다. 과도한 길이 입력으로 저장공간 남용/응답 비대화가 가능하다. 서버측 길이 제한과 `color` 정규식 검증을 추가할 것.

#### M-5. 보안 헤더 세트 미흡 (A05)
**위치**: `backend/app.js`, `frontend` 호스팅
`helmet` 등으로 일괄 관리되는 보안 헤더(`X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Strict-Transport-Security`, `Permissions-Policy`)가 설정되지 않았다. `frameHeaders`가 `X-Frame-Options`/CSP만 부분 설정한다. `helmet` 도입을 권장한다.

---

### LOW

#### L-1. 오류 로깅 시 항상 메시지 콘솔 출력 (A09 - 로깅)
**위치**: `backend/app.js:62-63`
`console.error('[error]', err.message, ...)`가 모든 오류에 대해 실행된다. 운영 환경에서 민감 정보가 메시지에 포함될 경우 로그로 흘러갈 수 있다. 구조화 로깅 + 민감정보 마스킹 권장. (스택은 비프로덕션에서만 노출하여 적절히 처리됨.)

#### L-2. `.env` 커밋 방지용 `.gitignore` 부재 (A05)
**위치**: `backend/`, `frontend/`
`.env.example`만 제공되고 `.gitignore`가 없어 실제 `.env`(DB 비밀번호 포함)가 실수로 커밋될 위험이 있다. `.gitignore`에 `.env`, `node_modules`를 명시할 것.

#### L-3. 소스맵 프로덕션 노출 (A05)
**위치**: `frontend/vite.config.js:20` (`sourcemap: true`)
프로덕션 빌드에 소스맵이 포함되어 클라이언트 코드 구조가 그대로 노출된다. 민감 로직은 없으나 공격 표면 축소를 위해 프로덕션에서는 비활성화 권장.

#### L-4. `.env.example`의 자리표시자 자격증명 (A02 - 참고)
**위치**: `backend/.env.example:2`
`DATABASE_URL=postgresql://user:password@...` 는 명백한 자리표시자로 실제 시크릿이 아니다(위험 없음). 배포 문서에서 강력한 자격증명 사용을 안내하는지 확인 권장. 하드코딩된 실제 시크릿은 발견되지 않음.

---

## 보안 점검 통과 항목

- **SQL 인젝션 방어 (A03)**: `models/session.js`, `models/event.js`의 모든 쿼리가 `$1, $2 ...` 파라미터 바인딩을 사용. 동적 `WHERE`/`SET` 절도 컬럼명을 고정 화이트리스트(`fieldMap`)로만 구성하여 식별자 인젝션 차단. 문자열 연결로 사용자 입력을 SQL에 직접 삽입하는 곳 없음.
- **토큰 생성 강도 (A02/A07)**: `tokenService.js`가 `nanoid(22)`(64^22 ≈ 132bit 엔트로피, CSPRNG 기반)로 추측 불가능한 토큰 발급. UNIQUE 제약으로 충돌 방지.
- **테넌트 격리 (A01)**: 모든 이벤트 쿼리(`findOne`/`updateEvent`/`deleteEvent`)가 `session_id`를 WHERE 조건에 강제하여 다른 세션의 이벤트에 IDOR로 접근/수정 불가.
- **세션 만료 처리 (A07)**: `sessionGuard`와 `getSessionByToken`이 `expiresAt < now`를 검사해 410 Gone 반환. 90일 만료 정책 일관 적용.
- **XSS 방어 (A03)**: 사용자 입력(title/description/authorName 등)은 React JSX 텍스트 보간 및 FullCalendar 기본 텍스트 렌더링으로 출력되어 자동 이스케이프됨. `dangerouslySetInnerHTML`/`innerHTML`/`eval` 사용 없음. `color`는 인라인 style 값으로만 사용되어 스크립트 실행 경로 없음.
- **요청 바디 크기 제한 (A05)**: `express.json({ limit: '1mb' })`로 대용량 페이로드 차단.
- **하드코딩 시크릿 부재 (A02)**: 소스 트리에 실제 API 키·비밀번호·토큰 하드코딩 없음. 모든 자격증명은 환경변수로 주입.
- **의존성 버전 (A06)**: `express ^4.19.2`, `pg ^8.12.0`, `nanoid ^3.3.7` 등 알려진 심각 취약점 없는 최신 계열. 와일드카드(`*`) 의존성 없음.
- **에러 정보 노출 통제 (A05)**: 글로벌 에러 핸들러가 스택/상세를 `NODE_ENV !== 'production'`에서만 응답에 포함.
