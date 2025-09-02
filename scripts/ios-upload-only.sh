#!/bin/bash

# iOS 업로드 전용 스크립트
# 버전 업데이트 없이 ios/distribution 내 파일들만 S3에 업로드

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
    echo "  $0 [options]"
    echo ""
    echo -e "${CYAN}Options:${NC}"
    echo "  --bundle-id ID          Bundle ID (선택사항, 기본값: com.sko.unitmgmt)"
    echo "  --release-notes \"notes\"  릴리스 노트 (선택사항)"
    echo "  --dry-run               실제 업로드하지 않고 시뮬레이션만 실행"
    echo ""
    echo -e "${CYAN}Examples:${NC}"
    echo "  $0 --release-notes \"iOS 긴급 패치\""
    echo "  $0 --dry-run"
}

# Enterprise In-House manifest.plist 생성 함수
generate_manifest_plist() {
    local version="$1"
    local bundle_id="$2" 
    local ipa_url="$3"
    local icon57_url="$4"
    local icon512_url="$5"
    local manifest_path="$6"
    
    cat > "$manifest_path" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>items</key>
    <array>
        <dict>
            <key>assets</key>
            <array>
                <dict>
                    <key>kind</key>
                    <string>software-package</string>
                    <key>url</key>
                    <string>${ipa_url}</string>
                </dict>
                <dict>
                    <key>kind</key>
                    <string>display-image</string>
                    <key>url</key>
                    <string>${icon57_url}</string>
                </dict>
                <dict>
                    <key>kind</key>
                    <string>full-size-image</string>
                    <key>url</key>
                    <string>${icon512_url}</string>
                </dict>
            </array>
            <key>metadata</key>
            <dict>
                <key>bundle-identifier</key>
                <string>${bundle_id}</string>
                <key>bundle-version</key>
                <string>${version}</string>
                <key>kind</key>
                <string>software</string>
                <key>platform-identifier</key>
                <string>com.apple.platform.iphoneos</string>
                <key>title</key>
                <string>유니트관리시스템</string>
                <key>subtitle</key>
                <string>Enterprise In-House Distribution</string>
            </dict>
        </dict>
    </array>
</dict>
</plist>
EOF
}

# 파라미터 파싱
BUNDLE_ID="${IOS_BUNDLE_ID:-com.sko.unitmgmt}"
RELEASE_NOTES=""
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --bundle-id)
            BUNDLE_ID="$2"
            shift 2
            ;;
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
echo -e "${CYAN}          📱 iOS Unit Management Upload Only Pipeline 📱${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# 현재 버전 정보 읽기
CURRENT_VERSION=$(grep '"version"' package.json | head -1 | cut -d'"' -f4)
VERSION_CODE=$(echo $CURRENT_VERSION | awk -F. '{print $1*10000 + $2*100 + $3}')

echo -e "${YELLOW}📌 Current version: ${CURRENT_VERSION} (${VERSION_CODE})${NC}"

# 배포 파일 확인 및 자동 복사
DISTRIBUTION_DIR="ios/distribution"
SOURCE_IPA_PATH="ios/App/unitmgmt.ipa"
IPA_FILENAME="unitmgmt_v${CURRENT_VERSION}.ipa"
DIST_IPA_PATH="${DISTRIBUTION_DIR}/${IPA_FILENAME}"

# 소스 IPA 파일 확인 및 검증 (S3 업로드 전 필수 검증)
echo -e "${YELLOW}🔍 Pre-upload validation...${NC}"

if [ ! -f "$SOURCE_IPA_PATH" ]; then
    echo -e "${RED}❌ Error: Source IPA file not found: ${SOURCE_IPA_PATH}${NC}"
    echo -e "${RED}   Please build the iOS app in Xcode first${NC}"
    exit 1
fi

# IPA 내부 버전 검증 (S3 업로드 전 필수!)
echo -e "${YELLOW}🔍 Verifying IPA version consistency...${NC}"
IPA_TEMP_DIR="/tmp/ipa_check_$$"
mkdir -p "$IPA_TEMP_DIR"
cd "$IPA_TEMP_DIR"

unzip -q "$OLDPWD/$SOURCE_IPA_PATH" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    IPA_VERSION=$(plutil -p Payload/unitmgmt.app/Info.plist | grep "CFBundleShortVersionString" | cut -d'"' -f4)
    IPA_BUNDLE_ID=$(plutil -p Payload/unitmgmt.app/Info.plist | grep "CFBundleIdentifier" | cut -d'"' -f4)
    
    echo -e "  • Package.json version: ${CYAN}${CURRENT_VERSION}${NC}"
    echo -e "  • IPA internal version: ${CYAN}${IPA_VERSION}${NC}"
    echo -e "  • IPA Bundle ID: ${CYAN}${IPA_BUNDLE_ID}${NC}"
    
    # 버전 불일치 검사 - 업로드 중단!
    if [ "$CURRENT_VERSION" != "$IPA_VERSION" ]; then
        echo -e "${RED}❌ Version Mismatch Detected! Upload BLOCKED!${NC}"
        echo -e "${RED}   Package.json: ${CURRENT_VERSION}${NC}"
        echo -e "${RED}   IPA Internal: ${IPA_VERSION}${NC}"
        echo -e "${YELLOW}💡 Solution: Please rebuild IPA in Xcode with correct version${NC}"
        echo -e "${YELLOW}   1. Clean Build Folder in Xcode (⇧⌘K)${NC}"
        echo -e "${YELLOW}   2. Archive again with version ${CURRENT_VERSION}${NC}"
        echo -e "${YELLOW}   3. Re-run this script after fixing the version${NC}"
        
        cd "$OLDPWD"
        rm -rf "$IPA_TEMP_DIR"
        exit 1
    fi
    
    # Bundle ID 검사
    if [ "$BUNDLE_ID" != "$IPA_BUNDLE_ID" ]; then
        echo -e "${YELLOW}⚠️ Bundle ID Mismatch Warning:${NC}"
        echo -e "${YELLOW}   Expected: ${BUNDLE_ID}${NC}"
        echo -e "${YELLOW}   IPA has: ${IPA_BUNDLE_ID}${NC}"
        echo -e "${YELLOW}   Using IPA's Bundle ID: ${IPA_BUNDLE_ID}${NC}"
        BUNDLE_ID="$IPA_BUNDLE_ID"
    fi
    
    echo -e "${GREEN}✅ IPA validation passed - safe to upload${NC}"
    
    # 검증된 버전으로 변수 업데이트
    CURRENT_VERSION="$IPA_VERSION"
    VERSION_CODE=$(echo $CURRENT_VERSION | awk -F. '{print $1*10000 + $2*100 + $3}')
else
    echo -e "${RED}❌ Could not verify IPA version (extraction failed)${NC}"
    echo -e "${RED}   Upload blocked for safety${NC}"
    cd "$OLDPWD"
    rm -rf "$IPA_TEMP_DIR"
    exit 1
fi

cd "$OLDPWD"
rm -rf "$IPA_TEMP_DIR"

# distribution 디렉토리 생성 (검증 통과 후)
mkdir -p "$DISTRIBUTION_DIR"

# IPA 파일 복사 및 이름 변경
echo -e "${YELLOW}📂 Copying and renaming IPA file...${NC}"
echo -e "  • Source: ${CYAN}${SOURCE_IPA_PATH}${NC}"
echo -e "  • Target: ${CYAN}${DIST_IPA_PATH}${NC}"

# 기존 파일이 있으면 제거
if [ -f "$DIST_IPA_PATH" ]; then
    rm "$DIST_IPA_PATH"
    echo -e "  • Removed existing file"
fi

# IPA 파일 복사
cp "$SOURCE_IPA_PATH" "$DIST_IPA_PATH"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ IPA file prepared successfully${NC}"
else
    echo -e "${RED}❌ Failed to copy IPA file${NC}"
    exit 1
fi

# 릴리스 노트 설정
if [ -z "$RELEASE_NOTES" ]; then
    # .env 파일에서 USER_NOTES 확인
    if [ -n "$USER_NOTES" ]; then
        RELEASE_NOTES="$USER_NOTES"
    else
        # 사용자에게 릴리스 노트 입력 여부 확인
        echo ""
        echo -e "${YELLOW}📝 릴리스 노트를 입력하시겠습니까?${NC}"
        echo -e "${CYAN}기본값: iOS 업데이트 - v${CURRENT_VERSION}${NC}"
        read -p "릴리스 노트를 입력하세요 (엔터: 기본값 사용): " USER_INPUT
        
        if [ -n "$USER_INPUT" ]; then
            RELEASE_NOTES="$USER_INPUT"
        else
            RELEASE_NOTES="iOS 업데이트 - v${CURRENT_VERSION}"
        fi
    fi
fi

# 파일 정보
IPA_SIZE_BYTES=$(stat -f%z "$DIST_IPA_PATH" 2>/dev/null || stat -c%s "$DIST_IPA_PATH" 2>/dev/null)
IPA_SIZE_MB=$((IPA_SIZE_BYTES / 1024 / 1024))

echo -e "${GREEN}📱 Distribution Files:${NC}"
echo -e "  • IPA: ${CYAN}${DIST_IPA_PATH}${NC} (${IPA_SIZE_MB} MB)"
echo -e "  • Bundle ID: ${CYAN}${BUNDLE_ID}${NC}"
echo -e "  • Release Notes: ${CYAN}${RELEASE_NOTES}${NC}"

# S3 업로드
echo -e "\n${BLUE}Step 1: Upload to S3${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# S3 키 구성
S3_IPA_KEY="${AWS_S3_IOS_PREFIX}/${IPA_FILENAME}"
S3_MANIFEST_KEY="${AWS_S3_IOS_PREFIX}/manifest.plist"
S3_ICON57_KEY="${AWS_S3_IOS_PREFIX}/app-icon-57.png"
S3_ICON512_KEY="${AWS_S3_IOS_PREFIX}/app-icon-512.png"

# S3 URL 구성
S3_URL="https://${AWS_S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${S3_IPA_KEY}"
MANIFEST_S3_URL="https://${AWS_S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${S3_MANIFEST_KEY}"
ICON57_S3_URL="https://${AWS_S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${S3_ICON57_KEY}"
ICON512_S3_URL="https://${AWS_S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${S3_ICON512_KEY}"

if [ "$DRY_RUN" = true ]; then
    echo -e "${CYAN}[DRY RUN] Would upload files:${NC}"
    echo -e "  • IPA: s3://${AWS_S3_BUCKET}/${S3_IPA_KEY}"
    echo -e "  • Manifest: s3://${AWS_S3_BUCKET}/${S3_MANIFEST_KEY}"
    echo -e "  • Icon 57px: s3://${AWS_S3_BUCKET}/${S3_ICON57_KEY}"
    echo -e "  • Icon 512px: s3://${AWS_S3_BUCKET}/${S3_ICON512_KEY}"
else
    echo -e "${YELLOW}📤 Uploading iOS distribution files to S3...${NC}"
    
    # IPA 업로드
    echo -e "${CYAN}🔄 Uploading IPA... Please wait${NC}"
    aws s3 cp "$DIST_IPA_PATH" "s3://${AWS_S3_BUCKET}/${S3_IPA_KEY}" \
        --region ${AWS_REGION} \
        --metadata "version=${CURRENT_VERSION},versionCode=${VERSION_CODE},platform=ios" \
        --cli-read-timeout 0 \
        --cli-connect-timeout 60
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ IPA upload successful!${NC}"
    else
        echo -e "${RED}❌ IPA upload failed!${NC}"
        exit 1
    fi
    
    echo -e "${CYAN}ℹ️ Using existing icon files from S3${NC}"
    
    # manifest.plist 생성 및 업로드
    MANIFEST_PATH="${DISTRIBUTION_DIR}/manifest.plist"
    echo -e "${CYAN}🔄 Generating and uploading manifest.plist...${NC}"
    generate_manifest_plist "$CURRENT_VERSION" "$BUNDLE_ID" "$S3_URL" "$ICON57_S3_URL" "$ICON512_S3_URL" "$MANIFEST_PATH"
    
    aws s3 cp "$MANIFEST_PATH" "s3://${AWS_S3_BUCKET}/${S3_MANIFEST_KEY}" \
        --region ${AWS_REGION} \
        --content-type "application/xml" \
        --cli-read-timeout 0 \
        --cli-connect-timeout 60
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Manifest upload successful!${NC}"
    else
        echo -e "${RED}❌ Manifest upload failed!${NC}"
        exit 1
    fi
fi

# DynamoDB 메타데이터 업데이트
echo -e "\n${BLUE}Step 2: Update DynamoDB Metadata${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

IOS_TABLE="${AWS_DYNAMODB_IOS_TABLE:-mobile-app-ios-versions}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

if [ "$DRY_RUN" = true ]; then
    echo -e "${CYAN}[DRY RUN] Would update iOS metadata in DynamoDB${NC}"
else
    echo -e "${YELLOW}💾 Updating iOS version metadata (no version change)...${NC}"
    
    # 1단계: 기존 모든 버전을 is_active = false로 설정
    echo -e "${CYAN}🔄 Deactivating previous iOS versions...${NC}"
    aws dynamodb scan \
        --table-name ${IOS_TABLE} \
        --filter-expression "app_id = :appId AND is_active = :active" \
        --expression-attribute-values '{":appId":{"S":"'${APP_ID}'"},":active":{"BOOL":true}}' \
        --region ${AWS_REGION} \
        --output json | \
    jq -r '.Items[] | [.app_id.S, .version_code.N] | @tsv' | \
    while IFS=$'\t' read -r app_id version_code; do
        if [ -n "$app_id" ] && [ -n "$version_code" ]; then
            echo -e "${YELLOW}  • Deactivating version ${version_code}...${NC}"
            aws dynamodb update-item \
                --table-name ${IOS_TABLE} \
                --key "{\"app_id\":{\"S\":\"${app_id}\"},\"version_code\":{\"N\":\"${version_code}\"}}" \
                --update-expression "SET is_active = :inactive" \
                --expression-attribute-values '{":inactive":{"BOOL":false}}' \
                --region ${AWS_REGION} \
                --no-cli-pager > /dev/null 2>&1
        fi
    done
    
    # 2단계: 현재 버전을 is_active = true로 설정하여 등록
    echo -e "${CYAN}🔄 Activating current version ${VERSION_CODE}...${NC}"
    
    DB_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
    INSTALL_URL="itms-services://?action=download-manifest&url=${MANIFEST_S3_URL}"
    
    cat > /tmp/dynamodb_ios_item.json << EOF
{
    "app_id": {"S": "${APP_ID}"},
    "version_code": {"N": "${VERSION_CODE}"},
    "bundle_id": {"S": "${BUNDLE_ID}"},
    "created_at": {"S": "${DB_TIMESTAMP}"},
    "download_count": {"N": "0"},
    "download_url": {"S": "${S3_URL}"},
    "file_size": {"N": "${IPA_SIZE_BYTES}"},
    "filename": {"S": "${IPA_FILENAME}"},
    "install_url": {"S": "${INSTALL_URL}"},
    "is_active": {"BOOL": true},
    "manifest_url": {"S": "${MANIFEST_S3_URL}"},
    "platform": {"S": "ios"},
    "release_date": {"S": "${DB_TIMESTAMP}"},
    "release_notes": {"S": "${RELEASE_NOTES}"},
    "updated_at": {"S": "${TIMESTAMP}"},
    "version_name": {"S": "${CURRENT_VERSION}"}
}
EOF
    
    aws dynamodb put-item \
        --table-name ${IOS_TABLE} \
        --item file:///tmp/dynamodb_ios_item.json \
        --region ${AWS_REGION}
    
    # 임시 파일 삭제
    rm -f /tmp/dynamodb_ios_item.json
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ iOS metadata updated successfully!${NC}"
    else
        echo -e "${RED}❌ Failed to update iOS metadata!${NC}"
        exit 1
    fi
fi

# 완료 요약
echo -e "\n${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}       🎉 iOS Upload Pipeline Complete! 🎉${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}📊 Summary:${NC}"
echo -e "  • Platform: ${CYAN}iOS${NC}"
echo -e "  • Version: ${CYAN}${CURRENT_VERSION}${NC} (Code: ${VERSION_CODE})"
echo -e "  • IPA Size: ${CYAN}${IPA_SIZE_MB} MB${NC}"
echo -e "  • Bundle ID: ${CYAN}${BUNDLE_ID}${NC}"
echo -e "  • S3 Location: ${CYAN}s3://${AWS_S3_BUCKET}/${S3_IPA_KEY}${NC}"
echo -e "  • Download URL: ${CYAN}${S3_URL}${NC}"
echo -e "  • Manifest URL: ${CYAN}${MANIFEST_S3_URL}${NC}"
echo -e "  • Install URL: ${CYAN}itms-services://?action=download-manifest&url=${MANIFEST_S3_URL}${NC}"
echo -e "  • DynamoDB Table: ${CYAN}${IOS_TABLE}${NC}"
echo -e "  • Release Notes: ${CYAN}${RELEASE_NOTES}${NC}"

if [ "$DRY_RUN" = true ]; then
    echo -e "\n${YELLOW}⚠️  This was a dry run. No actual changes were made.${NC}"
    echo -e "${YELLOW}    Remove --dry-run flag to execute the upload.${NC}"
fi

echo -e "\n${CYAN}═══════════════════════════════════════════════════════════════${NC}"