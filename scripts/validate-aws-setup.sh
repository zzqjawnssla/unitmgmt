#!/bin/bash

# AWS 설정 검증 스크립트
# AWS CLI 설정 및 권한을 확인합니다

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}       🔍 AWS Setup Validation Script 🔍${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# 환경 변수 로드
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo -e "${GREEN}✅ .env file loaded${NC}"
else
    echo -e "${RED}❌ .env file not found${NC}"
    exit 1
fi

# 테스트 결과 저장
TESTS_PASSED=0
TESTS_FAILED=0

# 함수: 테스트 결과 출력
print_test_result() {
    local TEST_NAME=$1
    local RESULT=$2
    
    if [ "$RESULT" = "PASS" ]; then
        echo -e "  ${GREEN}✅ ${TEST_NAME}${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "  ${RED}❌ ${TEST_NAME}${NC}"
        ((TESTS_FAILED++))
    fi
}

# 1. AWS CLI 설치 확인
echo -e "\n${BLUE}1. Checking AWS CLI Installation${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if command -v aws &> /dev/null; then
    AWS_VERSION=$(aws --version 2>&1)
    print_test_result "AWS CLI installed: $AWS_VERSION" "PASS"
else
    print_test_result "AWS CLI not installed" "FAIL"
    echo -e "${YELLOW}  → Install from: https://aws.amazon.com/cli/${NC}"
fi

# 2. AWS 자격 증명 확인
echo -e "\n${BLUE}2. Checking AWS Credentials${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

AWS_IDENTITY=$(aws sts get-caller-identity --region ${AWS_REGION} 2>&1)
if [ $? -eq 0 ]; then
    ACCOUNT_ID=$(echo $AWS_IDENTITY | jq -r '.Account')
    USER_ARN=$(echo $AWS_IDENTITY | jq -r '.Arn')
    print_test_result "AWS credentials configured" "PASS"
    echo -e "    Account: ${CYAN}${ACCOUNT_ID}${NC}"
    echo -e "    User: ${CYAN}${USER_ARN}${NC}"
else
    print_test_result "AWS credentials not configured" "FAIL"
    echo -e "${YELLOW}  → Run: aws configure${NC}"
fi

# 3. 환경 변수 확인
echo -e "\n${BLUE}3. Checking Environment Variables${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

REQUIRED_VARS=(
    "AWS_S3_BUCKET"
    "AWS_S3_PREFIX"
    "AWS_DYNAMODB_TABLE"
    "AWS_REGION"
    "APP_ID"
)

for VAR in "${REQUIRED_VARS[@]}"; do
    if [ -n "${!VAR}" ]; then
        print_test_result "$VAR: ${!VAR}" "PASS"
    else
        print_test_result "$VAR not set" "FAIL"
    fi
done

# 4. S3 버킷 접근 권한 확인
echo -e "\n${BLUE}4. Checking S3 Bucket Access${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# 버킷 존재 확인
aws s3api head-bucket --bucket ${AWS_S3_BUCKET} --region ${AWS_REGION} 2>/dev/null
if [ $? -eq 0 ]; then
    print_test_result "S3 bucket exists: ${AWS_S3_BUCKET}" "PASS"
else
    print_test_result "S3 bucket not accessible: ${AWS_S3_BUCKET}" "FAIL"
fi

# 쓰기 권한 확인 (테스트 파일 업로드)
TEST_FILE="/tmp/aws-test-$(date +%s).txt"
echo "test" > $TEST_FILE
aws s3 cp $TEST_FILE "s3://${AWS_S3_BUCKET}/${AWS_S3_PREFIX}/test.txt" --region ${AWS_REGION} 2>/dev/null
if [ $? -eq 0 ]; then
    print_test_result "S3 write permission" "PASS"
    # 테스트 파일 삭제
    aws s3 rm "s3://${AWS_S3_BUCKET}/${AWS_S3_PREFIX}/test.txt" --region ${AWS_REGION} 2>/dev/null
else
    print_test_result "S3 write permission" "FAIL"
fi
rm -f $TEST_FILE

# 5. DynamoDB 테이블 접근 권한 확인
echo -e "\n${BLUE}5. Checking DynamoDB Table Access${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# 테이블 존재 확인
aws dynamodb describe-table --table-name ${AWS_DYNAMODB_TABLE} --region ${AWS_REGION} 2>/dev/null 1>/dev/null
if [ $? -eq 0 ]; then
    print_test_result "DynamoDB table exists: ${AWS_DYNAMODB_TABLE}" "PASS"
else
    print_test_result "DynamoDB table not accessible: ${AWS_DYNAMODB_TABLE}" "FAIL"
fi

# 읽기 권한 확인
aws dynamodb query \
    --table-name ${AWS_DYNAMODB_TABLE} \
    --key-condition-expression "app_id = :app_id" \
    --expression-attribute-values '{":app_id": {"S": "'${APP_ID}'"}}' \
    --region ${AWS_REGION} \
    --limit 1 2>/dev/null 1>/dev/null
if [ $? -eq 0 ]; then
    print_test_result "DynamoDB read permission" "PASS"
else
    print_test_result "DynamoDB read permission" "FAIL"
fi

# 6. Node.js 및 npm 확인
echo -e "\n${BLUE}6. Checking Node.js and npm${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_test_result "Node.js installed: $NODE_VERSION" "PASS"
else
    print_test_result "Node.js not installed" "FAIL"
fi

if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_test_result "npm installed: $NPM_VERSION" "PASS"
else
    print_test_result "npm not installed" "FAIL"
fi

# 7. Android 빌드 환경 확인
echo -e "\n${BLUE}7. Checking Android Build Environment${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ -f "android/gradlew" ]; then
    print_test_result "Gradle wrapper found" "PASS"
else
    print_test_result "Gradle wrapper not found" "FAIL"
fi

if [ -f "android/app/build.gradle" ]; then
    print_test_result "Android build.gradle found" "PASS"
else
    print_test_result "Android build.gradle not found" "FAIL"
fi

# 8. 필수 스크립트 확인
echo -e "\n${BLUE}8. Checking Required Scripts${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

REQUIRED_SCRIPTS=(
    "scripts/manual/version-bump.js"
    "scripts/release-and-deploy.sh"
)

# Android keystore 검증
REQUIRED_KEYSTORE_FILES=(
    "android/keystore.properties"
    "android/release.keystore"
)

for SCRIPT in "${REQUIRED_SCRIPTS[@]}"; do
    if [ -f "$SCRIPT" ]; then
        print_test_result "$SCRIPT exists" "PASS"
    else
        print_test_result "$SCRIPT not found" "FAIL"
    fi
done

# 9. Android 키스토어 확인
echo -e "\n${BLUE}9. Checking Android Keystore${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

for KEYSTORE_FILE in "${REQUIRED_KEYSTORE_FILES[@]}"; do
    if [ -f "$KEYSTORE_FILE" ]; then
        print_test_result "$KEYSTORE_FILE exists" "PASS"
        
        # keystore.properties 파일의 내용 검증
        if [[ "$KEYSTORE_FILE" == *"keystore.properties"* ]]; then
            if grep -q "storeFile=" "$KEYSTORE_FILE" && \
               grep -q "storePassword=" "$KEYSTORE_FILE" && \
               grep -q "keyAlias=" "$KEYSTORE_FILE" && \
               grep -q "keyPassword=" "$KEYSTORE_FILE"; then
                print_test_result "keystore.properties has required properties" "PASS"
            else
                print_test_result "keystore.properties missing required properties" "FAIL"
            fi
        fi
        
        # release.keystore 파일 검증
        if [[ "$KEYSTORE_FILE" == *"release.keystore"* ]]; then
            KEYSTORE_SIZE=$(stat -f%z "$KEYSTORE_FILE" 2>/dev/null || stat -c%s "$KEYSTORE_FILE" 2>/dev/null)
            if [ "$KEYSTORE_SIZE" -gt 0 ]; then
                print_test_result "release.keystore is not empty ($KEYSTORE_SIZE bytes)" "PASS"
            else
                print_test_result "release.keystore is empty" "FAIL"
            fi
        fi
    else
        print_test_result "$KEYSTORE_FILE not found" "FAIL"
        if [[ "$KEYSTORE_FILE" == *"keystore.properties"* ]]; then
            echo -e "${YELLOW}  → Create keystore.properties with signing configuration${NC}"
        elif [[ "$KEYSTORE_FILE" == *"release.keystore"* ]]; then
            echo -e "${YELLOW}  → Generate keystore: keytool -genkeypair -v -keystore android/release.keystore${NC}"
        fi
    fi
done

# 최종 결과
echo -e "\n${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}                     Test Results${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Passed: ${TESTS_PASSED}${NC}"
echo -e "${RED}Failed: ${TESTS_FAILED}${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed! Your environment is ready.${NC}"
    echo -e "${CYAN}You can now run:${NC}"
    echo -e "  ${YELLOW}./scripts/release-and-deploy.sh patch${NC}"
else
    echo -e "\n${RED}⚠️  Some tests failed. Please fix the issues above.${NC}"
fi

echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"