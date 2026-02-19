import React, { useState, useCallback } from 'react';
import { StyleSheet, TouchableOpacity, View, ScrollView } from 'react-native';
import { useNavigation, RouteProp, useFocusEffect } from '@react-navigation/native';
import {
  Text,
  TextInput,
  Button,
  Surface,
  Appbar,
  Snackbar,
  ActivityIndicator,
  SegmentedButtons,
} from 'react-native-paper';
import { scale, verticalScale } from 'react-native-size-matters';
import { getRentalRequestDetail, approveRentalRequest, rejectRentalRequest } from '../../services/api/api';
import type { UserinfoStackParamList } from '../../navigation/RootStackNavigation';

// KakaoTalk-style colors
const COLORS = {
  primary: '#F47725',
  primaryLight: 'rgba(244, 119, 37, 0.1)',
  background: '#FFFFFF',
  surface: '#F9F9F9',
  text: '#000000',
  textSecondary: '#666666',
  textTertiary: '#999999',
  textWhite: '#FFFFFF',
  border: '#E0E0E0',
  divider: '#F0F0F0',
};

const shippingMethods = [
  { value: 'pickup', label: '직접수령' },
  { value: 'delivery', label: '택배' },
  { value: 'vehicle', label: '차량운송' },
];

type RequestReviewScreenRouteProp = RouteProp<UserinfoStackParamList, 'RequestReviewScreen'>;

interface Props {
  route: RequestReviewScreenRouteProp;
}

export const RequestReviewScreen: React.FC<Props> = ({ route }) => {
  const { requestId } = route.params;
  const navigation = useNavigation();

  // Data loading state
  const [data, setData] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(true);

  // Review mode state
  const [reviewMode, setReviewMode] = useState<string>('approve');

  // Approve form states
  const [selectedShippingMethod, setSelectedShippingMethod] = useState<{ value: string; label: string } | null>(null);
  const [approvalMemo, setApprovalMemo] = useState('');

  // Reject form state
  const [rejectionReason, setRejectionReason] = useState('');

  // UI states
  const [expanded, setExpanded] = useState<string | null>(null);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  // Load request detail on mount
  useFocusEffect(
    useCallback(() => {
      const fetchDetail = async () => {
        setDataLoading(true);
        try {
          const response = await getRentalRequestDetail(requestId);
          setData(response);
        } catch (error: any) {
          console.log('Failed to load request detail:', error);
          setSnackbar({ visible: true, message: '요청 상세 정보를 불러오는데 실패했습니다.' });
        } finally {
          setDataLoading(false);
        }
      };
      fetchDetail();
    }, [requestId]),
  );

  const getLocationDisplay = () => {
    const history = data?.unit_info?.last_manage_history;
    if (!history) return '-';

    const location = history.location || '';
    const contextInstance = history.location_context_instance;

    if (contextInstance) {
      const name =
        contextInstance.warehouse_name ||
        contextInstance.zp_name ||
        contextInstance.name ||
        '';
      return name ? `${location} (${name})` : location;
    }
    return location;
  };

  const handleSelectShippingMethod = (method: { value: string; label: string }) => {
    setSelectedShippingMethod(method);
    setExpanded(null);
  };

  const handleApprove = async () => {
    if (!selectedShippingMethod) {
      setSnackbar({ visible: true, message: '발송 방법을 선택해주세요.' });
      return;
    }
    setLoading(true);
    try {
      await approveRentalRequest(requestId, {
        shipping_method: selectedShippingMethod.value,
        approval_memo: approvalMemo,
      });
      setSnackbar({ visible: true, message: '대여 요청이 승인되었습니다.' });
      setTimeout(() => navigation.goBack(), 1500);
    } catch (error: any) {
      const msg = error?.response?.data?.detail || '승인 처리에 실패했습니다.';
      setSnackbar({ visible: true, message: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setSnackbar({ visible: true, message: '반려 사유를 입력해주세요.' });
      return;
    }
    setLoading(true);
    try {
      await rejectRentalRequest(requestId, {
        rejection_reason: rejectionReason,
      });
      setSnackbar({ visible: true, message: '대여 요청이 반려되었습니다.' });
      setTimeout(() => navigation.goBack(), 1500);
    } catch (error: any) {
      const msg = error?.response?.data?.detail || '반려 처리에 실패했습니다.';
      setSnackbar({ visible: true, message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Surface style={styles.container}>
      <Appbar.Header style={styles.appbar}>
        <Appbar.BackAction
          onPress={() => navigation.goBack()}
          iconColor={COLORS.text}
        />
        <Appbar.Content
          title="승인/반려 처리"
          titleStyle={styles.appbarTitle}
        />
      </Appbar.Header>

      {dataLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : data ? (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* 유니트/요청 요약 (readonly, 간략) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>유니트/요청 요약</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>SKT바코드</Text>
                <Text style={styles.infoValue}>{data.unit_info?.skt_barcode || '-'}</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>상세타입</Text>
                <Text style={styles.infoValue}>{data.unit_info?.detail_typename || '-'}</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>현재위치</Text>
                <Text style={styles.infoValue} numberOfLines={2}>
                  {getLocationDisplay()}
                </Text>
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
            </View>
          </View>

          {/* SegmentedButtons for 승인/반려 선택 */}
          <SegmentedButtons
            value={reviewMode}
            onValueChange={setReviewMode}
            buttons={[
              { value: 'approve', label: '승인', icon: 'check-circle-outline' },
              { value: 'reject', label: '반려', icon: 'close-circle-outline' },
            ]}
            style={{ marginBottom: verticalScale(16) }}
          />

          {/* Conditional form based on selection */}
          {reviewMode === 'approve' ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>승인 처리</Text>

              {/* 발송 방법 Dropdown */}
              <View style={styles.dropdownSection}>
                <Text style={styles.label}>발송 방법</Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() =>
                    setExpanded(expanded === 'shipping' ? null : 'shipping')
                  }
                >
                  <Text style={styles.dropdownText}>
                    {selectedShippingMethod?.label || '발송 방법을 선택해주세요'}
                  </Text>
                  <Text style={styles.dropdownIcon}>
                    {expanded === 'shipping' ? '▲' : '▼'}
                  </Text>
                </TouchableOpacity>

                {expanded === 'shipping' && (
                  <View style={styles.dropdownOptions}>
                    {shippingMethods.map((method, index) => (
                      <TouchableOpacity
                        key={method.value}
                        style={[
                          styles.dropdownOption,
                          index === shippingMethods.length - 1 &&
                            styles.dropdownOptionLast,
                        ]}
                        onPress={() => handleSelectShippingMethod(method)}
                      >
                        <Text style={styles.dropdownOptionText}>
                          {method.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* 메모 TextInput */}
              <Text style={styles.label}>메모</Text>
              <TextInput
                value={approvalMemo}
                onChangeText={setApprovalMemo}
                placeholder="승인 메모를 입력해주세요. (선택)"
                mode="flat"
                multiline
                style={[
                  styles.textInput,
                  focusedInput === 'approvalMemo' && styles.textInputActive,
                ]}
                textColor={COLORS.text}
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                selectionColor={COLORS.primary}
                cursorColor={COLORS.primary}
                onFocus={() => setFocusedInput('approvalMemo')}
                onBlur={() => setFocusedInput(null)}
              />

              {/* 승인하기 버튼 */}
              <View style={styles.buttonContainer}>
                <Button
                  mode="contained"
                  onPress={handleApprove}
                  style={styles.submitButton}
                  buttonColor={COLORS.primary}
                  labelStyle={styles.submitButtonText}
                  loading={loading}
                  disabled={loading}
                >
                  승인하기
                </Button>
              </View>
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>반려 처리</Text>

              {/* 반려 사유 TextInput */}
              <Text style={styles.label}>반려 사유</Text>
              <TextInput
                value={rejectionReason}
                onChangeText={setRejectionReason}
                placeholder="반려 사유를 입력해주세요. (필수)"
                mode="flat"
                multiline
                style={[
                  styles.textInput,
                  focusedInput === 'rejectionReason' && styles.textInputActive,
                ]}
                textColor={COLORS.text}
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                selectionColor={COLORS.primary}
                cursorColor={COLORS.primary}
                onFocus={() => setFocusedInput('rejectionReason')}
                onBlur={() => setFocusedInput(null)}
              />

              {/* 반려하기 버튼 */}
              <View style={styles.buttonContainer}>
                <Button
                  mode="contained"
                  onPress={handleReject}
                  style={styles.submitButton}
                  buttonColor="#F44336"
                  labelStyle={styles.submitButtonText}
                  loading={loading}
                  disabled={loading}
                >
                  반려하기
                </Button>
              </View>
            </View>
          )}
        </ScrollView>
      ) : (
        <View style={styles.loadingContainer}>
          <Text style={styles.emptyText}>요청 정보를 찾을 수 없습니다.</Text>
        </View>
      )}

      <Snackbar
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
        <Text style={styles.snackbarText}>{snackbar.message}</Text>
      </Snackbar>
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
  label: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: verticalScale(8),
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
    fontSize: scale(13),
    fontWeight: '500',
    color: COLORS.textSecondary,
    flex: 1,
  },
  infoValue: {
    fontSize: scale(13),
    fontWeight: '600',
    color: COLORS.text,
    flex: 2,
    textAlign: 'right',
  },
  infoDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
  },
  // Dropdown
  dropdownSection: {
    marginBottom: verticalScale(12),
  },
  dropdown: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: scale(8),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownText: {
    fontSize: scale(14),
    color: COLORS.text,
    flex: 1,
  },
  dropdownIcon: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
  },
  dropdownOptions: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: scale(8),
    marginTop: verticalScale(4),
    overflow: 'hidden',
  },
  dropdownOption: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dropdownOptionLast: {
    borderBottomWidth: 0,
  },
  dropdownOptionText: {
    fontSize: scale(14),
    color: COLORS.text,
  },
  // TextInput
  textInput: {
    backgroundColor: COLORS.primaryLight,
    fontSize: scale(14),
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopLeftRadius: scale(10),
    borderTopRightRadius: scale(10),
    borderBottomLeftRadius: scale(10),
    borderBottomRightRadius: scale(10),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(6),
    minHeight: verticalScale(80),
  },
  textInputActive: {
    borderColor: COLORS.primary,
  },
  // Submit button
  buttonContainer: {
    paddingVertical: verticalScale(16),
    paddingBottom: verticalScale(32),
  },
  submitButton: {
    borderRadius: scale(8),
    minHeight: verticalScale(40),
    justifyContent: 'center',
  },
  submitButtonText: {
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
  snackbarText: {
    color: COLORS.background,
  },
});
