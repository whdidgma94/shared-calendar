# Render 배포 가이드 — Shared Calendar

## 개요
- **백엔드**: Node.js/Express (Render 무료 Web Service)
- **DB**: Neon 무료 PostgreSQL (영구 무료, 재배포해도 데이터 유지)
- **프론트엔드**: 백엔드가 정적 파일로 함께 서빙

**총 비용: $0**

---

## 1단계 — Neon 무료 DB 생성

1. **[neon.tech](https://neon.tech)** 접속 → GitHub으로 회원가입
2. **New Project** 클릭 → 프로젝트명 입력 (예: `shared-calendar`) → **Create Project**
3. 대시보드에서 **Connection string** 복사
   ```
   postgresql://user:password@ep-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
   이 값을 메모해 두세요. Render 설정에서 사용합니다.

---

## 2단계 — Render Blueprint 연결

1. **[render.com](https://render.com)** 접속 → GitHub으로 로그인
2. **New** → **Blueprint**
3. `whdidgma94/shared-calendar` 레포 선택
4. Blueprint 설정 화면에서 `DATABASE_URL` 입력란에 **Neon 연결 문자열** 붙여넣기
5. **Apply** 클릭

빌드가 시작됩니다 (3~5분 소요).

---

## 3단계 — 배포 확인

Dashboard → `shared-calendar` → **Logs** 탭:
```
[db] PostgreSQL migration complete (Neon)
[shared-calendar] listening on http://localhost:10000
```
이 뜨면 성공입니다.

상단 URL(`https://shared-calendar-xxxx.onrender.com`) 접속 → 앱 동작 확인 ✅

---

## 4단계 — 슬립 방지 (선택)

Render 무료 플랜은 **15분 미사용 시 슬립**되어 첫 접속이 약 30초 느립니다.

[UptimeRobot](https://uptimerobot.com) 무료 계정으로 해결:
1. **New Monitor** → Monitor Type: `HTTP(s)`
2. URL: `https://shared-calendar-xxxx.onrender.com/health`
3. Monitoring Interval: `5 minutes`

---

## 로컬 개발 환경 실행

```bash
# 터미널 1 — 백엔드
cd backend
npm install
cp .env.example .env
# .env의 DATABASE_URL에 Neon 연결 문자열 입력
node app.js

# 터미널 2 — 프론트엔드
cd frontend
npm install
npm run dev
```

---

## APK 빌드 시 API URL

```
/build-apk 20260602-shared-calendar api_url=https://shared-calendar-xxxx.onrender.com
```
