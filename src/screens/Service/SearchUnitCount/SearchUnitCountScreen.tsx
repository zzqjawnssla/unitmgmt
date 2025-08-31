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
  Card,
  Chip,
  SegmentedButtons,
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

  // Auto scroll for region selection
  useEffect(() => {
    if (selectRegion?.region && scrollViewRef.current && regionList?.results) {
      const index = regionList.results.findIndex(
        (item: RegionType) => item.region === selectRegion.region,
      );
      if (index !== -1) {
        // Region 버튼의 고정된 너비를 사용
        const buttonWidth = scale(100); // 더 큰 고정 너비
        const buttonMargin = scale(12); // marginLeft + marginRight (6 + 6)
        const totalButtonWidth = buttonWidth + buttonMargin;

        const scrollPosition = Math.max(0, index * totalButtonWidth);
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
        <Card style={styles.locationCard}>
          <View style={styles.locationHeader}>
            <MaterialIcons
              name="location-on"
              size={scale(24)}
              color="#F47725"
              style={styles.locationIcon}
            />
            <View style={styles.locationInfo}>
              <Text variant="titleMedium" style={styles.locationName}>
                {locationName}
              </Text>
              <Text variant="bodyMedium" style={styles.locationTeam}>
                {locationManageTeam}
              </Text>
            </View>
          </View>

          <View style={styles.statusContainer}>
            <Chip
              mode="flat"
              textStyle={styles.chipText}
              style={[styles.statusChip, { backgroundColor: '#4CAF50' }]}
            >
              정상:{' '}
              {item.unit_states?.find(
                (state: any) => state.unit_state === '정상',
              )?.count || 0}
            </Chip>

            <Chip
              mode="flat"
              textStyle={styles.chipText}
              style={[styles.statusChip, { backgroundColor: '#F44336' }]}
            >
              불량:{' '}
              {item.unit_states?.find(
                (state: any) => state.unit_state === '불량',
              )?.count || 0}
            </Chip>

            <Chip
              mode="flat"
              textStyle={styles.chipText}
              style={[styles.statusChip, { backgroundColor: '#9C27B0' }]}
            >
              수리불가:{' '}
              {item.unit_states?.find(
                (state: any) => state.unit_state === '수리불가(불용)',
              )?.count || 0}
            </Chip>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Text variant="bodyLarge" style={styles.emptyText}>
        조회결과가 없습니다
      </Text>
    </View>
  );

  return (
    <Surface style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="유니트 현황 조회" />
      </Appbar.Header>

      <View style={styles.content}>
        {/* Unit Selection Card */}
        <TouchableOpacity onPress={handleOpenOptionModal}>
          <Card style={styles.selectionCard}>
            <Card.Content>
              <View style={styles.selectionContent}>
                {detailType?.value !== '' ? (
                  <>
                    <View style={styles.selectionInfo}>
                      <Text variant="titleLarge" style={styles.selectionTitle}>
                        {detailType.value}
                      </Text>
                      <Text
                        variant="bodyMedium"
                        style={styles.selectionSubtitle}
                        numberOfLines={1}
                      >
                        {mainType.label} · {subType.typename} ·{' '}
                        {manufacturer.label}
                      </Text>
                    </View>
                    <MaterialIcons
                      name="refresh"
                      size={scale(24)}
                      color="#666"
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
                      size={scale(24)}
                      color="#666"
                    />
                  </>
                )}
              </View>
            </Card.Content>
          </Card>
        </TouchableOpacity>

        {/* Region Selection */}
        <View style={styles.filterSection}>
          {regionLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#F47725" />
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
              <SegmentedButtons
                value={selectRegion?.region || ''}
                onValueChange={(region: string) => {
                  const selectedItem = regionList?.results?.find(
                    (item: RegionType) => item.region === region,
                  );
                  if (selectedItem) {
                    setSelectRegion({
                      id: selectedItem.id,
                      region: selectedItem.region,
                    });
                  }
                }}
                buttons={
                  regionList?.results?.map((item: RegionType) => ({
                    value: item.region,
                    label: item.region,
                    style: [
                      styles.regionSegmentButton,
                      selectRegion?.region === item.region &&
                        styles.regionSelectedSegmentButton,
                    ],
                    labelStyle: [
                      styles.regionSegmentLabel,
                      selectRegion?.region === item.region &&
                        styles.regionSelectedSegmentLabel,
                    ],
                  })) || []
                }
                style={styles.regionSegmentedButtons}
              />
            </ScrollView>
          )}
        </View>

        {/* Location Selection */}
        <View style={styles.filterSection}>
          {locationLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#F47725" />
              <Text variant="bodySmall" style={styles.loadingText}>
                위치 정보 로딩 중...
              </Text>
            </View>
          ) : filteredLocationList.length > 0 ? (
            <View style={styles.locationButtonContainer}>
              <SegmentedButtons
                buttons={filteredLocationList.map((item: LocationType) => ({
                  value: item.id.toString(),
                  label: item.location,
                  style: [
                    styles.locationSegmentButton,
                    selectLocation?.id.toString() === item.id.toString() &&
                      styles.locationSelectedSegmentButton,
                  ],
                  labelStyle: [
                    styles.locationSegmentLabel,
                    selectLocation?.id.toString() === item.id.toString() &&
                      styles.locationSelectedSegmentLabel,
                  ],
                }))}
                value={selectLocation?.id.toString() || ''}
                onValueChange={(location: string) => {
                  const selectedItem = filteredLocationList.find(
                    (item: LocationType) => item.id.toString() === location,
                  );
                  if (selectedItem) {
                    setSelectLocation({
                      id: selectedItem.id,
                      location: selectedItem.location,
                    });
                  }
                }}
                style={styles.locationSegmentedButtons}
              />
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
          >
            조회
          </Button>
        </View>

        {/* Results */}
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
  },
  selectionCard: {
    marginVertical: verticalScale(12),
    elevation: 2,
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
    fontWeight: '700',
    color: '#333333',
  },
  selectionSubtitle: {
    color: '#666666',
    marginTop: verticalScale(4),
  },
  selectionPlaceholder: {
    color: '#333333',
  },
  filterSection: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingVertical: verticalScale(8),
    marginVertical: verticalScale(4),
  },
  horizontalScroll: {
    paddingHorizontal: scale(4),
  },
  // Region SegmentedButtons 스타일
  regionSegmentedButtons: {
    alignItems: 'stretch',
    borderRadius: 0,
    backgroundColor: 'transparent',
  },
  regionSegmentButton: {
    backgroundColor: 'transparent',
    borderRadius: scale(20),
    borderColor: 'transparent',
    marginLeft: scale(6),
    marginRight: scale(6),
    paddingHorizontal: scale(12),
    paddingVertical: scale(1), // 8/3 ≈ 2.7
    width: scale(100), // 더 큰 고정 너비
    borderWidth: 0,
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
    borderBottomLeftRadius: scale(20),
    borderBottomRightRadius: scale(20),
  },
  regionSelectedSegmentButton: {
    backgroundColor: '#F47725',
    borderRadius: scale(20),
    borderWidth: 0,
    marginLeft: scale(6),
    marginRight: scale(6),
    paddingHorizontal: scale(12),
    paddingVertical: scale(1), // 8/3 ≈ 2.7
    width: scale(100), // 더 큰 고정 너비
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
    borderBottomLeftRadius: scale(20),
    borderBottomRightRadius: scale(20),
  },
  regionSegmentLabel: {
    color: '#333333',
    fontSize: scale(12),
    textAlign: 'center',
    fontWeight: '500',
  },
  regionSelectedSegmentLabel: {
    color: '#FFFFFF',
  },

  // Location SegmentedButtons 스타일
  locationSegmentedButtons: {
    flexWrap: 'nowrap',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    width: '100%',
    borderRadius: 0,
    backgroundColor: 'transparent',
  },
  locationSegmentButton: {
    backgroundColor: 'transparent',
    borderRadius: scale(20),
    borderColor: 'transparent',
    marginHorizontal: scale(1),
    marginVertical: scale(1),
    paddingHorizontal: scale(8),
    paddingVertical: scale(1),
    minHeight: scale(40),
    minWidth: scale(85),
    borderWidth: 0,
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
    borderBottomLeftRadius: scale(20),
    borderBottomRightRadius: scale(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationSelectedSegmentButton: {
    backgroundColor: '#F47725',
    borderRadius: scale(20),
    borderWidth: 0,
    marginHorizontal: scale(1),
    marginVertical: scale(1),
    paddingHorizontal: scale(8),
    paddingVertical: scale(1),
    minHeight: scale(40),
    minWidth: scale(85),
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
    borderBottomLeftRadius: scale(20),
    borderBottomRightRadius: scale(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationSegmentLabel: {
    color: '#333333',
    fontSize: scale(10),
    textAlign: 'center',
    lineHeight: scale(12),
    fontWeight: '500',
    flexWrap: 'wrap',
    numberOfLines: 2,
  },
  locationSelectedSegmentLabel: {
    color: '#FFFFFF',
    fontSize: scale(10),
    textAlign: 'center',
    lineHeight: scale(12),
    fontWeight: '500',
    flexWrap: 'wrap',
    numberOfLines: 2,
  },
  searchButtonContainer: {
    paddingVertical: verticalScale(12),
  },
  searchButton: {
    backgroundColor: '#F47725',
  },
  resultsList: {
    paddingBottom: verticalScale(20),
  },
  locationItem: {
    marginVertical: verticalScale(6),
  },
  locationCard: {
    elevation: 1,
    borderRadius: scale(12),
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 119, 37, 0.1)',
    padding: scale(16),
    borderTopLeftRadius: scale(12),
    borderTopRightRadius: scale(12),
  },
  locationIcon: {
    marginRight: scale(12),
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontWeight: '700',
    color: '#333333',
  },
  locationTeam: {
    color: '#666666',
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: scale(16),
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: scale(12),
    borderBottomRightRadius: scale(12),
  },
  statusChip: {
    minWidth: scale(80),
  },
  chipText: {
    color: '#FFFFFF',
    fontSize: scale(12),
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: verticalScale(40),
  },
  emptyText: {
    color: '#666666',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(12),
  },
  loadingText: {
    color: '#666666',
    marginLeft: scale(8),
  },
  locationButtonContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(2),
  },
});

export default SearchUnitCountScreen;
