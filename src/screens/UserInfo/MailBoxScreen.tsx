import React, { useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import {
  Surface,
  Text,
  Appbar,
  Card,
  SegmentedButtons,
} from 'react-native-paper';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { scale, verticalScale } from 'react-native-size-matters';
import type { RootStackParamList } from '../../navigation/RootStackNavigation.tsx';

type MailBoxScreenNavigationProp = NavigationProp<RootStackParamList>;

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

  const filteredMails = mockMailData.filter(mail => mail.status === mailState.value);

  const renderMailItem = ({ item }: { item: MailItem }) => (
    <Card style={styles.mailCard}>
      <Card.Content>
        <Text variant="titleMedium" style={styles.mailTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text variant="bodyMedium" style={styles.mailContent} numberOfLines={3}>
          {item.content}
        </Text>
        <View style={styles.mailFooter}>
          <Text variant="bodySmall" style={styles.mailDate}>
            {item.created_at}
          </Text>
          <Text 
            variant="bodySmall" 
            style={[
              styles.statusBadge,
              { 
                backgroundColor: getStatusColor(item.status),
                color: 'white',
              }
            ]}
          >
            {getStatusLabel(item.status)}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case '1': return '#FF9500'; // 대기
      case '2': return '#4CAF50'; // 승인
      case '3': return '#F44336'; // 반려
      default: return '#666666';
    }
  };

  const getStatusLabel = (status: string) => {
    const state = mailStateList.find(item => item.value === status);
    return state?.label || '알 수 없음';
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
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
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="결재함" />
      </Appbar.Header>

      <View style={styles.content}>
        <SegmentedButtons
          value={mailState.value}
          onValueChange={changeMailState}
          buttons={mailStateList.map(button => ({
            value: button.value,
            label: button.label,
            style: styles.segmentButton,
            labelStyle: [
              styles.segmentLabel,
              {
                color: mailState.value === button.value ? '#F47725' : '#666666',
              }
            ],
          }))}
          style={styles.segmentedButtons}
        />

        <FlatList
          data={filteredMails}
          renderItem={renderMailItem}
          keyExtractor={(item) => item.id}
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
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: scale(16),
  },
  segmentedButtons: {
    marginVertical: verticalScale(16),
  },
  segmentButton: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  segmentLabel: {
    fontSize: scale(16),
    fontWeight: '600',
    paddingVertical: verticalScale(8),
  },
  listContainer: {
    paddingBottom: verticalScale(20),
  },
  mailCard: {
    marginBottom: verticalScale(12),
    elevation: 1,
  },
  mailTitle: {
    fontWeight: '700',
    color: '#333333',
    marginBottom: verticalScale(8),
  },
  mailContent: {
    color: '#666666',
    lineHeight: 20,
    marginBottom: verticalScale(12),
  },
  mailFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mailDate: {
    color: '#999999',
  },
  statusBadge: {
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(2),
    borderRadius: 4,
    fontSize: scale(12),
    fontWeight: '600',
    overflow: 'hidden',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: verticalScale(100),
  },
  emptyTitle: {
    color: '#666666',
    marginBottom: verticalScale(8),
    textAlign: 'center',
  },
  emptySubtitle: {
    color: '#999999',
    textAlign: 'center',
  },
});

export default MailBoxScreen;