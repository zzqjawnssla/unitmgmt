import React, { useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import {
  Surface,
  Text,
  Appbar,
  Card,
  SegmentedButtons,
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { scale, verticalScale } from 'react-native-size-matters';
import type { RootStackParamList } from '../../navigation/RootStackNavigation.tsx';

type MailBoxScreenNavigationProp = NavigationProp<RootStackParamList>;

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
  warning: '#FF9500',
  error: '#F44336',
};

export const mailStateList = [
  { value: '1', label: '대기' },
  { value: '2', label: '승인' },
  { value: '3', label: '반려' },
];

interface MailItem {
  id: string;
  title: string;
  content: string;
  status: string;
  created_at: string;
}

const MailBoxScreen: React.FC = () => {
  const navigation = useNavigation<MailBoxScreenNavigationProp>();
  const [mailState, setMailState] = useState(mailStateList[0]);

  // Mock data - 실제 API로 대체 필요
  const mockMailData: MailItem[] = [];

  const changeMailState = (value: string) => {
    const selectedState = mailStateList.find(item => item.value === value);
    if (selectedState) {
      setMailState(selectedState);
    }
  };

  const filteredMails = mockMailData.filter(
    mail => mail.status === mailState.value,
  );

  const renderMailItem = ({ item }: { item: MailItem }) => (
    <Card style={styles.mailCard}>
      <Card.Content>
        <View style={styles.mailHeader}>
          <MaterialCommunityIcons
            name={getStatusIcon(item.status)}
            size={scale(20)}
            color={getStatusColor(item.status)}
            style={styles.statusIcon}
          />
          <Text
            variant="bodySmall"
            style={[
              styles.statusBadge,
              {
                backgroundColor: getStatusColor(item.status),
              },
            ]}
          >
            {getStatusLabel(item.status)}
          </Text>
        </View>

        <Text variant="titleMedium" style={styles.mailTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text variant="bodyMedium" style={styles.mailContent} numberOfLines={3}>
          {item.content}
        </Text>

        <View style={styles.mailFooter}>
          <MaterialCommunityIcons
            name="clock-outline"
            size={scale(14)}
            color={COLORS.textTertiary}
            style={styles.clockIcon}
          />
          <Text variant="bodySmall" style={styles.mailDate}>
            {item.created_at}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case '1':
        return COLORS.warning; // 대기
      case '2':
        return COLORS.success; // 승인
      case '3':
        return COLORS.error; // 반려
      default:
        return COLORS.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case '1':
        return 'clock-outline'; // 대기
      case '2':
        return 'check-circle'; // 승인
      case '3':
        return 'close-circle'; // 반려
      default:
        return 'help-circle';
    }
  };

  const getStatusLabel = (status: string) => {
    const state = mailStateList.find(item => item.value === status);
    return state?.label || '알 수 없음';
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons
        name="email-off-outline"
        size={scale(64)}
        color={COLORS.textTertiary}
        style={styles.emptyIcon}
      />
      <Text variant="titleMedium" style={styles.emptyTitle}>
        {mailState.label} 상태의 결재가 없습니다
      </Text>
      <Text variant="bodyMedium" style={styles.emptySubtitle}>
        결재 요청이 있을 때 여기에 표시됩니다
      </Text>
    </View>
  );

  return (
    <Surface style={styles.container}>
      <Appbar.Header style={styles.appbar}>
        <Appbar.BackAction
          onPress={() => navigation.goBack()}
          color={COLORS.text}
        />
        <Appbar.Content title="결재함" titleStyle={styles.appbarTitle} />
      </Appbar.Header>

      <View style={styles.content}>
        <View style={styles.headerSection}>
          <MaterialCommunityIcons
            name="email-outline"
            size={scale(24)}
            color={COLORS.primary}
            style={styles.headerIcon}
          />
          <Text variant="headlineSmall" style={styles.headerTitle}>
            결재 요청 관리
          </Text>
          <Text variant="bodyMedium" style={styles.headerSubtitle}>
            결재 요청 내역을 확인하고 관리할 수 있습니다
          </Text>
        </View>

        <SegmentedButtons
          value={mailState.value}
          onValueChange={changeMailState}
          buttons={mailStateList.map(button => ({
            value: button.value,
            label: button.label,
            style: [
              styles.segmentButton,
              mailState.value === button.value && styles.segmentButtonActive,
            ],
            labelStyle: [
              styles.segmentLabel,
              {
                color:
                  mailState.value === button.value
                    ? COLORS.background
                    : COLORS.textSecondary,
                fontWeight: mailState.value === button.value ? '600' : '500',
              },
            ],
          }))}
          style={styles.segmentedButtons}
        />

        <FlatList
          data={filteredMails}
          renderItem={renderMailItem}
          keyExtractor={item => item.id}
          ListEmptyComponent={renderEmptyList}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      </View>
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
    // textAlign: 'center',
  },
  content: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  headerSection: {
    backgroundColor: COLORS.background,
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(24),
    paddingBottom: verticalScale(20),
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerIcon: {
    marginBottom: verticalScale(12),
  },
  headerTitle: {
    color: COLORS.text,
    fontWeight: '700',
    marginBottom: verticalScale(8),
    textAlign: 'center',
  },
  headerSubtitle: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  segmentedButtons: {
    marginHorizontal: scale(16),
    marginVertical: verticalScale(16),
    backgroundColor: COLORS.surface,
    borderRadius: scale(25),
    elevation: 1,
  },
  segmentButton: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderRadius: scale(20),
  },
  segmentButtonActive: {
    backgroundColor: COLORS.primary,
  },
  segmentLabel: {
    fontSize: scale(14),
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(4),
  },
  listContainer: {
    paddingHorizontal: scale(16),
    paddingBottom: verticalScale(20),
  },
  mailCard: {
    marginBottom: verticalScale(12),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderRadius: scale(12),
    backgroundColor: COLORS.background,
  },
  mailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: verticalScale(8),
  },
  statusIcon: {
    marginRight: scale(4),
  },
  statusBadge: {
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: scale(12),
    fontSize: scale(11),
    fontWeight: '600',
    color: COLORS.background,
    overflow: 'hidden',
  },
  mailTitle: {
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: verticalScale(8),
    lineHeight: 22,
  },
  mailContent: {
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: verticalScale(12),
  },
  mailFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clockIcon: {
    marginRight: scale(4),
  },
  mailDate: {
    color: COLORS.textTertiary,
    fontSize: scale(12),
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: verticalScale(60),
    paddingHorizontal: scale(32),
  },
  emptyIcon: {
    marginBottom: verticalScale(20),
  },
  emptyTitle: {
    color: COLORS.textSecondary,
    marginBottom: verticalScale(8),
    textAlign: 'center',
    fontWeight: '600',
  },
  emptySubtitle: {
    color: COLORS.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default MailBoxScreen;
