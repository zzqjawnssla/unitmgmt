import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import {
  Surface,
  Text,
  Appbar,
  Card,
  SegmentedButtons,
  ActivityIndicator,
} from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { scale, verticalScale } from 'react-native-size-matters';
import { useInfiniteQuery } from '@tanstack/react-query';
import { getRentalRequests } from '../../services/api/api';
import type { UserinfoStackParamList } from '../../navigation/RootStackNavigation';

type NavigationProp = NativeStackNavigationProp<UserinfoStackParamList>;

const COLORS = {
  primary: '#F47725',
  primaryLight: 'rgba(244, 119, 37, 0.1)',
  background: '#FFFFFF',
  surface: '#F7F7F7',
  text: '#000000',
  textSecondary: '#666666',
  textTertiary: '#999999',
  textWhite: '#FFFFFF',
  border: '#E6E6E6',
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#FF9500',
  approved: '#4CAF50',
  rejected: '#F44336',
  cancelled: '#999999',
};

const STATUS_LABELS: Record<string, string> = {
  pending: '대기',
  approved: '승인',
  rejected: '반려',
  cancelled: '취소',
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const MailBoxScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [activeTab, setActiveTab] = useState<'requester' | 'reviewer'>('requester');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const queryParams = useMemo(() => {
    const params: any = { role: activeTab };
    if (statusFilter !== 'all') {
      params.status = statusFilter;
    }
    return params;
  }, [activeTab, statusFilter]);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['rentalRequests', activeTab, statusFilter],
    queryFn: ({ pageParam }) =>
      getRentalRequests(queryParams, pageParam || undefined),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: any) => lastPage.next || undefined,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const allRequests = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page: any) => page.results || []);
  }, [data]);

  const totalCount = data?.pages?.[0]?.count || 0;

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const handleEndReached = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const handleItemPress = (item: any) => {
    navigation.navigate('RequestDetailScreen', { requestId: item.id });
  };

  const renderItem = ({ item }: { item: any }) => (
    <Card
      style={styles.card}
      onPress={() => handleItemPress(item)}
    >
      <Card.Content>
        <View style={styles.cardRow}>
          <Text style={styles.barcodeText} numberOfLines={1}>
            {item.unit_info?.skt_barcode || item.skt_barcode || '-'}
          </Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: STATUS_COLORS[item.status] || COLORS.textTertiary },
            ]}
          >
            <Text style={styles.statusBadgeText}>
              {item.status_display || STATUS_LABELS[item.status] || item.status}
            </Text>
          </View>
        </View>
        <View style={styles.cardSubRow}>
          <Text style={styles.subText}>
            {activeTab === 'requester'
              ? `검토자: ${item.reviewer_name || '-'}`
              : `요청자: ${item.requester_name || '-'}`}
          </Text>
          <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
        </View>
      </Card.Content>
    </Card>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>요청 내역이 없습니다.</Text>
    </View>
  );

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={COLORS.primary} />
        <Text style={styles.footerText}>더 불러오는 중...</Text>
      </View>
    );
  };

  return (
    <Surface style={styles.container}>
      <Appbar.Header style={styles.appbar}>
        <Appbar.BackAction
          onPress={() => navigation.goBack()}
          iconColor={COLORS.text}
        />
        <Appbar.Content title="요청함" titleStyle={styles.appbarTitle} />
      </Appbar.Header>

      <View style={styles.content}>
        {/* Role-based tabs */}
        <SegmentedButtons
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value as 'requester' | 'reviewer');
            setStatusFilter('all');
          }}
          buttons={[
            {
              value: 'requester',
              label: '내 요청',
              style: [
                styles.tabButton,
                activeTab === 'requester' && styles.tabButtonActive,
              ],
              labelStyle: {
                color: activeTab === 'requester' ? COLORS.textWhite : COLORS.textSecondary,
                fontWeight: activeTab === 'requester' ? '600' : '500',
              },
            },
            {
              value: 'reviewer',
              label: '검토 대기',
              style: [
                styles.tabButton,
                activeTab === 'reviewer' && styles.tabButtonActive,
              ],
              labelStyle: {
                color: activeTab === 'reviewer' ? COLORS.textWhite : COLORS.textSecondary,
                fontWeight: activeTab === 'reviewer' ? '600' : '500',
              },
            },
          ]}
          style={styles.tabContainer}
        />

        {/* Status filter */}
        <SegmentedButtons
          value={statusFilter}
          onValueChange={setStatusFilter}
          buttons={[
            {
              value: 'all',
              label: '전체',
              style: [
                styles.filterButton,
                statusFilter === 'all' && styles.filterButtonActive,
              ],
              labelStyle: {
                color: statusFilter === 'all' ? COLORS.primary : COLORS.textSecondary,
                fontWeight: statusFilter === 'all' ? '600' : '400',
                fontSize: scale(12),
              },
            },
            {
              value: 'pending',
              label: '대기',
              style: [
                styles.filterButton,
                statusFilter === 'pending' && styles.filterButtonActive,
              ],
              labelStyle: {
                color: statusFilter === 'pending' ? COLORS.primary : COLORS.textSecondary,
                fontWeight: statusFilter === 'pending' ? '600' : '400',
                fontSize: scale(12),
              },
            },
            {
              value: 'approved',
              label: '승인',
              style: [
                styles.filterButton,
                statusFilter === 'approved' && styles.filterButtonActive,
              ],
              labelStyle: {
                color: statusFilter === 'approved' ? COLORS.primary : COLORS.textSecondary,
                fontWeight: statusFilter === 'approved' ? '600' : '400',
                fontSize: scale(12),
              },
            },
            {
              value: 'rejected',
              label: '반려',
              style: [
                styles.filterButton,
                statusFilter === 'rejected' && styles.filterButtonActive,
              ],
              labelStyle: {
                color: statusFilter === 'rejected' ? COLORS.primary : COLORS.textSecondary,
                fontWeight: statusFilter === 'rejected' ? '600' : '400',
                fontSize: scale(12),
              },
            },
          ]}
          style={styles.filterContainer}
        />

        {/* Count badge */}
        {totalCount > 0 && (
          <View style={styles.countContainer}>
            <Text style={styles.countText}>
              총 {totalCount}건
            </Text>
          </View>
        )}

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            data={allRequests}
            renderItem={renderItem}
            keyExtractor={(item) => String(item.id)}
            ListEmptyComponent={renderEmptyList}
            ListFooterComponent={renderFooter}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.3}
            onRefresh={() => refetch()}
            refreshing={isLoading}
          />
        )}
      </View>
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
  // Tab buttons (role-based)
  tabContainer: {
    marginHorizontal: scale(16),
    marginTop: verticalScale(16),
    marginBottom: verticalScale(8),
    backgroundColor: COLORS.surface,
    borderRadius: scale(25),
    elevation: 1,
  },
  tabButton: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderRadius: scale(20),
  },
  tabButtonActive: {
    backgroundColor: COLORS.primary,
  },
  // Status filter buttons
  filterContainer: {
    marginHorizontal: scale(16),
    marginBottom: verticalScale(8),
  },
  filterButton: {
    backgroundColor: 'transparent',
    borderColor: COLORS.border,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  // Count
  countContainer: {
    paddingHorizontal: scale(16),
    paddingBottom: verticalScale(8),
  },
  countText: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  // List
  listContainer: {
    paddingHorizontal: scale(16),
    paddingBottom: verticalScale(20),
    flexGrow: 1,
  },
  card: {
    marginBottom: verticalScale(10),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderRadius: scale(12),
    backgroundColor: COLORS.background,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(8),
  },
  barcodeText: {
    fontSize: scale(14),
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
    marginRight: scale(8),
  },
  statusBadge: {
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: scale(12),
  },
  statusBadgeText: {
    fontSize: scale(11),
    fontWeight: '700',
    color: COLORS.textWhite,
  },
  cardSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subText: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
  },
  dateText: {
    fontSize: scale(12),
    color: COLORS.textTertiary,
  },
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Footer loader
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: verticalScale(16),
  },
  footerText: {
    marginLeft: scale(8),
    color: COLORS.textSecondary,
    fontSize: scale(12),
  },
  // Empty
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: verticalScale(60),
  },
  emptyText: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});

export default MailBoxScreen;
