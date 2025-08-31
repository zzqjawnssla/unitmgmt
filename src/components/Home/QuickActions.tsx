import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Surface, useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { scale, verticalScale } from 'react-native-size-matters';

export const QuickActions: React.FC = () => {
  const theme = useTheme();

  const quickActions = [
    { id: 1, title: '단위 등록', icon: 'plus-circle', color: theme.colors.primary },
    { id: 2, title: '재고 확인', icon: 'package-variant', color: '#4CAF50' },
    { id: 3, title: '리포트 생성', icon: 'file-chart', color: '#FF9800' },
    { id: 4, title: '설정', icon: 'cog', color: '#9C27B0' },
  ];

  return (
    <Card style={styles.sectionCard} mode="elevated">
      <Card.Content>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          빠른 작업
        </Text>
        <View style={styles.quickActionsGrid}>
          {quickActions.map((action) => (
            <Surface key={action.id} style={styles.quickActionItem} elevation={1}>
              <Icon name={action.icon} size={32} color={action.color} />
              <Text variant="bodySmall" style={styles.quickActionText}>
                {action.title}
              </Text>
            </Surface>
          ))}
        </View>
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
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(12),
  },
  quickActionItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: verticalScale(16),
    borderRadius: scale(12),
  },
  quickActionText: {
    marginTop: verticalScale(8),
    textAlign: 'center',
  },
});