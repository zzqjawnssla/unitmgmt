#!/bin/bash

# 통합 릴리스 및 배포 스크립트
# 버전 업데이트, APK 빌드, S3 업로드, DynamoDB 메타데이터 저장

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 환경 변수 로드
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo -e "${RED}Error: .env file not found${NC}"
    exit 1
fi

# ENV_MODE 확인 - dev 모드일 때 경고
if [ "${ENV_MODE}" = "dev" ]; then
    echo -e "${RED}⚠️  Warning: ENV_MODE is set to 'dev'${NC}"
    echo -e "${YELLOW}Production release should use ENV_MODE=prd${NC}"
    echo -e "${YELLOW}Please update your .env file to set ENV_MODE=prd${NC}"
    echo ""
    echo -e "${CYAN}Do you want to continue with dev mode? (y/n):${NC}"
    read -r CONTINUE_DEV
    if [[ "$CONTINUE_DEV" != "y" ]] && [[ "$CONTINUE_DEV" != "Y" ]]; then
        echo -e "${YELLOW}Exiting. Please update ENV_MODE to 'prd' in .env file.${NC}"
        exit 1
    fi
    echo -e "${YELLOW}Continuing with dev mode...${NC}"
    echo ""
fi

# 프로젝트 루트 디렉토리 확인
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found. Please run this script from the project root.${NC}"
    exit 1
fi

# AWS CLI 설치 확인
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed. Please install it first.${NC}"
    echo "Visit: https://aws.amazon.com/cli/"
    exit 1
fi

# 함수: 사용법 출력
show_usage() {
    echo -e "${CYAN}Usage:${NC}"
    echo "  $0 [patch|minor|major] [options]"
    echo ""
    echo -e "${CYAN}Options:${NC}"
    echo "  --release-notes \"notes\"  릴리스 노트 (선택사항)"
    echo "  --skip-build            빌드 건너뛰기"
    echo "  --skip-upload           업로드 건너뛰기"
    echo "  --dry-run               실제 작업 수행하지 않고 시뮬레이션만 실행"
    echo ""
    echo -e "${CYAN}Examples:${NC}"
    echo "  $0 patch --release-notes \"버그 수정 및 성능 개선\""
    echo "  $0 minor --release-notes \"새로운 기능 추가\""
    echo "  $0 major --release-notes \"주요 업데이트\""
}

# 파라미터 파싱
VERSION_TYPE=${1:-patch}
RELEASE_NOTES=""
SKIP_BUILD=false
SKIP_UPLOAD=false
DRY_RUN=false

# Shift first argument if it's a version type
if [[ "$1" == "patch" ]] || [[ "$1" == "minor" ]] || [[ "$1" == "major" ]]; then
    shift
else
    VERSION_TYPE="patch"
fi

# Parse additional options
while [[ $# -gt 0 ]]; do
    case $1 in
        --release-notes)
            RELEASE_NOTES="$2"
            shift 2
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --skip-upload)
            SKIP_UPLOAD=true
            shift
            ;;
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

# 릴리스 노트가 없으면 입력 받기
if [ -z "$RELEASE_NOTES" ]; then
    echo -e "${YELLOW}📝 Enter release notes (press Enter for default):${NC}"
    read -r USER_NOTES
    if [ -z "$USER_NOTES" ]; then
        case $VERSION_TYPE in
            patch)
                RELEASE_NOTES="버그 수정 및 성능 개선"
                ;;
            minor)
                RELEASE_NOTES="새로운 기능 추가 및 개선"
                ;;
            major)
                RELEASE_NOTES="주요 업데이트"
                ;;
        esac
    else
        RELEASE_NOTES="$USER_NOTES"
    fi
fi

echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}       📱 Unit Management Release & Deploy Pipeline 📱${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# 현재 버전 정보 읽기
CURRENT_VERSION=$(grep '"version"' package.json | head -1 | cut -d'"' -f4)
echo -e "${YELLOW}📌 Current version: ${CURRENT_VERSION}${NC}"

# 1. 버전 업데이트
echo -e "\n${BLUE}Step 1: Version Bump (${VERSION_TYPE})${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ "$DRY_RUN" = true ]; then
    echo -e "${CYAN}[DRY RUN] Would execute: node scripts/manual/version-bump.js ${VERSION_TYPE}${NC}"
    NEW_VERSION="$CURRENT_VERSION"  # 실제로는 변경되지 않음
else
    node scripts/manual/version-bump.js ${VERSION_TYPE}
fi

# 새 버전 정보 읽기
NEW_VERSION=$(grep '"version"' package.json | head -1 | cut -d'"' -f4)
VERSION_CODE=$(echo $NEW_VERSION | awk -F. '{print $1*10000 + $2*100 + $3}')

echo -e "${GREEN}✅ Version bumped to: ${NEW_VERSION} (code: ${VERSION_CODE})${NC}"

# 2. APK 빌드
if [ "$SKIP_BUILD" = false ]; then
    echo -e "\n${BLUE}Step 2: Building APK${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    if [ "$DRY_RUN" = true ]; then
        echo -e "${CYAN}[DRY RUN] Would execute: ./scripts/build-signed.sh${NC}"
        APK_FILE="android/app/unitmgmt-v${NEW_VERSION}-release.apk"
        APK_SIZE_BYTES=50000000  # 가상 크기
    else
        echo -e "${YELLOW}🔨 Executing build script...${NC}"
        ./scripts/build-signed.sh

        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Build successful!${NC}"
            APK_FILE="android/app/unitmgmt-v${NEW_VERSION}-release.apk"
            if [ -f "$APK_FILE" ]; then
                APK_SIZE_BYTES=$(stat -f%z "$APK_FILE" 2>/dev/null || stat -c%s "$APK_FILE" 2>/dev/null)
                echo -e "${GREEN}✅ APK created: unitmgmt-v${NEW_VERSION}-release.apk${NC}"
            else
                echo -e "${RED}❌ APK file not found!${NC}"
                exit 1
            fi
        else
            echo -e "${RED}❌ Build failed!${NC}"
            exit 1
        fi
    fi
else
    echo -e "\n${YELLOW}⏭ Skipping build step${NC}"
    APK_FILE="android/app/unitmgmt-v${NEW_VERSION}-release.apk"
    if [ -f "$APK_FILE" ]; then
        APK_SIZE_BYTES=$(stat -f%z "$APK_FILE" 2>/dev/null || stat -c%s "$APK_FILE" 2>/dev/null)
    else
        echo -e "${RED}❌ APK file not found: $APK_FILE${NC}"
        exit 1
    fi
fi

# 3. AppSafer 업로드 안내
echo -e "\n${BLUE}Step 3: AppSafer Upload Instructions${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "${CYAN}📋 Next Steps for AppSafer Process:${NC}"
echo -e "  1. ${YELLOW}수동으로 AppSafer에 APK 업로드${NC}"
echo -e "     • 파일: ${CYAN}${APK_FILE}${NC}"
echo -e "  2. ${YELLOW}AppSafer 처리 완료 후 APK 다운로드${NC}"
echo -e "     • 저장 위치: ${CYAN}android/downloaded-apks/com.unitmgmt.apk${NC}"
echo -e "  3. ${YELLOW}최종 배포 실행${NC}"
echo -e "     • 명령어: ${CYAN}npm run deploy:android:appsafer${NC}"
echo -e "     • 또는: ${CYAN}./scripts/android-deploy-appsafer.sh${NC}"
echo ""
echo -e "${RED}⚠️  중요: 이 스크립트는 AWS 업로드를 수행하지 않습니다.${NC}"
echo -e "${RED}   AppSafer 처리 후 android-deploy-appsafer.sh를 실행하세요.${NC}"

# 4. Git 커밋 및 태그 (선택사항)
echo -e "\n${BLUE}Step 4: Git Operations${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ "$DRY_RUN" = true ]; then
    echo -e "${CYAN}[DRY RUN] Suggested git commands:${NC}"
    echo "  git add -A"
    echo "  git commit -m \"chore: build v${NEW_VERSION} - ${RELEASE_NOTES}\""
    echo "  git tag v${NEW_VERSION}"
else
    echo -e "${YELLOW}💡 Suggested git commands:${NC}"
    echo -e "${CYAN}git add -A${NC}"
    echo -e "${CYAN}git commit -m \"chore: build v${NEW_VERSION} - ${RELEASE_NOTES}\"${NC}"
    echo -e "${CYAN}git tag v${NEW_VERSION}${NC}"
    echo ""
    echo -e "${YELLOW}Do you want to execute these commands? (y/n):${NC}"
    read -r EXECUTE_GIT

    if [[ "$EXECUTE_GIT" == "y" ]] || [[ "$EXECUTE_GIT" == "Y" ]]; then
        git add -A
        git commit -m "chore: build v${NEW_VERSION} - ${RELEASE_NOTES}"
        git tag "v${NEW_VERSION}"
        echo -e "${GREEN}✅ Git commit and tag created${NC}"
        echo -e "${YELLOW}Push to remote? (y/n):${NC}"
        read -r PUSH_GIT
        if [[ "$PUSH_GIT" == "y" ]] || [[ "$PUSH_GIT" == "Y" ]]; then
            git push origin main --tags
            echo -e "${GREEN}✅ Pushed to remote${NC}"
        fi
    fi
fi


# 완료 요약
echo -e "\n${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}       🎉 Build Pipeline Complete! 🎉${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}📊 Summary:${NC}"
echo -e "  • Version: ${CYAN}${NEW_VERSION}${NC} (Code: ${VERSION_CODE})"
echo -e "  • APK File: ${CYAN}${APK_FILE}${NC}"
if [ "$DRY_RUN" = false ]; then
    APK_SIZE_MB=$((APK_SIZE_BYTES / 1024 / 1024))
    echo -e "  • APK Size: ${CYAN}${APK_SIZE_MB} MB${NC}"
fi
echo -e "  • Release Notes: ${CYAN}${RELEASE_NOTES}${NC}"
echo -e "  • Status: ${YELLOW}Ready for AppSafer${NC}"
echo ""

# AppSafer 및 배포 안내
echo -e "${BLUE}📱 Next Steps:${NC}"
echo -e "  1. ${YELLOW}AppSafer에 APK 업로드${NC}"
echo -e "     • 파일: ${CYAN}${APK_FILE}${NC}"
echo -e "  2. ${YELLOW}처리된 APK 다운로드${NC}"
echo -e "     • 저장: ${CYAN}android/downloaded-apks/com.unitmgmt.apk${NC}"
echo -e "  3. ${YELLOW}최종 배포${NC}"
echo -e "     • 명령어: ${CYAN}npm run deploy:android:appsafer${NC}"
echo -e "  4. ${YELLOW}iOS 배포 (필요시)${NC}"
echo -e "     • 명령어: ${CYAN}npm run ios:upload:only${NC}"
echo ""

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}⚠️  This was a dry run. No actual changes were made.${NC}"
    echo -e "${YELLOW}    Remove --dry-run flag to execute the pipeline.${NC}"
fi

echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"