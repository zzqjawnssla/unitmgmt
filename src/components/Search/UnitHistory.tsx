import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Snackbar, Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { scale, verticalScale } from 'react-native-size-matters';
import moment from 'moment';
import React, { useState } from 'react';
import { api } from '../../services/api/api.tsx';
import { useInfiniteQuery } from '@tanstack/react-query';

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
  divider: '#F0F0F0',
  success: '#4CAF50',
  warning: '#FF9500',
  error: '#F44336',
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
  result:
    | {
        skt_barcode: string;
        [key: string]: any;
      }
    | null
    | undefined;
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
        const response = await api.get('/apps/unit_manage_history_detail/', {
          params,
        });
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
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={scale(48)}
            color={COLORS.textTertiary}
            style={styles.errorIcon}
          />
          <Text style={styles.errorTitle}>
            유니트 정보를 불러올 수 없습니다
          </Text>
          <Text style={styles.errorSubtext}>
            바코드 정보가 없어 이력을 조회할 수 없어요
          </Text>
        </View>
        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => setSnackbarVisible(false)}
          duration={3000}
          style={styles.snackbar}
          theme={{ colors: { primary: COLORS.primary } }}
          action={{
            label: '확인',
            labelStyle: { color: COLORS.primary },
            onPress: () => setSnackbarVisible(false),
          }}
        >
          <Text style={styles.snackbarText}>{snackbarMessage}</Text>
        </Snackbar>
      </View>
    );
  }

  const renderHistoryItem = ({ item, index }: { item: HistoryItem; index: number }) => {
    const formattedData = item.created_at
      ? moment(item.created_at).format('YYYY-MM-DD HH:mm')
      : '';

    return (
      <View style={styles.historyItem}>
        <View style={styles.timelineContainer}>
          <View style={styles.timelineDot} />
          {index < allHistoryItems.length - 1 && <View style={styles.timelineLine} />}
        </View>
        
        <View style={styles.contentContainer}>
          <View style={styles.headerRow}>
            <MaterialCommunityIcons
              name="clock-outline"
              size={scale(16)}
              color={COLORS.primary}
              style={styles.clockIcon}
            />
            <Text style={styles.dateText}>{formattedData}</Text>
          </View>

          <View style={styles.locationSection}>
            <View style={styles.locationTypeRow}>
              <MaterialCommunityIcons
                name="map-marker"
                size={scale(14)}
                color={COLORS.primary}
                style={styles.locationIcon}
              />
              <Text style={styles.locationTypeText}>{item?.location}</Text>
            </View>
            
            {item?.location === '국소' && (
              <View style={styles.locationDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>통시코드</Text>
                  <Text style={styles.detailValue}>
                    {item?.location_context_instance?.zp_code}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>국소명</Text>
                  <Text style={[styles.detailValue, styles.locationName]} numberOfLines={2}>
                    {item?.location_context_instance?.zp_name}
                  </Text>
                </View>
              </View>
            )}

            {item.location === '창고' && (
              <View style={styles.locationDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>통시코드</Text>
                  <Text style={styles.detailValue}>
                    {item?.location_context_instance?.zp_code}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>창고명</Text>
                  <Text style={[styles.detailValue, styles.locationName]} numberOfLines={2}>
                    {item?.location_context_instance?.warehouse_name}
                  </Text>
                </View>
              </View>
            )}

            {item.location === '전진배치(집/중/통)' && (
              <View style={styles.locationDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>통시코드</Text>
                  <Text style={styles.detailValue}>
                    {item?.location_context_instance?.zp_code}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>기지국명</Text>
                  <Text style={[styles.detailValue, styles.locationName]} numberOfLines={2}>
                    {item?.location_context_instance?.zp_name}
                  </Text>
                </View>
              </View>
            )}

            {item.location === '차량보관' && (
              <View style={styles.locationDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>관리부서</Text>
                  <Text style={styles.detailValue}>
                    {item?.location_context_instance?.vehicle_manage_team}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>차량번호</Text>
                  <Text style={[styles.detailValue, styles.locationName]} numberOfLines={1}>
                    {item?.location_context_instance?.vehicle_number}
                  </Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.userSection}>
            <View style={styles.userRow}>
              <MaterialCommunityIcons
                name="account"
                size={scale(14)}
                color={COLORS.textSecondary}
                style={styles.userIcon}
              />
              <Text style={styles.userText}>
                {item?.user_first_name} ({item?.user})
              </Text>
              <Text style={styles.teamBadge}>
                {item?.user_region} · {item?.user_team}
              </Text>
            </View>
          </View>

          <View style={styles.statusSection}>
            <View style={styles.statusRow}>
              <MaterialCommunityIcons
                name="swap-horizontal"
                size={scale(14)}
                color={COLORS.primary}
                style={styles.statusIcon}
              />
              <Text style={styles.statusText}>
                {item?.unit_movement}
              </Text>
              <Text style={styles.stateText}>
                ({item?.unit_state})
              </Text>
            </View>
            
            {(item.unit_movement_desc !== '' || item.state_desc !== '') && (
              <View style={styles.reasonSection}>
                <Text style={styles.reasonTitle}>이동사유</Text>
                <View style={styles.reasonBox}>
                  {item.state_desc !== '' && (
                    <Text style={styles.reasonText} numberOfLines={3}>
                      {item.state_desc}
                    </Text>
                  )}
                  {item.unit_movement_desc !== '' && (
                    <Text style={styles.reasonText} numberOfLines={3}>
                      {item.unit_movement_desc}
                    </Text>
                  )}
                </View>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>이력 정보를 불러오는 중...</Text>
        <Text style={styles.loadingSubtext}>잠시만 기다려 주세요</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons
          name="wifi-off"
          size={scale(48)}
          color={COLORS.textTertiary}
          style={styles.errorIcon}
        />
        <Text style={styles.errorTitle}>이력 정보를 불러올 수 없습니다</Text>
        <Text style={styles.errorSubtext}>네트워크 연결을 확인해 주세요</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerSection}>
        <MaterialCommunityIcons
          name="history"
          size={scale(18)}
          color={COLORS.primary}
          style={styles.headerIcon}
        />
        <Text style={styles.headerTitle}>이력 정보</Text>
        <Text style={styles.headerSubtitle}>
          총 {data?.pages[0]?.count || 0}개의 이력이 있습니다
        </Text>
      </View>

      <View style={styles.historyContainer}>
        {allHistoryItems.length > 0 ? (
          <FlatList
            showsVerticalScrollIndicator={false}
            data={allHistoryItems}
            keyExtractor={(item, index) => `${item.id}_${index}`}
            renderItem={({ item, index }) => renderHistoryItem({ item, index })}
            contentContainerStyle={styles.listContent}
            removeClippedSubviews={false}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              !hasNextPage ? (
                <View style={styles.endContainer}>
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={scale(20)}
                    color={COLORS.success}
                    style={styles.endIcon}
                  />
                  <Text style={styles.endText}>
                    모든 이력을 확인했습니다
                  </Text>
                </View>
              ) : isFetchingNextPage ? (
                <View style={styles.loadMoreContainer}>
                  <ActivityIndicator
                    size="small"
                    color={COLORS.primary}
                  />
                  <Text style={styles.loadMoreText}>더 불러오는 중...</Text>
                </View>
              ) : null
            }
          />
        ) : (
          <View style={styles.noDataContainer}>
            <MaterialCommunityIcons
              name="clock-outline"
              size={scale(48)}
              color={COLORS.textTertiary}
              style={styles.noDataIcon}
            />
            <Text style={styles.noDataTitle}>이력 정보가 없습니다</Text>
            <Text style={styles.noDataSubtext}>
              아직 등록된 이력이 없어요
            </Text>
          </View>
        )}
      </View>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={styles.snackbar}
        theme={{ colors: { primary: COLORS.primary } }}
        action={{
          label: '확인',
          labelStyle: { color: COLORS.primary },
          onPress: () => setSnackbarVisible(false),
        }}
      >
        <Text style={styles.snackbarText}>{snackbarMessage}</Text>
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  headerSection: {
    backgroundColor: COLORS.background,
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(16),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: 'center',
  },
  headerIcon: {
    marginBottom: verticalScale(8),
  },
  headerTitle: {
    fontSize: scale(16),
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: verticalScale(4),
  },
  headerSubtitle: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
  },
  historyContainer: {
    flex: 1,
    paddingHorizontal: scale(16),
  },
  listContent: {
    paddingTop: verticalScale(16),
    paddingBottom: verticalScale(20),
  },
  historyItem: {
    flexDirection: 'row',
    marginBottom: verticalScale(20),
  },
  timelineContainer: {
    alignItems: 'center',
    marginRight: scale(16),
    paddingTop: verticalScale(6),
  },
  timelineDot: {
    width: scale(10),
    height: scale(10),
    borderRadius: scale(5),
    backgroundColor: COLORS.primary,
    zIndex: 1,
  },
  timelineLine: {
    position: 'absolute',
    top: scale(10),
    width: 2,
    height: '100%',
    backgroundColor: COLORS.border,
    marginTop: verticalScale(8),
  },
  contentContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: scale(12),
    padding: scale(16),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  clockIcon: {
    marginRight: scale(6),
  },
  dateText: {
    fontSize: scale(13),
    fontWeight: '600',
    color: COLORS.primary,
  },
  locationSection: {
    marginBottom: verticalScale(12),
  },
  locationTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(8),
  },
  locationIcon: {
    marginRight: scale(6),
  },
  locationTypeText: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.text,
  },
  locationDetails: {
    backgroundColor: COLORS.surface,
    borderRadius: scale(8),
    padding: scale(12),
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: verticalScale(6),
  },
  detailLabel: {
    fontSize: scale(12),
    fontWeight: '500',
    color: COLORS.textSecondary,
    flex: 0.3,
  },
  detailValue: {
    fontSize: scale(12),
    fontWeight: '600',
    color: COLORS.text,
    flex: 0.7,
    textAlign: 'right',
  },
  locationName: {
    lineHeight: scale(16),
  },
  userSection: {
    marginBottom: verticalScale(12),
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userIcon: {
    marginRight: scale(6),
  },
  userText: {
    fontSize: scale(13),
    fontWeight: '500',
    color: COLORS.text,
    flex: 1,
  },
  teamBadge: {
    fontSize: scale(11),
    fontWeight: '500',
    color: COLORS.textSecondary,
    backgroundColor: COLORS.surface,
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(2),
    borderRadius: scale(10),
  },
  statusSection: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: verticalScale(12),
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(8),
  },
  statusIcon: {
    marginRight: scale(6),
  },
  statusText: {
    fontSize: scale(14),
    fontWeight: '700',
    color: COLORS.primary,
    marginRight: scale(6),
  },
  stateText: {
    fontSize: scale(12),
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  reasonSection: {
    marginTop: verticalScale(8),
  },
  reasonTitle: {
    fontSize: scale(12),
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: verticalScale(6),
  },
  reasonBox: {
    backgroundColor: COLORS.primaryLight,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    borderRadius: scale(6),
    padding: scale(10),
  },
  reasonText: {
    fontSize: scale(12),
    fontWeight: '500',
    color: COLORS.text,
    lineHeight: scale(16),
    marginBottom: verticalScale(2),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: verticalScale(40),
  },
  loadingText: {
    marginTop: verticalScale(16),
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  loadingSubtext: {
    marginTop: verticalScale(4),
    fontSize: scale(13),
    color: COLORS.textTertiary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: verticalScale(40),
    paddingHorizontal: scale(32),
  },
  errorIcon: {
    marginBottom: verticalScale(16),
  },
  errorTitle: {
    fontSize: scale(18),
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: verticalScale(8),
  },
  errorSubtext: {
    fontSize: scale(14),
    color: COLORS.textTertiary,
    textAlign: 'center',
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: verticalScale(60),
    paddingHorizontal: scale(32),
  },
  noDataIcon: {
    marginBottom: verticalScale(20),
  },
  noDataTitle: {
    fontSize: scale(18),
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: verticalScale(8),
  },
  noDataSubtext: {
    fontSize: scale(14),
    color: COLORS.textTertiary,
    textAlign: 'center',
  },
  endContainer: {
    alignItems: 'center',
    paddingVertical: verticalScale(24),
  },
  endIcon: {
    marginBottom: verticalScale(8),
  },
  endText: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.success,
  },
  loadMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(16),
  },
  loadMoreText: {
    marginLeft: scale(8),
    fontSize: scale(14),
    color: COLORS.textSecondary,
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
