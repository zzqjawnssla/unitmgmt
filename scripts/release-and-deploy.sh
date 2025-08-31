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
        echo -e "${CYAN}[DRY RUN] Would build APK...${NC}"
        APK_FILE="android/app/unitmgmt-v${NEW_VERSION}-release.apk"
        APK_SIZE_BYTES=50000000  # 가상 크기
    else
        # Clean previous builds
        echo -e "${YELLOW}🧹 Cleaning previous builds...${NC}"
        cd android
        ./gradlew clean
        
        # Build release APK
        echo -e "${YELLOW}🔨 Building release APK...${NC}"
        ./gradlew assembleRelease
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Build successful!${NC}"
            
            # Find and copy APK
            BUILT_APK=$(find app/build/outputs/apk/release -name "*.apk" | head -1)
            if [ -n "$BUILT_APK" ]; then
                FINAL_APK_NAME="unitmgmt-v${NEW_VERSION}-release.apk"
                cp "$BUILT_APK" "app/$FINAL_APK_NAME"
                APK_FILE="android/app/$FINAL_APK_NAME"
                APK_SIZE_BYTES=$(stat -f%z "$BUILT_APK" 2>/dev/null || stat -c%s "$BUILT_APK" 2>/dev/null)
                echo -e "${GREEN}✅ APK created: $FINAL_APK_NAME${NC}"
            else
                echo -e "${RED}❌ No APK file found!${NC}"
                exit 1
            fi
        else
            echo -e "${RED}❌ Build failed!${NC}"
            exit 1
        fi
        
        cd ..
    fi
else
    echo -e "\n${YELLOW}⏭ Skipping build step${NC}"
    APK_FILE="android/app/otums-v${NEW_VERSION}-release.apk"
    if [ -f "$APK_FILE" ]; then
        APK_SIZE_BYTES=$(stat -f%z "$APK_FILE" 2>/dev/null || stat -c%s "$APK_FILE" 2>/dev/null)
    else
        echo -e "${RED}❌ APK file not found: $APK_FILE${NC}"
        exit 1
    fi
fi

# 3. S3 업로드
if [ "$SKIP_UPLOAD" = false ]; then
    echo -e "\n${BLUE}Step 3: Upload to S3${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    S3_KEY="${AWS_S3_PREFIX}/unitmgmt-v${NEW_VERSION}-release.apk"
    S3_URL="https://${AWS_S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${S3_KEY}"
    
    if [ "$DRY_RUN" = true ]; then
        echo -e "${CYAN}[DRY RUN] Would upload to: s3://${AWS_S3_BUCKET}/${S3_KEY}${NC}"
    else
        echo -e "${YELLOW}📤 Uploading APK to S3...${NC}"
        
        # APK 파일 크기 가져오기 (MB 단위로 표시)
        APK_SIZE_MB=$((APK_SIZE_BYTES / 1024 / 1024))
        echo -e "${CYAN}📊 File size: ${APK_SIZE_MB}MB${NC}"
        
        # S3 업로드
        echo -e "${CYAN}🔄 Uploading... Please wait${NC}"
        aws s3 cp "$APK_FILE" "s3://${AWS_S3_BUCKET}/${S3_KEY}" \
            --region ${AWS_REGION} \
            --metadata "version=${NEW_VERSION},versionCode=${VERSION_CODE}" \
            --cli-read-timeout 0 \
            --cli-connect-timeout 60
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Upload successful!${NC}"
            echo -e "${CYAN}📍 S3 URL: ${S3_URL}${NC}"
        else
            echo -e "${RED}❌ Upload failed!${NC}"
            exit 1
        fi
    fi
else
    echo -e "\n${YELLOW}⏭ Skipping upload step${NC}"
    S3_KEY="${AWS_S3_PREFIX}/unitmgmt-v${NEW_VERSION}-release.apk"
    S3_URL="https://${AWS_S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${S3_KEY}"
fi

# 4. DynamoDB 메타데이터 저장
echo -e "\n${BLUE}Step 4: Update DynamoDB Metadata${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# 메타데이터 준비
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
APK_SIZE_KB=$((APK_SIZE_BYTES / 1024))
APK_FILENAME="unitmgmt-v${NEW_VERSION}-release.apk"
PLATFORM_VERSION="android#$(printf "%05d" $VERSION_CODE)"

# 이전 활성 버전 비활성화
if [ "$DRY_RUN" = true ]; then
    echo -e "${CYAN}[DRY RUN] Would deactivate previous active versions${NC}"
else
    echo -e "${YELLOW}🔄 Deactivating previous active versions...${NC}"
    
    # 현재 활성 버전 조회 및 비활성화
    aws dynamodb query \
        --table-name ${AWS_DYNAMODB_TABLE} \
        --key-condition-expression "app_id = :app_id" \
        --filter-expression "is_active = :active AND platform = :platform" \
        --expression-attribute-values '{
            ":app_id": {"S": "'${APP_ID}'"},
            ":active": {"BOOL": true},
            ":platform": {"S": "android"}
        }' \
        --region ${AWS_REGION} \
        --output json | \
    jq -r '.Items[] | .platform_version.S' | \
    while read -r old_version; do
        if [ -n "$old_version" ]; then
            echo "  Deactivating: $old_version"
            aws dynamodb update-item \
                --table-name ${AWS_DYNAMODB_TABLE} \
                --key '{
                    "app_id": {"S": "'${APP_ID}'"},
                    "platform_version": {"S": "'${old_version}'"}
                }' \
                --update-expression "SET is_active = :inactive" \
                --expression-attribute-values '{":inactive": {"BOOL": false}}' \
                --region ${AWS_REGION} > /dev/null 2>&1
        fi
    done
fi

# 새 버전 메타데이터 저장
if [ "$DRY_RUN" = true ]; then
    echo -e "${CYAN}[DRY RUN] Would save metadata to DynamoDB:${NC}"
    echo "  app_id: ${APP_ID}"
    echo "  platform_version: ${PLATFORM_VERSION}"
    echo "  version_name: ${NEW_VERSION}"
    echo "  release_notes: ${RELEASE_NOTES}"
else
    echo -e "${YELLOW}💾 Saving new version metadata...${NC}"
    
    aws dynamodb put-item \
        --table-name ${AWS_DYNAMODB_TABLE} \
        --item '{
            "app_id": {"S": "'${APP_ID}'"},
            "platform_version": {"S": "'${PLATFORM_VERSION}'"},
            "platform": {"S": "android"},
            "version_name": {"S": "'${NEW_VERSION}'"},
            "apk_filename": {"S": "'${APK_FILENAME}'"},
            "apk_size": {"N": "'${APK_SIZE_KB}'"},
            "created_at": {"S": "'${TIMESTAMP}'"},
            "release_date": {"S": "'${TIMESTAMP}'"},
            "download_url": {"S": "'${S3_URL}'"},
            "download_count": {"N": "0"},
            "is_active": {"BOOL": true},
            "release_notes": {"S": "'${RELEASE_NOTES}'"}
        }' \
        --region ${AWS_REGION}
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Metadata saved successfully!${NC}"
    else
        echo -e "${RED}❌ Failed to save metadata!${NC}"
        exit 1
    fi
fi

# 5. Git 커밋 (선택사항)
echo -e "\n${BLUE}Step 5: Git Operations${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ "$DRY_RUN" = true ]; then
    echo -e "${CYAN}[DRY RUN] Suggested git commands:${NC}"
    echo "  git add -A"
    echo "  git commit -m \"chore: release v${NEW_VERSION} - ${RELEASE_NOTES}\""
    echo "  git tag v${NEW_VERSION}"
    echo "  git push origin main --tags"
else
    echo -e "${YELLOW}💡 Suggested git commands:${NC}"
    echo -e "${CYAN}git add -A${NC}"
    echo -e "${CYAN}git commit -m \"chore: release v${NEW_VERSION} - ${RELEASE_NOTES}\"${NC}"
    echo -e "${CYAN}git tag v${NEW_VERSION}${NC}"
    echo -e "${CYAN}git push origin main --tags${NC}"
    echo ""
    echo -e "${YELLOW}Do you want to execute these commands? (y/n):${NC}"
    read -r EXECUTE_GIT
    
    if [[ "$EXECUTE_GIT" == "y" ]] || [[ "$EXECUTE_GIT" == "Y" ]]; then
        git add -A
        git commit -m "chore: release v${NEW_VERSION} - ${RELEASE_NOTES}"
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
echo -e "${GREEN}       🎉 Release Pipeline Complete! 🎉${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}📊 Summary:${NC}"
echo -e "  • Version: ${CYAN}${NEW_VERSION}${NC} (Code: ${VERSION_CODE})"
echo -e "  • APK Size: ${CYAN}$((APK_SIZE_KB / 1024)) MB${NC} (${APK_SIZE_KB} KB)"
echo -e "  • S3 Location: ${CYAN}s3://${AWS_S3_BUCKET}/${S3_KEY}${NC}"
echo -e "  • Download URL: ${CYAN}${S3_URL}${NC}"
echo -e "  • DynamoDB Key: ${CYAN}${APP_ID} / ${PLATFORM_VERSION}${NC}"
echo -e "  • Release Notes: ${CYAN}${RELEASE_NOTES}${NC}"
echo -e "  • Status: ${GREEN}Active${NC}"
echo ""

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}⚠️  This was a dry run. No actual changes were made.${NC}"
    echo -e "${YELLOW}    Remove --dry-run flag to execute the pipeline.${NC}"
fi

echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"