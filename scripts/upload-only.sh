#!/bin/bash

# APK 빌드 및 업로드 전용 스크립트 (버전 업데이트 없음)
# 현재 버전으로 APK를 빌드하고 S3에 업로드합니다

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

# 함수: 사용법 출력
show_usage() {
    echo -e "${CYAN}Usage:${NC}"
    echo "  $0 [options]"
    echo ""
    echo -e "${CYAN}Options:${NC}"
    echo "  --release-notes \"notes\"  릴리스 노트 (선택사항)"
    echo "  --skip-build            빌드 건너뛰기"
    echo "  --dry-run               실제 작업 수행하지 않고 시뮬레이션만 실행"
    echo ""
    echo -e "${CYAN}Examples:${NC}"
    echo "  $0 --release-notes \"테스트 빌드\""
    echo "  $0 --skip-build"
    echo "  $0 --dry-run"
}

# 파라미터 파싱
RELEASE_NOTES=""
SKIP_BUILD=false
DRY_RUN=false

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
        RELEASE_NOTES="테스트 빌드 (버전 업데이트 없음)"
    else
        RELEASE_NOTES="$USER_NOTES"
    fi
fi

echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}       📤 Unit Management Upload Only Pipeline 📤${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# 현재 버전 정보 읽기
CURRENT_VERSION=$(grep '"version"' package.json | head -1 | cut -d'"' -f4)
VERSION_CODE=$(echo $CURRENT_VERSION | awk -F. '{print $1*10000 + $2*100 + $3}')

echo -e "${YELLOW}📌 Current version: ${CURRENT_VERSION} (code: ${VERSION_CODE})${NC}"
echo -e "${YELLOW}📝 Release notes: ${RELEASE_NOTES}${NC}"
echo ""

# 1. APK 빌드
if [ "$SKIP_BUILD" = false ]; then
    echo -e "${BLUE}Step 1: Building APK${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    if [ "$DRY_RUN" = true ]; then
        echo -e "${CYAN}[DRY RUN] Would build APK...${NC}"
        APK_FILE="android/app/unitmgmt-v${CURRENT_VERSION}-release.apk"
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
                FINAL_APK_NAME="unitmgmt-v${CURRENT_VERSION}-release.apk"
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
    echo -e "${YELLOW}⏭ Skipping build step${NC}"
    APK_FILE="android/app/unitmgmt-v${CURRENT_VERSION}-release.apk"
    if [ -f "$APK_FILE" ]; then
        APK_SIZE_BYTES=$(stat -f%z "$APK_FILE" 2>/dev/null || stat -c%s "$APK_FILE" 2>/dev/null)
    else
        echo -e "${RED}❌ APK file not found: $APK_FILE${NC}"
        exit 1
    fi
fi

# 2. S3 업로드
echo -e "\n${BLUE}Step 2: Upload to S3${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

S3_KEY="${AWS_S3_PREFIX}/unitmgmt_${CURRENT_VERSION}.apk"
S3_URL="https://${AWS_S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${S3_KEY}"

if [ "$DRY_RUN" = true ]; then
    echo -e "${CYAN}[DRY RUN] Would upload to: s3://${AWS_S3_BUCKET}/${S3_KEY}${NC}"
else
    echo -e "${YELLOW}📤 Uploading APK to S3...${NC}"
    
    # APK 파일 크기 가져오기 (MB 단위로 표시)
    APK_SIZE_MB=$((APK_SIZE_BYTES / 1024 / 1024))
    echo -e "${CYAN}📊 File size: ${APK_SIZE_MB}MB${NC}"
    
    # S3 업로드 (progress는 일부 AWS CLI 버전에서만 지원)
    echo -e "${CYAN}🔄 Uploading... Please wait${NC}"
    aws s3 cp "$APK_FILE" "s3://${AWS_S3_BUCKET}/${S3_KEY}" \
        --region ${AWS_REGION} \
        --metadata "version=${CURRENT_VERSION},versionCode=${VERSION_CODE}" \
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

# 3. DynamoDB 메타데이터 저장 (선택사항)
echo -e "\n${BLUE}Step 3: Update DynamoDB Metadata (Optional)${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "${YELLOW}💡 Save metadata to DynamoDB? (y/n):${NC}"
if [ "$DRY_RUN" = true ]; then
    SAVE_METADATA="n"
    echo -e "${CYAN}[DRY RUN] Would ask for metadata save confirmation${NC}"
else
    read -r SAVE_METADATA
fi

if [[ "$SAVE_METADATA" == "y" ]] || [[ "$SAVE_METADATA" == "Y" ]]; then
    # 메타데이터 준비
    DB_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    RELEASE_DATE=$(date -u +"%Y-%m-%d")
    APK_FILENAME="unitmgmt_${CURRENT_VERSION}.apk"
    
    if [ "$DRY_RUN" = true ]; then
        echo -e "${CYAN}[DRY RUN] Would save metadata to DynamoDB:${NC}"
        echo "  app_id: ${APP_ID}"
        echo "  version_code: ${VERSION_CODE}"
        echo "  version_name: ${CURRENT_VERSION}"
        echo "  filename: ${APK_FILENAME}"
        echo "  file_size: ${APK_SIZE_BYTES}"
        echo "  release_notes: ${RELEASE_NOTES}"
    else
        echo -e "${YELLOW}💾 Saving metadata to DynamoDB...${NC}"
        
        aws dynamodb put-item \
            --table-name ${AWS_DYNAMODB_TABLE} \
            --item '{
                "app_id": {"S": "'${APP_ID}'"},
                "version_code": {"N": "'${VERSION_CODE}'"},
                "created_at": {"S": "'${DB_TIMESTAMP}'"},
                "download_count": {"N": "0"},
                "download_url": {"S": "'${S3_URL}'"},
                "file_size": {"N": "'${APK_SIZE_BYTES}'"},
                "filename": {"S": "'${APK_FILENAME}'"},
                "is_active": {"BOOL": false},
                "platform": {"S": "android"},
                "release_date": {"S": "'${RELEASE_DATE}'"},
                "release_notes": {"S": "'${RELEASE_NOTES}'"},
                "version_name": {"S": "'${CURRENT_VERSION}'"}
            }' \
            --region ${AWS_REGION}
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Metadata saved successfully!${NC}"
        else
            echo -e "${RED}❌ Failed to save metadata!${NC}"
        fi
    fi
else
    echo -e "${YELLOW}⏭ Skipping metadata save${NC}"
fi

# 완료 요약
echo -e "\n${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}       🎉 Upload Pipeline Complete! 🎉${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}📊 Summary:${NC}"
echo -e "  • Version: ${CYAN}${CURRENT_VERSION}${NC} (Code: ${VERSION_CODE}) - ${YELLOW}NO VERSION UPDATE${NC}"
echo -e "  • APK Size: ${CYAN}$((APK_SIZE_BYTES / 1024 / 1024)) MB${NC}"
echo -e "  • Filename: ${CYAN}${APK_FILENAME}${NC}"
echo -e "  • S3 Location: ${CYAN}s3://${AWS_S3_BUCKET}/${S3_KEY}${NC}"
echo -e "  • Download URL: ${CYAN}${S3_URL}${NC}"
echo -e "  • Release Notes: ${CYAN}${RELEASE_NOTES}${NC}"
echo -e "  • Build Type: ${YELLOW}Test Build${NC}"
echo ""

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}⚠️  This was a dry run. No actual changes were made.${NC}"
    echo -e "${YELLOW}    Remove --dry-run flag to execute the pipeline.${NC}"
fi

echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"