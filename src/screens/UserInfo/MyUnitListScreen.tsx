import React, { useCallback } from 'react';
import { TouchableOpacity, View, FlatList, StyleSheet } from 'react-native';
import {
  Surface,
  Text,
  Appbar,
  Card,
  ActivityIndicator,
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  useNavigation,
  NavigationProp,
  useFocusEffect,
} from '@react-navigation/native';
import { scale, verticalScale } from 'react-native-size-matters';
import { useAuth } from '../../store/AuthContext.tsx';
import { useMyUnits } from '../../hooks/useSelectList.ts';
import moment from 'moment';
import type { RootStackParamList } from '../../navigation/RootStackNavigation.tsx';

type MyUnitListScreenNavigationProp = NavigationProp<RootStackParamList>;

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

  const {
    data: myUnitList,
    isLoading,
    refetch,
  } = useMyUnits(
    5, // location - 현장대기
    user?.user_id || 0, // userId - 로그인한 사용자 ID
    !!user, // enabled
    false, // realTimeMode
  );

  // 화면에 포커스될 때마다 데이터 새로고침
  useFocusEffect(
    useCallback(() => {
      if (user?.user_id) {
        refetch();
      }
    }, [user?.user_id, refetch]),
  );

  const goToUnitInfoScreen = (unit: UnitItem) => {
    // Set search parameters and navigate to SearchResultScreen
    setSearchTerm({ sktbarcode: unit.skt_barcode, serial: '' });
    setSearchCode({ value: '1', label: 'SKT바코드' });

    navigation.navigate('SearchStack', {
      screen: 'SearchResult',
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
        activeOpacity={0.7}
      >
        <Card style={styles.unitCard}>
          <Card.Content>
            <View style={styles.cardHeader}>
              {/*<View style={styles.unitTypeContainer}>*/}
              {/*  <MaterialCommunityIcons*/}
              {/*    name="devices"*/}
              {/*    size={scale(18)}*/}
              {/*    color={COLORS.primary}*/}
              {/*    style={styles.unitTypeIcon}*/}
              {/*  />*/}
              {/*  <Text variant="bodySmall" style={styles.unitTypeText}>*/}
              {/*    내 보유 유니트*/}
              {/*  </Text>*/}
              {/*</View>*/}
              <View style={styles.dateContainer}>
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={scale(12)}
                  color={COLORS.textTertiary}
                  style={styles.clockIcon}
                />
                <Text
                  variant="bodySmall"
                  style={styles.dateText}
                  numberOfLines={1}
                  ellipsizeMode={'tail'}
                >
                  {formattedDate}
                </Text>
              </View>
            </View>

            <Text
              variant="headlineSmall"
              style={styles.unitTitle}
              numberOfLines={2}
            >
              {item?.detail_typename}
            </Text>

            <View style={styles.unitInfoRow}>
              <MaterialCommunityIcons
                name="information-outline"
                size={scale(16)}
                color={COLORS.textSecondary}
                style={styles.infoIcon}
              />
              <Text
                variant="bodyMedium"
                style={styles.unitSubtitle}
                numberOfLines={1}
              >
                {item?.main_typename} • {item?.unit_sub_type} •{' '}
                {item?.manufacturer}
              </Text>
            </View>

            <View style={styles.unitCodeContainer}>
              <MaterialCommunityIcons
                name="barcode"
                size={scale(18)}
                color={COLORS.primary}
                style={styles.barcodeIcon}
              />
              <Text variant="titleMedium" style={styles.unitCode}>
                {item?.skt_barcode}
              </Text>
              <Text variant="bodyMedium" style={styles.serialText}>
                ({item?.unit_serial})
              </Text>
            </View>

            <View style={styles.cardFooter}>
              <MaterialCommunityIcons
                name="chevron-right"
                size={scale(20)}
                color={COLORS.primary}
              />
            </View>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons
        name="archive-off-outline"
        size={scale(64)}
        color={COLORS.textTertiary}
        style={styles.emptyIcon}
      />
      <Text variant="titleMedium" style={styles.emptyTitle}>
        보유 유니트가 없습니다
      </Text>
      <Text variant="bodyMedium" style={styles.emptySubtitle}>
        아직 등록된 보유 유니트가 없어요.{'\n'}
        유니트를 등록하면 여기에 표시됩니다.
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <Surface style={styles.container}>
        <Appbar.Header style={styles.appbar}>
          <Appbar.BackAction
            onPress={() => navigation.goBack()}
            color={COLORS.text}
          />
          <Appbar.Content title="보유 유니트" titleStyle={styles.appbarTitle} />
        </Appbar.Header>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text variant="bodyLarge" style={styles.loadingText}>
            유니트 목록을 불러오는 중...
          </Text>
        </View>
      </Surface>
    );
  }

  return (
    <Surface style={styles.container}>
      <Appbar.Header style={styles.appbar}>
        <Appbar.BackAction
          onPress={() => navigation.goBack()}
          color={COLORS.text}
        />
        <Appbar.Content title="보유 유니트" titleStyle={styles.appbarTitle} />
        <Appbar.Action
          icon="refresh"
          onPress={() => refetch()}
          iconColor={COLORS.primary}
        />
      </Appbar.Header>

      <View style={styles.headerSection}>
        <MaterialCommunityIcons
          name="archive-search-outline"
          size={scale(24)}
          color={COLORS.primary}
          style={styles.headerIcon}
        />
        <Text variant="headlineSmall" style={styles.headerTitle}>
          내 보유 유니트
        </Text>
        <Text variant="bodyMedium" style={styles.headerSubtitle}>
          현재 보유하고 있는 유니트 목록입니다
        </Text>

        {myUnitList?.results && myUnitList.results.length > 0 && (
          <View style={styles.countBadge}>
            <Text variant="labelMedium" style={styles.countText}>
              총 {myUnitList.results.length}개 유니트
            </Text>
          </View>
        )}
      </View>

      <FlatList
        data={myUnitList?.results || []}
        renderItem={renderUnit}
        keyExtractor={(item, index) => item.id?.toString() || index.toString()}
        ListEmptyComponent={renderEmptyList}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        onRefresh={() => refetch()}
        refreshing={isLoading}
        style={styles.flatList}
      />
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
    // textAlign: 'center',
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
    marginBottom: verticalScale(12),
  },
  countBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: scale(15),
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  countText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  flatList: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  loadingText: {
    marginTop: verticalScale(16),
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  listContainer: {
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(16),
    paddingBottom: verticalScale(20),
  },
  unitCard: {
    marginBottom: verticalScale(16),
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  unitTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: scale(12),
  },
  unitTypeIcon: {
    marginRight: scale(4),
  },
  unitTypeText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: scale(11),
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    minWidth: 0,
  },
  clockIcon: {
    marginRight: scale(4),
  },
  dateText: {
    color: COLORS.textTertiary,
    fontSize: scale(11),
    flexShrink: 1,
  },
  unitTitle: {
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: verticalScale(8),
    lineHeight: 24,
  },
  unitInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  infoIcon: {
    marginRight: scale(6),
  },
  unitSubtitle: {
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  unitCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: scale(12),
    borderRadius: scale(8),
    marginBottom: verticalScale(8),
  },
  barcodeIcon: {
    marginRight: scale(8),
  },
  unitCode: {
    fontWeight: '700',
    color: COLORS.primary,
    flex: 1,
  },
  serialText: {
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginLeft: scale(4),
  },
  cardFooter: {
    alignItems: 'flex-end',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: verticalScale(60),
    paddingHorizontal: scale(32),
  },
  emptyIcon: {
    marginBottom: verticalScale(20),
  },
  emptyTitle: {
    color: COLORS.textSecondary,
    marginBottom: verticalScale(12),
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtitle: {
    color: COLORS.textTertiary,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default MyUnitListScreen;
