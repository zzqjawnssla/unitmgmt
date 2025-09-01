#!/bin/bash

# iOS 릴리스 및 배포 스크립트
# 수동 빌드된 IPA 파일을 S3에 업로드하고 DynamoDB 메타데이터를 저장

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
    echo "  $0 [patch|minor|major] --ipa-path PATH [options]"
    echo ""
    echo -e "${CYAN}Required:${NC}"
    echo "  --ipa-path PATH         IPA 파일 경로 (필수)"
    echo ""
    echo -e "${CYAN}Options:${NC}"
    echo "  --manifest-path PATH    Manifest.plist 파일 경로 (선택사항)"
    echo "  --bundle-id ID          Bundle ID (선택사항, 기본값: com.unitmgmt)"
    echo "  --release-notes \"notes\"  릴리스 노트 (선택사항)"
    echo "  --skip-upload           업로드 건너뛰기"
    echo "  --dry-run               실제 작업 수행하지 않고 시뮬레이션만 실행"
    echo ""
    echo -e "${CYAN}Examples:${NC}"
    echo "  $0 patch --ipa-path ./ios/build/unitmgmt.ipa --release-notes \"iOS 버그 수정\""
    echo "  $0 minor --ipa-path ./build/unitmgmt-v1.2.0.ipa --manifest-path ./build/manifest.plist"
}

# 파라미터 파싱
VERSION_TYPE=${1:-patch}
IPA_PATH=""
MANIFEST_PATH=""
BUNDLE_ID="com.unitmgmt"
RELEASE_NOTES=""
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
        --ipa-path)
            IPA_PATH="$2"
            shift 2
            ;;
        --manifest-path)
            MANIFEST_PATH="$2"
            shift 2
            ;;
        --bundle-id)
            BUNDLE_ID="$2"
            shift 2
            ;;
        --release-notes)
            RELEASE_NOTES="$2"
            shift 2
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

# IPA 경로 필수 체크
if [ -z "$IPA_PATH" ]; then
    echo -e "${RED}Error: --ipa-path is required${NC}"
    show_usage
    exit 1
fi

# IPA 파일 존재 확인
if [ ! -f "$IPA_PATH" ]; then
    echo -e "${RED}Error: IPA file not found at: $IPA_PATH${NC}"
    exit 1
fi

# Manifest 파일 존재 확인 (제공된 경우)
if [ -n "$MANIFEST_PATH" ] && [ ! -f "$MANIFEST_PATH" ]; then
    echo -e "${RED}Error: Manifest file not found at: $MANIFEST_PATH${NC}"
    exit 1
fi

# 릴리스 노트가 없으면 입력 받기
if [ -z "$RELEASE_NOTES" ]; then
    echo -e "${YELLOW}📝 Enter release notes (press Enter for default):${NC}"
    read -r USER_NOTES
    if [ -z "$USER_NOTES" ]; then
        case $VERSION_TYPE in
            patch)
                RELEASE_NOTES="iOS 버그 수정 및 성능 개선"
                ;;
            minor)
                RELEASE_NOTES="iOS 새로운 기능 추가 및 개선"
                ;;
            major)
                RELEASE_NOTES="iOS 주요 업데이트"
                ;;
        esac
    else
        RELEASE_NOTES="$USER_NOTES"
    fi
fi

echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}       📱 iOS Unit Management Release & Deploy Pipeline 📱${NC}"
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

# IPA 파일 정보
IPA_SIZE_BYTES=$(stat -f%z "$IPA_PATH" 2>/dev/null || stat -c%s "$IPA_PATH" 2>/dev/null)
IPA_SIZE_MB=$((IPA_SIZE_BYTES / 1024 / 1024))
IPA_FILENAME="unitmgmt-v${NEW_VERSION}-release.ipa"

echo -e "${GREEN}📱 IPA Information:${NC}"
echo -e "  • Path: ${CYAN}${IPA_PATH}${NC}"
echo -e "  • Size: ${CYAN}${IPA_SIZE_MB} MB${NC}"
echo -e "  • Target filename: ${CYAN}${IPA_FILENAME}${NC}"

# 2. S3 업로드
if [ "$SKIP_UPLOAD" = false ]; then
    echo -e "\n${BLUE}Step 2: Upload to S3${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # iOS 전용 S3 prefix 사용
    IOS_S3_PREFIX="${AWS_S3_PREFIX/android/ios}"
    S3_KEY="${IOS_S3_PREFIX}/${IPA_FILENAME}"
    S3_URL="https://${AWS_S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${S3_KEY}"
    
    if [ "$DRY_RUN" = true ]; then
        echo -e "${CYAN}[DRY RUN] Would upload IPA to: s3://${AWS_S3_BUCKET}/${S3_KEY}${NC}"
        if [ -n "$MANIFEST_PATH" ]; then
            MANIFEST_S3_KEY="${IOS_S3_PREFIX}/manifest-v${NEW_VERSION}.plist"
            echo -e "${CYAN}[DRY RUN] Would upload Manifest to: s3://${AWS_S3_BUCKET}/${MANIFEST_S3_KEY}${NC}"
        fi
    else
        echo -e "${YELLOW}📤 Uploading IPA to S3...${NC}"
        
        # IPA 업로드
        echo -e "${CYAN}🔄 Uploading IPA... Please wait${NC}"
        aws s3 cp "$IPA_PATH" "s3://${AWS_S3_BUCKET}/${S3_KEY}" \
            --region ${AWS_REGION} \
            --metadata "version=${NEW_VERSION},versionCode=${VERSION_CODE},platform=ios" \
            --cli-read-timeout 0 \
            --cli-connect-timeout 60
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ IPA upload successful!${NC}"
            echo -e "${CYAN}📍 S3 URL: ${S3_URL}${NC}"
        else
            echo -e "${RED}❌ IPA upload failed!${NC}"
            exit 1
        fi
        
        # Manifest 업로드 (제공된 경우)
        if [ -n "$MANIFEST_PATH" ]; then
            MANIFEST_S3_KEY="${IOS_S3_PREFIX}/manifest-v${NEW_VERSION}.plist"
            MANIFEST_S3_URL="https://${AWS_S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${MANIFEST_S3_KEY}"
            
            echo -e "${YELLOW}📤 Uploading Manifest to S3...${NC}"
            aws s3 cp "$MANIFEST_PATH" "s3://${AWS_S3_BUCKET}/${MANIFEST_S3_KEY}" \
                --region ${AWS_REGION} \
                --content-type "application/xml" \
                --cli-read-timeout 0 \
                --cli-connect-timeout 60
            
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✅ Manifest upload successful!${NC}"
                echo -e "${CYAN}📍 Manifest URL: ${MANIFEST_S3_URL}${NC}"
            else
                echo -e "${YELLOW}⚠️ Manifest upload failed, but continuing...${NC}"
                MANIFEST_S3_URL=""
            fi
        fi
    fi
else
    echo -e "\n${YELLOW}⏭ Skipping upload step${NC}"
    IOS_S3_PREFIX="${AWS_S3_PREFIX/android/ios}"
    S3_KEY="${IOS_S3_PREFIX}/${IPA_FILENAME}"
    S3_URL="https://${AWS_S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${S3_KEY}"
fi

# 3. DynamoDB 메타데이터 저장
echo -e "\n${BLUE}Step 3: Update DynamoDB Metadata${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# iOS 테이블 사용
IOS_TABLE="mobile-app-ios-versions"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
IPA_SIZE_BYTES_NUM=$IPA_SIZE_BYTES

# 이전 활성 버전 비활성화
if [ "$DRY_RUN" = true ]; then
    echo -e "${CYAN}[DRY RUN] Would deactivate previous active iOS versions${NC}"
else
    echo -e "${YELLOW}🔄 Deactivating previous active iOS versions...${NC}"
    
    # 현재 활성 버전 조회 및 비활성화
    aws dynamodb query \
        --table-name ${IOS_TABLE} \
        --key-condition-expression "app_id = :app_id" \
        --filter-expression "is_active = :active AND platform = :platform" \
        --expression-attribute-values '{
            ":app_id": {"S": "'${APP_ID}'"},
            ":active": {"BOOL": true},
            ":platform": {"S": "ios"}
        }' \
        --region ${AWS_REGION} \
        --output json | \
    jq -r '.Items[] | .version_code.N' | \
    while read -r old_version_code; do
        if [ -n "$old_version_code" ]; then
            echo "  Deactivating iOS version: $old_version_code"
            aws dynamodb update-item \
                --table-name ${IOS_TABLE} \
                --key '{
                    "app_id": {"S": "'${APP_ID}'"},
                    "version_code": {"N": "'${old_version_code}'"}
                }' \
                --update-expression "SET is_active = :inactive" \
                --expression-attribute-values '{"inactive": {"BOOL": false}}' \
                --region ${AWS_REGION} > /dev/null 2>&1
        fi
    done
fi

# 새 버전 메타데이터 저장
if [ "$DRY_RUN" = true ]; then
    echo -e "${CYAN}[DRY RUN] Would save iOS metadata to DynamoDB:${NC}"
    echo "  app_id: ${APP_ID}"
    echo "  version_code: ${VERSION_CODE}"
    echo "  version_name: ${NEW_VERSION}"
    echo "  bundle_id: ${BUNDLE_ID}"
    echo "  release_notes: ${RELEASE_NOTES}"
else
    echo -e "${YELLOW}💾 Saving new iOS version metadata...${NC}"
    
    # iOS 메타데이터 항목 구성
    METADATA_ITEM='{
        "app_id": {"S": "'${APP_ID}'"},
        "version_code": {"N": "'${VERSION_CODE}'"},
        "platform": {"S": "ios"},
        "version_name": {"S": "'${NEW_VERSION}'"},
        "bundle_id": {"S": "'${BUNDLE_ID}'"},
        "filename": {"S": "'${IPA_FILENAME}'"},
        "file_size": {"N": "'${IPA_SIZE_BYTES_NUM}'"},
        "created_at": {"S": "'${TIMESTAMP}'"},
        "release_date": {"S": "'${TIMESTAMP}'"},
        "download_url": {"S": "'${S3_URL}'"},
        "download_count": {"N": "0"},
        "is_active": {"BOOL": true},
        "release_notes": {"S": "'${RELEASE_NOTES}'"}
    }'
    
    # Manifest URL 추가 (있는 경우)
    if [ -n "$MANIFEST_S3_URL" ]; then
        METADATA_ITEM=$(echo "$METADATA_ITEM" | sed 's/}$/,"manifest_url": {"S": "'${MANIFEST_S3_URL}'"}}/')
    fi
    
    aws dynamodb put-item \
        --table-name ${IOS_TABLE} \
        --item "$METADATA_ITEM" \
        --region ${AWS_REGION}
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ iOS metadata saved successfully!${NC}"
    else
        echo -e "${RED}❌ Failed to save iOS metadata!${NC}"
        exit 1
    fi
fi

# 4. Git 커밋 (선택사항)
echo -e "\n${BLUE}Step 4: Git Operations${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ "$DRY_RUN" = true ]; then
    echo -e "${CYAN}[DRY RUN] Suggested git commands:${NC}"
    echo "  git add -A"
    echo "  git commit -m \"chore: iOS release v${NEW_VERSION} - ${RELEASE_NOTES}\""
    echo "  git tag ios-v${NEW_VERSION}"
    echo "  git push origin main --tags"
else
    echo -e "${YELLOW}💡 Suggested git commands:${NC}"
    echo -e "${CYAN}git add -A${NC}"
    echo -e "${CYAN}git commit -m \"chore: iOS release v${NEW_VERSION} - ${RELEASE_NOTES}\"${NC}"
    echo -e "${CYAN}git tag ios-v${NEW_VERSION}${NC}"
    echo -e "${CYAN}git push origin main --tags${NC}"
    echo ""
    echo -e "${YELLOW}Do you want to execute these commands? (y/n):${NC}"
    read -r EXECUTE_GIT
    
    if [[ "$EXECUTE_GIT" == "y" ]] || [[ "$EXECUTE_GIT" == "Y" ]]; then
        git add -A
        git commit -m "chore: iOS release v${NEW_VERSION} - ${RELEASE_NOTES}"
        git tag "ios-v${NEW_VERSION}"
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
echo -e "${GREEN}       🎉 iOS Release Pipeline Complete! 🎉${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}📊 Summary:${NC}"
echo -e "  • Platform: ${CYAN}iOS${NC}"
echo -e "  • Version: ${CYAN}${NEW_VERSION}${NC} (Code: ${VERSION_CODE})"
echo -e "  • IPA Size: ${CYAN}${IPA_SIZE_MB} MB${NC}"
echo -e "  • Bundle ID: ${CYAN}${BUNDLE_ID}${NC}"
echo -e "  • S3 Location: ${CYAN}s3://${AWS_S3_BUCKET}/${S3_KEY}${NC}"
echo -e "  • Download URL: ${CYAN}${S3_URL}${NC}"
if [ -n "$MANIFEST_S3_URL" ]; then
echo -e "  • Manifest URL: ${CYAN}${MANIFEST_S3_URL}${NC}"
fi
echo -e "  • DynamoDB Key: ${CYAN}${APP_ID} / ${VERSION_CODE}${NC}"
echo -e "  • DynamoDB Table: ${CYAN}${IOS_TABLE}${NC}"
echo -e "  • Release Notes: ${CYAN}${RELEASE_NOTES}${NC}"
echo -e "  • Status: ${GREEN}Active${NC}"
echo ""

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}⚠️  This was a dry run. No actual changes were made.${NC}"
    echo -e "${YELLOW}    Remove --dry-run flag to execute the pipeline.${NC}"
fi

echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"