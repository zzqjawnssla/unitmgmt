# 유니트 대여 요청/승인 기능 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 타 팀 관리 창고의 유니트를 대여 요청/승인/반려/취소할 수 있는 워크플로우를 백엔드 + 모바일 앱에 구현한다.

**Architecture:** 백엔드에 UnitRentalRequest 모델과 REST API를 추가하고, 모바일에 RequestCreateScreen, RequestDetailScreen, RequestReviewScreen 3개 신규 화면과 MailBoxScreen 리팩토링을 구현한다. 서비스 레이어 패턴으로 비즈니스 로직을 분리하고, 기존 SMS 인프라를 활용하여 알림을 발송한다.

**Tech Stack:** Django REST Framework, PostgreSQL, Celery (SMS), React Native 0.81.1, TypeScript, React Native Paper, React Navigation

---

## Phase 1: 백엔드 - 모델 및 마이그레이션

### Task 1: UnitRentalRequest 모델 생성

**Files:**
- Modify: `/Users/beomjun/PycharmProjects/unit_management_system/apps/models.py` (끝부분에 추가)

**Step 1: UnitRentalRequest 모델 코드 작성**

`apps/models.py` 파일 끝에 추가:

```python
class UnitRentalRequest(models.Model):
    """
    유니트 대여 요청
    - 타 팀 창고의 유니트를 대여 요청하고 승인/반려하는 워크플로우
    """
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

    # 요청 대상
    unit = models.ForeignKey(
        UnitObjectInfo, on_delete=models.CASCADE,
        verbose_name="대여 요청 유니트",
        related_name='rental_requests'
    )

    # 요청자 정보
    requester = models.ForeignKey(
        User, on_delete=models.CASCADE,
        verbose_name="요청자",
        related_name='rental_requests'
    )
    requester_warehouse = models.ForeignKey(
        UnitWarehouse, on_delete=models.CASCADE,
        verbose_name="요청 장소",
        related_name='rental_requests_destination'
    )
    request_memo = models.TextField(verbose_name="요청 메모", blank=True, default='')

    # 검토자 정보
    reviewer = models.ForeignKey(
        User, on_delete=models.SET_NULL,
        verbose_name="검토자",
        related_name='rental_reviews',
        null=True, blank=True
    )

    # 상태
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES,
        default='pending', verbose_name="상태"
    )

    # 승인 시 입력
    shipping_method = models.CharField(
        max_length=20, choices=SHIPPING_METHOD_CHOICES,
        verbose_name="발송 방법",
        null=True, blank=True
    )
    approval_memo = models.TextField(verbose_name="승인 메모", blank=True, default='')

    # 반려 시 입력
    rejection_reason = models.TextField(verbose_name="반려 사유", blank=True, default='')

    # 타임스탬프
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="요청일시")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="수정일시")
    reviewed_at = models.DateTimeField(verbose_name="처리일시", null=True, blank=True)

    class Meta:
        verbose_name = '대여 요청'
        verbose_name_plural = '10. 대여 요청'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['requester', 'status']),
            models.Index(fields=['reviewer', 'status']),
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return f"대여요청 #{self.pk} - {self.unit.skt_barcode} ({self.get_status_display()})"
```

**Step 2: 마이그레이션 생성 및 적용**

Run: `cd /Users/beomjun/PycharmProjects/unit_management_system && python manage.py makemigrations apps`
Expected: Migration file created

Run: `cd /Users/beomjun/PycharmProjects/unit_management_system && python manage.py migrate`
Expected: Migration applied successfully

**Step 3: 커밋**

```bash
cd /Users/beomjun/PycharmProjects/unit_management_system
git add apps/models.py apps/migrations/
git commit -m "feat: UnitRentalRequest 모델 추가

## 1. UnitRentalRequest 모델 (apps/models.py)

### 내용
- 대여 요청 워크플로우를 위한 모델 추가
- 상태: pending/approved/rejected/cancelled
- 발송방법: pickup/delivery/vehicle
- 요청자, 검토자, 유니트 FK 관계 설정
- 인덱스: requester+status, reviewer+status, created_at"
```

---

## Phase 2: 백엔드 - 서비스 레이어

### Task 2: RentalService 서비스 레이어 구현

**Files:**
- Create: `/Users/beomjun/PycharmProjects/unit_management_system/apps/services/__init__.py`
- Create: `/Users/beomjun/PycharmProjects/unit_management_system/apps/services/rental_service.py`

**Step 1: 서비스 레이어 작성**

`apps/services/__init__.py`:
```python
```

`apps/services/rental_service.py`:
```python
"""
대여 요청 비즈니스 로직 서비스
"""
import logging

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError, PermissionDenied

from accounts.models import UserProfile
from apps.models import UnitRentalRequest, UnitWarehouse

logger = logging.getLogger(__name__)
User = get_user_model()


class RentalService:
    """대여 요청/승인/반려/취소 비즈니스 로직"""

    @staticmethod
    def get_reviewer_for_warehouse(warehouse):
        """
        창고 담당자(검토자) 자동 배정
        해당 창고를 my_warehouse로 설정한 사용자 중 1명을 반환
        """
        reviewer_profile = UserProfile.objects.filter(
            my_warehouse=warehouse
        ).select_related('user').first()

        if reviewer_profile:
            return reviewer_profile.user
        return None

    @staticmethod
    def get_unit_current_warehouse(unit):
        """유니트의 현재 위치 창고를 반환"""
        last_history = unit.get_last_manage_history()
        if not last_history:
            return None

        if last_history.content_type and last_history.object_id:
            location_instance = last_history.content_type.get_object_for_this_type(
                id=last_history.object_id
            )
            if isinstance(location_instance, UnitWarehouse):
                return location_instance
        return None

    @staticmethod
    def validate_rental_request(user, unit):
        """대여 요청 유효성 검증"""
        user_profile = UserProfile.objects.get(user=user)
        current_warehouse = RentalService.get_unit_current_warehouse(unit)

        if not current_warehouse:
            raise ValidationError("유니트의 현재 위치가 창고가 아닙니다.")

        if not current_warehouse.warehouse_manage_team:
            raise ValidationError("창고에 관리팀이 지정되어 있지 않습니다.")

        # 같은 팀이면 대여 요청 불가
        if current_warehouse.warehouse_manage_team.team_name == user_profile.team:
            raise ValidationError("같은 팀 관리 창고의 유니트는 대여 요청할 수 없습니다.")

        # 이미 대기 중인 요청이 있는지 확인
        existing = UnitRentalRequest.objects.filter(
            unit=unit, status='pending'
        ).exists()
        if existing:
            raise ValidationError("이미 대기 중인 대여 요청이 있습니다.")

        return current_warehouse

    @transaction.atomic
    def create_request(self, user, unit, requester_warehouse_id, request_memo=''):
        """대여 요청 생성"""
        current_warehouse = self.validate_rental_request(user, unit)

        requester_warehouse = UnitWarehouse.objects.get(id=requester_warehouse_id)
        reviewer = self.get_reviewer_for_warehouse(current_warehouse)

        rental_request = UnitRentalRequest.objects.create(
            unit=unit,
            requester=user,
            requester_warehouse=requester_warehouse,
            request_memo=request_memo,
            reviewer=reviewer,
            status='pending',
        )

        # SMS 알림 발송 (검토자에게)
        if reviewer:
            self._send_notification(
                rental_request, 'created', reviewer
            )

        logger.info(
            f"대여 요청 생성: request_id={rental_request.pk}, "
            f"unit={unit.skt_barcode}, requester={user.username}"
        )
        return rental_request

    @transaction.atomic
    def approve_request(self, reviewer, rental_request, shipping_method, approval_memo=''):
        """대여 요청 승인"""
        if rental_request.status != 'pending':
            raise ValidationError("대기 상태의 요청만 승인할 수 있습니다.")

        if rental_request.reviewer and rental_request.reviewer != reviewer:
            raise PermissionDenied("해당 요청의 검토자가 아닙니다.")

        rental_request.status = 'approved'
        rental_request.shipping_method = shipping_method
        rental_request.approval_memo = approval_memo
        rental_request.reviewed_at = timezone.now()
        rental_request.reviewer = reviewer
        rental_request.save()

        # SMS 알림 발송 (요청자에게)
        self._send_notification(
            rental_request, 'approved', rental_request.requester
        )

        logger.info(
            f"대여 요청 승인: request_id={rental_request.pk}, "
            f"reviewer={reviewer.username}"
        )
        return rental_request

    @transaction.atomic
    def reject_request(self, reviewer, rental_request, rejection_reason):
        """대여 요청 반려"""
        if rental_request.status != 'pending':
            raise ValidationError("대기 상태의 요청만 반려할 수 있습니다.")

        if rental_request.reviewer and rental_request.reviewer != reviewer:
            raise PermissionDenied("해당 요청의 검토자가 아닙니다.")

        if not rejection_reason or not rejection_reason.strip():
            raise ValidationError("반려 사유는 필수 입력입니다.")

        rental_request.status = 'rejected'
        rental_request.rejection_reason = rejection_reason
        rental_request.reviewed_at = timezone.now()
        rental_request.reviewer = reviewer
        rental_request.save()

        # SMS 알림 발송 (요청자에게)
        self._send_notification(
            rental_request, 'rejected', rental_request.requester
        )

        logger.info(
            f"대여 요청 반려: request_id={rental_request.pk}, "
            f"reviewer={reviewer.username}"
        )
        return rental_request

    @transaction.atomic
    def cancel_request(self, user, rental_request):
        """대여 요청 취소"""
        if rental_request.status != 'pending':
            raise ValidationError("대기 상태의 요청만 취소할 수 있습니다.")

        if rental_request.requester != user:
            raise PermissionDenied("요청자만 취소할 수 있습니다.")

        rental_request.status = 'cancelled'
        rental_request.reviewed_at = timezone.now()
        rental_request.save()

        logger.info(
            f"대여 요청 취소: request_id={rental_request.pk}, "
            f"user={user.username}"
        )
        return rental_request

    def _send_notification(self, rental_request, action, recipient):
        """SMS 알림 발송 (Celery 비동기)"""
        try:
            from accounts.tasks.sms_tasks import send_sms_async
            recipient_profile = UserProfile.objects.get(user=recipient)
            phone = recipient_profile.mobile_number

            if not phone or phone == '010-0000-0000':
                logger.warning(f"알림 발송 실패: 수신자 전화번호 없음 (user={recipient.username})")
                return

            unit_barcode = rental_request.unit.skt_barcode
            messages = {
                'created': f'[유니트관리] 대여 요청이 접수되었습니다. (바코드: {unit_barcode})',
                'approved': f'[유니트관리] 대여 요청이 승인되었습니다. (바코드: {unit_barcode})',
                'rejected': f'[유니트관리] 대여 요청이 반려되었습니다. (바코드: {unit_barcode})',
            }

            message = messages.get(action)
            if message:
                send_sms_async.delay(
                    phone_number=phone,
                    message=message,
                    username=recipient.username,
                    user_id=recipient.id,
                    sms_type='notification',
                )
        except Exception as e:
            logger.error(f"SMS 알림 발송 실패: {e}", exc_info=True)
```

**Step 2: 커밋**

```bash
cd /Users/beomjun/PycharmProjects/unit_management_system
git add apps/services/
git commit -m "feat: RentalService 서비스 레이어 구현

## 1. rental_service.py (apps/services/rental_service.py)

### 내용
- create_request: 요청 생성 + 검토자 자동 배정 + SMS 알림
- approve_request: 승인 처리 + SMS 알림
- reject_request: 반려 처리 (사유 필수) + SMS 알림
- cancel_request: 취소 처리 (요청자만 가능)
- validate_rental_request: 같은 팀 검증, 중복 요청 검증
- get_reviewer_for_warehouse: my_warehouse 기반 검토자 배정
- _send_notification: Celery 비동기 SMS 발송"
```

---

## Phase 3: 백엔드 - Serializer 및 View

### Task 3: Serializer 작성

**Files:**
- Modify: `/Users/beomjun/PycharmProjects/unit_management_system/apps/serializers.py` (끝부분에 추가)

**Step 1: 시리얼라이저 추가**

`apps/serializers.py` 끝에 추가:

```python
class UnitRentalRequestSerializer(serializers.ModelSerializer):
    """대여 요청 목록/상세 시리얼라이저"""
    requester_name = serializers.CharField(source='requester.first_name', read_only=True)
    requester_username = serializers.CharField(source='requester.username', read_only=True)
    reviewer_name = serializers.SerializerMethodField()
    unit_info = serializers.SerializerMethodField()
    requester_warehouse_name = serializers.CharField(
        source='requester_warehouse.warehouse_name', read_only=True
    )
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    shipping_method_display = serializers.SerializerMethodField()

    class Meta:
        model = UnitRentalRequest
        fields = [
            'id', 'status', 'status_display',
            'unit', 'unit_info',
            'requester', 'requester_name', 'requester_username',
            'requester_warehouse', 'requester_warehouse_name',
            'request_memo',
            'reviewer', 'reviewer_name',
            'shipping_method', 'shipping_method_display',
            'approval_memo', 'rejection_reason',
            'created_at', 'updated_at', 'reviewed_at',
        ]
        read_only_fields = [
            'id', 'requester', 'reviewer', 'status',
            'shipping_method', 'approval_memo', 'rejection_reason',
            'created_at', 'updated_at', 'reviewed_at',
        ]

    def get_reviewer_name(self, obj):
        if obj.reviewer:
            return obj.reviewer.first_name
        return '자동 배정 대기'

    def get_unit_info(self, obj):
        unit = obj.unit
        last_history = unit.get_last_manage_history()
        info = {
            'id': unit.id,
            'skt_barcode': unit.skt_barcode,
            'unit_serial': unit.unit_serial,
            'detail_typename': unit.unit_detail_type.typename,
        }
        if last_history:
            location_instance = None
            if last_history.content_type and last_history.object_id:
                loc = last_history.content_type.get_object_for_this_type(id=last_history.object_id)
                if hasattr(loc, 'to_json'):
                    location_instance = loc.to_json()
            info['last_manage_history'] = {
                'unit_movement': last_history.unit_movement.change_type,
                'location': last_history.location.location if last_history.location else None,
                'location_context_instance': location_instance,
            }
        return info

    def get_shipping_method_display(self, obj):
        if obj.shipping_method:
            return obj.get_shipping_method_display()
        return None


class UnitRentalRequestCreateSerializer(serializers.Serializer):
    """대여 요청 생성 시리얼라이저"""
    unit_id = serializers.IntegerField()
    requester_warehouse_id = serializers.IntegerField()
    request_memo = serializers.CharField(required=False, default='', allow_blank=True)

    def validate_unit_id(self, value):
        from apps.models import UnitObjectInfo
        try:
            UnitObjectInfo.objects.get(id=value)
        except UnitObjectInfo.DoesNotExist:
            raise serializers.ValidationError("존재하지 않는 유니트입니다.")
        return value

    def validate_requester_warehouse_id(self, value):
        try:
            UnitWarehouse.objects.get(id=value)
        except UnitWarehouse.DoesNotExist:
            raise serializers.ValidationError("존재하지 않는 창고입니다.")
        return value


class UnitRentalRequestApproveSerializer(serializers.Serializer):
    """대여 요청 승인 시리얼라이저"""
    shipping_method = serializers.ChoiceField(
        choices=UnitRentalRequest.SHIPPING_METHOD_CHOICES
    )
    approval_memo = serializers.CharField(required=False, default='', allow_blank=True)


class UnitRentalRequestRejectSerializer(serializers.Serializer):
    """대여 요청 반려 시리얼라이저"""
    rejection_reason = serializers.CharField(min_length=1)
```

import 추가 (serializers.py 상단 import에):
```python
from apps.models import UnitRentalRequest
```

**Step 2: 커밋**

```bash
cd /Users/beomjun/PycharmProjects/unit_management_system
git add apps/serializers.py
git commit -m "feat: UnitRentalRequest 시리얼라이저 추가

## 1. 시리얼라이저 (apps/serializers.py)

### 내용
- UnitRentalRequestSerializer: 목록/상세 조회 (unit_info, reviewer_name 포함)
- UnitRentalRequestCreateSerializer: 생성 (unit_id, requester_warehouse_id, request_memo)
- UnitRentalRequestApproveSerializer: 승인 (shipping_method, approval_memo)
- UnitRentalRequestRejectSerializer: 반려 (rejection_reason 필수)"
```

---

### Task 4: View 및 URL 작성

**Files:**
- Modify: `/Users/beomjun/PycharmProjects/unit_management_system/apps/views.py` (끝부분에 추가)
- Modify: `/Users/beomjun/PycharmProjects/unit_management_system/apps/urls.py`

**Step 1: View 코드 작성**

`apps/views.py` 끝에 추가:

```python
from apps.models import UnitRentalRequest
from apps.serializers import (
    UnitRentalRequestSerializer,
    UnitRentalRequestCreateSerializer,
    UnitRentalRequestApproveSerializer,
    UnitRentalRequestRejectSerializer,
)
from apps.services.rental_service import RentalService


class RentalRequestListCreateView(generics.ListCreateAPIView):
    """
    대여 요청 목록 조회 및 생성
    GET: 내가 요청한 + 내가 검토해야 할 요청 목록
    POST: 새 대여 요청 생성
    """
    authentication_classes = [JWTAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return UnitRentalRequestCreateSerializer
        return UnitRentalRequestSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = UnitRentalRequest.objects.filter(
            Q(requester=user) | Q(reviewer=user)
        ).select_related(
            'unit', 'unit__unit_detail_type',
            'requester', 'reviewer',
            'requester_warehouse',
        ).order_by('-created_at')

        # 필터: role (requester/reviewer)
        role = self.request.query_params.get('role')
        if role == 'requester':
            queryset = queryset.filter(requester=user)
        elif role == 'reviewer':
            queryset = queryset.filter(reviewer=user)

        # 필터: status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        return queryset

    def create(self, request, *args, **kwargs):
        serializer = UnitRentalRequestCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = RentalService()
        unit = UnitObjectInfo.objects.get(id=serializer.validated_data['unit_id'])

        rental_request = service.create_request(
            user=request.user,
            unit=unit,
            requester_warehouse_id=serializer.validated_data['requester_warehouse_id'],
            request_memo=serializer.validated_data.get('request_memo', ''),
        )

        response_serializer = UnitRentalRequestSerializer(rental_request)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class RentalRequestDetailView(generics.RetrieveAPIView):
    """대여 요청 상세 조회 (요청자/검토자만 접근 가능)"""
    serializer_class = UnitRentalRequestSerializer
    authentication_classes = [JWTAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return UnitRentalRequest.objects.filter(
            Q(requester=user) | Q(reviewer=user)
        ).select_related(
            'unit', 'unit__unit_detail_type',
            'requester', 'reviewer',
            'requester_warehouse',
        )


class RentalRequestApproveView(generics.UpdateAPIView):
    """대여 요청 승인"""
    serializer_class = UnitRentalRequestApproveSerializer
    authentication_classes = [JWTAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UnitRentalRequest.objects.filter(reviewer=self.request.user)

    def update(self, request, *args, **kwargs):
        rental_request = self.get_object()
        serializer = UnitRentalRequestApproveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = RentalService()
        updated = service.approve_request(
            reviewer=request.user,
            rental_request=rental_request,
            shipping_method=serializer.validated_data['shipping_method'],
            approval_memo=serializer.validated_data.get('approval_memo', ''),
        )

        response_serializer = UnitRentalRequestSerializer(updated)
        return Response(response_serializer.data)


class RentalRequestRejectView(generics.UpdateAPIView):
    """대여 요청 반려"""
    serializer_class = UnitRentalRequestRejectSerializer
    authentication_classes = [JWTAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UnitRentalRequest.objects.filter(reviewer=self.request.user)

    def update(self, request, *args, **kwargs):
        rental_request = self.get_object()
        serializer = UnitRentalRequestRejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = RentalService()
        updated = service.reject_request(
            reviewer=request.user,
            rental_request=rental_request,
            rejection_reason=serializer.validated_data['rejection_reason'],
        )

        response_serializer = UnitRentalRequestSerializer(updated)
        return Response(response_serializer.data)


class RentalRequestCancelView(generics.UpdateAPIView):
    """대여 요청 취소"""
    authentication_classes = [JWTAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UnitRentalRequest.objects.filter(requester=self.request.user)

    def update(self, request, *args, **kwargs):
        rental_request = self.get_object()
        service = RentalService()
        updated = service.cancel_request(
            user=request.user,
            rental_request=rental_request,
        )

        response_serializer = UnitRentalRequestSerializer(updated)
        return Response(response_serializer.data)


class RentalWarehouseListView(generics.ListAPIView):
    """요청자 region 내 창고 목록"""
    serializer_class = UnitWarehouseListSerializer
    authentication_classes = [JWTAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user_profile = UserProfile.objects.get(user=self.request.user)
        return UnitWarehouse.objects.filter(
            warehouse_manage_team__region__region=user_profile.region,
            is_use=True
        ).order_by('seq_no', 'warehouse_name')
```

**Step 2: URL 패턴 추가**

`apps/urls.py`에 import 및 URL 추가:

import 추가:
```python
from apps.views import (
    RentalRequestListCreateView, RentalRequestDetailView,
    RentalRequestApproveView, RentalRequestRejectView,
    RentalRequestCancelView, RentalWarehouseListView,
)
```

urlpatterns에 추가:
```python
    # 대여 요청
    path('rental-requests/', RentalRequestListCreateView.as_view(), name='rental_request_list_create'),
    path('rental-requests/<int:pk>/', RentalRequestDetailView.as_view(), name='rental_request_detail'),
    path('rental-requests/<int:pk>/approve/', RentalRequestApproveView.as_view(), name='rental_request_approve'),
    path('rental-requests/<int:pk>/reject/', RentalRequestRejectView.as_view(), name='rental_request_reject'),
    path('rental-requests/<int:pk>/cancel/', RentalRequestCancelView.as_view(), name='rental_request_cancel'),
    path('rental-requests/warehouses/', RentalWarehouseListView.as_view(), name='rental_warehouse_list'),
```

**Step 3: 커밋**

```bash
cd /Users/beomjun/PycharmProjects/unit_management_system
git add apps/views.py apps/urls.py
git commit -m "feat: 대여 요청 REST API 엔드포인트 추가

## 1. Views (apps/views.py)

### 내용
- RentalRequestListCreateView: GET(목록)/POST(생성), role/status 필터
- RentalRequestDetailView: GET(상세), 요청자/검토자만 접근
- RentalRequestApproveView: PATCH(승인)
- RentalRequestRejectView: PATCH(반려)
- RentalRequestCancelView: PATCH(취소)
- RentalWarehouseListView: GET(요청자 region 내 창고)

## 2. URLs (apps/urls.py)

### 내용
- /apps/rental-requests/ (목록/생성)
- /apps/rental-requests/<id>/ (상세)
- /apps/rental-requests/<id>/approve/ (승인)
- /apps/rental-requests/<id>/reject/ (반려)
- /apps/rental-requests/<id>/cancel/ (취소)
- /apps/rental-requests/warehouses/ (창고 목록)"
```

---

## Phase 4: 모바일 - 네비게이션 및 API

### Task 5: 모바일 API 함수 추가

**Files:**
- Modify: `/Users/beomjun/PycharmProjects/unitmgmt/src/services/api/api.tsx` (끝부분에 추가)

**Step 1: API 함수 추가**

`src/services/api/api.tsx` 끝에 추가:

```typescript
// 대여 요청 API
export async function getRentalRequests(params?: {
  role?: 'requester' | 'reviewer';
  status?: string;
}) {
  return await api
    .get('/apps/rental-requests/', { params })
    .then(response => response.data);
}

export async function getRentalRequestDetail(id: number) {
  return await api
    .get(`/apps/rental-requests/${id}/`)
    .then(response => response.data);
}

export async function createRentalRequest(data: {
  unit_id: number;
  requester_warehouse_id: number;
  request_memo?: string;
}) {
  return await api
    .post('/apps/rental-requests/', data)
    .then(response => response.data);
}

export async function approveRentalRequest(
  id: number,
  data: { shipping_method: string; approval_memo?: string },
) {
  return await api
    .patch(`/apps/rental-requests/${id}/approve/`, data)
    .then(response => response.data);
}

export async function rejectRentalRequest(
  id: number,
  data: { rejection_reason: string },
) {
  return await api
    .patch(`/apps/rental-requests/${id}/reject/`, data)
    .then(response => response.data);
}

export async function cancelRentalRequest(id: number) {
  return await api
    .patch(`/apps/rental-requests/${id}/cancel/`)
    .then(response => response.data);
}

export async function getRentalWarehouses() {
  return await api
    .get('/apps/rental-requests/warehouses/')
    .then(response => response.data);
}
```

**Step 2: 커밋**

```bash
cd /Users/beomjun/PycharmProjects/unitmgmt
git add src/services/api/api.tsx
git commit -m "feat: 대여 요청 API 함수 추가 (api.tsx)"
```

---

### Task 6: 네비게이션 타입 및 라우트 추가

**Files:**
- Modify: `/Users/beomjun/PycharmProjects/unitmgmt/src/navigation/RootStackNavigation.tsx`

**Step 1: 네비게이션 타입 및 스크린 등록**

주의: 이 파일에는 한국어가 포함되어 있으므로 **Write 도구**를 사용해야 합니다.

변경사항:
1. 상단에 새 스크린 import 추가
2. `SearchStackParamList`에 `RequestCreateScreen` 추가
3. `UserinfoStackParamList`에 `RequestDetailScreen`, `RequestReviewScreen` 추가
4. `SearchStackNavigator`에 스크린 등록
5. `UserinfoStackNavigator`에 스크린 등록

`SearchStackParamList` 변경:
```typescript
export type SearchStackParamList = {
  SearchResult: undefined;
  UseUnitScreen: {
    result: any;
    initialActionType?: string;
  };
  RequestCreateScreen: {
    result: any;
  };
};
```

`UserinfoStackParamList` 변경:
```typescript
export type UserinfoStackParamList = {
  ChangeUserInfoScreen: undefined;
  MailBoxScreen: undefined;
  MyUnitListScreen: undefined;
  RequestDetailScreen: {
    requestId: number;
  };
  RequestReviewScreen: {
    requestId: number;
  };
};
```

import 추가:
```typescript
import { RequestCreateScreen } from '../screens/Request/RequestCreateScreen';
import { RequestDetailScreen } from '../screens/Request/RequestDetailScreen';
import { RequestReviewScreen } from '../screens/Request/RequestReviewScreen';
```

`SearchStackNavigator`에 추가:
```tsx
<SearchStack.Screen
  name="RequestCreateScreen"
  component={RequestCreateScreen}
/>
```

`UserinfoStackNavigator`에 추가:
```tsx
<UserinfoStack.Screen
  name="RequestDetailScreen"
  component={RequestDetailScreen}
/>
<UserinfoStack.Screen
  name="RequestReviewScreen"
  component={RequestReviewScreen}
/>
```

**Step 2: 커밋**

```bash
cd /Users/beomjun/PycharmProjects/unitmgmt
git add src/navigation/RootStackNavigation.tsx
git commit -m "feat: 대여 요청 스크린 네비게이션 등록"
```

---

## Phase 5: 모바일 - 화면 구현

### Task 7: RequestCreateScreen 구현

**Files:**
- Create: `/Users/beomjun/PycharmProjects/unitmgmt/src/screens/Request/RequestCreateScreen.tsx`

**Step 1: 스크린 작성**

주의: 한국어 포함 파일이므로 **Write 도구** 사용 필수.

핵심 구현 사항:
- `useRoute`로 `result` 파라미터 수신 (SearchResultScreen에서 넘어옴)
- 3 섹션: 유니트 정보(readonly), 선택항목(드롭다운+메모), 요청 버튼
- `getRentalWarehouses()` API로 요청 장소 드롭다운 데이터 로드
- `createRentalRequest()` API 호출
- 기존 패턴 참고: Surface > Appbar.Header > ScrollView > Snackbar
- 브랜드 컬러, scale/verticalScale, React Native Paper 컴포넌트 사용

드롭다운 구현은 기존 `UseUnitScreen.tsx`의 `expanded` state 패턴 참고:
```typescript
const [expanded, setExpanded] = useState<string | null>(null);
```

**Step 2: 커밋**

```bash
cd /Users/beomjun/PycharmProjects/unitmgmt
git add src/screens/Request/RequestCreateScreen.tsx
git commit -m "feat: RequestCreateScreen 구현

- 유니트 정보 (readonly), 선택항목 (요청장소 드롭다운, 요청메모), 요청 버튼
- getRentalWarehouses API 연동
- createRentalRequest API 연동"
```

---

### Task 8: RequestDetailScreen 구현

**Files:**
- Create: `/Users/beomjun/PycharmProjects/unitmgmt/src/screens/Request/RequestDetailScreen.tsx`

**Step 1: 스크린 작성**

주의: 한국어 포함 파일이므로 **Write 도구** 사용 필수.

핵심 구현 사항:
- `useRoute`로 `requestId` 파라미터 수신
- `getRentalRequestDetail(requestId)` API로 데이터 로드
- 3 섹션: 유니트 정보(readonly), 요청/처리 정보(readonly), 하단 버튼
- 역할 판단: `useAuth()`의 `user.user_id`와 `request.requester` 비교
- 버튼 조건:
  - 요청자 + 대기 → [취소] 버튼 (cancelRentalRequest API)
  - 검토자 + 대기 → [승인][반려] 버튼 → RequestReviewScreen 네비게이션
  - 그 외 → 버튼 없음
- 승인됨: 발송 방법, 승인 메모, 처리 일시 표시
- 반려됨: 반려 사유, 처리 일시 표시
- 상태별 색상 뱃지 (대기:주황, 승인:초록, 반려:빨강, 취소:회색)

**Step 2: 커밋**

```bash
cd /Users/beomjun/PycharmProjects/unitmgmt
git add src/screens/Request/RequestDetailScreen.tsx
git commit -m "feat: RequestDetailScreen 구현

- 요청 상세 조회 (유니트정보, 요청정보, 처리정보)
- 역할별 버튼 (요청자:취소, 검토자:승인/반려)
- 상태별 색상 뱃지"
```

---

### Task 9: RequestReviewScreen 구현

**Files:**
- Create: `/Users/beomjun/PycharmProjects/unitmgmt/src/screens/Request/RequestReviewScreen.tsx`

**Step 1: 스크린 작성**

주의: 한국어 포함 파일이므로 **Write 도구** 사용 필수.

핵심 구현 사항:
- `useRoute`로 `requestId` 파라미터 수신
- `getRentalRequestDetail(requestId)` API로 데이터 로드
- 유니트/요청 요약 (readonly, 간략)
- SegmentedButtons로 승인/반려 선택 (React Native Paper)
- 승인 선택 시:
  - 발송 방법 드롭다운 (직접수령/택배/차량운송)
  - 메모 TextInput (multiline)
  - [승인하기] 버튼 → `approveRentalRequest()` API
- 반려 선택 시:
  - 반려 사유 TextInput (multiline, 필수)
  - [반려하기] 버튼 → `rejectRentalRequest()` API
- 처리 완료 후 goBack() 또는 MailBoxScreen으로 네비게이션

**Step 2: 커밋**

```bash
cd /Users/beomjun/PycharmProjects/unitmgmt
git add src/screens/Request/RequestReviewScreen.tsx
git commit -m "feat: RequestReviewScreen 구현

- 승인/반려 선택 (SegmentedButtons)
- 승인: 발송 방법 드롭다운 + 메모
- 반려: 반려 사유 필수 입력
- API 연동 (approveRentalRequest, rejectRentalRequest)"
```

---

## Phase 6: 모바일 - 기존 화면 수정

### Task 10: ActionButtons에 대여 요청 버튼 추가

**Files:**
- Modify: `/Users/beomjun/PycharmProjects/unitmgmt/src/components/Search/ActionButtons.tsx`

**Step 1: 대여 요청 버튼 추가**

주의: 한국어 포함 파일이므로 **Write 도구** 사용 필수.

변경사항:
1. `useAuth` import 추가
2. props에서 `result`의 `last_manage_history.location_context_instance`의 관리팀 정보 확인
3. 유니트의 관리팀(warehouse_manage_team 또는 zp_manage_team 등) ≠ `user.team`일 때 "대여 요청" 버튼 표시
4. 버튼 클릭 시 `navigation.navigate('RequestCreateScreen', { result })` 호출

대여 요청 버튼 조건 로직:
```typescript
const { user } = useAuth();

const shouldShowRentalButton = () => {
  const location = result?.last_manage_history?.location;
  const instance = result?.last_manage_history?.location_context_instance;
  if (!instance || !user?.team) return false;

  // 창고에 있는 유니트만 대여 요청 가능
  if (location !== '창고') return false;

  // 관리팀이 다른 경우에만 표시
  return instance.warehouse_manage_team !== user.team;
};
```

대여 요청 버튼 렌더:
```tsx
{shouldShowRentalButton() && (
  <Button
    mode="contained"
    onPress={() => navigation.navigate('RequestCreateScreen', { result })}
    style={[styles.actionButton, { backgroundColor: BRAND_COLORS.primary }]}
    labelStyle={styles.actionButtonText}
    icon="hand-extended-outline"
  >
    대여 요청
  </Button>
)}
```

**Step 2: 커밋**

```bash
cd /Users/beomjun/PycharmProjects/unitmgmt
git add src/components/Search/ActionButtons.tsx
git commit -m "feat: ActionButtons에 대여 요청 버튼 추가

- 유니트 관리팀 != 사용자 팀일 때만 표시
- 창고 위치 유니트에만 대여 요청 가능
- RequestCreateScreen으로 네비게이션"
```

---

### Task 11: MailBoxScreen 리팩토링

**Files:**
- Modify: `/Users/beomjun/PycharmProjects/unitmgmt/src/screens/UserInfo/MailBoxScreen.tsx`

**Step 1: 실제 API 연동으로 리팩토링**

주의: 한국어 포함 파일이므로 **Write 도구** 사용 필수.

변경사항:
1. 기존 mock 데이터 제거, `getRentalRequests()` API 연동
2. 탭 구조 변경: 기존 상태별(대기/승인/반려) → 역할별("내 요청"/"검토 대기")
3. 각 탭 내에서 상태별 SegmentedButtons 필터 유지
4. FlatList 항목 클릭 시 `RequestDetailScreen`으로 네비게이션
5. useFocusEffect로 화면 포커스 시 데이터 리로드
6. 상태 뱃지 색상: pending=주황(#FF9500), approved=초록(#4CAF50), rejected=빨강(#F44336), cancelled=회색(#999999)

탭 구조:
```typescript
const [activeTab, setActiveTab] = useState<'requester' | 'reviewer'>('requester');
```

네비게이션:
```typescript
navigation.navigate('UserinfoStack', {
  screen: 'RequestDetailScreen',
  params: { requestId: item.id },
});
```

**Step 2: 커밋**

```bash
cd /Users/beomjun/PycharmProjects/unitmgmt
git add src/screens/UserInfo/MailBoxScreen.tsx
git commit -m "feat: MailBoxScreen 리팩토링 - API 연동

- mock 데이터 제거, getRentalRequests API 연동
- 역할별 탭 (내 요청/검토 대기)
- 항목 클릭 시 RequestDetailScreen 네비게이션
- 상태별 뱃지 색상"
```

---

### Task 12: HomeScreen 결재 대기 건수 연동

**Files:**
- Modify: `/Users/beomjun/PycharmProjects/unitmgmt/src/screens/Main/HomeScreen.tsx`

**Step 1: 결재 대기 건수 API 연동**

HomeScreen의 "결재 대기: 0건" 카드를 실제 API 데이터와 연동.

`getRentalRequests({ role: 'reviewer', status: 'pending' })`로 대기 건수 조회하여 표시.

**Step 2: 커밋**

```bash
cd /Users/beomjun/PycharmProjects/unitmgmt
git add src/screens/Main/HomeScreen.tsx
git commit -m "feat: HomeScreen 결재 대기 건수 API 연동"
```

---

## Phase 7: 테스트

### Task 13: 백엔드 테스트 작성

**Files:**
- Create: `/Users/beomjun/PycharmProjects/unit_management_system/tests/test_rental_service.py`
- Create: `/Users/beomjun/PycharmProjects/unit_management_system/tests/test_rental_api.py`

**Step 1: 서비스 레이어 테스트**

테스트 항목:
- `test_should_create_rental_request_when_different_team`
- `test_should_reject_creation_when_same_team`
- `test_should_reject_creation_when_duplicate_pending`
- `test_should_approve_request_when_reviewer`
- `test_should_reject_when_not_pending`
- `test_should_cancel_request_when_requester`
- `test_should_reject_cancel_when_not_requester`
- `test_should_assign_reviewer_from_warehouse_users`

**Step 2: API 테스트**

테스트 항목:
- `test_list_requests_as_requester`
- `test_list_requests_as_reviewer`
- `test_create_request_success`
- `test_detail_access_only_for_involved_users`
- `test_approve_request_success`
- `test_reject_request_requires_reason`
- `test_cancel_request_success`
- `test_warehouse_list_filtered_by_region`

**Step 3: 커밋**

```bash
cd /Users/beomjun/PycharmProjects/unit_management_system
git add tests/
git commit -m "test: 대여 요청 서비스 및 API 테스트 추가"
```

---

## 구현 순서 요약

| Phase | Task | 프로젝트 | 내용 |
|-------|------|---------|------|
| 1 | Task 1 | Backend | UnitRentalRequest 모델 + 마이그레이션 |
| 2 | Task 2 | Backend | RentalService 서비스 레이어 |
| 3 | Task 3 | Backend | 시리얼라이저 |
| 3 | Task 4 | Backend | View + URL |
| 4 | Task 5 | Mobile | API 함수 추가 |
| 4 | Task 6 | Mobile | 네비게이션 타입/라우트 |
| 5 | Task 7 | Mobile | RequestCreateScreen |
| 5 | Task 8 | Mobile | RequestDetailScreen |
| 5 | Task 9 | Mobile | RequestReviewScreen |
| 6 | Task 10 | Mobile | ActionButtons 수정 |
| 6 | Task 11 | Mobile | MailBoxScreen 리팩토링 |
| 6 | Task 12 | Mobile | HomeScreen 결재 건수 |
| 7 | Task 13 | Backend | 테스트 작성 |
