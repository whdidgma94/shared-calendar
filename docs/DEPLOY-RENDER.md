# Render 배포 가이드 — Shared Calendar

## 개요

백엔드(Node.js + SQLite) + 프론트엔드(React)를 **Render 단일 Web Service**로 배포합니다.
`render.yaml` Blueprint가 자동으로 서비스와 Disk를 구성합니다.

### 비용
| 항목 | 가격 |
|------|------|
| Web Service (free 플랜) | **무료** (15분 미사용 시 슬립) |
| Disk 1GB (SQLite 영속 저장) | **$0.25/월** (약 270원) |

> Disk 없이 배포하면 재배포/슬립 복귀 시 일정 데이터가 초기화됩니다.

---

## 1단계 — Render 접속 및 Blueprint 연결

1. **[render.com](https://render.com)** 접속 → GitHub으로 로그인
2. **New** → **Blueprint**
3. `whdidgma94/shared-calendar` 레포 선택
4. Render가 `render.yaml`을 자동 감지 → **Apply** 클릭

빌드 과정 (자동):
```
npm install --prefix backend
npm install --prefix frontend
npm run build --prefix frontend   ← React 앱 빌드
node backend/app.js               ← 백엔드 + 프론트엔드 서빙
```

---

## 2단계 — 배포 완료 확인

1. **Dashboard** → `shared-calendar` 서비스 클릭
2. **Logs** 탭에서 아래 메시지 확인:
   ```
   [db] SQLite initialized
   [shared-calendar] listening on http://localhost:10000
   ```
3. 상단 URL (`https://shared-calendar-xxxx.onrender.com`) 클릭 → 앱 접속 확인 ✅

---

## 3단계 — 슬립 문제 해결 (선택)

Render 무료 플랜은 **15분 미사용 시 슬립**되어 첫 접속이 30~60초 느립니다.
해결 방법:
- [UptimeRobot](https://uptimerobot.com) 무료 계정으로 5분마다 `/health` 핑 설정
  - Monitor Type: `HTTP(s)`
  - URL: `https://shared-calendar-xxxx.onrender.com/health`
  - Interval: `5 minutes`

---

## 로컬 개발 환경 실행

```bash
# 터미널 1 — 백엔드 (http://localhost:4000)
cd backend
npm install
node app.js

# 터미널 2 — 프론트엔드 (http://localhost:5173)
cd frontend
npm install
npm run dev
```

---

## APK 빌드 시 API URL 설정

`/build-apk` 실행 시 Render 배포 URL을 지정합니다:

```
/build-apk 20260602-shared-calendar api_url=https://shared-calendar-xxxx.onrender.com
```
