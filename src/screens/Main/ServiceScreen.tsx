import React from 'react';
import { Platform, ScrollView, TouchableOpacity, View, StyleSheet } from 'react-native';
import {
  Surface,
  Text,
  Appbar,
  Card,
  Snackbar,
} from 'react-native-paper';
import { scale, verticalScale } from 'react-native-size-matters';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import type { RootStackParamList } from '../../navigation/RootStackNavigation.tsx';

type ServiceScreenNavigationProp = NavigationProp<RootStackParamList>;

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
      style={styles.serviceItem}
    >
      <Card style={[
        styles.serviceCard, 
        isActive ? styles.activeCard : styles.inactiveCard
      ]}>
        <Card.Content>
          <View style={styles.serviceContent}>
            <MaterialCommunityIcons
              name={item.icon as any}
              size={scale(48)}
              color={isActive ? '#F47725' : '#CCCCCC'}
              style={styles.serviceIcon}
            />
            <View style={styles.serviceTextContainer}>
              <Text 
                variant="titleLarge" 
                style={[
                  styles.serviceType,
                  { color: isActive ? '#333333' : '#CCCCCC' }
                ]}
              >
                {item.type}
              </Text>
              <Text 
                variant="titleMedium" 
                style={[
                  styles.serviceName,
                  { color: isActive ? '#F47725' : '#CCCCCC' }
                ]}
              >
                {item.service}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  return (
    <Surface style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="서비스" />
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
              size={scale(20)}
              color="#4CAF50"
              style={styles.sectionIcon}
            />
            <Text variant="titleLarge" style={styles.sectionTitle}>
              제공 서비스
            </Text>
          </View>
          
          <View style={styles.serviceList}>
            {ActiveServiceList.map((item) => renderServiceItem(item, true))}
          </View>
        </View>

        {/* 예정 서비스 섹션 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons
              name="check-circle"
              size={scale(20)}
              color="#F44336"
              style={styles.sectionIcon}
            />
            <Text variant="titleLarge" style={styles.sectionTitle}>
              예정 서비스
            </Text>
          </View>
          
          <View style={styles.serviceList}>
            {NonActiveServiceList.map((item) => renderServiceItem(item, false))}
          </View>
        </View>
      </ScrollView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        준비 중인 서비스입니다.
      </Snackbar>
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: scale(16),
    paddingTop: Platform.OS === 'ios' ? 0 : verticalScale(16),
    paddingBottom: verticalScale(20),
  },
  section: {
    marginBottom: verticalScale(32),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(16),
  },
  sectionIcon: {
    marginRight: scale(8),
  },
  sectionTitle: {
    fontWeight: '700',
    color: '#333333',
  },
  serviceList: {
    gap: verticalScale(12),
  },
  serviceItem: {
    // No specific styles needed for TouchableOpacity
  },
  serviceCard: {
    elevation: 2,
    borderRadius: scale(12),
  },
  activeCard: {
    borderWidth: 2,
    borderColor: '#F47725',
    backgroundColor: '#FFFFFF',
  },
  inactiveCard: {
    borderWidth: 2,
    borderColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
  },
  serviceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(8),
  },
  serviceIcon: {
    marginRight: scale(16),
  },
  serviceTextContainer: {
    flex: 1,
  },
  serviceType: {
    fontWeight: '700',
    marginBottom: verticalScale(4),
  },
  serviceName: {
    fontWeight: '600',
    textAlign: 'right',
  },
});

export default ServiceScreen;