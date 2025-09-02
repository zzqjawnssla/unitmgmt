import React, { useRef, useState, useEffect } from 'react';
import {
  ScrollView,
  View,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import {
  Surface,
  Text,
  Appbar,
  Button,
  Snackbar,
  ActivityIndicator,
} from 'react-native-paper';
import { scale, verticalScale } from 'react-native-size-matters';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../../../store/AuthContext.tsx';
import { SelectUnitModal } from '../../../components/common/SelectUnitModal.tsx';
import { getUnitCount } from '../../../services/api/api.tsx';
import { useRegions, useLocations } from '../../../hooks/useSelectList.ts';
import type { ServiceStackParamList } from '../../../navigation/RootStackNavigation.tsx';
import { useNavigation, NavigationProp } from '@react-navigation/native';

type SearchUnitCountScreenNavigationProp =
  NavigationProp<ServiceStackParamList>;

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
  error: '#F44336',
  warning: '#9C27B0',
};

interface LocationType {
  id: string | number;
  location: string;
}

interface RegionType {
  id: string;
  region: string;
}

interface UnitDetail {
  key: string;
  value: string;
}

interface ManufacturerInfo {
  value: string;
  label: string;
}

interface MainTypeInfo {
  value: string;
  label: string;
}

interface SubTypeInfo {
  id: string;
  typename: string;
}

const SearchUnitCountScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<SearchUnitCountScreenNavigationProp>();

  const { data: regionList, isLoading: regionLoading } = useRegions();
  const { data: locationList, isLoading: locationLoading } = useLocations();

  const [selectRegion, setSelectRegion] = useState<RegionType>(() => {
    if (regionList?.results) {
      const matchingRegion = regionList.results.find(
        (item: RegionType) => item.region === user?.region,
      );
      return {
        id: matchingRegion?.id || '',
        region: user?.region || '',
      };
    }
    return { id: '', region: user?.region || '' };
  });

  const [selectLocation, setSelectLocation] = useState<LocationType>({
    id: '',
    location: '',
  });

  const [manufacturer, setManufacturer] = useState<ManufacturerInfo>({
    value: '',
    label: '',
  });
  const [mainType, setMainType] = useState<MainTypeInfo>({
    value: '',
    label: '',
  });
  const [subType, setSubType] = useState<SubTypeInfo>({
    id: '',
    typename: '',
  });
  const [detailType, setDetailType] = useState<UnitDetail>({
    key: '',
    value: '',
  });

  const [visible, setVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>([]);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const scrollViewRef = useRef<ScrollView>(null);

  // Set initial location when locationList is loaded
  useEffect(() => {
    if (locationList && locationList.length > 0 && !selectLocation.id) {
      setSelectLocation(locationList[0]);
    }
  }, [locationList, selectLocation.id]);

  // Update region when regionList changes
  useEffect(() => {
    if (regionList?.results && user?.region && !selectRegion.id) {
      const matchingRegion = regionList.results.find(
        (item: RegionType) => item.region === user?.region,
      );
      if (matchingRegion) {
        setSelectRegion({
          id: matchingRegion.id,
          region: matchingRegion.region,
        });
      }
    }
  }, [regionList, user?.region, selectRegion.id]);

  // Auto scroll for region selection - ensure selected region is visible
  useEffect(() => {
    if (selectRegion?.region && scrollViewRef.current && regionList?.results) {
      const index = regionList.results.findIndex(
        (item: RegionType) => item.region === selectRegion.region,
      );
      if (index !== -1) {
        // Use fixed chip width for consistent calculation
        const chipWidth = scale(100); // Fixed width for all chips
        const chipMargin = scale(8);
        const totalChipWidth = chipWidth + chipMargin;

        // Screen width consideration for viewport
        const screenWidth = scale(350); // Approximate screen width
        const scrollViewPadding = scale(40); // Total horizontal padding
        const visibleWidth = screenWidth - scrollViewPadding;

        // Calculate position to center the selected chip in viewport
        const selectedChipPosition = index * totalChipWidth;
        const centerOffset = visibleWidth / 2 - chipWidth / 2;
        const scrollPosition = Math.max(0, selectedChipPosition - centerOffset);

        setTimeout(() => {
          scrollViewRef.current?.scrollTo({
            x: scrollPosition,
            animated: true,
          });
        }, 300);
      }
    }
  }, [selectRegion?.region, regionList]);

  // Debug logging for raw location data
  useEffect(() => {
    console.log('Raw location data:', {
      locationList,
      locationListResults: locationList,
      locationLoading,
      rawDataType: typeof locationList,
      isArray: Array.isArray(locationList),
    });
  }, [locationList, locationLoading]);

  const filteredLocationList =
    locationList?.filter(
      (location: LocationType) =>
        location.location !== '국소' && location.location !== '차량보관',
    ) || [];

  // Debug logging for filtered location data
  useEffect(() => {
    console.log('Filtered location data:', {
      filteredLocationList,
      filteredLocationListLength: filteredLocationList.length,
      selectLocation,
      locationListExists: !!locationList,
      firstItem: locationList?.[0],
    });
  }, [locationList, filteredLocationList, selectLocation]);

  const handleOpenOptionModal = () => {
    setVisible(true);
  };

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  const goToDetail = (item: any) => {
    if (!item?.location_instance) {
      showSnackbar('위치 정보가 없습니다.');
      return;
    }

    // Navigate to detail screen with required parameters
    navigation.navigate('DetailUnitCountScreen', {
      locationId: selectLocation.id,
      locationInstanceId:
        item.location_instance.id || item.location_instance.user_id,
      detailTypeId: parseInt(detailType.key, 10),
    });
  };

  const handleSearch = async () => {
    if (!detailType.key) {
      showSnackbar('유니트를 선택해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await getUnitCount(
        parseInt(selectLocation.id.toString()),
        'ALL',
        selectRegion.region,
        parseInt(detailType.key),
      );
      setResult(response);
    } catch (error: any) {
      showSnackbar('검색 실패: ' + (error.message || '알 수 없는 오류'));
    } finally {
      setIsLoading(false);
    }
  };

  // Reset result when search criteria changes
  useEffect(() => {
    setResult([]);
  }, [detailType, selectRegion, selectLocation]);

  const renderLocationItem = (item: any) => {
    if (!item || !item.location_instance) return null;

    let locationName;
    let locationManageTeam;

    if (item?.location_name === '창고') {
      locationName = item.location_instance?.warehouse_name;
      locationManageTeam = item.location_instance?.warehouse_manage_team;
    } else if (item?.location_name === '전진배치(집/중/통') {
      locationName = item.location_instance?.zp_name;
      locationManageTeam = item.location_instance?.zp_manage_team;
    } else if (item?.location_name === '현장대기') {
      locationName = item.location_instance?.first_name;
      locationManageTeam = item.location_instance?.team;
    }

    return (
      <TouchableOpacity
        onPress={() => goToDetail(item)}
        style={styles.locationItem}
      >
        <View style={styles.locationCard}>
          <View style={styles.locationHeader}>
            <View style={styles.locationHeaderLeft}>
              <MaterialIcons
                name="location-on"
                size={scale(18)}
                color={COLORS.primary}
                style={styles.locationIcon}
              />
              <View style={styles.locationInfo}>
                <Text variant="titleMedium" style={styles.locationName}>
                  {locationName}
                </Text>
                <Text variant="bodySmall" style={styles.locationTeam}>
                  {locationManageTeam}
                </Text>
              </View>
            </View>
            <MaterialIcons
              name="chevron-right"
              size={scale(20)}
              color={COLORS.textSecondary}
            />
          </View>

          <View style={styles.statusContainer}>
            <View style={styles.statusRow}>
              <View style={[styles.statusItem, styles.statusSuccess]}>
                <Text variant="bodySmall" style={styles.statusLabel}>
                  정상
                </Text>
                <Text variant="titleMedium" style={styles.statusValue}>
                  {item.unit_states?.find(
                    (state: any) => state.unit_state === '정상',
                  )?.count || 0}
                </Text>
              </View>

              <View style={[styles.statusItem, styles.statusError]}>
                <Text variant="bodySmall" style={styles.statusLabel}>
                  불량
                </Text>
                <Text variant="titleMedium" style={styles.statusValue}>
                  {item.unit_states?.find(
                    (state: any) => state.unit_state === '불량',
                  )?.count || 0}
                </Text>
              </View>

              <View style={[styles.statusItem, styles.statusWarning]}>
                <Text variant="bodySmall" style={styles.statusLabel}>
                  수리불가
                </Text>
                <Text variant="titleMedium" style={styles.statusValue}>
                  {item.unit_states?.find(
                    (state: any) => state.unit_state === '수리불가(불용)',
                  )?.count || 0}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyCard}>
        <MaterialIcons
          name="search-off"
          size={scale(48)}
          color={COLORS.textTertiary}
          style={styles.emptyIcon}
        />
        <Text variant="titleMedium" style={styles.emptyTitle}>
          조회 결과가 없습니다
        </Text>
        <Text variant="bodyMedium" style={styles.emptyText}>
          검색 조건을 확인하고 다시 시도해주세요
        </Text>
      </View>
    </View>
  );

  return (
    <Surface style={styles.container}>
      <Appbar.Header style={styles.appbar}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content
          title="유니트 현황 조회"
          titleStyle={styles.appbarTitle}
        />
      </Appbar.Header>

      <View style={styles.content}>
        {/* Unit Selection */}
        <View style={styles.selectionSection}>
          <TouchableOpacity
            onPress={handleOpenOptionModal}
            style={styles.selectionCard}
          >
            <View style={styles.selectionContent}>
              {detailType?.value !== '' ? (
                <>
                  <View style={styles.selectionInfo}>
                    <Text variant="titleMedium" style={styles.selectionTitle}>
                      {detailType.value}
                    </Text>
                    <Text
                      variant="bodySmall"
                      style={styles.selectionSubtitle}
                      numberOfLines={1}
                    >
                      {mainType.label} · {subType.typename} ·{' '}
                      {manufacturer.label}
                    </Text>
                  </View>
                  <MaterialIcons
                    name="refresh"
                    size={scale(20)}
                    color={COLORS.textSecondary}
                  />
                </>
              ) : (
                <>
                  <View style={styles.selectionInfo}>
                    <Text
                      variant="titleMedium"
                      style={styles.selectionPlaceholder}
                    >
                      유니트를 선택해주세요.
                    </Text>
                  </View>
                  <MaterialIcons
                    name="search"
                    size={scale(20)}
                    color={COLORS.textSecondary}
                  />
                </>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Region Selection */}
        <View style={styles.filterSection}>
          <Text variant="titleSmall" style={styles.sectionTitle}>
            지역 선택
          </Text>
          {regionLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text variant="bodySmall" style={styles.loadingText}>
                지역 정보 로딩 중...
              </Text>
            </View>
          ) : (
            <ScrollView
              ref={scrollViewRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              {regionList?.results?.map((item: RegionType) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => {
                    setSelectRegion({
                      id: item.id,
                      region: item.region,
                    });
                  }}
                  style={[
                    styles.regionChip,
                    selectRegion?.region === item.region &&
                      styles.regionChipSelected,
                  ]}
                >
                  <Text
                    variant="bodyMedium"
                    style={[
                      styles.regionChipText,
                      selectRegion?.region === item.region &&
                        styles.regionChipTextSelected,
                    ]}
                  >
                    {item.region}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Location Selection */}
        <View style={styles.filterSection}>
          <Text variant="titleSmall" style={styles.sectionTitle}>
            위치 선택
          </Text>
          {locationLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text variant="bodySmall" style={styles.loadingText}>
                위치 정보 로딩 중...
              </Text>
            </View>
          ) : filteredLocationList.length > 0 ? (
            <View style={styles.locationGrid}>
              {filteredLocationList.map((item: LocationType) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => {
                    setSelectLocation({
                      id: item.id,
                      location: item.location,
                    });
                  }}
                  style={[
                    styles.locationChip,
                    selectLocation?.id.toString() === item.id.toString() &&
                      styles.locationChipSelected,
                  ]}
                >
                  <Text
                    variant="bodyMedium"
                    style={[
                      styles.locationChipText,
                      selectLocation?.id.toString() === item.id.toString() &&
                        styles.locationChipTextSelected,
                    ]}
                  >
                    {item.location}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.loadingContainer}>
              <Text variant="bodySmall" style={styles.loadingText}>
                위치 정보가 없습니다
              </Text>
            </View>
          )}
        </View>

        {/* Search Button */}
        <View style={styles.searchButtonContainer}>
          <Button
            mode="contained"
            onPress={handleSearch}
            disabled={isLoading}
            loading={isLoading}
            style={styles.searchButton}
            buttonColor={COLORS.primary}
          >
            조회
          </Button>
        </View>

        <FlatList
          data={result?.results?.data?.[0]?.unit_details?.[0]?.locations || []}
          renderItem={({ item }) => renderLocationItem(item)}
          keyExtractor={(item, index) =>
            item.location_instance?.id
              ? `location-${item.location_instance.id}-${index}`
              : `user-${item.location_instance?.user_id}-${index}`
          }
          ListEmptyComponent={renderEmptyList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.resultsList}
        />
      </View>

      <SelectUnitModal
        isVisible={visible}
        onClose={() => setVisible(false)}
        detailType={detailType}
        setManufacturer={setManufacturer}
        setMainType={setMainType}
        setSubType={setSubType}
        setDetailType={setDetailType}
      />

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
  content: {
    flex: 1,
    backgroundColor: COLORS.surface,
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(6),
  },

  // Selection Section
  selectionSection: {
    marginBottom: verticalScale(6),
  },
  selectionCard: {
    backgroundColor: COLORS.background,
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(16),
  },
  selectionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectionInfo: {
    flex: 1,
  },
  selectionTitle: {
    fontWeight: '600',
    color: COLORS.text,
    fontSize: scale(18),
  },
  selectionSubtitle: {
    color: COLORS.textSecondary,
    marginTop: verticalScale(4),
    fontSize: scale(12),
  },
  selectionPlaceholder: {
    color: COLORS.textSecondary,
  },

  // Filter Sections
  filterSection: {
    backgroundColor: COLORS.background,
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: scale(12),
    marginBottom: verticalScale(6),
  },
  sectionTitle: {
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: verticalScale(6),
    fontSize: scale(14),
  },
  horizontalScroll: {
    paddingHorizontal: scale(4),
  },

  // Region Selection
  regionChip: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: scale(16),
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    marginRight: scale(8),
    minWidth: scale(80), // Reduced minimum width
    alignItems: 'center',
    justifyContent: 'center',
  },
  regionChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  regionChipText: {
    color: COLORS.textSecondary,
    fontWeight: '500',
    fontSize: scale(13),
  },
  regionChipTextSelected: {
    color: COLORS.background,
    fontWeight: '600',
  },

  // Location Selection
  locationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
  },
  locationChip: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: scale(16),
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    // marginBottom: scale(0),
  },
  locationChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  locationChipText: {
    color: COLORS.textSecondary,
    fontWeight: '500',
    fontSize: scale(13),
  },
  locationChipTextSelected: {
    color: COLORS.background,
    fontWeight: '600',
  },

  // Search Button
  searchButtonContainer: {
    marginBottom: verticalScale(10),
  },
  searchButton: {
    backgroundColor: COLORS.primary,
    borderRadius: scale(12),
    paddingVertical: scale(4),
  },

  // Results List
  resultsList: {
    paddingBottom: verticalScale(10),
  },
  locationItem: {
    marginBottom: verticalScale(8),
  },
  locationCard: {
    backgroundColor: COLORS.background,
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  locationHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationIcon: {
    marginRight: scale(12),
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontWeight: '600',
    color: COLORS.text,
  },
  locationTeam: {
    color: COLORS.textSecondary,
    marginTop: verticalScale(2),
  },
  statusContainer: {
    padding: scale(16),
    backgroundColor: COLORS.background,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusItem: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: verticalScale(8),
    borderRadius: scale(8),
    marginHorizontal: scale(4),
  },
  statusSuccess: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  statusError: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
  statusWarning: {
    backgroundColor: 'rgba(156, 39, 176, 0.1)',
  },
  statusLabel: {
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginBottom: verticalScale(4),
  },
  statusValue: {
    color: COLORS.text,
    fontWeight: '700',
  },

  // Loading & Empty States
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(8),
  },
  loadingText: {
    color: COLORS.textSecondary,
    marginLeft: scale(8),
    fontSize: scale(13),
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(40),
  },
  emptyCard: {
    backgroundColor: COLORS.background,
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: scale(24),
    alignItems: 'center',
    maxWidth: scale(280),
  },
  emptyIcon: {
    marginBottom: verticalScale(16),
  },
  emptyTitle: {
    color: COLORS.text,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: verticalScale(8),
  },
  emptyText: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: scale(20),
  },

  // Snackbar
  snackbar: {
    backgroundColor: COLORS.text,
    marginBottom: verticalScale(20),
  },
  snackbarText: {
    color: COLORS.background,
  },
});

export default SearchUnitCountScreen;
