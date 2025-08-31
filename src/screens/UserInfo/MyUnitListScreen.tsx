import React, { useCallback } from 'react';
import { TouchableOpacity, View, FlatList, StyleSheet } from 'react-native';
import {
  Surface,
  Text,
  Appbar,
  Card,
  ActivityIndicator,
} from 'react-native-paper';
import { useNavigation, NavigationProp, useFocusEffect } from '@react-navigation/native';
import { scale, verticalScale } from 'react-native-size-matters';
import { useAuth } from '../../store/AuthContext.tsx';
import { useMyUnits } from '../../hooks/useSelectList.ts';
import moment from 'moment';
import type { RootStackParamList } from '../../navigation/RootStackNavigation.tsx';

type MyUnitListScreenNavigationProp = NavigationProp<RootStackParamList>;

interface UnitItem {
  id: string;
  detail_typename: string;
  main_typename: string;
  unit_sub_type: string;
  manufacturer: string;
  skt_barcode: string;
  unit_serial: string;
  created_at: string;
}

const MyUnitListScreen: React.FC = () => {
  const navigation = useNavigation<MyUnitListScreenNavigationProp>();
  const { user, setSearchTerm, setSearchCode } = useAuth();

  const { data: myUnitList, isLoading, refetch } = useMyUnits(
    5, // location - 현장대기
    user?.user_id || 0, // userId - 로그인한 사용자 ID
    !!user, // enabled
    false // realTimeMode
  );

  // 화면에 포커스될 때마다 데이터 새로고침
  useFocusEffect(
    useCallback(() => {
      if (user?.user_id) {
        refetch();
      }
    }, [user?.user_id, refetch])
  );

  const goToUnitInfoScreen = (unit: UnitItem) => {
    // Set search parameters and navigate to SearchResultScreen
    setSearchTerm({ sktbarcode: unit.skt_barcode, serial: '' });
    setSearchCode({ value: '1', label: 'SKT바코드' });
    
    navigation.navigate('SearchStack', {
      screen: 'SearchResult'
    });
  };

  const renderUnit = ({ item, index }: { item: UnitItem; index: number }) => {
    const formattedDate = item.created_at
      ? moment(item.created_at).format('YYYY-MM-DD HH:mm')
      : '';

    return (
      <TouchableOpacity
        key={index}
        onPress={() => goToUnitInfoScreen(item)}
      >
        <Card style={styles.unitCard}>
          <Card.Content>
            <View style={styles.dateContainer}>
              <Text variant="bodySmall" style={styles.dateText}>
                {formattedDate}
              </Text>
            </View>
            
            <Text 
              variant="headlineSmall" 
              style={styles.unitTitle}
              numberOfLines={1}
            >
              {item?.detail_typename}
            </Text>
            
            <Text
              variant="bodyMedium"
              style={styles.unitSubtitle}
              numberOfLines={1}
            >
              {item?.main_typename} • {item?.unit_sub_type} • {item?.manufacturer}
            </Text>
            
            <Text variant="titleMedium" style={styles.unitCode}>
              {item?.skt_barcode} ({item?.unit_serial})
            </Text>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Text variant="titleMedium" style={styles.emptyTitle}>
        보유 유니트가 없습니다
      </Text>
      <Text variant="bodyMedium" style={styles.emptySubtitle}>
        등록된 유니트가 없습니다
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <Surface style={styles.container}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title="보유 유니트" />
        </Appbar.Header>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F47725" />
          <Text variant="bodyLarge" style={styles.loadingText}>
            유니트 목록을 불러오는 중...
          </Text>
        </View>
      </Surface>
    );
  }

  return (
    <Surface style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="보유 유니트" />
        <Appbar.Action icon="refresh" onPress={() => refetch()} />
      </Appbar.Header>

      <FlatList
        data={myUnitList?.results || []}
        renderItem={renderUnit}
        keyExtractor={(item, index) => item.id?.toString() || index.toString()}
        ListEmptyComponent={renderEmptyList}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        onRefresh={() => refetch()}
        refreshing={isLoading}
      />
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: verticalScale(16),
    color: '#666666',
  },
  listContainer: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
  },
  unitCard: {
    marginBottom: verticalScale(12),
    elevation: 2,
  },
  dateContainer: {
    alignItems: 'flex-end',
    marginBottom: verticalScale(8),
  },
  dateText: {
    color: '#999999',
    fontSize: scale(12),
  },
  unitTitle: {
    fontWeight: '700',
    color: '#333333',
    marginBottom: verticalScale(4),
  },
  unitSubtitle: {
    color: '#666666',
    marginBottom: verticalScale(8),
  },
  unitCode: {
    fontWeight: '700',
    color: '#F47725',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: verticalScale(100),
  },
  emptyTitle: {
    color: '#666666',
    marginBottom: verticalScale(8),
  },
  emptySubtitle: {
    color: '#999999',
    textAlign: 'center',
  },
});

export default MyUnitListScreen;