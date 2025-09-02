import React, { useState, useMemo } from 'react';
import {
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
  FlatList,
  ScrollView,
} from 'react-native';
import {
  Text,
  TextInput,
  SegmentedButtons,
  Snackbar,
  List,
} from 'react-native-paper';
import { scale, verticalScale } from 'react-native-size-matters';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { api } from '../../services/api/api';
import { useTeams } from '../../hooks/useSelectList';

// Brand Colors
const BRAND_COLORS = {
  primary: '#F47725',
  background: '#FCFCFC',
  surface: '#FFFFFF',
  text: '#000000',
  textSecondary: '#666666',
  light: 'rgba(244, 119, 37, 0.1)',
};

interface SearchLocationModalProps {
  isVisible: boolean;
  onClose: () => void;
  location: { 
    id: string; 
    location: string 
  };
  searchLocation: {
    value: string;
    label: string;
  };
  setSearchLocation: React.Dispatch<React.SetStateAction<{
    value: string;
    label: string;
  }>>;
}

const menuItems = [
  { value: 'zp_name', label: '국소명' },
  { value: 'zp_code', label: '통합시설코드' },
];

// Team data will be fetched using useTeams hook

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
  const [expandedAccordion, setExpandedAccordion] = useState<string | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  // Debug useEffect to track result state changes
  React.useEffect(() => {
    console.log('Result state changed:', result);
    console.log('Result.results:', result?.results);
    console.log('Result.results type:', typeof result?.results);
    console.log('Result.results is array:', Array.isArray(result?.results));
    console.log('About to render FlatList with data length:', result?.results?.length);
  }, [result]);

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
      console.log('Search response:', response.data);
      console.log('Search results:', response.data.results);
      console.log('Search results length:', response.data.results?.length);
      setResult(response.data);
      setNextPage(response.data.next);
      console.log('After setResult - current result state should be:', response.data);
    } catch (error) {
      console.error('Search error:', error);
      showSnackbar('검색에 실패했습니다.');
    }
  };

  const fetchNextPage = async () => {
    if (nextPage) {
      try {
        const response = await api.get(nextPage);
        setResult((prevList: any) => ({
          ...prevList,
          results: [...(prevList.results || []), ...response.data.results],
          next: response.data.next,
        }));
        setNextPage(response.data.next);
      } catch (error) {
        console.log('Pagination error:', error);
        showSnackbar('추가 데이터를 불러오는데 실패했습니다.');
      }
    } else {
      showSnackbar('더 이상 불러올 데이터가 없습니다.');
    }
  };

  return (
    <>
      <Modal visible={isVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text variant="titleLarge" style={styles.headerText}>
                세부 위치 검색
              </Text>
              <TouchableOpacity onPress={handleClose}>
                <Icon name="close" size={24} color={BRAND_COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Menu Selection */}
            <SegmentedButtons
              buttons={menuItems.map(item => ({
                value: item.value,
                label: item.label,
                style: {
                  backgroundColor: selectMenu.value === item.value 
                    ? BRAND_COLORS.light : 'transparent',
                },
              }))}
              value={selectMenu.value}
              onValueChange={(value) => {
                const selectedItem = menuItems.find(item => item.value === value);
                if (selectedItem) {
                  setSelectMenu(selectedItem);
                  setSearchQuery('');
                  setResult({ results: [], count: 0 });
                }
              }}
              theme={{ roundness: 8 }}
              style={styles.segmentedButtons}
            />

            {/* Region and Team Selection with AccordionGroup (only for zp_name search) */}
            {selectMenu.value === 'zp_name' && (
              <View style={styles.accordionSection}>
                <List.AccordionGroup 
                  expandedId={expandedAccordion || undefined}
                  onAccordionPress={(expandedId) => 
                    setExpandedAccordion(expandedId === expandedAccordion ? null : expandedId?.toString() || null)
                  }
                >
                  <List.Accordion
                    title={selectedRegion.value || '지역 선택'}
                    id="region"
                    style={styles.accordionItem}
                    titleStyle={styles.accordionTitle}
                  >
                    <ScrollView style={styles.accordionContent}>
                      {isTeamLoading ? (
                        <List.Item title="로딩 중..." />
                      ) : (
                        uniqueRegions?.map((regionItem: any, index: number) => (
                          <List.Item
                            key={index}
                            title={regionItem.value}
                            titleStyle={styles.listItemTitle}
                            onPress={() => {
                              setSelectedRegion({ 
                                key: regionItem.key, 
                                value: regionItem.value 
                              });
                              setTeam({ key: 0, value: '' }); // 지역 변경시 팀 초기화
                              setExpandedAccordion(null);
                            }}
                          />
                        )) || (
                          <List.Item title="데이터가 없습니다" />
                        )
                      )}
                    </ScrollView>
                  </List.Accordion>

                  {selectedRegion.value !== '' && (
                    <List.Accordion
                      title={team.value || '팀 선택'}
                      id="team"
                      style={styles.accordionItem}
                      titleStyle={styles.accordionTitle}
                    >
                      <ScrollView style={styles.accordionContent}>
                        {isTeamLoading ? (
                          <List.Item title="로딩 중..." />
                        ) : (
                          filteredTeams?.map((teamItem: any) => (
                            <List.Item
                              key={teamItem.id}
                              title={teamItem.team_name}
                              titleStyle={styles.listItemTitle}
                              onPress={() => {
                                setTeam({ 
                                  key: teamItem.id, 
                                  value: teamItem.team_name 
                                });
                                setExpandedAccordion(null);
                              }}
                            />
                          )) || (
                            <List.Item 
                              title={filteredTeams.length === 0 ? '해당 지역에 팀이 없습니다' : '데이터가 없습니다'} 
                            />
                          )
                        )}
                      </ScrollView>
                    </List.Accordion>
                  )}
                </List.AccordionGroup>
              </View>
            )}

            {/* Search Input */}
            <View style={styles.searchSection}>
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={selectMenu.value === 'zp_name' ? '국소명' : '통합시설코드'}
                mode="outlined"
                returnKeyType="search"
                onSubmitEditing={handleSearch}
                style={styles.searchInput}
                textColor={BRAND_COLORS.text}
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
                  console.log('FlatList renderItem called with item:', item);
                  return (
                    <TouchableOpacity
                      onPress={() => handleSelectLocation(item.id, item.zp_name)}
                      style={styles.resultItem}
                    >
                      <View style={styles.resultContent}>
                        <Icon
                          name="location-on"
                          size={20}
                          color={
                            item.zp_name === searchLocation.label
                              ? BRAND_COLORS.primary
                              : BRAND_COLORS.textSecondary
                          }
                          style={styles.locationIcon}
                        />
                        <View style={styles.resultText}>
                          <Text variant="bodySmall" style={styles.resultCode}>
                            [{item.zp_code}]
                          </Text>
                          <Text variant="titleMedium" style={styles.resultName}>
                            {item.zp_name}
                          </Text>
                          <Text variant="bodySmall" style={styles.resultTeam}>
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
                onEndReachedThreshold={0.3}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        {snackbarMessage}
      </Snackbar>
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
    maxHeight: verticalScale(500),
    backgroundColor: 'white',
    padding: scale(16),
    borderRadius: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(16),
  },
  headerText: {
    fontWeight: 'bold',
    color: BRAND_COLORS.textSecondary,
  },
  segmentedButtons: {
    marginBottom: verticalScale(16),
  },
  accordionSection: {
    marginBottom: verticalScale(16),
  },
  accordionItem: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginBottom: verticalScale(8),
  },
  accordionTitle: {
    fontSize: scale(14),
    fontWeight: 'bold',
  },
  accordionContent: {
    maxHeight: verticalScale(150),
    backgroundColor: 'white',
  },
  listItemTitle: {
    fontSize: scale(12),
  },
  teamSection: {
    marginBottom: verticalScale(16),
  },
  sectionLabel: {
    marginBottom: verticalScale(8),
    color: BRAND_COLORS.textSecondary,
    fontWeight: 'bold',
  },
  teamSelector: {
    position: 'relative',
  },
  teamButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: scale(12),
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  teamButtonText: {
    color: 'black',
  },
  teamDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  teamOption: {
    padding: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  searchSection: {
    marginBottom: verticalScale(16),
  },
  searchInput: {
    backgroundColor: 'white',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  resultsTitle: {
    fontWeight: 'bold',
    color: BRAND_COLORS.textSecondary,
  },
  resultsCount: {
    color: BRAND_COLORS.textSecondary,
  },
  resultsContainer: {
    height: verticalScale(200),
  },
  resultsList: {
    maxHeight: verticalScale(200),
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
    color: BRAND_COLORS.textSecondary,
    marginBottom: verticalScale(2),
  },
  resultName: {
    fontWeight: 'bold',
    color: 'black',
    marginBottom: verticalScale(2),
  },
  resultTeam: {
    color: BRAND_COLORS.textSecondary,
  },
  emptyContainer: {
    paddingVertical: verticalScale(20),
    alignItems: 'center',
  },
  emptyText: {
    color: BRAND_COLORS.textSecondary,
  },
});