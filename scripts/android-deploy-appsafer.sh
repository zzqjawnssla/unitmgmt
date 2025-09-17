#!/bin/bash

# AppSafer 적용 APK 최종 배포 스크립트
# AppSafer가 적용된 APK를 재서명하고 AWS S3 업로드 및 DynamoDB 업데이트

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
    echo -e "${YELLOW}Production deployment should use ENV_MODE=prd${NC}"
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
    echo "  $0 [options]"
    echo ""
    echo -e "${CYAN}Options:${NC}"
    echo "  --release-notes \"notes\"  릴리스 노트 (선택사항)"
    echo "  --dry-run               실제 작업 수행하지 않고 시뮬레이션만 실행"
    echo "  --help|-h               도움말 출력"
    echo ""
    echo -e "${CYAN}Examples:${NC}"
    echo "  $0 --release-notes \"AppSafer 적용 및 보안 강화\""
    echo "  $0 --dry-run"
}

# 파라미터 파싱
RELEASE_NOTES=""
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --release-notes)
            RELEASE_NOTES="$2"
            shift 2
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

echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}        📱 Android AppSafer Deploy Pipeline 📱${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# 현재 버전 정보 읽기
CURRENT_VERSION=$(grep '"version"' package.json | head -1 | cut -d'"' -f4)
VERSION_CODE=$(echo $CURRENT_VERSION | awk -F. '{print $1*10000 + $2*100 + $3}')

echo -e "${YELLOW}📌 Current version: ${CURRENT_VERSION} (code: ${VERSION_CODE})${NC}"

# AppSafer 적용된 APK 파일 확인
APPSAFER_APK="android/downloaded-apks/com.unitmgmt.apk"

echo -e "\n${BLUE}Step 1: Validate AppSafer APK${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ ! -f "$APPSAFER_APK" ]; then
    echo -e "${RED}❌ Error: AppSafer APK not found: ${APPSAFER_APK}${NC}"
    echo -e "${RED}   Please follow these steps:${NC}"
    echo -e "${YELLOW}   1. Build APK: npm run build:android:release${NC}"
    echo -e "${YELLOW}   2. Upload APK to AppSafer manually${NC}"
    echo -e "${YELLOW}   3. Download processed APK to: ${APPSAFER_APK}${NC}"
    echo -e "${YELLOW}   4. Run this script again${NC}"
    exit 1
fi

# AppSafer APK 정보
APPSAFER_SIZE_BYTES=$(stat -f%z "$APPSAFER_APK" 2>/dev/null || stat -c%s "$APPSAFER_APK" 2>/dev/null)
APPSAFER_SIZE_MB=$((APPSAFER_SIZE_BYTES / 1024 / 1024))

echo -e "${GREEN}✅ AppSafer APK found${NC}"
echo -e "  • File: ${CYAN}${APPSAFER_APK}${NC}"
echo -e "  • Size: ${CYAN}${APPSAFER_SIZE_MB} MB${NC}"

# 릴리스 노트 입력
if [ -z "$RELEASE_NOTES" ]; then
    echo -e "\n${YELLOW}📝 릴리스 노트를 입력하세요:${NC}"
    echo -e "${CYAN}기본값: AppSafer 적용 및 보안 강화 - v${CURRENT_VERSION}${NC}"
    echo -e "${YELLOW}릴리스 노트 (엔터: 기본값 사용): ${NC}"
    read -r USER_NOTES
    if [ -z "$USER_NOTES" ]; then
        RELEASE_NOTES="AppSafer 적용 및 보안 강화 - v${CURRENT_VERSION}"
    else
        RELEASE_NOTES="$USER_NOTES"
    fi
fi

echo -e "${CYAN}📝 Release notes: ${RELEASE_NOTES}${NC}"

# 2. zipalign 및 서명
echo -e "\n${BLUE}Step 2: Re-align and Sign APK${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

FINAL_APK_NAME="unitmgmt-v${CURRENT_VERSION}.apk"
FINAL_APK_PATH="android/app/${FINAL_APK_NAME}"
ALIGNED_APK_PATH="android/app/unitmgmt-v${CURRENT_VERSION}-aligned.apk"

if [ "$DRY_RUN" = true ]; then
    echo -e "${CYAN}[DRY RUN] Would re-align and sign APK...${NC}"
    echo -e "  • Input: ${APPSAFER_APK}"
    echo -e "  • Aligned: ${ALIGNED_APK_PATH}"
    echo -e "  • Final: ${FINAL_APK_PATH}"
else
    # Android SDK 경로 확인 (ANDROID_HOME 또는 ANDROID_SDK_ROOT)
    ANDROID_SDK_PATH="$ANDROID_HOME"
    if [ -z "$ANDROID_SDK_PATH" ] && [ -n "$ANDROID_SDK_ROOT" ]; then
        ANDROID_SDK_PATH="$ANDROID_SDK_ROOT"
    fi

    if [ -z "$ANDROID_SDK_PATH" ]; then
        echo -e "${RED}❌ Error: ANDROID_HOME or ANDROID_SDK_ROOT environment variable not set${NC}"
        exit 1
    fi

    # build-tools 최신 버전 찾기
    BUILD_TOOLS_VERSION=$(find "$ANDROID_SDK_PATH/build-tools" -maxdepth 1 -type d -name "*.*.*" | sort -V | tail -1 | xargs basename)
    if [ -z "$BUILD_TOOLS_VERSION" ]; then
        echo -e "${RED}❌ Error: No build-tools found in Android SDK${NC}"
        exit 1
    fi

    ZIPALIGN="$ANDROID_SDK_PATH/build-tools/$BUILD_TOOLS_VERSION/zipalign"
    APKSIGNER="$ANDROID_SDK_PATH/build-tools/$BUILD_TOOLS_VERSION/apksigner"

    if [ ! -f "$ZIPALIGN" ] || [ ! -f "$APKSIGNER" ]; then
        echo -e "${RED}❌ Error: zipalign or apksigner not found in build-tools/$BUILD_TOOLS_VERSION${NC}"
        exit 1
    fi

    echo -e "${CYAN}  • Using build-tools: ${BUILD_TOOLS_VERSION}${NC}"

    # keystore.properties 파일에서 설정 읽기
    KEYSTORE_PROPS="android/app/keystore.properties"
    if [ ! -f "$KEYSTORE_PROPS" ]; then
        echo -e "${RED}❌ Error: keystore.properties not found: $KEYSTORE_PROPS${NC}"
        exit 1
    fi

    # keystore.properties에서 값 읽기
    STORE_FILE=$(grep "storeFile=" "$KEYSTORE_PROPS" | cut -d'=' -f2)
    KEY_ALIAS=$(grep "keyAlias=" "$KEYSTORE_PROPS" | cut -d'=' -f2)
    STORE_PASSWORD=$(grep "storePassword=" "$KEYSTORE_PROPS" | cut -d'=' -f2)
    KEY_PASSWORD=$(grep "keyPassword=" "$KEYSTORE_PROPS" | cut -d'=' -f2)

    # keystore 파일 경로
    KEYSTORE_PATH="android/app/$STORE_FILE"
    if [ ! -f "$KEYSTORE_PATH" ]; then
        echo -e "${RED}❌ Error: Keystore file not found: $KEYSTORE_PATH${NC}"
        echo -e "${YELLOW}   Please check your keystore.properties file${NC}"
        exit 1
    fi

    echo -e "${CYAN}  • Keystore: ${STORE_FILE}${NC}"
    echo -e "${CYAN}  • Key Alias: ${KEY_ALIAS}${NC}"

    # ① zipalign (정렬) - 프로젝트 루트에서 수행
    echo -e "${YELLOW}🔧 Re-aligning APK...${NC}"
    "$ZIPALIGN" -p -f 4 \
        "$APPSAFER_APK" \
        "$ALIGNED_APK_PATH"

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ APK aligned successfully${NC}"
    else
        echo -e "${RED}❌ APK alignment failed${NC}"
        exit 1
    fi

    # ② apksigner (V1/V2/V3 모두 활성화)
    echo -e "${YELLOW}🔐 Signing APK with V1/V2/V3...${NC}"
    "$APKSIGNER" sign \
        --ks "$KEYSTORE_PATH" \
        --ks-key-alias "$KEY_ALIAS" \
        --ks-pass pass:"$STORE_PASSWORD" \
        --key-pass pass:"$KEY_PASSWORD" \
        --v1-signing-enabled true \
        --v2-signing-enabled true \
        --v3-signing-enabled true \
        --out "$FINAL_APK_PATH" \
        "$ALIGNED_APK_PATH"

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ APK signed successfully${NC}"

        # ③ 검증
        echo -e "${YELLOW}🔍 Verifying APK signature...${NC}"
        "$APKSIGNER" verify --verbose --print-certs "$FINAL_APK_PATH"

        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ APK signature verification passed${NC}"
        else
            echo -e "${YELLOW}⚠️ Signature verification warning (APK may still be valid)${NC}"
        fi

        # 임시 aligned 파일 삭제
        rm -f "$ALIGNED_APK_PATH"
    else
        echo -e "${RED}❌ APK signing failed${NC}"
        exit 1
    fi

    # 최종 APK 크기
    FINAL_SIZE_BYTES=$(stat -f%z "$FINAL_APK_PATH" 2>/dev/null || stat -c%s "$FINAL_APK_PATH" 2>/dev/null)
    FINAL_SIZE_MB=$((FINAL_SIZE_BYTES / 1024 / 1024))

    echo -e "${GREEN}✅ Final APK created: ${FINAL_APK_NAME}${NC}"
    echo -e "  • Size: ${CYAN}${FINAL_SIZE_MB} MB${NC}"
fi

# 3. S3 업로드
echo -e "\n${BLUE}Step 3: Upload to S3${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

S3_KEY="${AWS_S3_PREFIX}/${FINAL_APK_NAME}"
S3_URL="https://${AWS_S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${S3_KEY}"

if [ "$DRY_RUN" = true ]; then
    echo -e "${CYAN}[DRY RUN] Would upload to: s3://${AWS_S3_BUCKET}/${S3_KEY}${NC}"
else
    echo -e "${YELLOW}📤 Uploading APK to S3...${NC}"
    echo -e "${CYAN}📊 File size: ${FINAL_SIZE_MB}MB${NC}"

    aws s3 cp "$FINAL_APK_PATH" "s3://${AWS_S3_BUCKET}/${S3_KEY}" \
        --region ${AWS_REGION} \
        --metadata "version=${CURRENT_VERSION},versionCode=${VERSION_CODE},appSafer=true" \
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

# 4. DynamoDB 메타데이터 저장
echo -e "\n${BLUE}Step 4: Update DynamoDB Metadata${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
DB_FILENAME="${FINAL_APK_NAME}"

if [ "$DRY_RUN" = false ]; then
    FINAL_SIZE_BYTES=$(stat -f%z "$FINAL_APK_PATH" 2>/dev/null || stat -c%s "$FINAL_APK_PATH" 2>/dev/null)
fi

# 이전 활성 버전 비활성화
if [ "$DRY_RUN" = true ]; then
    echo -e "${CYAN}[DRY RUN] Would deactivate previous active versions${NC}"
else
    echo -e "${YELLOW}🔄 Deactivating previous active versions...${NC}"

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
    jq -r '.Items[] | .version_code.N' | \
    while read -r old_version_code; do
        if [ -n "$old_version_code" ]; then
            echo "  Deactivating version: $old_version_code"
            aws dynamodb update-item \
                --table-name ${AWS_DYNAMODB_TABLE} \
                --key '{
                    "app_id": {"S": "'${APP_ID}'"},
                    "version_code": {"N": "'${old_version_code}'"}
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
    echo "  version_name: ${CURRENT_VERSION}"
    echo "  release_notes: ${RELEASE_NOTES}"
    echo "  appsafer_applied: true"
else
    echo -e "${YELLOW}💾 Saving new version metadata...${NC}"

    cat > /tmp/dynamodb_item.json << EOF
{
    "app_id": {"S": "${APP_ID}"},
    "version_code": {"N": "${VERSION_CODE}"},
    "platform": {"S": "android"},
    "version_name": {"S": "${CURRENT_VERSION}"},
    "filename": {"S": "${DB_FILENAME}"},
    "file_size": {"N": "${FINAL_SIZE_BYTES}"},
    "created_at": {"S": "${TIMESTAMP}"},
    "release_date": {"S": "$(date -u +"%Y-%m-%d")"},
    "download_url": {"S": "${S3_URL}"},
    "download_count": {"N": "0"},
    "is_active": {"BOOL": true},
    "release_notes": {"S": "${RELEASE_NOTES}"},
    "appsafer_applied": {"BOOL": true}
}
EOF

    aws dynamodb put-item \
        --table-name ${AWS_DYNAMODB_TABLE} \
        --item file:///tmp/dynamodb_item.json \
        --region ${AWS_REGION}

    rm -f /tmp/dynamodb_item.json

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Metadata saved successfully!${NC}"
    else
        echo -e "${RED}❌ Failed to save metadata!${NC}"
        exit 1
    fi
fi

# 완료 요약
echo -e "\n${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}       🎉 AppSafer Deploy Complete! 🎉${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

if [ "$DRY_RUN" = false ]; then
    echo -e "${GREEN}📊 Summary:${NC}"
    echo -e "  • Version: ${CYAN}${CURRENT_VERSION}${NC} (Code: ${VERSION_CODE})"
    echo -e "  • APK Size: ${CYAN}${FINAL_SIZE_MB} MB${NC}"
    echo -e "  • Final APK: ${CYAN}${FINAL_APK_PATH}${NC}"
    echo -e "  • S3 Location: ${CYAN}s3://${AWS_S3_BUCKET}/${S3_KEY}${NC}"
    echo -e "  • Download URL: ${CYAN}${S3_URL}${NC}"
    echo -e "  • Release Notes: ${CYAN}${RELEASE_NOTES}${NC}"
    echo -e "  • AppSafer Applied: ${GREEN}✅ Yes${NC}"
    echo -e "  • Status: ${GREEN}Active${NC}"
else
    echo -e "${YELLOW}⚠️  This was a dry run. No actual changes were made.${NC}"
    echo -e "${YELLOW}    Remove --dry-run flag to execute the deployment.${NC}"
fi

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"