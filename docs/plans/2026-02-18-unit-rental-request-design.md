# 유니트 대여 요청/승인 기능 설계

## 1. 개요

타 팀 관리 창고에 있는 유니트를 대여 요청하고, 해당 창고 담당자가 승인/반려하는 워크플로우.

### 핵심 결정사항
- **단일 승인**: 검토자 1명이 승인/반려 결정
- **승인 = 허가만**: 실제 유니트 이동(창고출고/입고)은 별도 처리
- **상태**: 대기(pending) → 승인(approved) / 반려(rejected) / 취소(cancelled)
- **반려 사유**: 필수 입력
- **검토자 자동 배정**: 백엔드에서 결정
- **SMS 알림**: 요청 시 검토자에게, 승인/반려 시 요청자에게

## 2. 화면 구조

### 2.1 흐름
```
SearchResultScreen (ActionButtons: "대여 요청" 버튼)
  → RequestCreateScreen (요청 생성)

HomeScreen (결재 대기 카드) / UserinfoScreen
  → MailBoxScreen (요청 목록)
    → RequestDetailScreen (요청 상세)
      → RequestReviewScreen (승인/반려 처리)
```

### 2.2 ActionButtons 수정
- 유니트의 `warehouse_manage_team` ≠ `user.team`일 때만 "대여 요청" 버튼 표시
- 기존 buttonMap과 별도로 독립적인 버튼

### 2.3 RequestCreateScreen
| 섹션 | 내용 |
|------|------|
| 유니트 정보 (Readonly) | SKT바코드, 시리얼넘버, 상세타입, 현재 위치(창고명), 관리팀 |
| 선택항목 | 요청자(자동, readonly), 요청 장소(user.region 내 창고 드롭다운), 검토자(자동 배정 표시), 요청 메모(TextInput) |
| 하단 | [요청하기] 버튼 |

### 2.4 RequestDetailScreen
| 섹션 | 내용 |
|------|------|
| 유니트 정보 (Readonly) | CreateScreen과 동일 |
| 요청 정보 (Readonly) | 요청자, 요청 장소, 검토자, 상태, 요청일시, 요청 메모 |
| 처리 정보 (Readonly) | 승인 시: 발송 방법, 승인 메모, 처리 일시 / 반려 시: 반려 사유, 처리 일시 |
| 하단 버튼 | 요청자+대기: [취소] / 검토자+대기: [승인][반려] → ReviewScreen / 그 외: 없음 |

- **접근 제한**: 요청자와 검토자만 열람 가능

### 2.5 RequestReviewScreen
| 섹션 | 내용 |
|------|------|
| 유니트/요청 요약 (Readonly) | 간략한 정보 |
| 액션 선택 | SegmentedButtons: 승인 / 반려 |
| 승인 시 | 발송 방법(드롭다운: 직접수령/택배/차량운송), 메모(TextInput) |
| 반려 시 | 반려 사유(TextInput, 필수) |
| 하단 | [승인하기] 또는 [반려하기] 버튼 |

### 2.6 MailBoxScreen 리팩토링
- 기존 placeholder → 실제 API 연동
- 탭: "내 요청" / "검토 대기"
- 항목 클릭 → RequestDetailScreen
- 상태 뱃지: 대기(주황), 승인(초록), 반려(빨강), 취소(회색)

## 3. 백엔드 설계

### 3.1 모델: UnitRentalRequest
```python
class UnitRentalRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', '대기'),
        ('approved', '승인'),
        ('rejected', '반려'),
        ('cancelled', '취소'),
    ]
    SHIPPING_METHOD_CHOICES = [
        ('pickup', '직접수령'),
        ('delivery', '택배'),
        ('vehicle', '차량운송'),
    ]

    unit = ForeignKey(UnitObjectInfo)
    requester = ForeignKey(User, related_name='rental_requests')
    requester_warehouse = ForeignKey(UnitWarehouse, related_name='rental_requests_destination')
    reviewer = ForeignKey(User, related_name='rental_reviews', null=True)
    status = CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    request_memo = TextField(blank=True, null=True)
    shipping_method = CharField(max_length=20, choices=SHIPPING_METHOD_CHOICES, null=True)
    approval_memo = TextField(blank=True, null=True)
    rejection_reason = TextField(blank=True, null=True)
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)
    reviewed_at = DateTimeField(null=True)
```

### 3.2 API 엔드포인트
| Method | URL | 설명 |
|--------|-----|------|
| POST | `/apps/rental-requests/` | 요청 생성 (검토자 자동 배정 + SMS) |
| GET | `/apps/rental-requests/` | 요청 목록 (내 요청 + 내 검토 대기) |
| GET | `/apps/rental-requests/{id}/` | 요청 상세 |
| PATCH | `/apps/rental-requests/{id}/approve/` | 승인 (발송방법+메모 + SMS) |
| PATCH | `/apps/rental-requests/{id}/reject/` | 반려 (사유 + SMS) |
| PATCH | `/apps/rental-requests/{id}/cancel/` | 취소 |
| GET | `/apps/rental-requests/warehouses/` | 요청자 region 내 창고 목록 |

### 3.3 서비스 레이어: rental_service.py
- 검토자 자동 배정 로직 (my_warehouse 기반)
- SMS 알림 발송 (기존 accounts SMS 인프라 활용)
- 상태 전이 검증

### 3.4 SMS 알림
| 시점 | 수신자 | 내용 |
|------|--------|------|
| 요청 생성 | 검토자 | "대여 요청이 접수되었습니다" |
| 승인 | 요청자 | "대여 요청이 승인되었습니다" |
| 반려 | 요청자 | "대여 요청이 반려되었습니다" |

## 4. 파일 구조

### 모바일 (unitmgmt)
```
src/screens/Request/
  ├── RequestCreateScreen.tsx
  ├── RequestDetailScreen.tsx
  └── RequestReviewScreen.tsx
src/components/Request/
  ├── UnitInfoSection.tsx
  └── RequestInfoSection.tsx
src/services/api/api.tsx (기존 파일에 추가)
src/navigation/RootStackNavigation.tsx (경로 추가)
src/screens/UserInfo/MailBoxScreen.tsx (리팩토링)
src/components/Search/ActionButtons.tsx (대여 요청 버튼 추가)
```

### 백엔드 (unit_management_system)
```
apps/models.py (UnitRentalRequest 추가)
apps/serializers.py (RentalRequest 시리얼라이저 추가)
apps/views.py (RentalRequest 뷰 추가)
apps/urls.py (rental-requests/ URL 추가)
apps/services/rental_service.py (신규)
```
