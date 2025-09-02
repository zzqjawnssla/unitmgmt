import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  useRoute,
  RouteProp,
  useFocusEffect,
  useNavigation,
  NavigationProp,
} from '@react-navigation/native';
import { Text, Snackbar, Appbar, Surface } from 'react-native-paper';
import { scale, verticalScale } from 'react-native-size-matters';
import MaterialIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { api } from '../../../services/api/api.tsx';
import {
  ServiceStackParamList,
  RootStackParamList,
} from '../../../navigation/RootStackNavigation.tsx';
import { useAuth } from '../../../store/AuthContext.tsx';
import FlatList = Animated.FlatList;

// Type for the API response data
interface UnitItem {
  id: string;
  skt_barcode: string;
  unit_serial: string;
  unit_state: string;
}

interface APIResponse {
  count: number;
  next: string | null;
  results: UnitItem[];
}

// KakaoTalk-style colors
const COLORS = {
  primary: '#F47725',
  primaryLight: 'rgba(244, 119, 37, 0.1)',
  background: '#FFFFFF',
  surface: '#F9F9F9',
  text: '#000000',
  textSecondary: '#666666',
  textTertiary: '#999999',
  border: '#E0E0E0',
  divider: '#F0F0F0',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',
};

export const DetailUnitCountScreen: React.FC = () => {
  const route =
    useRoute<RouteProp<ServiceStackParamList, 'DetailUnitCountScreen'>>();
  const navigation =
    useNavigation<NavigationProp<ServiceStackParamList & RootStackParamList>>();
  const { locationId, locationInstanceId, detailTypeId } = route.params;
  const { setSearchTerm, setSearchCode } = useAuth();

  // 상태별 색상과 표시 텍스트 가져오기
  const getStateStyle = (unitState: string) => {
    switch (unitState) {
      case '정상':
        return {
          backgroundColor: `${COLORS.success}20`,
          textColor: COLORS.success,
          displayText: '정상',
        };
      case '불량':
        return {
          backgroundColor: `${COLORS.warning}20`,
          textColor: COLORS.warning,
          displayText: '불량',
        };
      case '수리불가(불용)':
        return {
          backgroundColor: `${COLORS.error}20`,
          textColor: COLORS.error,
          displayText: '불용',
        };
      default:
        return {
          backgroundColor: COLORS.primaryLight,
          textColor: COLORS.primary,
          displayText: unitState,
        };
    }
  };

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [result, setResult] = useState<APIResponse>({
    count: 0,
    next: null,
    results: [],
  });
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  const goToDetailScreen = (item: UnitItem) => {
    // Set search parameters and navigate to SearchResultScreen
    setSearchTerm({ sktbarcode: item.skt_barcode, serial: '' });
    setSearchCode({ value: '1', label: 'SKT바코드' });

    navigation.navigate('SearchStack', {
      screen: 'SearchResult',
    });
  };

  const renderFooter = () => {
    // 로딩 중일 때
    if (isLoadingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.footerText}>더 많은 데이터를 불러오는 중...</Text>
        </View>
      );
    }

    // 데이터가 있고 더 이상 불러올 데이터가 없을 때
    if (result.results.length > 0 && !nextPage) {
      return (
        <View style={styles.footerEndMessage}>
          <Text style={styles.footerEndText}>모든 데이터를 불러왔습니다.</Text>
        </View>
      );
    }

    return null;
  };

  const fetchDetailList = async () => {
    setIsLoading(true);

    const params = {
      location: locationId,
      location_content_instance_id: locationInstanceId,
      unit_detail_type: detailTypeId,
    };

    try {
      const response = await api
        .get('/apps/unit_object_info_by_location_and_unitdetail_type', {
          params,
        })
        .then(response => response.data);

      setResult(response);
      setNextPage(response.next);
      setIsLoading(false);
    } catch (error) {
      console.log(error);
      showSnackbar('데이터를 불러오는데 실패했습니다.');
      setIsLoading(false);
    }
  };

  const fetchNextPage = async () => {
    if (nextPage && !isLoadingMore) {
      try {
        setIsLoadingMore(true);
        const response = await api.get(nextPage);

        setResult(prevList => {
          // 중복 제거: 기존 결과의 ID들을 Set으로 만들어 중복 체크
          const existingIds = new Set(prevList.results.map(item => item.id));
          const newResults = response.data.results.filter(
            (item: UnitItem) => !existingIds.has(item.id),
          );

          return {
            ...prevList,
            results: [...prevList.results, ...newResults],
          };
        });

        setNextPage(response.data.next);
        setIsLoadingMore(false);
      } catch (error) {
        showSnackbar('데이터를 불러오는데 실패했습니다.');
        setIsLoadingMore(false);
      }
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDetailList();
    }, [locationId, locationInstanceId, detailTypeId]),
  );

  if (isLoading) {
    return (
      <Surface style={styles.container}>
        <Appbar.Header style={styles.appbar}>
          <Appbar.BackAction
            onPress={() => navigation.goBack()}
            iconColor={COLORS.text}
          />
          <Appbar.Content
            title="유니트 상세 현황"
            titleStyle={styles.appbarTitle}
          />
        </Appbar.Header>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>데이터를 불러오는 중...</Text>
        </View>
      </Surface>
    );
  }

  return (
    <Surface style={styles.container}>
      <Appbar.Header style={styles.appbar}>
        <Appbar.BackAction
          onPress={() => navigation.goBack()}
          iconColor={COLORS.text}
        />
        <Appbar.Content
          title="유니트 상세 현황"
          titleStyle={styles.appbarTitle}
        />
      </Appbar.Header>

      <View style={styles.contentContainer}>
        <View style={styles.countContainer}>
          <Text style={styles.countText}>
            총 {result.results?.length || 0}개 / {result.count || 0}개
          </Text>
        </View>
        {result.results && result.results.length > 0 ? (
          <FlatList
            data={result.results}
            renderItem={({ item }) => {
              return (
                <TouchableOpacity
                  style={styles.itemCard}
                  onPress={() => {
                    goToDetailScreen(item);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.itemContainer}>
                    <View style={styles.itemContent}>
                      {(() => {
                        const stateStyle = getStateStyle(item.unit_state);
                        return (
                          <View
                            style={[
                              styles.stateChip,
                              { backgroundColor: stateStyle.backgroundColor },
                            ]}
                          >
                            <Text
                              style={[
                                styles.chipText,
                                { color: stateStyle.textColor },
                              ]}
                            >
                              {stateStyle.displayText}
                            </Text>
                          </View>
                        );
                      })()}

                      <View style={styles.itemInfo}>
                        <Text style={styles.barcodeText}>
                          {item.skt_barcode}
                        </Text>
                        <Text style={styles.serialText}>
                          {item.unit_serial}
                        </Text>
                      </View>
                    </View>
                    <View>
                      <MaterialIcons
                        name={'chevron-right'}
                        size={scale(20)}
                        color={COLORS.textSecondary}
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            onEndReached={fetchNextPage}
            onEndReachedThreshold={0.3}
            ListFooterComponent={renderFooter}
            style={styles.flatList}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={false}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.noDataText}>데이터가 없습니다.</Text>
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
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: COLORS.surface,
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(16),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  loadingText: {
    marginTop: verticalScale(16),
    fontSize: scale(16),
    color: COLORS.textSecondary,
  },
  countContainer: {
    marginBottom: verticalScale(16),
  },
  countText: {
    textAlign: 'right',
    fontSize: scale(14),
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  flatList: {
    flex: 1,
  },
  itemCard: {
    backgroundColor: COLORS.background,
    marginBottom: verticalScale(8),
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: scale(16),
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stateChip: {
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: scale(12),
    alignSelf: 'flex-start',
  },
  chipText: {
    fontSize: scale(12),
    fontWeight: '600',
  },
  itemInfo: {
    flexDirection: 'column',
    paddingLeft: scale(16),
    flex: 1,
  },
  barcodeText: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: verticalScale(2),
  },
  serialText: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    textAlign: 'center',
    fontSize: scale(16),
    color: COLORS.textSecondary,
  },
  footerLoader: {
    paddingVertical: verticalScale(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    marginTop: verticalScale(8),
    fontSize: scale(14),
    color: COLORS.textSecondary,
  },
  footerEndMessage: {
    paddingVertical: verticalScale(20),
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: verticalScale(16),
  },
  footerEndText: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
  },
  snackbar: {
    backgroundColor: COLORS.text,
    marginBottom: verticalScale(20),
  },
  snackbarText: {
    color: COLORS.background,
  },
});
