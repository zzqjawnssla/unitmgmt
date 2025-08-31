import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Surface, Text } from 'react-native-paper';
import { scale, verticalScale } from 'react-native-size-matters';

const TransScreen: React.FC = () => {
  return (
    <Surface style={styles.container}>
      <View style={styles.content}>
        <Text variant="headlineMedium" style={styles.title}>
          이동
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          이동 화면입니다
        </Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(24),
  },
  title: {
    textAlign: 'center',
    marginBottom: verticalScale(16),
    color: '#333333',
    fontWeight: '700',
  },
  subtitle: {
    textAlign: 'center',
    color: '#666666',
  },
});

export default TransScreen;