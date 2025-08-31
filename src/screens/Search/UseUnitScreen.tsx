import React, { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View, ScrollView } from 'react-native';
import { useNavigation, RouteProp } from '@react-navigation/native';
import { 
  Text, 
  List, 
  TextInput, 
  Switch, 
  Button, 
  Surface, 
  Appbar,
  Snackbar 
} from 'react-native-paper';
import { scale, verticalScale } from 'react-native-size-matters';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../../store/AuthContext';
import { api } from '../../services/api/api';
import { SearchLocationModal } from '../../components/Search/SearchLocationModal';
import type { HomeStackParamList } from '../../navigation/RootStackNavigation';

// Brand Colors
const BRAND_COLORS = {
  primary: '#F47725',
  background: '#FCFCFC',
  surface: '#FFFFFF',
  textSecondary: '#666666',
  light: 'rgba(244, 119, 37, 0.1)',
};

type UseUnitScreenRouteProp = RouteProp<HomeStackParamList, 'UseUnitScreen'>;

interface UseUnitProps {
  route: UseUnitScreenRouteProp & {
    params: {
      result: any;
      initialActionType?: string;
    };
  };
}

const actionTypes = [
  { value: 'incoming', label: '창고입고' },
  { value: 'release', label: '창고출고' },
  { value: 'mounting', label: '장착' },
  { value: 'unmounting', label: '탈장' },
  { value: 'repair_release', label: '수리출고' },
];

const unitStatusList = [
  { id: '1', state: '정상' },
  { id: '2', state: '불량' },
  { id: '3', state: '수리불가(불용)' },
];

const locationList = [
  { id: '1', location: '국소' },
  { id: '2', location: '전진배치(집/중/통)' },
  { id: '3', location: '창고' },
  { id: '4', location: '현장대기' },
  { id: '5', location: '차량보관' },
];

const repairDeliveryType = [
  { value: '1', label: '직접전달' },
  { value: '2', label: '물류지정업체' },
  { value: '3', label: '일반택배' },
  { value: '4', label: '퀵' },
  { value: '5', label: '기타' },
];

export const UseUnitScreen: React.FC<UseUnitProps> = ({ route }) => {
  const { user } = useAuth();
  const { result, initialActionType } = route.params;
  const navigation = useNavigation();

  // Find initial action type or default to first one
  const getInitialActionType = () => {
    if (initialActionType) {
      const foundType = actionTypes.find(type => type.value === initialActionType);
      return foundType || actionTypes[0];
    }
    return actionTypes[0];
  };

  // Core states
  const selectedActionType = getInitialActionType();
  const [expanded, setExpanded] = useState<string | null>(null);

  // Common states
  const [unitSerial, setUnitSerial] = useState(result?.unit_serial || '');
  const [selectedUnitState, setSelectedUnitState] = useState({ label: '', value: '' });
  const [stateDesc, setStateDesc] = useState('');
  const [movementDesc, setMovementDesc] = useState('');

  // Location states
  const [selectedLocation, setSelectedLocation] = useState({ label: '', value: '', id: '' });
  const [searchLocation, setSearchLocation] = useState({ label: '', value: '' });

  // Repair specific states
  const [selectedCompany, setSelectedCompany] = useState({ label: '', value: '' });
  const [selectedVendor, setSelectedVendor] = useState({ label: '', value: '' });
  const [selectedDelivery, setSelectedDelivery] = useState({ label: '', value: '' });
  const [deliveryDesc, setDeliveryDesc] = useState('');
  const [repairDesc, setRepairDesc] = useState('');
  const [isRequiredTestBed, setIsRequiredTestBed] = useState(result?.is_required_testbed || false);
  const [isPreLentalReturn, setIsPreLentalReturn] = useState(false);

  // UI states
  const [isLocationModalVisible, setIsLocationModalVisible] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  const handleSelectUnitState = (value: string, label: string) => {
    setSelectedUnitState({ label, value });
    setExpanded(null);
    setStateDesc('');
  };

  const handleSelectLocation = (value: string, label: string) => {
    setSelectedLocation({ label, value, id: value });
    setExpanded(null);
    setSearchLocation({ label: '', value: '' });
    setMovementDesc('');
  };

  const handleSelectDelivery = (value: string, label: string) => {
    setSelectedDelivery({ label, value });
    setExpanded(null);
    setDeliveryDesc('');
  };

  const handleSearchLocation = () => {
    if (selectedLocation.value === '' || selectedLocation.value === null) {
      showSnackbar('장착 위치를 먼저 선택해주세요.');
      return;
    }
    setIsLocationModalVisible(true);
  };

  const handleSubmit = async () => {
    // Validation
    if (selectedActionType.value === 'incoming') {
      if (selectedUnitState.label === '') {
        showSnackbar('유니트 상태를 선택해주세요.');
        return;
      }
      if (['불량', '수리불가(불용)'].includes(selectedUnitState.label) && stateDesc.length < 3) {
        showSnackbar('사유를 2글자 이상 입력해주세요.');
        return;
      }
    }

    if (selectedActionType.value === 'mounting') {
      if (searchLocation.label === '') {
        showSnackbar('세부 위치를 선택해주세요.');
        return;
      }
      if (['전진배치(집/중/통)', '차량보관'].includes(selectedLocation.label) && movementDesc.length < 3) {
        showSnackbar('사유를 2글자 이상 입력해주세요.');
        return;
      }
    }

    if (selectedActionType.value === 'unmounting') {
      if (selectedUnitState.label === '') {
        showSnackbar('유니트 상태를 선택해주세요.');
        return;
      }
      if (['불량', '수리불가(불용)'].includes(selectedUnitState.label) && stateDesc.length < 4) {
        showSnackbar('사유를 3글자 이상 입력해주세요.');
        return;
      }
    }

    if (selectedActionType.value === 'repair_release') {
      if (!selectedVendor.label) {
        showSnackbar('수리업체를 선택해주세요.');
        return;
      }
      if (isRequiredTestBed === true && selectedCompany.label !== 'SKO') {
        showSnackbar('T/B 대상여부는 SKO에만 적용됩니다.');
        return;
      }
    }

    const instance = result?.id;

    // Update serial number if changed
    if (unitSerial !== result?.unit_serial) {
      try {
        await api.put(`/apps/unit_object_info/update_serial_number/${instance}/`, {
          unit_serial: unitSerial,
        });
      } catch (error) {
        console.log('Serial update error:', error);
      }
    }

    // Prepare data based on action type
    let data = {};
    let successMessage = '';

    switch (selectedActionType.value) {
      case 'incoming':
        data = {
          location: '창고',
          location_context_instance: user?.my_warehouse?.id,
          unit_movement: '창고입고',
          state: selectedUnitState.label,
          state_desc: selectedUnitState.label === '정상' ? '' : stateDesc,
        };
        successMessage = '입고 성공';
        break;

      case 'release':
        data = {
          location: '현장대기',
          location_context_instance: user?.user_id,
          unit_movement: '창고출고',
          state: result?.last_manage_history?.unit_state,
          state_desc: result?.last_manage_history?.state_desc,
          movement_desc: movementDesc || result?.last_manage_history?.movement_desc,
        };
        successMessage = '출고 성공';
        break;

      case 'mounting':
        data = {
          location: selectedLocation.label,
          location_context_instance: searchLocation.value,
          unit_movement: '장착',
          state: result?.last_manage_history?.unit_state,
          movement_desc: movementDesc,
        };
        successMessage = '장착 성공';
        break;

      case 'unmounting':
        data = {
          location: '현장대기',
          location_context_instance: user?.user_id,
          unit_movement: '탈장',
          state: selectedUnitState.label,
          state_desc: stateDesc,
        };
        successMessage = '탈장 성공';
        break;

      case 'repair_release':
        data = {
          location: '창고',
          location_context_instance: selectedVendor.value,
          unit_movement: '수리출고',
          state: result?.last_manage_history?.unit_state,
          movement_desc: `${isRequiredTestBed ? '[T/B 요청] ' : ''}${isPreLentalReturn ? '[선임대 반납] ' : ''}[${selectedDelivery.label}${deliveryDesc.trim() ? `, ${deliveryDesc}` : ''}], ${repairDesc}`,
        };
        successMessage = '수리출고 요청 성공';
        break;
    }

    try {
      await api.post(`/apps/unitmanagehistory/create/${instance}/`, data);
      showSnackbar(successMessage);
      setTimeout(() => navigation.goBack(), 1000);
    } catch (error) {
      console.log('Submit error:', error);
      showSnackbar(`${selectedActionType.label} 실패`);
    }
  };

  const getActionTitle = () => {
    switch (selectedActionType.value) {
      case 'incoming':
        return '유니트를 창고에 입고 하시겠습니까?';
      case 'release':
        return '유니트를 창고에서 출고 하시겠습니까?';
      case 'mounting':
        return '해당 위치에 장착 하시겠습니까?';
      case 'unmounting':
        return '해당 위치에서 탈장 하시겠습니까?';
      case 'repair_release':
        return '유니트를 수리출고 하시겠습니까?';
      default:
        return '작업을 진행하시겠습니까?';
    }
  };

  const filteredLocationList = locationList.filter(
    location =>
      location.location !== '현장대기' &&
      location.location !== '창고' &&
      location.location !== '차량보관'
  );

  useEffect(() => {
    if (selectedUnitState.value !== '정상' && result?.last_manage_history?.state_desc) {
      setStateDesc(result.last_manage_history.state_desc);
    }
  }, [selectedUnitState, result]);

  useEffect(() => {
    if (selectedActionType.value === 'repair_release' && result?.last_manage_history?.unit_state !== '정상') {
      setRepairDesc(result?.last_manage_history?.state_desc || '');
    }
  }, [selectedActionType, result]);

  return (
    <Surface style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={`유니트 ${selectedActionType.label}`} />
      </Appbar.Header>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

        {/* Action Title */}
        <View style={styles.section}>
          <Text variant="titleLarge" style={styles.actionTitle}>
            {getActionTitle()}
          </Text>
        </View>

        {/* Serial Number Input (for incoming) */}
        {selectedActionType.value === 'incoming' && (
          <View style={styles.section}>
            <TextInput
              label="제조사S/N"
              placeholder="제조사S/N을 입력해주세요."
              value={unitSerial}
              onChangeText={setUnitSerial}
              mode="outlined"
              style={styles.textInput}
            />
          </View>
        )}

        {/* Unit State Selection (for incoming, unmounting) */}
        {['incoming', 'unmounting'].includes(selectedActionType.value) && (
          <View style={styles.section}>
            <List.AccordionGroup
              expandedId={expanded}
              onAccordionPress={id => setExpanded(id === expanded ? null : id)}
            >
              <List.Accordion
                title={
                  <Text variant="titleMedium" style={{ fontWeight: 'bold', color: 'black' }}>
                    {selectedUnitState.label || '유니트 상태'}
                  </Text>
                }
                theme={{ colors: { background: 'transparent' } }}
                id="unitState"
                style={styles.accordion}
              >
                {unitStatusList.map((state, index) => (
                  <List.Item
                    key={index}
                    title={
                      <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                        {state.state}
                      </Text>
                    }
                    onPress={() => handleSelectUnitState(state.id, state.state)}
                  />
                ))}
              </List.Accordion>
            </List.AccordionGroup>

            {['불량', '수리불가(불용)'].includes(selectedUnitState.label) && (
              <TextInput
                value={stateDesc}
                onChangeText={setStateDesc}
                placeholder={
                  selectedUnitState.label === '불량'
                    ? '(필수) 불량 사유를 입력해주세요.'
                    : '(필수) 수리불가 사유를 입력해주세요.'
                }
                mode="outlined"
                multiline
                style={styles.textInput}
              />
            )}
          </View>
        )}

        {/* Location Selection (for mounting) */}
        {selectedActionType.value === 'mounting' && (
          <View style={styles.section}>
            <List.AccordionGroup
              expandedId={expanded}
              onAccordionPress={id => setExpanded(id === expanded ? null : id)}
            >
              <List.Accordion
                title={
                  <Text variant="titleMedium" style={{ fontWeight: 'bold', color: 'black' }}>
                    {selectedLocation.label || '장착 위치'}
                  </Text>
                }
                theme={{ colors: { background: 'transparent' } }}
                id="location"
                style={styles.accordion}
              >
                {filteredLocationList.map((location, index) => (
                  <List.Item
                    key={index}
                    title={
                      <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                        {location.location}
                      </Text>
                    }
                    onPress={() => handleSelectLocation(location.id, location.location)}
                  />
                ))}
              </List.Accordion>
            </List.AccordionGroup>

            {/* Search Location Button */}
            <TouchableOpacity
              onPress={handleSearchLocation}
              style={styles.searchLocationButton}
            >
              {searchLocation.label === '' ? (
                <View style={styles.searchLocationContent}>
                  <Icon name="search" size={20} style={styles.searchIcon} />
                  <Text>세부 위치 검색</Text>
                </View>
              ) : (
                <View style={styles.selectedLocationContent}>
                  <Text
                    variant="titleMedium"
                    style={styles.selectedLocationText}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {searchLocation.label}
                  </Text>
                  <Icon name="refresh" color="grey" size={20} />
                </View>
              )}
            </TouchableOpacity>

            {['전진배치(집/중/통)', '차량보관'].includes(selectedLocation.label) && (
              <TextInput
                value={movementDesc}
                onChangeText={setMovementDesc}
                placeholder={
                  selectedLocation.label === '차량보관'
                    ? '(필수) 차량보관 사유를 입력해주세요.'
                    : '(필수) 전진배치 사유를 입력해주세요.'
                }
                mode="outlined"
                multiline
                style={styles.textInput}
              />
            )}
          </View>
        )}

        {/* Movement Description (for release) */}
        {selectedActionType.value === 'release' && (
          <View style={styles.section}>
            <TextInput
              value={movementDesc}
              onChangeText={setMovementDesc}
              placeholder="(선택) 출고 사유를 입력해주세요."
              mode="outlined"
              multiline
              style={styles.textInput}
            />
          </View>
        )}

        {/* Repair Release Specific Fields */}
        {selectedActionType.value === 'repair_release' && (
          <>
            {/* Vendor Selection - Mock for now */}
            <View style={styles.section}>
              <Text variant="titleMedium" style={styles.label}>
                수리업체 (Mock)
              </Text>
              <TouchableOpacity 
                style={styles.mockVendorButton}
                onPress={() => {
                  setSelectedCompany({ label: 'SKO', value: 'sko' });
                  setSelectedVendor({ label: 'SKO 수리센터', value: 'sko_repair' });
                }}
              >
                <Text variant="titleMedium">
                  {selectedVendor.label || '수리업체 선택 (Mock)'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* T/B and Pre-rental switches */}
            <View style={styles.switchContainer}>
              <View style={styles.switchItem}>
                <Text variant="titleMedium" style={styles.switchLabel}>
                  T/B 대상여부
                </Text>
                <Switch
                  value={isRequiredTestBed}
                  onValueChange={setIsRequiredTestBed}
                  color={BRAND_COLORS.primary}
                />
              </View>
              <View style={styles.switchItem}>
                <Text variant="titleMedium" style={styles.switchLabel}>
                  선임대 반납
                </Text>
                <Switch
                  value={isPreLentalReturn}
                  onValueChange={setIsPreLentalReturn}
                  color={BRAND_COLORS.primary}
                />
              </View>
            </View>

            {/* Delivery Type Selection */}
            <View style={styles.section}>
              <List.AccordionGroup
                expandedId={expanded}
                onAccordionPress={id => setExpanded(id === expanded ? null : id)}
              >
                <List.Accordion
                  title={
                    <Text variant="titleMedium" style={{ fontWeight: 'bold', color: 'black' }}>
                      {selectedDelivery.label || '배송방법'}
                    </Text>
                  }
                  theme={{ colors: { background: 'transparent' } }}
                  id="delivery"
                  style={styles.accordion}
                >
                  {repairDeliveryType.map((delivery, index) => (
                    <List.Item
                      key={index}
                      title={
                        <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                          {delivery.label}
                        </Text>
                      }
                      onPress={() => handleSelectDelivery(delivery.value, delivery.label)}
                    />
                  ))}
                </List.Accordion>
              </List.AccordionGroup>

              {['기타', '일반택배', '퀵', '직접전달'].includes(selectedDelivery.label) && (
                <TextInput
                  placeholder="송장번호 등 기타 내역을 입력해주세요."
                  value={deliveryDesc}
                  onChangeText={setDeliveryDesc}
                  mode="outlined"
                  style={styles.textInput}
                />
              )}
            </View>

            {/* Repair Description */}
            <View style={styles.section}>
              <TextInput
                value={repairDesc}
                onChangeText={setRepairDesc}
                label="불량 내역(필수)"
                placeholder="불량 내역을 입력해주세요."
                mode="outlined"
                multiline
                numberOfLines={5}
                style={styles.textInput}
              />
            </View>
          </>
        )}

        {/* Submit Button */}
        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={handleSubmit}
            style={[styles.submitButton, { backgroundColor: BRAND_COLORS.primary }]}
            labelStyle={styles.submitButtonText}
          >
            {selectedActionType.value === 'repair_release' ? '요청' : '확인'}
          </Button>
        </View>
      </ScrollView>

      {/* Location Search Modal */}
      <SearchLocationModal
        isVisible={isLocationModalVisible}
        onClose={() => setIsLocationModalVisible(false)}
        location={selectedLocation}
        searchLocation={searchLocation}
        setSearchLocation={setSearchLocation}
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
    backgroundColor: BRAND_COLORS.background,
  },
  content: {
    flex: 1,
    padding: scale(16),
  },
  section: {
    marginBottom: verticalScale(16),
  },
  label: {
    marginBottom: verticalScale(8),
    color: BRAND_COLORS.textSecondary,
    fontWeight: 'bold',
  },
  actionTitle: {
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#333333',
  },
  textInput: {
    backgroundColor: 'white',
    fontSize: scale(14),
  },
  accordion: {
    backgroundColor: 'white',
    borderColor: '#000000',
    borderWidth: 0.5,
    borderRadius: 5,
    marginBottom: verticalScale(8),
  },
  searchLocationButton: {
    backgroundColor: '#F0F0F0',
    borderRadius: 10,
    marginTop: verticalScale(8),
    padding: scale(12),
  },
  searchLocationContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: {
    marginRight: scale(8),
  },
  selectedLocationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedLocationText: {
    fontWeight: 'bold',
    color: 'black',
    flex: 1,
    marginRight: scale(8),
  },
  mockVendorButton: {
    backgroundColor: '#F0F0F0',
    padding: scale(12),
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: verticalScale(16),
    marginBottom: verticalScale(16),
  },
  switchItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchLabel: {
    marginRight: scale(8),
    fontWeight: 'bold',
    color: BRAND_COLORS.textSecondary,
  },
  buttonContainer: {
    paddingVertical: verticalScale(16),
    paddingBottom: verticalScale(32),
  },
  submitButton: {
    paddingVertical: verticalScale(8),
    borderRadius: 8,
  },
  submitButtonText: {
    fontSize: scale(16),
    fontWeight: 'bold',
  },
});