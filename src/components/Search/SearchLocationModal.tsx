import React, { useState, useMemo } from 'react';
import {
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
  FlatList,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import {
  Text,
  TextInput,
  SegmentedButtons,
  ActivityIndicator,
} from 'react-native-paper';
import { scale, verticalScale } from 'react-native-size-matters';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { api } from '../../services/api/api';
import { useTeams } from '../../hooks/useSelectList';
import { SafeSnackbar } from '../common/SafeSnackbar';

// KakaoTalk-style colors (consistent with UseUnitScreen)
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
};

interface SearchLocationModalProps {
  isVisible: boolean;
  onClose: () => void;
  location: {
    id: string;
    location: string;
  };
  searchLocation: {
    value: string;
    label: string;
  };
  setSearchLocation: React.Dispatch<
    React.SetStateAction<{
      value: string;
      label: string;
    }>
  >;
}

const menuItems = [
  { value: 'zp_name', label: '국소명' },
  { value: 'zp_code', label: '통합시설코드' },
];

export const SearchLocationModal: React.FC<SearchLocationModalProps> = ({
  isVisible,
  onClose,
  location,
  searchLocation,
  setSearchLocation,
}) => {
  const { data: teamData, isLoading: isTeamLoading } = useTeams();
  const [selectedRegion, setSelectedRegion] = useState({ key: '', value: '' });
  const [team, setTeam] = useState({ key: 0, value: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [result, setResult] = useState<any>({ results: [], count: 0 });
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [selectMenu, setSelectMenu] = useState(menuItems[0]);
  const [expandedAccordion, setExpandedAccordion] = useState<string | null>(
    null,
  );
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  // 지역 목록을 중복 제거해서 추출
  const uniqueRegions = useMemo(() => {
    if (!teamData?.results) {
      return [];
    }

    const regions = teamData.results.map((item: any) => ({
      key: item.region,
      value: item.region,
    }));

    // 중복 제거
    const uniqueValues = [...new Set(regions.map(region => region.value))];
    return uniqueValues.map(region => ({
      key: region,
      value: region,
    }));
  }, [teamData]);

  // 선택된 지역에 해당하는 팀 목록 필터링
  const filteredTeams = useMemo(() => {
    if (!teamData?.results || selectedRegion.value === '') {
      return [];
    }

    return teamData.results
      .filter((team: any) => team.region === selectedRegion.value)
      .map((team: any) => ({
        id: team.id,
        team_name: team.team_name,
        region: team.region,
      }));
  }, [teamData, selectedRegion]);

  const handleSelectLocation = (value: string, label: string) => {
    setSearchLocation({ value, label });
    onClose();
  };

  const handleClose = () => {
    setSearchQuery('');
    setResult({ results: [], count: 0 });
    setSelectedRegion({ key: '', value: '' });
    setTeam({ key: 0, value: '' });
    setExpandedAccordion(null);
    onClose();
  };

  const handleSearch = async () => {
    if (searchQuery.length < 2) {
      showSnackbar('검색어를 2글자 이상 입력해주세요.');
      return;
    }

    if (selectMenu.value === 'zp_name' && selectedRegion.value === '') {
      showSnackbar('지역을 선택해주세요.');
      return;
    }

    if (selectMenu.value === 'zp_name' && team.value === '') {
      showSnackbar('팀을 선택해주세요.');
      return;
    }

    let url = '';
    let params = {};

    switch (location.id) {
      case '1': // 국소
        url = 'unit_zpcode_list';
        params = {
          zp_type: '중계기',
          [selectMenu.value]: searchQuery,
          ...(selectMenu.value === 'zp_name' && { zp_manage_team: team.value }),
        };
        break;
      case '2': // 전진배치(집/중/통)
        url = 'intergraged_basestation_list';
        params = {
          zp_type: '전진배치(집/중/통)',
          [selectMenu.value]: searchQuery,
          ...(selectMenu.value === 'zp_name' && { zp_manage_team: team.value }),
        };
        break;
      default:
        showSnackbar('지원하지 않는 위치입니다.');
        return;
    }

    try {
      const response = await api.get(`/apps/${url}/`, { params });
      setResult(response.data);
      setNextPage(response.data.next);
    } catch (error) {
      console.error('Search error:', error);
      showSnackbar('검색에 실패했습니다.');
    }
  };

  const fetchNextPage = async () => {
    // 검색 결과가 없거나 이미 로딩 중일 때는 실행하지 않음
    if (!result?.results?.length || isTeamLoading || isLoadingMore) {
      return;
    }

    // 이미 모든 데이터를 로드했는지 확인
    if (result?.results?.length >= result?.count) {
      showSnackbar('더 이상 불러올 데이터가 없습니다.');
      return;
    }

    if (nextPage) {
      setIsLoadingMore(true);
      try {
        const response = await api.get(nextPage);
        const newResults = [
          ...(result.results || []),
          ...response.data.results,
        ];

        setResult((prevList: any) => ({
          ...prevList,
          results: newResults,
          next: response.data.next,
        }));
        setNextPage(response.data.next);

        // 모든 데이터를 로드했는지 다시 확인
        if (newResults.length >= result.count) {
          showSnackbar('더 이상 불러올 데이터가 없습니다.');
        }
      } catch (error) {
        console.log('Pagination error:', error);
        showSnackbar('추가 데이터를 불러오는데 실패했습니다.');
      } finally {
        setIsLoadingMore(false);
      }
    } else if (result?.results?.length > 0) {
      // nextPage가 없고 검색 결과가 있을 때만 메시지 표시
      showSnackbar('더 이상 불러올 데이터가 없습니다.');
    }
  };

  // Loading Footer Component for pagination
  const renderFooter = () => {
    if (!isLoadingMore) return null;

    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator
          animating={true}
          color={COLORS.primary}
          size="small"
        />
        <Text style={styles.loadingText}>더 많은 결과를 불러오는 중...</Text>
      </View>
    );
  };

  return (
    <>
      <Modal visible={isVisible} animationType="slide" transparent>
        <TouchableWithoutFeedback
          onPress={() => {
            Keyboard.dismiss();
            handleClose();
          }}
        >
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalContainer}>
                {/* Header */}
                <View style={styles.modalHeader}>
                  <Text variant="titleLarge" style={styles.headerText}>
                    세부 위치 검색
                  </Text>
                  <TouchableOpacity onPress={handleClose}>
                    <Icon name="close" size={24} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Menu Selection */}
                <SegmentedButtons
                  buttons={menuItems.map(item => ({
                    value: item.value,
                    label: item.label,
                    style: {
                      backgroundColor:
                        selectMenu.value === item.value
                          ? COLORS.primary
                          : 'transparent',
                      borderColor: COLORS.primaryLight,
                      borderRadius: 8,
                    },
                  }))}
                  value={selectMenu.value}
                  onValueChange={value => {
                    const selectedItem = menuItems.find(
                      item => item.value === value,
                    );
                    if (selectedItem) {
                      setSelectMenu(selectedItem);
                      setSearchQuery('');
                      setResult({ results: [], count: 0 });
                    }
                  }}
                  theme={{ roundness: 8 }}
                  style={styles.segmentedButtons}
                />

                {/* Region and Team Selection (only for zp_name search) */}
                {selectMenu.value === 'zp_name' && (
                  <View style={styles.dropdownSection}>
                    {/* Region Dropdown */}
                    <View style={styles.dropdownContainer}>
                      <Text style={styles.label}>지역</Text>
                      <TouchableOpacity
                        style={styles.dropdown}
                        onPress={() =>
                          setExpandedAccordion(
                            expandedAccordion === 'region' ? null : 'region',
                          )
                        }
                      >
                        <Text style={styles.dropdownText}>
                          {selectedRegion.value || '지역을 선택해주세요'}
                        </Text>
                        <Text style={styles.dropdownIcon}>
                          {expandedAccordion === 'region' ? '▲' : '▼'}
                        </Text>
                      </TouchableOpacity>

                      {expandedAccordion === 'region' && (
                        <View style={styles.dropdownOptions}>
                          <ScrollView
                            style={styles.dropdownScrollView}
                            nestedScrollEnabled
                          >
                            {isTeamLoading ? (
                              <View style={styles.dropdownOption}>
                                <Text style={styles.dropdownOptionText}>
                                  로딩 중...
                                </Text>
                              </View>
                            ) : (
                              uniqueRegions?.map(
                                (regionItem: any, index: number) => (
                                  <TouchableOpacity
                                    key={index}
                                    style={[
                                      styles.dropdownOption,
                                      index === uniqueRegions.length - 1 &&
                                        styles.dropdownOptionLast,
                                    ]}
                                    onPress={() => {
                                      setSelectedRegion({
                                        key: regionItem.key,
                                        value: regionItem.value,
                                      });
                                      setTeam({ key: 0, value: '' }); // 지역 변경시 팀 초기화
                                      setExpandedAccordion(null);
                                    }}
                                  >
                                    <Text style={styles.dropdownOptionText}>
                                      {regionItem.value}
                                    </Text>
                                  </TouchableOpacity>
                                ),
                              ) || (
                                <View style={styles.dropdownOption}>
                                  <Text style={styles.dropdownOptionText}>
                                    데이터가 없습니다
                                  </Text>
                                </View>
                              )
                            )}
                          </ScrollView>
                        </View>
                      )}
                    </View>

                    {/* Team Dropdown */}
                    {selectedRegion.value !== '' && (
                      <View style={styles.dropdownContainer}>
                        <Text style={styles.label}>팀</Text>
                        <TouchableOpacity
                          style={styles.dropdown}
                          onPress={() =>
                            setExpandedAccordion(
                              expandedAccordion === 'team' ? null : 'team',
                            )
                          }
                        >
                          <Text style={styles.dropdownText}>
                            {team.value || '팀을 선택해주세요'}
                          </Text>
                          <Text style={styles.dropdownIcon}>
                            {expandedAccordion === 'team' ? '▲' : '▼'}
                          </Text>
                        </TouchableOpacity>

                        {expandedAccordion === 'team' && (
                          <View style={styles.dropdownOptions}>
                            <ScrollView
                              style={styles.dropdownScrollView}
                              nestedScrollEnabled
                            >
                              {isTeamLoading ? (
                                <View style={styles.dropdownOption}>
                                  <Text style={styles.dropdownOptionText}>
                                    로딩 중...
                                  </Text>
                                </View>
                              ) : (
                                filteredTeams?.map(
                                  (teamItem: any, index: number) => (
                                    <TouchableOpacity
                                      key={teamItem.id}
                                      style={[
                                        styles.dropdownOption,
                                        index === filteredTeams.length - 1 &&
                                          styles.dropdownOptionLast,
                                      ]}
                                      onPress={() => {
                                        setTeam({
                                          key: teamItem.id,
                                          value: teamItem.team_name,
                                        });
                                        setExpandedAccordion(null);
                                      }}
                                    >
                                      <Text style={styles.dropdownOptionText}>
                                        {teamItem.team_name}
                                      </Text>
                                    </TouchableOpacity>
                                  ),
                                ) || (
                                  <View style={styles.dropdownOption}>
                                    <Text style={styles.dropdownOptionText}>
                                      {filteredTeams.length === 0
                                        ? '해당 지역에 팀이 없습니다'
                                        : '데이터가 없습니다'}
                                    </Text>
                                  </View>
                                )
                              )}
                            </ScrollView>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                )}

                {/* Search Input */}
                <View style={styles.searchSection}>
                  <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder={
                      selectMenu.value === 'zp_name' ? '국소명' : '통합시설코드'
                    }
                    mode="outlined"
                    returnKeyType="search"
                    onSubmitEditing={handleSearch}
                    style={styles.searchInput}
                    textColor={COLORS.text}
                    outlineColor={COLORS.border}
                    activeOutlineColor={COLORS.primary}
                    placeholderTextColor={COLORS.textSecondary}
                    right={
                      <TextInput.Icon
                        icon="magnify"
                        size={20}
                        onPress={handleSearch}
                      />
                    }
                  />
                </View>

                {/* Search Results Header */}
                <View style={styles.resultsHeader}>
                  <Text variant="titleMedium" style={styles.resultsTitle}>
                    검색 결과
                  </Text>
                  <Text variant="bodyMedium" style={styles.resultsCount}>
                    {result.results?.length || 0}/{result.count || 0}
                  </Text>
                </View>

                {/* Search Results */}
                <View style={styles.resultsContainer}>
                  <FlatList
                    data={result?.results || []}
                    renderItem={({ item }) => {
                      return (
                        <TouchableOpacity
                          onPress={() =>
                            handleSelectLocation(item.id, item.zp_name)
                          }
                          style={styles.resultItem}
                        >
                          <View style={styles.resultContent}>
                            <Icon
                              name="location-on"
                              size={20}
                              color={
                                item.zp_name === searchLocation.label
                                  ? COLORS.primary
                                  : COLORS.textSecondary
                              }
                              style={styles.locationIcon}
                            />
                            <View style={styles.resultText}>
                              <Text
                                variant="bodySmall"
                                style={styles.resultCode}
                              >
                                [{item.zp_code}]
                              </Text>
                              <Text
                                variant="titleMedium"
                                style={styles.resultName}
                              >
                                {item.zp_name}
                              </Text>
                              <Text
                                variant="bodySmall"
                                style={styles.resultTeam}
                              >
                                {item.zp_manage_team}
                              </Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    }}
                    style={styles.resultsList}
                    keyExtractor={(item, index) => `${item.id}-${index}`}
                    ListEmptyComponent={
                      <View style={styles.emptyContainer}>
                        <Text variant="bodyMedium" style={styles.emptyText}>
                          검색 결과가 없습니다.
                        </Text>
                      </View>
                    }
                    showsVerticalScrollIndicator={false}
                    onEndReached={fetchNextPage}
                    onEndReachedThreshold={0.1}
                    removeClippedSubviews={true}
                    ListFooterComponent={renderFooter}
                  />
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
        {/* Snackbar inside Modal */}
        <SafeSnackbar
          visible={snackbarVisible}
          onDismiss={() => setSnackbarVisible(false)}
          duration={3000}
          style={styles.snackbar}
        >
          {snackbarMessage}
        </SafeSnackbar>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: scale(320),
    height: verticalScale(500),
    backgroundColor: 'white',
    padding: scale(16),
    borderRadius: 10,
    overflow: 'hidden', // 내용이 모달 밖으로 벗어나지 않도록
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(16),
  },
  headerText: {
    fontWeight: 'bold',
    color: COLORS.textSecondary,
  },
  segmentedButtons: {
    marginBottom: verticalScale(12),
  },
  searchSection: {
    marginBottom: verticalScale(12),
  },
  searchInput: {
    backgroundColor: 'white',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(8),
  },
  resultsTitle: {
    fontWeight: 'bold',
    color: COLORS.textSecondary,
  },
  resultsCount: {
    color: COLORS.textSecondary,
  },
  resultsContainer: {
    height: verticalScale(170),
  },
  resultsList: {
    height: verticalScale(170),
  },
  resultItem: {
    backgroundColor: '#F0F0F0',
    padding: scale(12),
    marginBottom: verticalScale(4),
    borderRadius: 10,
  },
  resultContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIcon: {
    marginRight: scale(12),
  },
  resultText: {
    flex: 1,
  },
  resultCode: {
    color: COLORS.textSecondary,
    marginBottom: verticalScale(2),
  },
  resultName: {
    fontWeight: 'bold',
    color: 'black',
    marginBottom: verticalScale(2),
  },
  resultTeam: {
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    paddingVertical: verticalScale(20),
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textSecondary,
  },
  // Dropdown styles matching UseUnitScreen
  dropdownSection: {
    marginBottom: verticalScale(8),
  },
  dropdownContainer: {
    marginBottom: verticalScale(8),
  },
  label: {
    fontSize: scale(12),
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: verticalScale(8),
  },
  dropdown: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: scale(8),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(10),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownText: {
    fontSize: scale(12),
    color: COLORS.text,
    flex: 1,
  },
  dropdownIcon: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
  },
  dropdownOptions: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: scale(8),
    marginTop: verticalScale(4),
    overflow: 'hidden',
    maxHeight: verticalScale(150), // 최대 높이 설정
  },
  dropdownScrollView: {
    maxHeight: verticalScale(150), // ScrollView 최대 높이
  },
  dropdownOption: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dropdownOptionLast: {
    borderBottomWidth: 0,
  },
  dropdownOptionText: {
    fontSize: scale(12),
    color: COLORS.text,
  },
  snackbar: {
    backgroundColor: COLORS.text,
    // bottom: verticalScale(10),
  },
  loadingFooter: {
    paddingVertical: verticalScale(16),
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  loadingText: {
    marginLeft: scale(8),
    fontSize: scale(14),
    color: COLORS.textSecondary,
  },
});
