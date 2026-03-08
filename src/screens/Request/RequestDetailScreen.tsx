import React, { useState, useCallback } from 'react';
import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import { useNavigation, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Text,
  Button,
  Surface,
  Appbar,
  ActivityIndicator,
} from 'react-native-paper';
import { scale, verticalScale } from 'react-native-size-matters';
import { useAuth } from '../../store/AuthContext';
import { getRentalRequestDetail, cancelRentalRequest } from '../../services/api/api';
import { COLORS, STATUS_COLORS } from '../../constants/colors';
import { getLocationDisplay } from '../../utils/locationDisplay';
import { formatDateTime } from '../../utils/formatDate';
import { SafeSnackbar } from '../../components/common/SafeSnackbar';
import type { UserinfoStackParamList } from '../../navigation/RootStackNavigation';

type RequestDetailScreenRouteProp = RouteProp<UserinfoStackParamList, 'RequestDetailScreen'>;

interface Props {
  route: RequestDetailScreenRouteProp;
}

export const RequestDetailScreen: React.FC<Props> = ({ route }) => {
  const { user } = useAuth();
  const { requestId } = route.params;
  const navigation = useNavigation<NativeStackNavigationProp<UserinfoStackParamList>>();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getRentalRequestDetail(requestId);
      setData(response);
    } catch (error: any) {
      console.log('Failed to load request detail:', error);
      setSnackbar({ visible: true, message: '요청 상세 정보를 불러오는데 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useFocusEffect(
    useCallback(() => {
      fetchDetail();
    }, [fetchDetail]),
  );

  const handleCancel = () => {
    Alert.alert(
      '요청 취소',
      '대여 요청을 취소하시겠습니까?',
      [
        { text: '아니오', style: 'cancel' },
        {
          text: '예',
          style: 'destructive',
          onPress: async () => {
            setCancelLoading(true);
            try {
              await cancelRentalRequest(requestId);
              setSnackbar({ visible: true, message: '요청이 취소되었습니다.' });
              fetchDetail();
            } catch (error: any) {
              const msg = error?.response?.data?.detail || '요청 취소에 실패했습니다.';
              setSnackbar({ visible: true, message: msg });
            } finally {
              setCancelLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleNavigateReview = () => {
    navigation.navigate('RequestReviewScreen', { requestId });
  };

  const isRequester = user?.user_id === data?.requester;
  const isReviewer = user?.user_id === data?.reviewer;
  const isPending = data?.status === 'pending';
  const isApproved = data?.status === 'approved';
  const isRejected = data?.status === 'rejected';

  return (
    <Surface style={styles.container}>
      <Appbar.Header style={styles.appbar}>
        <Appbar.BackAction
          onPress={() => navigation.goBack()}
          iconColor={COLORS.text}
        />
        <Appbar.Content
          title="요청 상세"
          titleStyle={styles.appbarTitle}
        />
      </Appbar.Header>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : data ? (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Section 1: 유니트 정보 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>유니트 정보</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>SKT바코드</Text>
                <Text style={styles.infoValue}>{data.unit_info?.skt_barcode || '-'}</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>제조사S/N</Text>
                <Text style={styles.infoValue}>{data.unit_info?.unit_serial || '-'}</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>상세타입</Text>
                <Text style={styles.infoValue}>{data.unit_info?.detail_typename || '-'}</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>현재위치</Text>
                <Text style={styles.infoValue} numberOfLines={1} ellipsizeMode="tail">
                  {getLocationDisplay(data?.unit_info?.last_manage_history)}
                </Text>
              </View>
            </View>
          </View>

          {/* Section 2: 요청/처리 정보 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>요청/처리 정보</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>요청일시</Text>
                <Text style={styles.infoValue}>{formatDateTime(data.created_at)}</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>요청자</Text>
                <Text style={styles.infoValue}>
                  {data.requester_name || '-'} ({data.requester_username || '-'})
                </Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>요청 장소</Text>
                <Text style={styles.infoValue}>{data.requester_warehouse_name || '-'}</Text>
              </View>
              {data.request_memo ? (
                <>
                  <View style={styles.infoDivider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>요청 메모</Text>
                    <Text style={styles.infoValue} numberOfLines={3}>
                      {data.request_memo}
                    </Text>
                  </View>
                </>
              ) : null}
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>상태</Text>
                <View style={styles.badgeContainer}>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: STATUS_COLORS[data.status] || COLORS.textTertiary },
                    ]}
                  >
                    <Text style={styles.statusBadgeText}>{data.status_display || '-'}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>검토 담당자</Text>
                <Text style={styles.infoValue}>
                  {data.reviewer_name && data.reviewer_warehouse_manage_team
                    ? `${data.reviewer_name}(${data.reviewer_warehouse_manage_team})`
                    : data.reviewer_name || '-'}
                </Text>
              </View>

              {/* Approved-specific fields */}
              {isApproved && (
                <>
                  <View style={styles.infoDivider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>발송 방법</Text>
                    <Text style={styles.infoValue}>{data.shipping_method_display || '-'}</Text>
                  </View>
                  <View style={styles.infoDivider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>승인 메모</Text>
                    <Text style={styles.infoValue} numberOfLines={3}>
                      {data.approval_memo || '-'}
                    </Text>
                  </View>
                  <View style={styles.infoDivider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>처리 일시</Text>
                    <Text style={styles.infoValue}>{formatDateTime(data.reviewed_at)}</Text>
                  </View>
                </>
              )}

              {/* Rejected-specific fields */}
              {isRejected && (
                <>
                  <View style={styles.infoDivider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>반려 사유</Text>
                    <Text style={styles.infoValue} numberOfLines={3}>
                      {data.rejection_reason || '-'}
                    </Text>
                  </View>
                  <View style={styles.infoDivider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>처리 일시</Text>
                    <Text style={styles.infoValue}>{formatDateTime(data.reviewed_at)}</Text>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* Section 3: 하단 버튼 */}
          {isRequester && isPending && (
            <View style={styles.buttonContainer}>
              <Button
                mode="contained"
                onPress={handleCancel}
                style={styles.cancelButton}
                buttonColor="#F44336"
                labelStyle={styles.buttonText}
                loading={cancelLoading}
                disabled={cancelLoading}
              >
                취소
              </Button>
            </View>
          )}

          {isReviewer && isPending && (
            <View style={styles.buttonContainer}>
              <Button
                mode="contained"
                onPress={handleNavigateReview}
                style={styles.submitButton}
                buttonColor={COLORS.primary}
                labelStyle={styles.buttonText}
              >
                승인/반려 처리
              </Button>
            </View>
          )}
        </ScrollView>
      ) : (
        <View style={styles.loadingContainer}>
          <Text style={styles.emptyText}>요청 정보를 찾을 수 없습니다.</Text>
        </View>
      )}

      <SafeSnackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
        duration={3000}
        style={styles.snackbar}
        theme={{ colors: { primary: COLORS.primary } }}
        action={{
          label: '확인',
          labelStyle: { color: COLORS.primary },
          onPress: () => setSnackbar({ ...snackbar, visible: false }),
        }}
      >
        {snackbar.message}
      </SafeSnackbar>
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  appbar: {
    backgroundColor: COLORS.background,
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  appbarTitle: {
    color: COLORS.text,
    fontWeight: '800',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: scale(20),
  },
  section: {
    marginBottom: verticalScale(10),
  },
  sectionTitle: {
    fontSize: scale(16),
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: verticalScale(12),
  },
  // Unit info card
  infoCard: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: scale(8),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(4),
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: verticalScale(10),
  },
  infoLabel: {
    fontSize: scale(12),
    fontWeight: '500',
    color: COLORS.textSecondary,
    flex: 1,
  },
  infoValue: {
    fontSize: scale(12),
    fontWeight: '600',
    color: COLORS.text,
    flex: 2,
    textAlign: 'right',
  },
  infoDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
  },
  // Status badge
  badgeContainer: {
    flex: 2,
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: scale(12),
  },
  statusBadgeText: {
    fontSize: scale(12),
    fontWeight: '700',
    color: COLORS.textWhite,
  },
  // Buttons
  buttonContainer: {
    paddingVertical: verticalScale(16),
    paddingBottom: verticalScale(32),
  },
  submitButton: {
    borderRadius: scale(8),
    minHeight: verticalScale(40),
    justifyContent: 'center',
  },
  cancelButton: {
    borderRadius: scale(8),
    minHeight: verticalScale(40),
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textWhite,
  },
  emptyText: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
  },
  // Snackbar
  snackbar: {
    backgroundColor: COLORS.text,
    marginBottom: verticalScale(20),
  },
});
