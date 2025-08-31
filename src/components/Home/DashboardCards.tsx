import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Badge, useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { scale, verticalScale } from 'react-native-size-matters';

export const DashboardCards: React.FC = () => {
  const theme = useTheme();

  const dashboardData = [
    {
      id: 1,
      icon: 'office-building',
      color: theme.colors.primary,
      label: '총 단위 수',
      value: '157',
      badge: 12,
    },
    {
      id: 2,
      icon: 'package-variant',
      color: '#4CAF50',
      label: '활성 재고',
      value: '1,247',
      badge: 3,
    },
    {
      id: 3,
      icon: 'chart-line',
      color: '#FF9800',
      label: '이번 달 증가율',
      value: '+12.5%',
      valueColor: '#4CAF50',
    },
    {
      id: 4,
      icon: 'clock-outline',
      color: '#9C27B0',
      label: '최근 업데이트',
      value: '10분 전',
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.dashboardRow}>
        {dashboardData.slice(0, 2).map((item) => (
          <Card key={item.id} style={styles.dashboardCard} mode="elevated">
            <Card.Content style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <Icon name={item.icon} size={28} color={item.color} />
                {item.badge && (
                  <Badge style={styles.badge}>{item.badge}</Badge>
                )}
              </View>
              <Text variant="bodySmall" style={styles.cardLabel}>
                {item.label}
              </Text>
              <Text 
                variant="headlineMedium" 
                style={[
                  styles.cardValue, 
                  item.valueColor && { color: item.valueColor }
                ]}
              >
                {item.value}
              </Text>
            </Card.Content>
          </Card>
        ))}
      </View>

      <View style={styles.dashboardRow}>
        {dashboardData.slice(2, 4).map((item) => (
          <Card key={item.id} style={styles.dashboardCard} mode="elevated">
            <Card.Content style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <Icon name={item.icon} size={28} color={item.color} />
              </View>
              <Text variant="bodySmall" style={styles.cardLabel}>
                {item.label}
              </Text>
              <Text 
                variant={item.id === 4 ? "titleSmall" : "headlineMedium"} 
                style={[
                  styles.cardValue, 
                  item.valueColor && { color: item.valueColor }
                ]}
              >
                {item.value}
              </Text>
            </Card.Content>
          </Card>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: verticalScale(12),
  },
  dashboardRow: {
    flexDirection: 'row',
    gap: scale(12),
    marginBottom: verticalScale(12),
  },
  dashboardCard: {
    flex: 1,
  },
  cardContent: {
    alignItems: 'center',
    paddingVertical: verticalScale(16),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(8),
  },
  badge: {
    marginLeft: scale(8),
    backgroundColor: '#FF5722',
  },
  cardLabel: {
    opacity: 0.7,
    marginBottom: verticalScale(4),
  },
  cardValue: {
    fontWeight: 'bold',
  },
});