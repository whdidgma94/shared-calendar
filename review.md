# 코드 리뷰 결과

## 요약
- BLOCKER: 5건
- WARN: 4건
- INFO: 3건

## BLOCKER
| # | 위치 | 내용 |
|---|------|------|
| B1 | tests/backend/integration/*.test.js, tests/backend/unit/Event.test.js, tests/backend/unit/Session.test.js | 백엔드 테스트가 `require('../../src/app')` 및 `jest.mock('../../src/models/Session')` / `'../../src/models/Event')` 를 참조하지만 실제 진입점은 `backend/app.js`(루트), 모델은 `backend/src/models/session.js`·`event.js`(소문자)다. 경로 자체가 존재하지 않아 모든 백엔드 테스트가 모듈 로드 단계에서 실패한다. |
| B2 | tests/backend/unit/Event.test.js, tests/backend/integration/events.api.test.js | 테스트가 EventModel의 `findAllBySession / findById / create / update / delete` 를 모킹·호출하지만 실제 `models/event.js` export는 `findBySession / findOne / createEvent / updateEvent / deleteEvent` 다. 메서드명이 전부 불일치하여 통합 테스트의 라우트-서비스-모델 경로가 동작하지 않는다. |
| B3 | tests/backend/unit/Session.test.js, tests/backend/integration/*.test.js | 테스트가 SessionModel의 `findByToken / isExpired / updateLastActive / create` 를 모킹하지만 실제 `models/session.js` export는 `createSession / findByToken / touchSession` 다. `isExpired`·`updateLastActive`·`create` 는 존재하지 않으며(만료 판정은 service 계층 `resolveSession`에서 수행), 모킹이 적용되지 않아 통합 테스트의 200/404/410 분기 검증이 모두 무효다. |
| B4 | tests/frontend/Event.test.jsx | 테스트가 `src/components/EventList` 와 `src/api/events`의 `getEvents` 를 참조하지만, 실제로 `EventList` 컴포넌트는 존재하지 않고(목록 UI는 `CalendarView.jsx`) API export는 `getEvents`가 아니라 `listEvents` 다. 컴포넌트·API 함수 양쪽이 없어 프론트엔드 이벤트 테스트가 로드/실행 불가. |
| B5 | tests/frontend/Session.test.jsx | 테스트가 `src/components/SessionCreateForm` 컴포넌트를 require 하지만 실제 컴포넌트 목록은 `CalendarView / EventModal / NameModal / SessionBanner` 로 `SessionCreateForm` 이 존재하지 않는다. 세션 생성 UI는 `pages/CreatePage.jsx`에 있어 테스트가 대상 모듈을 찾지 못한다. |

## WARN
| # | 위치 | 내용 |
|---|------|------|
| W1 | backend/package.json | `test` 스크립트와 jest·supertest devDependencies가 없다. 테스트 트리(`tests/backend/`)가 존재하지만 실행 인프라가 누락되어 그대로는 구동할 수 없다. |
| W2 | frontend/package.json | `test` 스크립트와 jest / @testing-library/react / @testing-library/user-event / @testing-library/jest-dom / jest-environment-jsdom devDependencies가 없다. `tests/frontend/` 테스트 실행 의존성 전체 누락. |
| W3 | tests/backend/integration/events.api.test.js (L366-376) | DELETE 204 테스트가 실제 라우트/서비스 흐름(`deleteEvent` rowCount 기반 404 판정)과 다른 `EventModel.delete` + 별도 `findById` 선검증을 가정한다. 실제 `routes/events.js` DELETE 핸들러는 `findById` 를 호출하지 않으므로, 모듈 경로를 고쳐도 모킹 가정이 구현과 어긋난다. |
| W4 | frontend/.env.example, frontend/src/api/client.js, vite.config.js | 백엔드는 `PORT=4000`(app.js 기본값)에 listen 하지만 프론트엔드 기본 API URL과 vite proxy target은 `http://localhost:3000` 이다. 개발 시 직접 호출/프록시 대상 포트가 백엔드와 어긋나 연결 실패 가능. 기본값을 4000으로 통일 권장. |

## INFO
| # | 위치 | 내용 |
|---|------|------|
| I1 | backend/src/, frontend/src/api/ | api-contract.json의 7개 엔드포인트(POST/GET 세션 2종 + 이벤트 CRUD 5종)가 backend routes와 frontend api 클라이언트에 모두 1:1로 구현·매핑되어 일치한다. 경로·메서드 불일치 없음. |
| I2 | backend/src/models/, backend/src/db/schema.sql | Session·Event 모델 필드가 api-contract.json models 및 schema.sql과 완전히 일치한다(필수 필드 누락·타입 불일치 없음, camelCase↔snake_case 변환 일관). 명명 규약(PascalCase 모델, /api/{kebab} 경로)도 준수. |
| I3 | backend/src/ | 빈 핸들러·TODO/FIXME·하드코딩 DB URL 없음. DB 접속은 환경변수 기반(pool.js), lastActiveAt 갱신·세션 만료 처리 등 계약상 부수효과가 service 계층에 구현되어 있다. |

## 검토 범위
- api-contract.json
- backend/app.js, backend/package.json, backend/.env.example
- backend/src/routes/sessions.js, backend/src/routes/events.js
- backend/src/models/session.js, backend/src/models/event.js
- backend/src/services/sessionService.js, backend/src/services/eventService.js
- backend/src/middleware/sessionGuard.js
- backend/src/db/schema.sql
- frontend/src/api/client.js, frontend/src/api/sessions.js, frontend/src/api/events.js
- frontend/package.json, frontend/vite.config.js, frontend/.env.example
- tests/backend/integration/{sessions,events}.api.test.js
- tests/backend/unit/{Session,Event}.test.js
- tests/frontend/{Session,Event}.test.jsx
