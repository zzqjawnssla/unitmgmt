import React, { useState, useEffect } from 'react';
import { Platform, StyleSheet, View, BackHandler } from 'react-native';
import { Text, Surface, Card, useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface Props {
  navigation: any;
  route: {
    params?: {
      issues: string[];
      hasError: boolean;
      hasWarning: boolean;
      overall: string;
      showRejectScreen?: boolean;
    };
  };
}

// 카운트다운 타이머 컴포넌트
const CountdownTimer: React.FC<{ initialSeconds: number; onComplete: () => void }> = ({
  initialSeconds,
  onComplete,
}) => {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    if (seconds > 0) {
      const timer = setTimeout(() => {
        setSeconds(seconds - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      onComplete();
    }
  }, [seconds, onComplete]);

  return (
    <Text variant="headlineLarge" style={styles.countdown}>
      {seconds}
    </Text>
  );
};

const SecurityRejectScreen: React.FC<Props> = ({ navigation, route }) => {
  const theme = useTheme();
  const securityIssues = route.params?.issues || [];

  useEffect(() => {
    // Android 하드웨어 백 버튼 차단 (보안 위반 화면에서)
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // 보안 위반 화면에서는 백 버튼 차단
      return true;
    });

    return () => backHandler.remove();
  }, []);

  return (
    <Surface style={styles.container}>
      <View style={styles.rejectContainer}>
        <Icon name="shield-off" size={80} color={theme.colors.error} style={styles.rejectIcon} />
        <Text variant="headlineMedium" style={[styles.rejectTitle, { color: theme.colors.error }]}>
          보안 위험 감지
        </Text>
        <Text variant="bodyMedium" style={styles.rejectSubtitle}>
          다음과 같은 보안 위험이 감지되어 앱을 계속 사용할 수 없습니다.
        </Text>
        
        <Card style={[styles.issuesCard, { borderColor: theme.colors.error }]}>
          <Card.Content>
            {securityIssues.map((issue, index) => (
              <View key={index} style={styles.issueItem}>
                <Icon name="alert-circle" size={16} color={theme.colors.error} />
                <Text variant="bodySmall" style={styles.issueText}>
                  {issue}
                </Text>
              </View>
            ))}
          </Card.Content>
        </Card>

        <Text variant="bodyMedium" style={styles.rejectInstructions}>
          {Platform.OS === 'android'
            ? '10초 후 앱이 자동으로 종료됩니다.'
            : '홈 버튼을 눌러 앱을 종료해주세요.'}
        </Text>

        {Platform.OS === 'android' && (
          <CountdownTimer 
            initialSeconds={10}
            onComplete={() => {
              BackHandler.exitApp();
            }}
          />
        )}
      </View>
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  rejectContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  rejectIcon: {
    marginBottom: 20,
  },
  rejectTitle: {
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: 'bold',
  },
  rejectSubtitle: {
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  issuesCard: {
    width: '100%',
    marginBottom: 20,
    borderWidth: 1,
  },
  issueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  issueText: {
    flex: 1,
    color: '#333',
  },
  rejectInstructions: {
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
    fontStyle: 'italic',
  },
  countdown: {
    color: '#F44336',
    fontWeight: 'bold',
  },
});

export default SecurityRejectScreen;