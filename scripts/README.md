# 🚀 OTUMS 자동화 스크립트

## 📋 개요
버전 관리, APK 빌드, AWS S3 업로드, DynamoDB 메타데이터 관리를 자동화하는 통합 스크립트 모음입니다.

## 📦 스크립트 구성

### 1. `release-and-deploy.sh`
전체 릴리스 파이프라인을 실행하는 메인 스크립트
- 버전 업데이트 (patch/minor/major)
- APK 자동 빌드
- S3 업로드
- DynamoDB 메타데이터 저장
- Git 태그 생성 (선택사항)

### 2. `aws-helpers.sh`
AWS 관련 유틸리티 함수 모음
- 버전 목록 조회
- 활성 버전 관리
- 다운로드 카운트 업데이트
- 릴리스 노트 수정

### 3. `validate-aws-setup.sh`
환경 설정 검증 스크립트
- AWS CLI 설치 확인
- AWS 자격 증명 확인
- 필수 환경 변수 검증
- S3/DynamoDB 권한 테스트

## 🛠 사전 요구사항

1. **AWS CLI 설치**
   ```bash
   # macOS
   brew install awscli
   
   # 또는 공식 설치 방법
   # https://aws.amazon.com/cli/
   ```

2. **AWS 자격 증명 설정**
   ```bash
   aws configure
   ```

3. **jq 설치** (JSON 파싱용)
   ```bash
   brew install jq
   ```

4. **환경 변수 설정** (`.env` 파일)
   ```env
   AWS_S3_BUCKET=skons-mobile-app-bucket
   AWS_S3_PREFIX=apk/otums/android
   AWS_DYNAMODB_TABLE=app-versions
   AWS_REGION=ap-northeast-2
   APP_ID=sko.company.otums
   ```

## 🚀 사용 방법

### 환경 검증
```bash
./scripts/automatical/validate-aws-setup.sh
```

### 릴리스 배포

#### 기본 사용법
```bash
# Patch 버전 업데이트 (0.0.1 → 0.0.2)
./scripts/automatical/release-and-deploy.sh patch

# Minor 버전 업데이트 (0.1.0 → 0.2.0)
./scripts/automatical/release-and-deploy.sh minor

# Major 버전 업데이트 (1.0.0 → 2.0.0)
./scripts/automatical/release-and-deploy.sh major
```

#### 고급 옵션
```bash
# 릴리스 노트 직접 지정
./scripts/automatical/release-and-deploy.sh patch --release-notes "긴급 버그 수정"

# 테스트 실행 (실제 작업 수행하지 않음)
./scripts/automatical/release-and-deploy.sh patch --dry-run

# 빌드 건너뛰기 (이미 빌드된 APK 사용)
./scripts/automatical/release-and-deploy.sh patch --skip-build

# 업로드 건너뛰기 (로컬 테스트용)
./scripts/automatical/release-and-deploy.sh patch --skip-upload
```

### AWS 헬퍼 함수 사용

```bash
# 스크립트 소스로 로드
source scripts/automatical/aws-helpers.sh

# 모든 버전 목록 조회
list_all_versions

# 현재 활성 버전 확인
get_active_version android

# 특정 버전 활성화
activate_version 1.0.1 android

# 버전 상세 정보 조회
get_version_details 1.0.1

# 릴리스 노트 업데이트
update_release_notes 1.0.1 "새로운 기능 추가"

# 다운로드 카운트 증가
increment_download_count 1.0.1

# S3 APK 목록 조회
list_s3_apks

# 버전 삭제 (주의!)
delete_version 1.0.0
```

## 📊 DynamoDB 스키마

| 필드 | 타입 | 설명 | 예시 |
|------|------|------|------|
| `app_id` (PK) | String | 앱 식별자 | sko.company.otums |
| `platform_version` (SK) | String | 플랫폼#버전코드 | android#00101 |
| `platform` | String | 플랫폼 | android |
| `version_name` | String | 버전 이름 | 1.0.1 |
| `apk_filename` | String | APK 파일명 | otums-v1.0.1-release.apk |
| `apk_size` | Number | 파일 크기 (KB) | 45312 |
| `created_at` | String | 생성 시간 | 2024-01-15T10:30:00Z |
| `release_date` | String | 릴리스 날짜 | 2024-01-15T10:30:00Z |
| `download_url` | String | S3 다운로드 URL | https://... |
| `download_count` | Number | 다운로드 횟수 | 156 |
| `is_active` | Boolean | 활성 상태 | true |
| `release_notes` | String | 릴리스 노트 | 버그 수정 및 성능 개선 |

## 🔄 전체 워크플로우

1. **환경 검증**
   ```bash
   ./scripts/automatical/validate-aws-setup.sh
   ```

2. **버전 업데이트 및 배포**
   ```bash
   ./scripts/automatical/release-and-deploy.sh minor --release-notes "새로운 대시보드 기능 추가"
   ```

3. **배포 확인**
   ```bash
   source scripts/automatical/aws-helpers.sh
   get_active_version android
   ```

## ⚠️ 주의사항

- 프로덕션 배포 전 반드시 `--dry-run` 옵션으로 테스트
- 버전 삭제는 복구 불가능하므로 신중히 실행
- S3 버킷과 DynamoDB 테이블에 대한 적절한 권한 필요
- Git 태그는 수동으로 푸시해야 함 (자동화 옵션 제공)

## 🐛 문제 해결

### AWS CLI 권한 오류
```bash
# AWS 자격 증명 재설정
aws configure

# 특정 프로파일 사용
AWS_PROFILE=myprofile ./scripts/automatical/release-and-deploy.sh patch
```

### 빌드 실패
```bash
# Android 빌드 캐시 정리
cd android && ./gradlew clean
```

### DynamoDB 쿼리 오류
```bash
# 테이블 존재 확인
aws dynamodb describe-table --table-name app-versions --region ap-northeast-2
```

## 📝 로그

스크립트 실행 로그는 터미널에 컬러 출력되며, 필요시 파일로 저장 가능:
```bash
./scripts/automatical/release-and-deploy.sh patch 2>&1 | tee release.log
```