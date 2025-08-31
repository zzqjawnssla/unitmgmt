import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { StyleSheet } from 'react-native';

import {
  NavigationProp,
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';
import { SegmentedButtons, Snackbar, Text, Surface, Appbar } from 'react-native-paper';
import { scale, verticalScale } from 'react-native-size-matters';

import { useAuth } from '../../store/AuthContext.tsx';
import { api } from '../../services/api/api.tsx';
import { UnitInfo } from '../../components/Search/UnitInfo.tsx';
import { UnitHistory } from '../../components/Search/UnitHistory.tsx';

// Brand Colors
const BRAND_COLORS = {
  primary: '#F47725',
  background: '#FCFCFC',
  surface: '#FFFFFF',
  textSecondary: '#666666',
};

type Item = {
  id: string;
  skt_barcode: string;
  unit_serial: string;
  detail_typename: string;
  sub_type: string;
  main_typename: string;
  manufacturer: string;
  generation: string;
  biz_type: string;
  updated_at: string;
  last_manage_history: {
    user: string;
    user_first_name: string;
    username: string;
    user_region: string;
    user_team: string;
    unit_state: string;
    state_desc: string;
    unit_movement: string;
    movement_desc: string;
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
};

type ResultData = {
  results: Item[];
  count: number;
  next: string | null;
  previous: string | null;
};

const ButtonList = [
  { value: '1', label: '유니트 정보' },
  { value: '2', label: '이력 정보' },
];

export const SearchResultScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<any>>();
  const { searchTerm, searchCode } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [result, setResult] = useState<ResultData | null>(null);
  const [value, setValue] = useState(ButtonList[0].value);

  // Snackbar state
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  const handleChangeValue = (val: string) => {
    setValue(val);
  };

  const fetchUnitInfo = useCallback(async () => {
    const params =
      searchCode.value === '1'
        ? { skt_barcode: searchTerm.sktbarcode }
        : { unit_serial: searchTerm.serial };

    try {
      const response = await api.get('/apps/unit_object_info/', { params });
      setResult(response.data);
      if (response.data.results.length === 0) {
        navigation.goBack();
        showSnackbar('검색 결과가 없습니다.\n입력한 값을 다시 확인해주세요.');
      } else {
        setResult(response.data);
      }
    } catch (error) {
      console.log('error', error);
      showSnackbar('검색 실패. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  }, [searchCode, searchTerm, navigation]);

  useFocusEffect(
    useCallback(() => {
      fetchUnitInfo();
    }, [fetchUnitInfo]),
  );

  if (isLoading) {
    return (
      <Surface style={styles.container}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title="검색 결과" />
        </Appbar.Header>
        
        <View style={styles.loadingContainer}>
          <Text
            variant="headlineMedium"
            style={{ marginBottom: verticalScale(5) }}
          >
            Loading...
          </Text>
          <ActivityIndicator size="large" color="black" />
        </View>
      </Surface>
    );
  }

  return (
    <Surface style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="검색 결과" />
      </Appbar.Header>
      
      <View style={styles.content}>
        <SegmentedButtons
          value={value}
          onValueChange={handleChangeValue}
          buttons={ButtonList.map(buttons => ({
            value: buttons.value,
            label: buttons.label,
            style: {
              backgroundColor: 'transparent',
              borderColor:
                value === buttons.value ? BRAND_COLORS.primary : 'transparent',
              borderBottomWidth: value === buttons.value ? 3 : 0,
              borderWidth: 0,
              marginBottom: verticalScale(16),
              marginHorizontal: scale(32),
            },
            labelStyle: {
              color: 'black',
              fontSize: scale(16),
              paddingTop: verticalScale(8),
              paddingBottom: verticalScale(1.6),
            },
          }))}
          theme={{ roundness: 0 }}
        />
        {value === '1' && result && <UnitInfo result={result.results[0]} />}
        {value === '2' && result && <UnitHistory result={result.results[0]} />}
        
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});