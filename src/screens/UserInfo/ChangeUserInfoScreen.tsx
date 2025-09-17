import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View, TouchableOpacity } from 'react-native';
import {
  Surface,
  Text,
  Appbar,
  Card,
  Button,
  Snackbar,
  ActivityIndicator,
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  useNavigation,
  NavigationProp,
  useFocusEffect,
} from '@react-navigation/native';
import { useAuth } from '../../store/AuthContext.tsx';
import { scale, verticalScale } from 'react-native-size-matters';
import { useQuery } from '@tanstack/react-query';
import { getWarehouseList, changeWarehouse } from '../../services/api/api.tsx';
import type { RootStackParamList } from '../../navigation/RootStackNavigation.tsx';

type ChangeUserInfoScreenNavigationProp = NavigationProp<RootStackParamList>;

// KakaoTalk-style colors
const COLORS = {
  primary: '#F47725',
  primaryLight: 'rgba(244, 119, 37, 0.1)',
  background: '#FFFFFF',
  surface: '#F7F7F7',
  text: '#000000',
  textSecondary: '#666666',
  textTertiary: '#999999',
  border: '#E6E6E6',
  success: '#4CAF50',
  warning: '#FF9500',
  error: '#F44336',
};

interface WarehouseItem {
  id: string | number;
  warehouse_name: string;
  warehouse_manage_region: string;
}

const ChangeUserInfoScreen: React.FC = () => {
  const navigation = useNavigation<ChangeUserInfoScreenNavigationProp>();
  const { user, refreshUserData } = useAuth();

  const [selectedWarehouse, setSelectedWarehouse] = useState<{
    label: string;
    value: string | number;
  }>({ label: '', value: '' });

  const [expanded, setExpanded] = useState<string | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 창고 목록 조회
  const { data: warehouseList } = useQuery({
    queryKey: ['warehouses'],
    queryFn: getWarehouseList,
    staleTime: 30 * 60 * 1000, // 30분
  });

  // 사용자 지역에 맞는 창고만 필터링
  const filteredWarehouseList = warehouseList?.results?.filter(
    (warehouse: WarehouseItem) =>
      warehouse.warehouse_manage_region === user?.region,
  );

  const listData = filteredWarehouseList?.map((warehouse: WarehouseItem) => ({
    label: warehouse.warehouse_name,
    value: warehouse.id,
  }));

  const handleChangeWarehouse = (item: {
    label: string;
    value: string | number;
  }) => {
    setSelectedWarehouse(item);
    setExpanded(null);
  };

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  // 초기값 설정
  useFocusEffect(
    useCallback(() => {
      if (
        user?.my_warehouse &&
        Array.isArray(user.my_warehouse) &&
        user.my_warehouse.length > 0
      ) {
        const warehouse = user.my_warehouse[0];
        setSelectedWarehouse({
          label: warehouse.warehouse_name || '',
          value: warehouse.id || '',
        });
      }
    }, [user?.my_warehouse]),
  );

  const handleConfirm = async () => {
    if (!selectedWarehouse.value) {
      showSnackbar('변경할 창고를 선택해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      await changeWarehouse(selectedWarehouse.value.toString());
      showSnackbar('변경사항을 저장하는데 성공하였습니다.');
      await refreshUserData();

      // 잠시 후 뒤로가기
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (error) {
      console.log('Error:', error);
      showSnackbar('변경사항을 저장하는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Surface style={styles.container}>
      <Appbar.Header style={styles.appbar}>
        <Appbar.BackAction
          onPress={() => navigation.goBack()}
          color={COLORS.text}
        />
        <Appbar.Content
          title="사용자 정보 변경"
          titleStyle={styles.appbarTitle}
        />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        <View style={styles.headerSection}>
          <MaterialCommunityIcons
            name="warehouse"
            size={scale(24)}
            color={COLORS.primary}
            style={styles.headerIcon}
          />
          <Text variant="headlineSmall" style={styles.headerTitle}>
            창고 변경
          </Text>
          <Text variant="bodyMedium" style={styles.headerSubtitle}>
            현재 담당 창고를 변경할 수 있습니다
          </Text>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.dropdownSection}>
              <Text style={styles.label}>창고 선택</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() =>
                  setExpanded(expanded === 'warehouse' ? null : 'warehouse')
                }
              >
                <View style={styles.dropdownContent}>
                  <MaterialCommunityIcons
                    name="warehouse"
                    size={scale(20)}
                    color={COLORS.primary}
                    style={styles.dropdownIcon}
                  />
                  <Text style={styles.dropdownText}>
                    {selectedWarehouse?.label || '창고를 선택하세요'}
                  </Text>
                  <Text style={styles.dropdownArrow}>
                    {expanded === 'warehouse' ? '▲' : '▼'}
                  </Text>
                </View>
              </TouchableOpacity>

              {expanded === 'warehouse' && (
                <View style={styles.dropdownOptions}>
                  {listData?.map((item, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.dropdownOption,
                        index === (listData?.length || 0) - 1 &&
                          styles.dropdownOptionLast,
                      ]}
                      onPress={() => handleChangeWarehouse(item)}
                    >
                      <View style={styles.optionContent}>
                        <MaterialCommunityIcons
                          name="domain"
                          size={scale(18)}
                          color={COLORS.textSecondary}
                          style={styles.optionIcon}
                        />
                        <Text style={styles.dropdownOptionText}>
                          {item.label}
                        </Text>
                        {selectedWarehouse?.value === item.value && (
                          <MaterialCommunityIcons
                            name="check"
                            size={scale(18)}
                            color={COLORS.primary}
                          />
                        )}
                      </View>
                    </TouchableOpacity>
                  )) || (
                    <View style={styles.dropdownOption}>
                      <View style={styles.optionContent}>
                        <MaterialCommunityIcons
                          name="alert-circle"
                          size={scale(18)}
                          color={COLORS.warning}
                          style={styles.optionIcon}
                        />
                        <Text
                          style={[
                            styles.dropdownOptionText,
                            { color: COLORS.textTertiary },
                          ]}
                        >
                          선택 가능한 창고가 없습니다
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>

            <View style={styles.infoBox}>
              <MaterialCommunityIcons
                name="information"
                size={scale(16)}
                color={COLORS.primary}
                style={styles.infoIcon}
              />
              <Text variant="bodySmall" style={styles.infoText}>
                선택 가능한 창고가 없을 경우 관리자에게 문의해주세요.
              </Text>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          onPress={handleConfirm}
          disabled={isLoading || !selectedWarehouse.value}
          loading={isLoading}
          style={styles.confirmButton}
          labelStyle={styles.buttonLabel}
          icon="check"
        >
          적용
        </Button>
      </View>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={styles.snackbar}
        action={{
          label: '확인',
          onPress: () => setSnackbarVisible(false),
          textColor: COLORS.primary,
        }}
      >
        <Text style={styles.snackbarText}>{snackbarMessage}</Text>
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
  content: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  headerSection: {
    backgroundColor: COLORS.background,
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(24),
    paddingBottom: verticalScale(20),
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerIcon: {
    marginBottom: verticalScale(12),
  },
  headerTitle: {
    color: COLORS.text,
    fontWeight: '700',
    marginBottom: verticalScale(8),
    textAlign: 'center',
  },
  headerSubtitle: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    margin: scale(16),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderRadius: scale(12),
    backgroundColor: COLORS.background,
  },
  label: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: verticalScale(8),
  },
  dropdownSection: {
    marginBottom: verticalScale(16),
  },
  dropdown: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: scale(8),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
  },
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownIcon: {
    marginRight: scale(12),
  },
  dropdownText: {
    fontSize: scale(14),
    color: COLORS.text,
    flex: 1,
  },
  dropdownArrow: {
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
    flex: 1,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIcon: {
    marginRight: scale(12),
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    padding: scale(12),
    borderRadius: scale(8),
    marginTop: verticalScale(8),
  },
  infoIcon: {
    marginRight: scale(8),
  },
  infoText: {
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  buttonContainer: {
    padding: scale(20),
    paddingBottom: verticalScale(32),
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
    // borderRadius: scale(25),
    // elevation: 2,
    shadowColor: COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  buttonLabel: {
    color: COLORS.background,
    fontWeight: '600',
    fontSize: scale(16),
  },
  snackbar: {
    backgroundColor: COLORS.text,
    marginBottom: verticalScale(20),
    borderRadius: scale(8),
  },
  snackbarText: {
    color: COLORS.background,
    fontWeight: '500',
  },
});

export default ChangeUserInfoScreen;
