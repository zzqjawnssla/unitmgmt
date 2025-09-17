#!/bin/bash

# Android APK 빌드 및 서명 스크립트
# 버전 업데이트 없이 현재 버전으로 APK를 빌드하고 서명합니다

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 프로젝트 루트 디렉토리 확인
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found. Please run this script from the project root.${NC}"
    exit 1
fi

# Android 프로젝트 확인
if [ ! -d "android" ]; then
    echo -e "${RED}Error: android directory not found. Please run this script from the project root.${NC}"
    exit 1
fi

# 함수: 사용법 출력
show_usage() {
    echo -e "${CYAN}Usage:${NC}"
    echo "  $0 [options]"
    echo ""
    echo -e "${CYAN}Options:${NC}"
    echo "  --dry-run               실제 빌드하지 않고 시뮬레이션만 실행"
    echo "  --help|-h               도움말 출력"
    echo ""
    echo -e "${CYAN}Examples:${NC}"
    echo "  $0                      현재 버전으로 APK 빌드"
    echo "  $0 --dry-run            시뮬레이션 실행"
}

# 파라미터 파싱
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --help|-h)
            show_usage
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            show_usage
            exit 1
            ;;
    esac
done

echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}         📱 Android APK Build & Sign Pipeline 📱${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# 현재 버전 정보 읽기
CURRENT_VERSION=$(grep '"version"' package.json | head -1 | cut -d'"' -f4)
VERSION_CODE=$(echo $CURRENT_VERSION | awk -F. '{print $1*10000 + $2*100 + $3}')

echo -e "${YELLOW}📌 Current version: ${CURRENT_VERSION} (code: ${VERSION_CODE})${NC}"
echo ""

# 1. Clean previous builds
echo -e "${BLUE}Step 1: Clean Previous Builds${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ "$DRY_RUN" = true ]; then
    echo -e "${CYAN}[DRY RUN] Would clean previous builds...${NC}"
else
    echo -e "${YELLOW}🧹 Cleaning previous builds...${NC}"
    cd android
    ./gradlew clean

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Clean successful!${NC}"
    else
        echo -e "${RED}❌ Clean failed!${NC}"
        exit 1
    fi
    cd ..
fi

# 2. Build release APK
echo -e "\n${BLUE}Step 2: Build Release APK${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ "$DRY_RUN" = true ]; then
    echo -e "${CYAN}[DRY RUN] Would build release APK...${NC}"
    APK_FILE="android/app/unitmgmt-v${CURRENT_VERSION}-release.apk"
    APK_SIZE_BYTES=50000000  # 가상 크기
else
    echo -e "${YELLOW}🔨 Building release APK...${NC}"
    cd android
    ./gradlew assembleRelease

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Build successful!${NC}"

        # Find built APK
        BUILT_APK=$(find app/build/outputs/apk/release -name "*.apk" | head -1)
        if [ -n "$BUILT_APK" ]; then
            # Copy APK to app directory with versioned name
            FINAL_APK_NAME="unitmgmt-v${CURRENT_VERSION}-release.apk"
            cp "$BUILT_APK" "app/$FINAL_APK_NAME"
            APK_FILE="android/app/$FINAL_APK_NAME"
            APK_SIZE_BYTES=$(stat -f%z "$BUILT_APK" 2>/dev/null || stat -c%s "$BUILT_APK" 2>/dev/null)
            echo -e "${GREEN}✅ APK created: $FINAL_APK_NAME${NC}"
        else
            echo -e "${RED}❌ No APK file found!${NC}"
            cd ..
            exit 1
        fi
    else
        echo -e "${RED}❌ Build failed!${NC}"
        cd ..
        exit 1
    fi
    cd ..
fi

# 3. APK 정보 출력
echo -e "\n${BLUE}Step 3: APK Information${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ "$DRY_RUN" = false ]; then
    APK_SIZE_MB=$((APK_SIZE_BYTES / 1024 / 1024))
    echo -e "${GREEN}📱 APK Information:${NC}"
    echo -e "  • File: ${CYAN}${APK_FILE}${NC}"
    echo -e "  • Version: ${CYAN}${CURRENT_VERSION}${NC} (Code: ${VERSION_CODE})"
    echo -e "  • Size: ${CYAN}${APK_SIZE_MB} MB${NC} (${APK_SIZE_BYTES} bytes)"
    echo -e "  • Type: ${CYAN}Release (Signed)${NC}"
fi

# 완료 요약
echo -e "\n${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}       🎉 APK Build Complete! 🎉${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

if [ "$DRY_RUN" = false ]; then
    echo -e "${GREEN}📊 Summary:${NC}"
    echo -e "  • Version: ${CYAN}${CURRENT_VERSION}${NC} (Code: ${VERSION_CODE})"
    echo -e "  • APK File: ${CYAN}${APK_FILE}${NC}"
    echo -e "  • APK Size: ${CYAN}${APK_SIZE_MB} MB${NC}"
    echo -e "  • Status: ${GREEN}Ready for AppSafer upload${NC}"
    echo ""

    echo -e "${BLUE}📋 Next Steps:${NC}"
    echo -e "  1. ${YELLOW}수동으로 AppSafer에 APK 업로드${NC}"
    echo -e "     • 파일: ${CYAN}${APK_FILE}${NC}"
    echo -e "  2. ${YELLOW}AppSafer 처리 완료 후 APK 다운로드${NC}"
    echo -e "     • 저장 위치: ${CYAN}android/downloaded-apks/com.unitmgmt.apk${NC}"
    echo -e "  3. ${YELLOW}최종 배포 실행${NC}"
    echo -e "     • 명령어: ${CYAN}npm run deploy:android:appsafer${NC}"
else
    echo -e "${YELLOW}⚠️  This was a dry run. No actual build was performed.${NC}"
    echo -e "${YELLOW}    Remove --dry-run flag to execute the build.${NC}"
fi

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"