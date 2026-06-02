# APK 빌드 보고서 — 공유 캘린더

- **session_id**: `20260602-shared-calendar`
- **app_id**: `com.app.sharedcalendar`
- **app_name**: 공유 캘린더
- **빌드 도구 상태**: Android SDK 없음 (tools_available: `no-sdk`)
- **생성일**: 2026-06-02

---

## 빌드 결과 요약

| 항목 | 상태 | 비고 |
|------|------|------|
| Node.js 확인 | 확인됨 | 빌드 환경에 설치 |
| Java 17 확인 | 확인됨 | Gradle 실행에 필요 |
| Android SDK | **없음** | 직접 빌드 불가 |
| 웹 에셋 빌드 | 설정 완료 | `build-apk.sh` STEP 1~3으로 수행 가능 |
| APK 직접 빌드 | **건너뜀** | Android SDK 설치 후 수동 진행 필요 |
| Capacitor 설정 파일 | 생성 완료 | `capacitor.config.json` |

> Android SDK가 없어 Gradle 빌드를 건너뛰었습니다.
> STEP 1~3(프론트엔드 Vite 빌드 + Capacitor sync)은 스크립트로 자동화할 수 있으며,
> 이후 Android Studio에서 최종 APK를 생성하세요.

---

## 생성된 파일 목록

```
apk/
├── capacitor.config.json   ← Capacitor 앱 설정 (appId, webDir 등)
├── package.json            ← Capacitor 6.x 의존성
├── .env.android            ← API URL 환경변수
├── build-apk.sh            ← 수동 빌드 자동화 스크립트 (chmod +x 완료)
└── apk-build.md            ← 이 파일
```

---

## 방법 1: 자동화 스크립트 사용 (권장)

### 전제 조건
- Node.js 18+
- Java 17 (JDK)
- Android SDK + `ANDROID_HOME` 환경 변수 설정

### 실행 방법

프로젝트 루트(`shared-calendar/` 디렉토리)에서 실행합니다.

```bash
# 프로젝트 루트로 이동
cd /path/to/shared-calendar

# 스크립트 실행
./apk/build-apk.sh
```

스크립트는 다음 4단계를 순서대로 수행합니다:

| 단계 | 작업 |
|------|------|
| STEP 1 | `.env.android` → `frontend/.env.production` 복사 후 `npm run build` |
| STEP 2 | `apk/` 디렉토리에서 Capacitor 의존성 설치 |
| STEP 3 | `npx cap add android` + `npx cap copy android` + `npx cap sync android` |
| STEP 4 | `./gradlew assembleDebug` (Android SDK 없을 시 건너뜀) |

빌드 성공 시 APK 경로:
```
apk/android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 방법 2: Android Studio 사용 (Android SDK 없을 때)

Android Studio는 내장 SDK를 포함하므로 별도 SDK 설치 없이 빌드 가능합니다.

### 단계별 절차

#### 1단계: 프론트엔드 빌드 + Capacitor 초기화

```bash
# 프로젝트 루트에서 실행
cd /path/to/shared-calendar

# (a) 환경변수 복사
cp apk/.env.android frontend/.env.production

# (b) 프론트엔드 빌드
cd frontend
npm install
npm run build
cd ..

# (c) Capacitor 의존성 설치
cd apk
npm install

# (d) Android 플랫폼 추가 (최초 1회)
npx cap add android

# (e) 웹 에셋 동기화
npx cap sync android
cd ..
```

#### 2단계: Android Studio에서 프로젝트 열기

1. [Android Studio](https://developer.android.com/studio) 설치 (최신 버전 권장)
2. Android Studio 실행 후 **"Open"** 클릭
3. 다음 경로를 선택합니다:
   ```
   /path/to/shared-calendar/apk/android/
   ```
4. Android Studio가 Gradle 동기화를 자동으로 수행합니다 (수 분 소요)

#### 3단계: Debug APK 빌드

1. 상단 메뉴에서 **Build → Build Bundle(s) / APK(s) → Build APK(s)** 선택
2. 빌드 완료 후 우하단 알림에서 **"locate"** 클릭

APK 출력 경로:
```
apk/android/app/build/outputs/apk/debug/app-debug.apk
```

#### 4단계: 기기에 설치 (선택)

```bash
# ADB로 설치 (기기 연결 또는 에뮬레이터 실행 필요)
adb install apk/android/app/build/outputs/apk/debug/app-debug.apk
```

또는 APK 파일을 Android 기기로 직접 복사한 후 설치합니다.
(기기 설정에서 "알 수 없는 출처의 앱 설치" 허용 필요)

---

## 방법 3: 명령줄 직접 빌드 (Android SDK 직접 설치 후)

### Android SDK 설치 (Linux/WSL)

```bash
# Command Line Tools 다운로드
mkdir -p ~/android-sdk/cmdline-tools
cd ~/android-sdk/cmdline-tools
wget https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
unzip commandlinetools-linux-*.zip
mv cmdline-tools latest

# 환경 변수 설정 (~/.bashrc 또는 ~/.zshrc에 추가)
export ANDROID_HOME=~/android-sdk
export ANDROID_SDK_ROOT=~/android-sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools

source ~/.bashrc   # 또는 source ~/.zshrc

# 필수 패키지 설치
sdkmanager --install "platform-tools" "platforms;android-34" "build-tools;34.0.0"
sdkmanager --licenses  # 라이선스 동의
```

### SDK 설치 확인 후 스크립트 재실행

```bash
cd /path/to/shared-calendar
./apk/build-apk.sh
```

---

## 환경변수 상세

`.env.android` 파일에 정의된 환경변수가 `frontend/.env.production`으로 복사되어
Vite 빌드 시 번들에 포함됩니다.

| 변수 | 값 | 용도 |
|------|----|------|
| `VITE_API_URL` | `https://shared-calendar-5nyi.onrender.com` | 백엔드 API 엔드포인트 |

> 백엔드 URL이 변경될 경우 `.env.android`를 수정한 뒤 빌드를 재실행하세요.

---

## 주의사항

- **Debug APK**는 개발/테스트 전용입니다. 배포를 위해서는 Keystore로 서명한 **Release APK**를 생성해야 합니다.
- Android Studio의 **Build → Generate Signed Bundle / APK** 메뉴에서 서명 APK를 생성할 수 있습니다.
- Render.com 무료 플랜 백엔드는 15분 비활성 시 슬립 상태에 들어갑니다. 앱 첫 요청 시 응답 지연(최대 1분)이 발생할 수 있습니다.
