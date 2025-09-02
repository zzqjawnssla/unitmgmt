import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Surface, Text, Appbar } from 'react-native-paper';
import { scale, verticalScale } from 'react-native-size-matters';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

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
};

const TransScreen: React.FC = () => {
  return (
    <Surface style={styles.container}>
      <Appbar.Header style={styles.appbar}>
        <Appbar.Content title="배송 조회" titleStyle={styles.appbarTitle} />
      </Appbar.Header>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons
            name="truck-delivery-outline"
            size={scale(80)}
            color={COLORS.primary}
            style={styles.mainIcon}
          />
        </View>

        <View style={styles.textContainer}>
          <Text variant="headlineMedium" style={styles.title}>
            택배사 배송 조회 서비스
          </Text>
          <Text variant="titleMedium" style={styles.subtitle}>
            준비중입니다
          </Text>
          <Text variant="bodyMedium" style={styles.description}>
            더 나은 서비스 제공을 위해{'\n'}
            열심히 준비하고 있습니다.
          </Text>
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.infoItem}>
            <MaterialCommunityIcons
              name="clock-outline"
              size={scale(20)}
              color={COLORS.textSecondary}
              style={styles.infoIcon}
            />
            <Text variant="bodyMedium" style={styles.infoText}>
              서비스 출시 예정
            </Text>
          </View>

          {/*<View style={styles.infoItem}>*/}
          {/*  <MaterialCommunityIcons*/}
          {/*    name="bell-outline"*/}
          {/*    size={scale(20)}*/}
          {/*    color={COLORS.textSecondary}*/}
          {/*    style={styles.infoIcon}*/}
          {/*  />*/}
          {/*  <Text variant="bodyMedium" style={styles.infoText}>*/}
          {/*    출시 시 알림을 드립니다*/}
          {/*  </Text>*/}
          {/*</View>*/}
        </View>
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
    textAlign: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(24),
    backgroundColor: COLORS.surface,
  },
  iconContainer: {
    marginBottom: verticalScale(32),
    padding: scale(24),
    backgroundColor: COLORS.primaryLight,
    borderRadius: scale(50),
  },
  mainIcon: {
    // 추가 스타일링 필요시 여기에
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: verticalScale(40),
  },
  title: {
    textAlign: 'center',
    marginBottom: verticalScale(12),
    color: COLORS.text,
    fontWeight: '700',
  },
  subtitle: {
    textAlign: 'center',
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: verticalScale(16),
  },
  description: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    lineHeight: scale(22),
  },
  infoContainer: {
    width: '100%',
    maxWidth: scale(280),
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(16),
    marginBottom: verticalScale(12),
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoIcon: {
    marginRight: scale(12),
  },
  infoText: {
    color: COLORS.textSecondary,
    flex: 1,
  },
});

export default TransScreen;
