import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Divider, useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { scale, verticalScale } from 'react-native-size-matters';

export const RecentActivities: React.FC = () => {
  const theme = useTheme();

  const recentActivities = [
    { id: 1, title: '새로운 단위 등록됨', time: '10분 전', type: 'create' },
    { id: 2, title: '재고 업데이트 완료', time: '1시간 전', type: 'update' },
    { id: 3, title: '월간 리포트 생성됨', time: '3시간 전', type: 'report' },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'create':
        return 'plus-circle';
      case 'update':
        return 'update';
      case 'report':
        return 'file-chart';
      default:
        return 'information';
    }
  };

  return (
    <Card style={styles.sectionCard} mode="elevated">
      <Card.Content>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          최근 활동
        </Text>
        {recentActivities.map((activity, index) => (
          <View key={activity.id}>
            <View style={styles.activityItem}>
              <Icon 
                name={getActivityIcon(activity.type)} 
                size={20} 
                color={theme.colors.primary} 
              />
              <View style={styles.activityContent}>
                <Text variant="bodyMedium">{activity.title}</Text>
                <Text variant="bodySmall" style={styles.activityTime}>
                  {activity.time}
                </Text>
              </View>
            </View>
            {index < recentActivities.length - 1 && (
              <Divider style={styles.activityDivider} />
            )}
          </View>
        ))}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  sectionCard: {
    marginBottom: verticalScale(16),
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: verticalScale(16),
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(12),
  },
  activityContent: {
    flex: 1,
    marginLeft: scale(12),
  },
  activityTime: {
    opacity: 0.6,
    marginTop: verticalScale(2),
  },
  activityDivider: {
    marginLeft: scale(32),
  },
});