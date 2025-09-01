import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Text, ActivityIndicator, Surface, Snackbar } from 'react-native-paper';
import {
  checkDeviceSecurity,
  SecurityCheckResult,
} from '../../services/security/securityService';
import {
  checkForUpdate,
  VersionInfo,
} from '../../services/update/versionService';

interface Props {
  navigation: any;
}

type InitializationStep = 'starting' | 'security' | 'update' | 'completed';

const InitializationScreen: React.FC<Props> = ({ navigation }) => {
  const [currentStep, setCurrentStep] =
    useState<InitializationStep>('starting');
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Environment mode check
  const envMode = process.env.ENV_MODE;

  useEffect(() => {
    startInitialization();
  }, []);

  const startInitialization = async () => {
    try {
      // 1. 시작
      setCurrentStep('starting');
      await new Promise(resolve => setTimeout(resolve, 500));

      // 2. 보안 검사
      setCurrentStep('security');
      console.log('백그라운드 보안 검사 시작...');
      const securityResult = await checkDeviceSecurity();

      // 프로덕션 모드이고 Critical 보안 문제가 있는 경우만 차단
      if (envMode === 'prd' && securityResult.hasError) {
        console.log('Critical 보안 위험 감지 - RejectScreen으로 이동');
        console.log('Critical issues:', securityResult.issues);
        // serializable한 데이터만 전달
        navigation.replace('Security', {
          issues: securityResult.issues,
          hasError: securityResult.hasError,
          hasWarning: securityResult.hasWarning,
          overall: securityResult.overall,
          showRejectScreen: true,
        });
        return;
      }

      // Warning 항목이 있으면 로그만 남기고 통과
      if (securityResult.hasWarning) {
        console.log('Security warnings (허용됨):', securityResult.warnings);
      }

      // 3. 업데이트 체크
      setCurrentStep('update');
      console.log('백그라운드 업데이트 확인 시작...');

      try {
        const updateInfo = await checkForUpdate(true);

        if (updateInfo) {
          console.log('업데이트 발견 - UpdateCheckScreen으로 이동');
          navigation.replace('UpdateCheck', { updateInfo });
          return;
        }

        // 최신 버전인 경우 snackbar 표시
        setSnackbarMessage('최신 버전을 사용하고 있습니다.');
        setShowSnackbar(true);
      } catch (error) {
        console.error('업데이트 확인 오류:', error);
        setSnackbarMessage('업데이트 확인 중 오류가 발생했습니다.');
        setShowSnackbar(true);
      }

      // 4. 완료 - 로그인으로 이동
      setCurrentStep('completed');
      setTimeout(() => {
        navigation.replace('Login');
      }, 1500);
    } catch (error) {
      console.error('초기화 중 오류:', error);
      setSnackbarMessage('앱 초기화 중 오류가 발생했습니다.');
      setShowSnackbar(true);

      // 오류 발생 시에도 로그인으로 이동
      setTimeout(() => {
        navigation.replace('Login');
      }, 2000);
    }
  };

  const getStepMessage = () => {
    switch (currentStep) {
      case 'starting':
        return '앱을 초기화하는 중...';
      case 'security':
        return '보안 검사 중...';
      case 'update':
        return '업데이트 확인 중...';
      case 'completed':
        return '초기화 완료';
      default:
        return '앱을 시작하는 중...';
    }
  };

  const getStepColor = () => {
    switch (currentStep) {
      case 'completed':
        return '#4CAF50';
      default:
        return '#F47725';
    }
  };

  return (
    <Surface style={styles.container}>
      <View style={styles.centerContainer}>
        <ActivityIndicator
          size="large"
          color={getStepColor()}
          style={styles.indicator}
        />
        <Text
          variant="bodyLarge"
          style={[styles.messageText, { color: getStepColor() }]}
        >
          {getStepMessage()}
        </Text>

        {currentStep === 'completed' && (
          <Text variant="bodySmall" style={styles.completedText}>
            로그인 화면으로 이동합니다...
          </Text>
        )}
      </View>

      <Snackbar
        visible={showSnackbar}
        onDismiss={() => setShowSnackbar(false)}
        duration={2000}
        style={styles.snackbar}
      >
        {snackbarMessage}
      </Snackbar>
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  indicator: {
    marginBottom: 24,
  },
  messageText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  completedText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
  },
  snackbar: {
    backgroundColor: '#333',
  },
});

export default InitializationScreen;
