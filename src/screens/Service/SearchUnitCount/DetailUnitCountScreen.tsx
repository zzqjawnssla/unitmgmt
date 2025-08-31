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
import { Text, Card, Chip, Snackbar, Appbar, Surface } from 'react-native-paper';
import { scale, verticalScale } from 'react-native-size-matters';
import MaterialIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { api } from '../../../services/api/api.tsx';
import { ServiceStackParamList, RootStackParamList } from '../../../navigation/RootStackNavigation.tsx';
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

// Brand Colors
const BRAND_COLORS = {
  primary: '#F47725',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  textSecondary: '#666666',
  success: '#4CAF50',
};

export const DetailUnitCountScreen: React.FC = () => {
  const route = useRoute<RouteProp<ServiceStackParamList, 'DetailUnitCountScreen'>>();
  const navigation = useNavigation<NavigationProp<ServiceStackParamList & RootStackParamList>>();
  const { locationId, locationInstanceId, detailTypeId } = route.params;
  const { setSearchTerm, setSearchCode } = useAuth();

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
      screen: 'SearchResult'
    });
  };

  const renderFooter = () => {
    // 로딩 중일 때
    if (isLoadingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={BRAND_COLORS.primary} />
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
          const newResults = response.data.results.filter((item: UnitItem) => 
            !existingIds.has(item.id)
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
      <View style={styles.loadingContainer}>
        <Text
          variant="headlineMedium"
          style={[styles.loadingText, { color: BRAND_COLORS.primary }]}
        >
          Loading...
        </Text>
        <ActivityIndicator
          size="large"
          color={BRAND_COLORS.primary}
          animating={true}
        />
      </View>
    );
  }

  return (
    <Surface style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="유니트 상세 현황" />
      </Appbar.Header>

      <View style={styles.contentContainer}>
        <View style={styles.countContainer}>
          <Text style={styles.countText}>
            total count : {result.results?.length || 0} / {result.count || 0}
          </Text>
        </View>
        {result.results && result.results.length > 0 ? (
          <FlatList
            data={result.results}
            renderItem={({ item }) => {
              return (
                <Card style={styles.itemCard}>
                  <TouchableOpacity
                    onPress={() => {
                      goToDetailScreen(item);
                    }}
                  >
                    <View style={styles.itemContainer}>
                      <View style={styles.itemContent}>
                        <Chip
                          style={styles.stateChip}
                          textStyle={styles.chipText}
                        >
                          {item.unit_state}
                        </Chip>

                        <View style={styles.itemInfo}>
                          <Text variant="bodyLarge" style={styles.barcodeText}>
                            {item.skt_barcode}
                          </Text>
                          <Text variant="bodyMedium" style={styles.serialText}>
                            {item.unit_serial}
                          </Text>
                        </View>
                      </View>
                      <View>
                        <MaterialIcons
                          name={'chevron-right'}
                          size={scale(20)}
                          color={BRAND_COLORS.textSecondary}
                        />
                      </View>
                    </View>
                  </TouchableOpacity>
                </Card>
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
          <Text style={styles.noDataText}>데이터가 없습니다.</Text>
        )}
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
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    flex: 1,
    padding: scale(12),
  },
  loadingContainer: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    textAlign: 'center',
    marginBottom: verticalScale(16),
    fontWeight: 'bold',
  },
  countContainer: {
    marginVertical: verticalScale(8),
  },
  countText: {
    textAlign: 'right',
    fontSize: scale(12),
    color: BRAND_COLORS.textSecondary,
  },
  flatList: {
    marginBottom: verticalScale(8),
  },
  itemCard: {
    marginVertical: verticalScale(4),
    elevation: 2,
    backgroundColor: BRAND_COLORS.surface,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: scale(12),
    flexWrap: 'wrap',
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stateChip: {
    backgroundColor: BRAND_COLORS.success,
  },
  chipText: {
    color: 'white',
    fontSize: scale(10),
  },
  itemInfo: {
    flexDirection: 'column',
    paddingLeft: scale(16),
    flex: 1,
  },
  barcodeText: {
    fontWeight: 'bold',
    color: '#333',
  },
  serialText: {
    color: BRAND_COLORS.textSecondary,
  },
  noDataText: {
    textAlign: 'center',
    fontSize: scale(14),
    color: BRAND_COLORS.textSecondary,
    marginTop: verticalScale(40),
  },
  footerLoader: {
    paddingVertical: verticalScale(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    marginTop: verticalScale(8),
    fontSize: scale(12),
    color: BRAND_COLORS.textSecondary,
  },
  footerEndMessage: {
    paddingVertical: verticalScale(20),
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    marginTop: verticalScale(10),
  },
  footerEndText: {
    fontSize: scale(12),
    color: BRAND_COLORS.textSecondary,
    fontStyle: 'italic',
  },
});