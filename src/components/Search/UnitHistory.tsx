import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Card, Snackbar, Text } from 'react-native-paper';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { scale, verticalScale } from 'react-native-size-matters';
import moment from 'moment';
import React, { useState } from 'react';
import { api } from '../../services/api/api.tsx';
import { useInfiniteQuery } from '@tanstack/react-query';

// Brand Colors
const BRAND_COLORS = {
  primary: '#F47725',
  background: '#FCFCFC',
  surface: '#FFFFFF',
  textSecondary: '#666666',
};

type HistoryItem = {
  id: string;
  user: string;
  user_first_name: string;
  username: string;
  user_region: string;
  user_team: string;
  unit_state: string;
  state_desc: string;
  unit_movement: string;
  unit_movement_desc: string;
  location: string;
  context_type: string;
  object_id: string;
  location_desc: string;
  location_context_instance: {
    id: number;
    zp_type: string;
    zp_code: string;
    t_code: string;
    zp_name: string;
    zp_manage_region: string;
    zp_manage_team: string;
    warehouse_name: string;
    warehouse_type: string;
    warehouse_manage_team: string;
    operating_company: string;
    is_use: boolean;
    vehicle_number: string;
    vehicle_type: string;
    vehicle_manage_team: string;
  };
  created_at: string;
};

type HistoryData = {
  results: HistoryItem[];
  count: number;
  next: string | null;
  previous: string | null;
};

type UnitHistoryProps = {
  result: {
    skt_barcode: string;
    [key: string]: any;
  } | null | undefined;
};

export const UnitHistory = ({ result }: UnitHistoryProps) => {
  // Snackbar state
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  // useInfiniteQuery로 무한 스크롤 구현
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery({
    queryKey: ['unitHistory', result?.skt_barcode || ''],
    queryFn: async ({ pageParam }) => {
      if (!result?.skt_barcode) {
        throw new Error('SKT 바코드가 없습니다.');
      }
      
      if (pageParam) {
        // 다음 페이지 URL이 있는 경우
        const response = await api.get(pageParam);
        return response.data;
      } else {
        // 첫 페이지
        const params = { skt_barcode: result.skt_barcode };
        const response = await api.get('/apps/unit_manage_history_detail/', { params });
        return response.data;
      }
    },
    getNextPageParam: (lastPage: HistoryData) => lastPage.next,
    initialPageParam: undefined,
    staleTime: 5 * 60 * 1000, // 5분간 캐시 유지
    gcTime: 10 * 60 * 1000, // 10분간 가비지 컬렉션 방지
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: !!result?.skt_barcode, // result가 있을 때만 쿼리 실행
  });

  // 모든 페이지의 데이터를 하나의 배열로 합치기
  const allHistoryItems = data?.pages.flatMap(page => page.results) || [];

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage().catch(_error => {
        showSnackbar('데이터를 불러오는데 실패했습니다.');
      });
    }
  };

  // result가 없는 경우 에러 UI 표시
  if (!result || !result.skt_barcode) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text variant="bodyMedium" style={styles.errorText}>
            유니트 정보를 불러올 수 없습니다.
          </Text>
        </View>
        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => setSnackbarVisible(false)}
          duration={3000}
          action={{
            label: '확인',
            onPress: () => setSnackbarVisible(false),
          }}
        >
          {snackbarMessage}
        </Snackbar>
      </View>
    );
  }

  const renderHistoryItem = ({ item }: { item: HistoryItem }) => {
    const formattedData = item.created_at
      ? moment(item.created_at).format('YYYY-MM-DD HH:mm')
      : '';

    return (
      <View style={styles.customCard}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
            marginVertical: verticalScale(8),
          }}
        >
          <Text variant="bodySmall" style={{ color: 'black' }}>
            {formattedData}
          </Text>
        </View>

        {item?.location === '국소' && (
          <>
            <View style={styles.contentsContainer}>
              <Text
                variant="bodyMedium"
                style={{
                  color: BRAND_COLORS.textSecondary,
                  fontWeight: 'bold',
                }}
              >
                통시코드
              </Text>
              <Text
                variant="bodyMedium"
                style={{
                  color: 'black',
                  fontWeight: 'bold',
                  maxWidth: scale(280),
                }}
                numberOfLines={1}
                ellipsizeMode={'tail'}
              >
                {item?.location_context_instance?.zp_code}
              </Text>
            </View>
            <View style={styles.locationNameContainer}>
              <Text
                variant="bodyMedium"
                style={{
                  color: BRAND_COLORS.textSecondary,
                  fontWeight: 'bold',
                }}
              >
                국소명
              </Text>
              <Text
                variant="bodyMedium"
                style={{
                  color: 'black',
                  fontWeight: 'bold',
                  maxWidth: scale(320),
                }}
                numberOfLines={1}
                ellipsizeMode={'tail'}
              >
                {item?.location_context_instance?.zp_name}
              </Text>
            </View>
          </>
        )}

        {item.location === '창고' && (
          <>
            <View style={styles.contentsContainer}>
              <Text
                variant="bodyMedium"
                style={{
                  color: BRAND_COLORS.textSecondary,
                  fontWeight: 'bold',
                }}
              >
                통시코드
              </Text>
              <Text
                variant="bodyMedium"
                style={{
                  color: 'black',
                  fontWeight: 'bold',
                  maxWidth: scale(320),
                }}
                numberOfLines={1}
                ellipsizeMode={'tail'}
              >
                {item?.location_context_instance?.zp_code}
              </Text>
            </View>
            <View style={styles.locationNameContainer}>
              <Text
                variant="bodyMedium"
                style={{
                  color: BRAND_COLORS.textSecondary,
                  fontWeight: 'bold',
                }}
              >
                창고명
              </Text>
              <Text
                variant="bodyMedium"
                style={{
                  color: 'black',
                  fontWeight: 'bold',
                  maxWidth: scale(280),
                }}
                numberOfLines={1}
                ellipsizeMode={'tail'}
              >
                {item?.location_context_instance?.warehouse_name}
              </Text>
            </View>
          </>
        )}

        {item.location === '전진배치(집/중/통)' && (
          <>
            <View style={styles.contentsContainer}>
              <Text
                variant="bodyMedium"
                style={{
                  color: BRAND_COLORS.textSecondary,
                  fontWeight: 'bold',
                }}
              >
                통시코드
              </Text>
              <Text
                variant="bodyMedium"
                style={{
                  color: 'black',
                  fontWeight: 'bold',
                  maxWidth: scale(320),
                }}
                numberOfLines={1}
                ellipsizeMode={'tail'}
              >
                {item?.location_context_instance?.zp_code}
              </Text>
            </View>
            <View style={styles.locationNameContainer}>
              <Text
                variant="bodyMedium"
                style={{
                  color: BRAND_COLORS.textSecondary,
                  fontWeight: 'bold',
                }}
              >
                기지국명
              </Text>
              <Text
                variant="bodyMedium"
                style={{
                  color: 'black',
                  fontWeight: 'bold',
                  maxWidth: scale(280),
                }}
                numberOfLines={1}
                ellipsizeMode={'tail'}
              >
                {item?.location_context_instance?.zp_name}
              </Text>
            </View>
          </>
        )}

        {item.location === '차량보관' && (
          <>
            <View style={styles.contentsContainer}>
              <Text
                variant="bodyMedium"
                style={{
                  color: BRAND_COLORS.textSecondary,
                  fontWeight: 'bold',
                }}
              >
                차량관리부서
              </Text>
              <Text
                variant="bodyMedium"
                style={{
                  color: 'black',
                  fontWeight: 'bold',
                  maxWidth: scale(320),
                }}
                numberOfLines={1}
                ellipsizeMode={'tail'}
              >
                {item?.location_context_instance?.vehicle_manage_team}
              </Text>
            </View>
            <View style={styles.locationNameContainer}>
              <Text
                variant="bodyMedium"
                style={{
                  color: BRAND_COLORS.textSecondary,
                  fontWeight: 'bold',
                }}
              >
                차량번호
              </Text>
              <Text
                variant="bodyMedium"
                style={{
                  color: 'black',
                  fontWeight: 'bold',
                  maxWidth: scale(280),
                }}
                numberOfLines={1}
                ellipsizeMode={'tail'}
              >
                {item?.location_context_instance?.vehicle_number}
              </Text>
            </View>
          </>
        )}

        <View style={styles.contentsContainer}>
          <Text
            variant="bodyMedium"
            style={{ color: BRAND_COLORS.textSecondary, fontWeight: 'bold' }}
          >
            작업자
          </Text>
          <Text
            variant="bodyMedium"
            style={{ color: 'black', fontWeight: 'bold' }}
          >
            {item?.user_first_name} ({item?.user})
          </Text>
        </View>
        <View style={styles.contentsContainer}>
          <Text
            variant="bodyMedium"
            style={{ color: BRAND_COLORS.textSecondary, fontWeight: 'bold' }}
          >
            소속
          </Text>
          <Text
            variant="bodyMedium"
            style={{ color: 'black', fontWeight: 'bold' }}
          >
            {item?.user_region} ・ {item?.user_team}
          </Text>
        </View>

        <View style={styles.movementContainer}>
          <Text
            variant="bodyMedium"
            style={{ color: BRAND_COLORS.textSecondary, fontWeight: 'bold' }}
          >
            이동유형(상태)
          </Text>
          <Text
            variant="bodyMedium"
            style={{ color: 'black', fontWeight: 'bold' }}
          >
            {item?.unit_movement} ({item?.unit_state})
          </Text>
        </View>
        <Text
          variant="bodyMedium"
          style={{ color: BRAND_COLORS.textSecondary, fontWeight: 'bold' }}
        >
          이동사유
        </Text>
        {item.unit_movement_desc !== '' || item.state_desc !== '' ? (
          <View style={styles.descriptionContainer}>
            {item.state_desc !== '' ? (
              <Text
                variant="bodyMedium"
                numberOfLines={1}
                ellipsizeMode={'tail'}
                style={{ color: 'black' }}
              >
                {item.state_desc}
              </Text>
            ) : null}
            {item.unit_movement_desc !== '' ? (
              <Text
                variant="bodyMedium"
                numberOfLines={1}
                ellipsizeMode={'tail'}
                style={{ color: 'black' }}
              >
                {item.unit_movement_desc}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={BRAND_COLORS.primary} />
        <Text variant="bodyMedium" style={styles.loadingText}>
          이력 정보를 불러오는 중...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text variant="bodyMedium" style={styles.errorText}>
          이력 정보를 불러올 수 없습니다.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Full History Section */}
      <View style={styles.historyContainer}>
        <View style={styles.sectionHeader}>
          <Text variant="titleMedium">전체 이력</Text>
        </View>

        <View>
          {allHistoryItems.length > 0 ? (
            <FlatList
              showsVerticalScrollIndicator={false}
              data={allHistoryItems}
              keyExtractor={(item, index) => `${item.id}_${index}`}
              renderItem={renderHistoryItem}
              contentContainerStyle={styles.listContent}
              removeClippedSubviews={false}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.3}
              ListFooterComponent={
                !hasNextPage ? (
                  <Text variant="bodyMedium" style={styles.noMoreDataText}>
                    더이상 불러올 데이터가 없습니다.
                  </Text>
                ) : isFetchingNextPage ? (
                  <ActivityIndicator
                    size="large"
                    color={BRAND_COLORS.primary}
                    style={styles.footerLoader}
                  />
                ) : null
              }
            />
          ) : (
            <View style={styles.noDataContainer}>
              <Text variant="bodyMedium" style={styles.noDataText}>
                이력 정보가 없습니다.
              </Text>
            </View>
          )}
        </View>
      </View>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        action={{
          label: '확인',
          onPress: () => setSnackbarVisible(false),
        }}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: verticalScale(24),
  },
  sectionHeader: {
    padding: scale(4),
  },
  customCard: {
    backgroundColor: '#F0F0F0',
    padding: scale(16),
    marginBottom: verticalScale(8),
    borderRadius: 10,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginVertical: verticalScale(4),
  },
  historyContainer: {
    flex: 1,
    marginTop: verticalScale(8),
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: verticalScale(8),
  },
  contentsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: verticalScale(4),
  },
  locationNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: verticalScale(16),
  },
  movementContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: verticalScale(8),
    marginBottom: verticalScale(4),
  },
  descriptionContainer: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    marginVertical: verticalScale(4),
    borderRadius: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: verticalScale(32),
  },
  loadingText: {
    marginTop: verticalScale(8),
    color: BRAND_COLORS.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: verticalScale(32),
  },
  errorText: {
    color: BRAND_COLORS.textSecondary,
    textAlign: 'center',
  },
  noDataContainer: {
    paddingVertical: verticalScale(32),
    alignItems: 'center',
  },
  noDataText: {
    color: BRAND_COLORS.textSecondary,
    textAlign: 'center',
  },
  noMoreDataText: {
    textAlign: 'center',
    color: BRAND_COLORS.textSecondary,
    paddingVertical: verticalScale(16),
  },
  footerLoader: {
    marginVertical: verticalScale(16),
  },
});