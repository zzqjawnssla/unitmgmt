import React from 'react';
import {
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
  StyleSheet,
} from 'react-native';
import { Surface, Text, Appbar, Snackbar } from 'react-native-paper';
import { scale, verticalScale } from 'react-native-size-matters';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import type { RootStackParamList } from '../../navigation/RootStackNavigation.tsx';

type ServiceScreenNavigationProp = NavigationProp<RootStackParamList>;

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
  inactive: '#CCCCCC',
  inactiveBackground: '#FAFAFA',
};

interface ServiceItem {
  key: number;
  type: string;
  service: string;
  icon: string;
  screen: string;
}

const ActiveServiceList: ServiceItem[] = [
  {
    key: 1,
    type: '예비 유니트',
    service: '보유 현황',
    icon: 'archive-search-outline',
    screen: 'TestSearchUnit',
  },
  // {
  //   key: 2,
  //   type: '신규 유니트',
  //   service: '등록',
  //   icon: 'archive-plus-outline',
  //   screen: 'RegistBarcode',
  // },
];

const NonActiveServiceList: ServiceItem[] = [
  {
    key: 1,
    type: '유니트 대여',
    service: '리스트',
    icon: 'clipboard-text-outline',
    screen: 'RentalUnitList',
  },
  {
    key: 2,
    type: '유니트 이관',
    service: '리스트',
    icon: 'clipboard-text-outline',
    screen: '',
  },
  // {
  //   key: 3,
  //   type: '선임대',
  //   service: '요청 / 반납',
  //   icon: 'archive-sync-outline',
  //   screen: '',
  // },
];

const ServiceScreen: React.FC = () => {
  const navigation = useNavigation<ServiceScreenNavigationProp>();
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  const goToServiceScreen = (screen: string) => {
    if (screen === 'TestSearchUnit') {
      navigation.navigate('ServiceStack', {
        screen: 'SearchUnitCountScreen',
      });
    }
  };

  const handleServicePress = (item: ServiceItem) => {
    if (item.screen === '') {
      setSnackbarVisible(true);
    } else {
      goToServiceScreen(item.screen);
    }
  };

  const renderServiceItem = (item: ServiceItem, isActive: boolean = true) => (
    <TouchableOpacity
      key={item.key}
      onPress={() => handleServicePress(item)}
      style={[
        styles.serviceItem,
        isActive ? styles.activeServiceItem : styles.inactiveServiceItem,
      ]}
    >
      <View style={styles.serviceContent}>
        <MaterialCommunityIcons
          name={item.icon as any}
          size={scale(40)}
          color={isActive ? COLORS.primary : COLORS.inactive}
          style={styles.serviceIcon}
        />
        <View style={styles.serviceTextContainer}>
          <Text
            variant="titleMedium"
            style={[
              styles.serviceType,
              { color: isActive ? COLORS.text : COLORS.inactive },
            ]}
          >
            {item.type}
          </Text>
          <Text
            variant="bodyMedium"
            style={[
              styles.serviceName,
              { color: isActive ? COLORS.primary : COLORS.inactive },
            ]}
          >
            {item.service}
          </Text>
        </View>
        <MaterialCommunityIcons
          name="chevron-right"
          size={scale(20)}
          color={isActive ? COLORS.textSecondary : COLORS.inactive}
        />
      </View>
    </TouchableOpacity>
  );

  return (
    <Surface style={styles.container}>
      <Appbar.Header style={styles.appbar}>
        <Appbar.Content title="서비스" titleStyle={styles.appbarTitle} />
      </Appbar.Header>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 제공 서비스 섹션 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons
              name="check-circle"
              size={scale(18)}
              color={COLORS.success}
              style={styles.sectionIcon}
            />
            <Text variant="titleMedium" style={styles.sectionTitle}>
              제공 서비스
            </Text>
          </View>

          <View style={styles.serviceList}>
            {ActiveServiceList.map(item => renderServiceItem(item, true))}
          </View>
        </View>

        {/* 예정 서비스 섹션 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons
              name="schedule"
              size={scale(18)}
              color={COLORS.textSecondary}
              style={styles.sectionIcon}
            />
            <Text variant="titleMedium" style={styles.sectionTitle}>
              예정 서비스
            </Text>
          </View>

          <View style={styles.serviceList}>
            {NonActiveServiceList.map(item => renderServiceItem(item, false))}
          </View>
        </View>
      </ScrollView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={styles.snackbar}
      >
        <Text style={styles.snackbarText}>준비 중인 서비스입니다.</Text>
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
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  scrollContent: {
    paddingTop: verticalScale(20),
    paddingBottom: verticalScale(20),
  },
  section: {
    marginBottom: verticalScale(24),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(12),
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionIcon: {
    marginRight: scale(8),
  },
  sectionTitle: {
    fontWeight: '600',
    color: COLORS.text,
  },
  serviceList: {
    backgroundColor: COLORS.background,
  },
  serviceItem: {
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(16),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  activeServiceItem: {
    backgroundColor: COLORS.background,
  },
  inactiveServiceItem: {
    backgroundColor: COLORS.inactiveBackground,
  },
  serviceContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceIcon: {
    marginRight: scale(16),
  },
  serviceTextContainer: {
    flex: 1,
  },
  serviceType: {
    fontWeight: '600',
    marginBottom: verticalScale(4),
  },
  serviceName: {
    fontWeight: '500',
  },
  snackbar: {
    backgroundColor: COLORS.text,
    marginBottom: verticalScale(20),
  },
  snackbarText: {
    color: COLORS.background,
  },
});

export default ServiceScreen;
