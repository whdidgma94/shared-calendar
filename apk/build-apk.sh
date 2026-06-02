#!/usr/bin/env bash
# =============================================================================
# build-apk.sh — 공유 캘린더 Android APK 빌드 스크립트
# 실행 위치: 프로젝트 루트 (shared-calendar/ 디렉토리)에서 실행
#   ./apk/build-apk.sh
# =============================================================================
set -euo pipefail

# ── 색상 출력 헬퍼 ────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ── 경로 설정 (프로젝트 루트 기준) ────────────────────────────────────────────
PROJECT_ROOT="$(pwd)"
FRONTEND_DIR="${PROJECT_ROOT}/frontend"
APK_DIR="${PROJECT_ROOT}/apk"
DIST_DIR="${FRONTEND_DIR}/dist"

info "프로젝트 루트: ${PROJECT_ROOT}"

# ── 사전 조건 검사 ─────────────────────────────────────────────────────────────
info "사전 조건 검사 중..."

command -v node >/dev/null 2>&1 || error "Node.js가 설치되어 있지 않습니다."
command -v npm  >/dev/null 2>&1 || error "npm이 설치되어 있지 않습니다."
command -v java >/dev/null 2>&1 || error "Java(JDK)가 설치되어 있지 않습니다."

NODE_VER=$(node -v)
JAVA_VER=$(java -version 2>&1 | head -1)
success "Node.js: ${NODE_VER}"
success "Java: ${JAVA_VER}"

# Android SDK 검사
if [ -z "${ANDROID_HOME:-}" ] && [ -z "${ANDROID_SDK_ROOT:-}" ]; then
  warn "ANDROID_HOME / ANDROID_SDK_ROOT 환경 변수가 설정되어 있지 않습니다."
  warn "Android SDK가 없으면 Gradle 빌드를 수행할 수 없습니다."
  warn "Android Studio 설치 후 수동 빌드 방법은 apk-build.md를 참조하세요."
  SDK_AVAILABLE=false
else
  SDK_AVAILABLE=true
  success "Android SDK: ${ANDROID_HOME:-${ANDROID_SDK_ROOT}}"
fi

# ── STEP 1: 프론트엔드 빌드 ────────────────────────────────────────────────────
info "STEP 1/4: 프론트엔드 빌드 (Vite)"

if [ ! -d "${FRONTEND_DIR}" ]; then
  error "프론트엔드 디렉토리가 없습니다: ${FRONTEND_DIR}"
fi

# .env.android → frontend/.env.production 복사
cp "${APK_DIR}/.env.android" "${FRONTEND_DIR}/.env.production"
success ".env.android → frontend/.env.production 복사 완료"

cd "${FRONTEND_DIR}"
npm install
npm run build
success "프론트엔드 빌드 완료 → ${DIST_DIR}"

cd "${PROJECT_ROOT}"

# ── STEP 2: Capacitor 의존성 설치 ─────────────────────────────────────────────
info "STEP 2/4: Capacitor 의존성 설치"
cd "${APK_DIR}"
npm install
success "Capacitor 의존성 설치 완료"

# ── STEP 3: Android 플랫폼 추가 및 동기화 ─────────────────────────────────────
info "STEP 3/4: Android 플랫폼 추가 및 동기화"

if [ ! -d "${APK_DIR}/android" ]; then
  info "android/ 디렉토리 없음 → npx cap add android 실행"
  npx cap add android
else
  info "android/ 디렉토리 존재 → 추가 건너뜀"
fi

npx cap copy android
npx cap sync android
success "Capacitor sync 완료"

cd "${PROJECT_ROOT}"

# ── STEP 4: Gradle 빌드 (Android SDK 있을 때만) ────────────────────────────────
if [ "${SDK_AVAILABLE}" = "true" ]; then
  info "STEP 4/4: Gradle Debug APK 빌드"
  cd "${APK_DIR}/android"

  if [ ! -f "gradlew" ]; then
    error "gradlew 파일이 없습니다. 'npx cap add android'를 먼저 실행하세요."
  fi

  chmod +x gradlew
  ./gradlew assembleDebug

  APK_PATH="${APK_DIR}/android/app/build/outputs/apk/debug/app-debug.apk"
  if [ -f "${APK_PATH}" ]; then
    success "APK 빌드 성공!"
    success "APK 경로: ${APK_PATH}"
    ls -lh "${APK_PATH}"
  else
    error "APK 파일을 찾을 수 없습니다: ${APK_PATH}"
  fi
else
  warn "STEP 4/4: Android SDK 없음 — Gradle 빌드를 건너뜁니다."
  warn "STEP 1~3(웹 빌드 + Capacitor sync)은 완료되었습니다."
  warn "이후 Android Studio에서 apk/android/ 프로젝트를 열어 APK를 빌드하세요."
  warn "자세한 방법은 apk/apk-build.md를 참조하세요."
fi

echo ""
success "build-apk.sh 완료"
