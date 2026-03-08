import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, TouchableOpacity, View, ScrollView } from 'react-native';
import { useNavigation, RouteProp } from '@react-navigation/native';
import {
  Text,
  TextInput,
  Button,
  Surface,
  Appbar,
} from 'react-native-paper';
import { scale, verticalScale } from 'react-native-size-matters';
import { useAuth } from '../../store/AuthContext';
import { createRentalRequest, getRentalWarehouses } from '../../services/api/api';
import { COLORS } from '../../constants/colors';
import { getLocationDisplay } from '../../utils/locationDisplay';
import { SafeSnackbar } from '../../components/common/SafeSnackbar';
import type { SearchStackParamList } from '../../navigation/RootStackNavigation';

type RequestCreateScreenRouteProp = RouteProp<SearchStackParamList, 'RequestCreateScreen'>;

interface Props {
  route: RequestCreateScreenRouteProp;
}

export const RequestCreateScreen: React.FC<Props> = ({ route }) => {
  const { user } = useAuth();
  const { result } = route.params;
  const navigation = useNavigation();

  // Warehouse list state
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [warehousesLoading, setWarehousesLoading] = useState(false);

  // Form states
  const [selectedWarehouse, setSelectedWarehouse] = useState<any>(null);
  const [memo, setMemo] = useState('');
  const [loading, setLoading] = useState(false);

  // UI states
  const [expanded, setExpanded] = useState<string | null>(null);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Load warehouses on mount
  useEffect(() => {
    const fetchWarehouses = async () => {
      setWarehousesLoading(true);
      try {
        const data = await getRentalWarehouses();
        setWarehouses(Array.isArray(data) ? data : data?.results || []);
      } catch (error) {
        console.log('Failed to load warehouses:', error);
        setSnackbar({ visible: true, message: '창고 목록을 불러오는데 실패했습니다.' });
      } finally {
        setWarehousesLoading(false);
      }
    };
    fetchWarehouses();
  }, []);

  // Helper to get reviewer display text (검토 담당자)
  const getReviewerDisplay = () => {
    const contextInstance = result?.last_manage_history?.location_context_instance;
    if (!contextInstance) return '-';
    const reviewerName = contextInstance.reviewer_name || '';
    const manageTeam = contextInstance.warehouse_manage_team || contextInstance.zp_manage_team || '';
    if (reviewerName && manageTeam) {
      return `${reviewerName}(${manageTeam})`;
    }
    if (reviewerName) return reviewerName;
    if (manageTeam) return manageTeam;
    return '-';
  };

  const handleSelectWarehouse = (warehouse: any) => {
    setSelectedWarehouse(warehouse);
    setExpanded(null);
  };

  const handleSubmit = async () => {
    if (!selectedWarehouse) {
      setSnackbar({ visible: true, message: '요청 장소를 선택해주세요.' });
      return;
    }
    setLoading(true);
    try {
      await createRentalRequest({
        unit_id: result.id,
        requester_warehouse_id: selectedWarehouse.id,
        request_memo: memo,
      });
      setSnackbar({ visible: true, message: '대여 요청이 완료되었습니다.' });
      timeoutRef.current = setTimeout(() => navigation.goBack(), 1500);
    } catch (error: any) {
      const msg = error?.response?.data?.detail || '대여 요청에 실패했습니다.';
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
          title="대여 요청"
          titleStyle={styles.appbarTitle}
        />
      </Appbar.Header>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 유니트 정보 (readonly) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>유니트 정보</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>SKT바코드</Text>
              <Text style={styles.infoValue}>{result?.skt_barcode || '-'}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>제조사S/N</Text>
              <Text style={styles.infoValue}>{result?.unit_serial || '-'}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>상세타입</Text>
              <Text style={styles.infoValue}>{result?.detail_typename || '-'}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>현재위치</Text>
              <Text style={styles.infoValue} numberOfLines={1} ellipsizeMode="tail">
                {getLocationDisplay(result?.last_manage_history)}
              </Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>검토 담당자</Text>
              <Text style={[styles.infoValue, styles.reviewerText]}>
                {getReviewerDisplay()}
              </Text>
            </View>
          </View>
          <Text style={styles.hintText}>
            * 검토자는 현재 유니트가 위치한 창고의 담당자가 자동 배정됩니다.
          </Text>
        </View>

        {/* 선택 항목 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>선택 항목</Text>

          {/* 요청 장소 Dropdown */}
          <View style={styles.dropdownSection}>
            <Text style={styles.label}>요청 장소</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() =>
                setExpanded(expanded === 'warehouse' ? null : 'warehouse')
              }
            >
              <View style={styles.dropdownTextContainer}>
                <Text style={styles.dropdownText}>
                  {selectedWarehouse?.warehouse_name || '요청 장소를 선택해주세요'}
                </Text>
                {selectedWarehouse?.warehouse_manage_team && (
                  <Text style={styles.dropdownSubText}>
                    담당팀: {selectedWarehouse.warehouse_manage_team}
                  </Text>
                )}
              </View>
              <Text style={styles.dropdownIcon}>
                {expanded === 'warehouse' ? '▲' : '▼'}
              </Text>
            </TouchableOpacity>

            {expanded === 'warehouse' && (
              <View style={styles.dropdownOptions}>
                {warehousesLoading ? (
                  <View style={styles.dropdownOption}>
                    <Text style={styles.dropdownOptionText}>로딩 중...</Text>
                  </View>
                ) : warehouses.length > 0 ? (
                  warehouses.map((warehouse: any, index: number) => (
                    <TouchableOpacity
                      key={warehouse.id}
                      style={[
                        styles.dropdownOption,
                        index === warehouses.length - 1 &&
                          styles.dropdownOptionLast,
                      ]}
                      onPress={() => handleSelectWarehouse(warehouse)}
                    >
                      <Text style={styles.dropdownOptionText}>
                        {warehouse.warehouse_name}
                      </Text>
                      {warehouse.warehouse_manage_team && (
                        <Text style={styles.dropdownOptionSubText}>
                          담당팀: {warehouse.warehouse_manage_team}
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.dropdownOption}>
                    <Text style={styles.dropdownOptionText}>
                      창고 목록이 없습니다
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* 요청 메모 */}
          <Text style={styles.label}>요청 메모</Text>
          <TextInput
            value={memo}
            onChangeText={setMemo}
            placeholder="요청 메모를 입력해주세요. (선택)"
            mode="flat"
            multiline
            style={[
              styles.textInput,
              focusedInput === 'memo' && styles.textInputActive,
            ]}
            textColor={COLORS.text}
            underlineColor="transparent"
            activeUnderlineColor="transparent"
            selectionColor={COLORS.primary}
            cursorColor={COLORS.primary}
            onFocus={() => setFocusedInput('memo')}
            onBlur={() => setFocusedInput(null)}
          />
        </View>

        {/* 요청 버튼 */}
        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={handleSubmit}
            style={styles.submitButton}
            buttonColor={COLORS.primary}
            labelStyle={styles.submitButtonText}
            loading={loading}
            disabled={loading}
          >
            대여 요청
          </Button>
        </View>
      </ScrollView>

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
    fontSize: scale(12),
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: verticalScale(6),
  },
  hintText: {
    fontSize: scale(11),
    color: COLORS.textTertiary,
    marginTop: verticalScale(6),
    lineHeight: scale(16),
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
  reviewerText: {
    color: COLORS.primary,
    fontWeight: '700',
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
    paddingVertical: verticalScale(10),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownTextContainer: {
    flex: 1,
  },
  dropdownText: {
    fontSize: scale(12),
    color: COLORS.text,
  },
  dropdownSubText: {
    fontSize: scale(10),
    color: COLORS.textSecondary,
    marginTop: verticalScale(2),
  },
  dropdownIcon: {
    fontSize: scale(11),
    color: COLORS.textSecondary,
    marginLeft: scale(8),
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
    paddingVertical: verticalScale(10),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dropdownOptionLast: {
    borderBottomWidth: 0,
  },
  dropdownOptionText: {
    fontSize: scale(12),
    color: COLORS.text,
  },
  dropdownOptionSubText: {
    fontSize: scale(10),
    color: COLORS.textSecondary,
    marginTop: verticalScale(2),
  },
  // TextInput
  textInput: {
    backgroundColor: COLORS.primaryLight,
    fontSize: scale(12),
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
  // Snackbar
  snackbar: {
    backgroundColor: COLORS.text,
    marginBottom: verticalScale(20),
  },
});
