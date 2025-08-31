import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  Surface,
  Text,
  Appbar,
  Card,
  List,
  Button,
  Snackbar,
  ActivityIndicator,
} from 'react-native-paper';
import { useNavigation, NavigationProp, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../store/AuthContext.tsx';
import { scale, verticalScale } from 'react-native-size-matters';
import { useQuery } from '@tanstack/react-query';
import { getWarehouseList, changeWarehouse } from '../../services/api/api.tsx';
import type { RootStackParamList } from '../../navigation/RootStackNavigation.tsx';

type ChangeUserInfoScreenNavigationProp = NavigationProp<RootStackParamList>;

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
  
  const [warehouseExpanded, setWarehouseExpanded] = useState<string | null>(null);
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
    (warehouse: WarehouseItem) => warehouse.warehouse_manage_region === user?.region
  );

  const listData = filteredWarehouseList?.map((warehouse: WarehouseItem) => ({
    label: warehouse.warehouse_name,
    value: warehouse.id,
  }));

  const handleChangeWarehouse = (item: { label: string; value: string | number }) => {
    setSelectedWarehouse(item);
    setWarehouseExpanded(null);
  };

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  // 초기값 설정
  useFocusEffect(
    useCallback(() => {
      if (user?.my_warehouse && Array.isArray(user.my_warehouse) && user.my_warehouse.length > 0) {
        const warehouse = user.my_warehouse[0];
        setSelectedWarehouse({
          label: warehouse.warehouse_name || '',
          value: warehouse.id || '',
        });
      }
    }, [user?.my_warehouse])
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
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="사용자 정보 변경" />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              창고 변경
            </Text>
            
            <List.Section style={styles.listSection}>
              <List.AccordionGroup
                expandedId={warehouseExpanded}
                onAccordionPress={id =>
                  setWarehouseExpanded(id === warehouseExpanded ? null : id)
                }
              >
                <List.Accordion
                  title={selectedWarehouse?.label || '창고를 선택하세요'}
                  titleStyle={styles.accordionTitle}
                  id="1"
                  style={styles.accordion}
                  onPress={() =>
                    setWarehouseExpanded(warehouseExpanded === '1' ? null : '1')
                  }
                >
                  {listData?.map((item, index) => (
                    <List.Item
                      key={index}
                      title={item.label}
                      onPress={() => handleChangeWarehouse(item)}
                      titleStyle={styles.listItemTitle}
                    />
                  )) || (
                    <List.Item
                      title="선택 가능한 창고가 없습니다"
                      titleStyle={[styles.listItemTitle, { color: '#999' }]}
                      disabled
                    />
                  )}
                </List.Accordion>
              </List.AccordionGroup>
            </List.Section>

            <Text variant="bodySmall" style={styles.warningText}>
              선택 가능한 창고가 없을 경우 관리자에게 문의해주세요.
            </Text>
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
        >
          적용
        </Button>
      </View>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        {snackbarMessage}
      </Snackbar>
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(16),
  },
  card: {
    elevation: 2,
  },
  sectionTitle: {
    color: '#333333',
    fontWeight: '700',
    marginBottom: verticalScale(16),
  },
  listSection: {
    paddingHorizontal: 0,
    marginBottom: verticalScale(12),
  },
  accordion: {
    backgroundColor: '#F5F5F5',
    borderRadius: scale(8),
  },
  accordionTitle: {
    color: '#333333',
  },
  listItemTitle: {
    color: '#333333',
  },
  warningText: {
    color: '#E53E3E',
    fontStyle: 'italic',
  },
  buttonContainer: {
    padding: scale(16),
    paddingBottom: verticalScale(32),
  },
  confirmButton: {
    backgroundColor: '#F47725',
  },
});

export default ChangeUserInfoScreen;