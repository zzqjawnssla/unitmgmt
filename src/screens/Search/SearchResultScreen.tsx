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
import { Snackbar, Text, Surface, Appbar } from 'react-native-paper';
import { scale, verticalScale } from 'react-native-size-matters';

import { useAuth } from '../../store/AuthContext.tsx';
import { api } from '../../services/api/api.tsx';
import { UnitInfo } from '../../components/Search/UnitInfo.tsx';
import { UnitHistory } from '../../components/Search/UnitHistory.tsx';

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
        <Appbar.Header style={styles.appbar}>
          <Appbar.BackAction
            onPress={() => navigation.goBack()}
            iconColor={COLORS.text}
          />
          <Appbar.Content title="검색 결과" titleStyle={styles.appbarTitle} />
        </Appbar.Header>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>검색 결과를 불러오는 중...</Text>
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
        <Appbar.Content title="검색 결과" titleStyle={styles.appbarTitle} />
      </Appbar.Header>

      <View style={styles.content}>
        <View style={styles.segmentedContainer}>
          {ButtonList.map(button => (
            <TouchableOpacity
              key={button.value}
              style={[
                styles.segmentButton,
                value === button.value && styles.segmentButtonActive,
              ]}
              onPress={() => handleChangeValue(button.value)}
            >
              <Text
                style={[
                  styles.segmentButtonText,
                  value === button.value && styles.segmentButtonTextActive,
                ]}
              >
                {button.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.contentContainer}>
          {value === '1' && result && (
            <ScrollView
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <UnitInfo result={result.results[0]} />
            </ScrollView>
          )}
          {value === '2' && result && (
            <UnitHistory result={result.results[0]} />
          )}
        </View>
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
    fontWeight: '800',
  },
  content: {
    flex: 1,
    backgroundColor: COLORS.surface,
    paddingBottom: verticalScale(20),
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    marginHorizontal: scale(20),
    marginTop: verticalScale(16),
    marginBottom: verticalScale(5),
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  segmentButton: {
    flex: 1,
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(16),
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonActive: {
    backgroundColor: COLORS.primaryLight,
  },
  segmentButtonText: {
    fontSize: scale(16),
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  segmentButtonTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    // paddingHorizontal: scale(20),
    paddingBottom: verticalScale(20),
    paddingTop: verticalScale(10),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  loadingText: {
    marginTop: verticalScale(16),
    color: COLORS.textSecondary,
    fontSize: scale(16),
  },
  snackbar: {
    backgroundColor: COLORS.text,
    marginBottom: verticalScale(20),
  },
  snackbarText: {
    color: COLORS.background,
  },
});
