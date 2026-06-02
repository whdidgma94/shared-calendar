# Railway 배포 가이드 — Shared Calendar

## 개요

백엔드(Node.js + SQLite) + 프론트엔드(React)를 **Railway 단일 서비스**로 배포합니다.
Railway가 프론트엔드를 빌드한 후 백엔드가 정적 파일까지 함께 서빙합니다.
별도 DB 서버 불필요 — SQLite 파일을 Railway 볼륨에 저장합니다.

---

## 1. 사전 준비

1. [railway.app](https://railway.app) 가입 (GitHub 로그인 가능)
2. 프로젝트 코드를 GitHub 레포지토리에 푸시
   ```bash
   git init
   git add .
   git commit -m "initial commit"
   git remote add origin https://github.com/{username}/shared-calendar.git
   git push -u origin main
   ```

---

## 2. Railway 서비스 생성

1. Railway 대시보드 → **New Project** → **Deploy from GitHub repo**
2. 레포지토리 선택 → Deploy 클릭
3. Railway가 `railway.json`을 감지하여 자동 빌드·배포 시작

빌드 과정:
```
npm install --prefix backend
npm install --prefix frontend
npm run build --prefix frontend   ← React 앱 빌드
node backend/app.js               ← 백엔드 + 프론트엔드 서빙
```

---

## 3. 볼륨 추가 (SQLite 데이터 영속 저장)

> 볼륨 없이 배포하면 재배포 시 DB 파일이 초기화됩니다. 반드시 추가하세요.

1. Railway 서비스 페이지 → **Volumes** 탭
2. **+ Add Volume** 클릭
3. Mount Path: `/data` 입력 → Add 클릭

---

## 4. 환경변수 설정

Railway 서비스 → **Variables** 탭에서 추가:

| 변수명 | 값 | 설명 |
|--------|----|------|
| `DB_PATH` | `/data/app.db` | SQLite 파일을 볼륨에 저장 |
| `NODE_ENV` | `production` | 프로덕션 모드 |
| `SESSION_EXPIRES_DAYS` | `90` | 세션 만료 기간 |

> `PORT`는 Railway가 자동 주입하므로 설정 불필요.

---

## 5. 도메인 확인

1. Railway 서비스 → **Settings** → **Networking**
2. **Generate Domain** 클릭
3. `https://your-app.up.railway.app` 형태의 URL 발급

브라우저에서 접속 → 캘린더 앱 동작 확인 ✓

---

## 6. 로컬 개발 환경 실행

```bash
# 터미널 1 — 백엔드 (http://localhost:4000)
cd backend
npm install
cp .env.example .env    # 필요 시 .env 수정
node app.js

# 터미널 2 — 프론트엔드 (http://localhost:5173, Vite dev server)
cd frontend
npm install
npm run dev
```

> 로컬에서는 Vite proxy(`/api → localhost:4000`)가 자동 적용되므로 CORS 설정 불필요.

---

## 7. APK 빌드 시 API URL 설정

`/build-apk` 실행 시 `api_url` 인자로 Railway 배포 URL을 전달합니다:

```
/build-apk 20260602-shared-calendar api_url=https://your-app.up.railway.app
```

APK 내부에서 모든 API 요청이 Railway 서버로 전송됩니다.

---

## 주의사항 (배포 전 해결 권장)

### HIGH — H-1: DB TLS 인증서 검증 (PostgreSQL 잔재, SQLite 전환 후 해당 없음)
SQLite로 전환 완료. 해당 없음.

### HIGH — H-2: 임베드 CSP unsafe-inline/unsafe-eval
`backend/src/middleware/frameHeaders.js`의 `/embed/` 경로 CSP를 프로덕션 전 강화 권장:
```javascript
// 현재
"default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; ..."
// 권장
"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';"
```
