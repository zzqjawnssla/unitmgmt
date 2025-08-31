#!/bin/bash

# AWS 헬퍼 함수 모음
# DynamoDB 및 S3 관련 유틸리티 함수들

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
fi

# 함수: 모든 버전 목록 조회
list_all_versions() {
    echo -e "${CYAN}📋 Fetching all versions from DynamoDB...${NC}"
    
    aws dynamodb query \
        --table-name ${AWS_DYNAMODB_TABLE} \
        --key-condition-expression "app_id = :app_id" \
        --expression-attribute-values '{":app_id": {"S": "'${APP_ID}'"}}' \
        --region ${AWS_REGION} \
        --output json | \
    jq -r '.Items[] | 
        "\(.version_name.S) | \(.platform.S) | \(.is_active.BOOL) | \(.created_at.S) | \(.apk_size.N) KB | \(.download_count.N) | \(.release_notes.S)"' | \
    column -t -s '|' -N "VERSION,PLATFORM,ACTIVE,CREATED,SIZE,DOWNLOADS,NOTES"
}

# 함수: 활성 버전 조회
get_active_version() {
    local PLATFORM=${1:-android}
    
    echo -e "${CYAN}🔍 Fetching active ${PLATFORM} version...${NC}"
    
    aws dynamodb query \
        --table-name ${AWS_DYNAMODB_TABLE} \
        --key-condition-expression "app_id = :app_id" \
        --filter-expression "is_active = :active AND platform = :platform" \
        --expression-attribute-values '{
            ":app_id": {"S": "'${APP_ID}'"},
            ":active": {"BOOL": true},
            ":platform": {"S": "'${PLATFORM}'"}
        }' \
        --region ${AWS_REGION} \
        --output json | \
    jq -r '.Items[0] | 
        if . then
            "Active Version: \(.version_name.S)\nPlatform: \(.platform.S)\nRelease Date: \(.release_date.S)\nDownload URL: \(.download_url.S)\nSize: \(.apk_size.N) KB\nDownloads: \(.download_count.N)\nNotes: \(.release_notes.S)"
        else
            "No active version found"
        end'
}

# 함수: 특정 버전 활성화
activate_version() {
    local VERSION=$1
    local PLATFORM=${2:-android}
    
    if [ -z "$VERSION" ]; then
        echo -e "${RED}Error: Version number required${NC}"
        echo "Usage: activate_version <version> [platform]"
        return 1
    fi
    
    local VERSION_CODE=$(echo $VERSION | awk -F. '{print $1*10000 + $2*100 + $3}')
    local PLATFORM_VERSION="${PLATFORM}#$(printf "%05d" $VERSION_CODE)"
    
    echo -e "${YELLOW}🔄 Activating version ${VERSION} (${PLATFORM_VERSION})...${NC}"
    
    # 먼저 모든 버전 비활성화
    echo -e "${YELLOW}  Deactivating all ${PLATFORM} versions...${NC}"
    aws dynamodb query \
        --table-name ${AWS_DYNAMODB_TABLE} \
        --key-condition-expression "app_id = :app_id" \
        --filter-expression "platform = :platform" \
        --expression-attribute-values '{
            ":app_id": {"S": "'${APP_ID}'"},
            ":platform": {"S": "'${PLATFORM}'"}
        }' \
        --region ${AWS_REGION} \
        --output json | \
    jq -r '.Items[] | .platform_version.S' | \
    while read -r pv; do
        aws dynamodb update-item \
            --table-name ${AWS_DYNAMODB_TABLE} \
            --key '{
                "app_id": {"S": "'${APP_ID}'"},
                "platform_version": {"S": "'${pv}'"}
            }' \
            --update-expression "SET is_active = :inactive" \
            --expression-attribute-values '{":inactive": {"BOOL": false}}' \
            --region ${AWS_REGION} > /dev/null 2>&1
    done
    
    # 선택한 버전 활성화
    echo -e "${YELLOW}  Activating version ${VERSION}...${NC}"
    aws dynamodb update-item \
        --table-name ${AWS_DYNAMODB_TABLE} \
        --key '{
            "app_id": {"S": "'${APP_ID}'"},
            "platform_version": {"S": "'${PLATFORM_VERSION}'"}
        }' \
        --update-expression "SET is_active = :active" \
        --expression-attribute-values '{":active": {"BOOL": true}}' \
        --region ${AWS_REGION}
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Version ${VERSION} activated successfully!${NC}"
    else
        echo -e "${RED}❌ Failed to activate version${NC}"
        return 1
    fi
}

# 함수: 다운로드 카운트 증가
increment_download_count() {
    local VERSION=$1
    local PLATFORM=${2:-android}
    
    if [ -z "$VERSION" ]; then
        echo -e "${RED}Error: Version number required${NC}"
        return 1
    fi
    
    local VERSION_CODE=$(echo $VERSION | awk -F. '{print $1*10000 + $2*100 + $3}')
    local PLATFORM_VERSION="${PLATFORM}#$(printf "%05d" $VERSION_CODE)"
    
    aws dynamodb update-item \
        --table-name ${AWS_DYNAMODB_TABLE} \
        --key '{
            "app_id": {"S": "'${APP_ID}'"},
            "platform_version": {"S": "'${PLATFORM_VERSION}'"}
        }' \
        --update-expression "SET download_count = download_count + :inc" \
        --expression-attribute-values '{":inc": {"N": "1"}}' \
        --region ${AWS_REGION} > /dev/null 2>&1
    
    echo -e "${GREEN}✅ Download count incremented for version ${VERSION}${NC}"
}

# 함수: S3에서 APK 삭제
delete_apk_from_s3() {
    local VERSION=$1
    
    if [ -z "$VERSION" ]; then
        echo -e "${RED}Error: Version number required${NC}"
        return 1
    fi
    
    local S3_KEY="${AWS_S3_PREFIX}/otums-v${VERSION}-release.apk"
    
    echo -e "${YELLOW}🗑 Deleting APK v${VERSION} from S3...${NC}"
    aws s3 rm "s3://${AWS_S3_BUCKET}/${S3_KEY}" --region ${AWS_REGION}
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ APK deleted from S3${NC}"
    else
        echo -e "${RED}❌ Failed to delete APK${NC}"
        return 1
    fi
}

# 함수: 버전 정보 삭제
delete_version() {
    local VERSION=$1
    local PLATFORM=${2:-android}
    
    if [ -z "$VERSION" ]; then
        echo -e "${RED}Error: Version number required${NC}"
        return 1
    fi
    
    local VERSION_CODE=$(echo $VERSION | awk -F. '{print $1*10000 + $2*100 + $3}')
    local PLATFORM_VERSION="${PLATFORM}#$(printf "%05d" $VERSION_CODE)"
    
    echo -e "${YELLOW}⚠️  Warning: This will delete version ${VERSION} from DynamoDB and S3${NC}"
    echo -e "${YELLOW}   Are you sure? (yes/no):${NC}"
    read -r CONFIRM
    
    if [ "$CONFIRM" != "yes" ]; then
        echo -e "${CYAN}Cancelled${NC}"
        return 0
    fi
    
    # DynamoDB에서 삭제
    echo -e "${YELLOW}🗑 Deleting version metadata from DynamoDB...${NC}"
    aws dynamodb delete-item \
        --table-name ${AWS_DYNAMODB_TABLE} \
        --key '{
            "app_id": {"S": "'${APP_ID}'"},
            "platform_version": {"S": "'${PLATFORM_VERSION}'"}
        }' \
        --region ${AWS_REGION}
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Metadata deleted from DynamoDB${NC}"
    else
        echo -e "${RED}❌ Failed to delete metadata${NC}"
    fi
    
    # S3에서 삭제
    delete_apk_from_s3 "$VERSION"
}

# 함수: 버전별 상세 정보 조회
get_version_details() {
    local VERSION=$1
    local PLATFORM=${2:-android}
    
    if [ -z "$VERSION" ]; then
        echo -e "${RED}Error: Version number required${NC}"
        return 1
    fi
    
    local VERSION_CODE=$(echo $VERSION | awk -F. '{print $1*10000 + $2*100 + $3}')
    local PLATFORM_VERSION="${PLATFORM}#$(printf "%05d" $VERSION_CODE)"
    
    echo -e "${CYAN}📊 Version ${VERSION} Details:${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    aws dynamodb get-item \
        --table-name ${AWS_DYNAMODB_TABLE} \
        --key '{
            "app_id": {"S": "'${APP_ID}'"},
            "platform_version": {"S": "'${PLATFORM_VERSION}'"}
        }' \
        --region ${AWS_REGION} \
        --output json | \
    jq -r '.Item | 
        if . then
            "Version Name: \(.version_name.S)
Platform: \(.platform.S)
Platform Version: \(.platform_version.S)
APK Filename: \(.apk_filename.S)
APK Size: \(.apk_size.N) KB (\(.apk_size.N | tonumber / 1024 | floor) MB)
Created At: \(.created_at.S)
Release Date: \(.release_date.S)
Download URL: \(.download_url.S)
Download Count: \(.download_count.N)
Is Active: \(.is_active.BOOL)
Release Notes: \(.release_notes.S)"
        else
            "Version not found"
        end'
}

# 함수: 릴리스 노트 업데이트
update_release_notes() {
    local VERSION=$1
    local NOTES="$2"
    local PLATFORM=${3:-android}
    
    if [ -z "$VERSION" ] || [ -z "$NOTES" ]; then
        echo -e "${RED}Error: Version and notes required${NC}"
        echo "Usage: update_release_notes <version> \"<notes>\" [platform]"
        return 1
    fi
    
    local VERSION_CODE=$(echo $VERSION | awk -F. '{print $1*10000 + $2*100 + $3}')
    local PLATFORM_VERSION="${PLATFORM}#$(printf "%05d" $VERSION_CODE)"
    
    echo -e "${YELLOW}📝 Updating release notes for version ${VERSION}...${NC}"
    
    aws dynamodb update-item \
        --table-name ${AWS_DYNAMODB_TABLE} \
        --key '{
            "app_id": {"S": "'${APP_ID}'"},
            "platform_version": {"S": "'${PLATFORM_VERSION}'"}
        }' \
        --update-expression "SET release_notes = :notes" \
        --expression-attribute-values '{":notes": {"S": "'"$NOTES"'"}}' \
        --region ${AWS_REGION}
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Release notes updated successfully!${NC}"
    else
        echo -e "${RED}❌ Failed to update release notes${NC}"
        return 1
    fi
}

# 함수: S3 APK 목록 조회
list_s3_apks() {
    echo -e "${CYAN}📦 APK files in S3:${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    aws s3 ls "s3://${AWS_S3_BUCKET}/${AWS_S3_PREFIX}/" --region ${AWS_REGION} | \
    while read -r line; do
        SIZE=$(echo $line | awk '{print $3}')
        SIZE_MB=$((SIZE / 1024 / 1024))
        FILENAME=$(echo $line | awk '{print $4}')
        DATE=$(echo $line | awk '{print $1, $2}')
        echo -e "  ${CYAN}${FILENAME}${NC} - ${SIZE_MB} MB (${DATE})"
    done
}

# 메인 스크립트 실행
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    # 직접 실행된 경우 도움말 표시
    echo -e "${CYAN}AWS Helper Functions${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "Available functions:"
    echo "  list_all_versions              - List all versions in DynamoDB"
    echo "  get_active_version [platform]  - Get current active version"
    echo "  activate_version <version>     - Activate a specific version"
    echo "  get_version_details <version>  - Get detailed info for a version"
    echo "  update_release_notes <version> \"<notes>\" - Update release notes"
    echo "  increment_download_count <version> - Increment download counter"
    echo "  delete_version <version>       - Delete version from DynamoDB and S3"
    echo "  list_s3_apks                   - List all APKs in S3"
    echo ""
    echo "Usage:"
    echo "  source scripts/aws-helpers.sh"
    echo "  list_all_versions"
    echo ""
    echo "Or run directly:"
    echo "  bash scripts/aws-helpers.sh && list_all_versions"
fi