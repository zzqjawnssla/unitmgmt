import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform, BackHandler, Alert } from 'react-native';
import { 
  Text, 
  Button, 
  Card, 
  ProgressBar, 
  Surface,
  Dialog,
  Paragraph,
  Snackbar,
  ActivityIndicator
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { checkForUpdate, getCurrentVersionInfo, VersionInfo } from '../../services/update/versionService';
import { 
  downloadAPK, 
  installAPK, 
  updateiOSApp,
  cleanupDownloads,
  checkAvailableStorage,
  DownloadProgress 
} from '../../services/update/downloadService';

interface Props {
  navigation: any;
  route: {
    params?: {
      updateInfo: VersionInfo;
    };
  };
}

type UpdateState = 'checking' | 'available' | 'downloading' | 'installing' | 'completed' | 'no_update' | 'error';

const UpdateCheckScreen: React.FC<Props> = ({ navigation, route }) => {
  const [updateState, setUpdateState] = useState<UpdateState>('available');
  const [updateInfo, setUpdateInfo] = useState<VersionInfo | null>(route.params?.updateInfo || null);
  const [currentVersion, setCurrentVersion] = useState<any>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress>({ progress: 0, written: 0, total: 0 });
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [downloadedFilePath, setDownloadedFilePath] = useState<string>('');
  const [showStorageWarning, setShowStorageWarning] = useState<boolean>(false);
  const [showExitDialog, setShowExitDialog] = useState<boolean>(false);

  useEffect(() => {
    initializeScreen();
    
    // Android 하드웨어 백 버튼 차단 (강제 업데이트이므로)
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (updateState === 'available' || updateState === 'error') {
        handleExitApp();
      }
      return true; // 백 버튼 동작 차단
    });

    return () => backHandler.remove();
  }, []);

  const initializeScreen = async () => {
    try {
      // 현재 버전 정보 가져오기
      const current = await getCurrentVersionInfo();
      setCurrentVersion(current);

      // updateInfo가 없으면 에러 상태로 설정
      if (!updateInfo) {
        console.error('UpdateCheckScreen: updateInfo가 없습니다.');
        setErrorMessage('업데이트 정보를 가져올 수 없습니다.');
        setUpdateState('error');
        return;
      }

      // Android의 경우 저장 공간 확인
      if (Platform.OS === 'android' && updateInfo) {
        const storage = await checkAvailableStorage();
        const requiredSpace = (updateInfo.fileSize || 50 * 1024 * 1024) * 1.5; // 여유 공간 50%
        
        if (storage.available > 0 && storage.available < requiredSpace) {
          setShowStorageWarning(true);
        }
      }

      console.log('UpdateCheckScreen 초기화 완료:', updateInfo);
    } catch (error) {
      console.error('UpdateCheckScreen 초기화 오류:', error);
      setErrorMessage('화면 초기화 중 오류가 발생했습니다.');
      setUpdateState('error');
    }
  };

  const handleUpdate = async () => {
    if (!updateInfo) return;

    try {
      if (Platform.OS === 'android') {
        await handleAndroidUpdate();
      } else {
        await handleiOSUpdate();
      }
    } catch (error: any) {
      console.error('업데이트 처리 오류:', error);
      setErrorMessage(error.message || '업데이트 처리 중 오류가 발생했습니다.');
      setUpdateState('error');
    }
  };

  const handleAndroidUpdate = async () => {
    if (!updateInfo) return;

    try {
      setUpdateState('downloading');
      console.log('APK 다운로드 시작...');

      // 이전 다운로드 파일 정리
      await cleanupDownloads();

      const filePath = await downloadAPK(updateInfo.downloadUrl, (progress) => {
        setDownloadProgress(progress);
      });

      console.log('다운로드 완료:', filePath);
      setDownloadedFilePath(filePath);
      setUpdateState('installing');

      // 1초 후 설치 시작
      setTimeout(async () => {
        await installAPK(filePath);
        setUpdateState('completed');
      }, 1000);

    } catch (error: any) {
      console.error('Android 업데이트 오류:', error);
      setErrorMessage(error.message);
      setUpdateState('error');
    }
  };

  const handleiOSUpdate = async () => {
    if (!updateInfo) return;

    try {
      setUpdateState('installing');
      console.log('iOS 업데이트 시작...');

      // Enterprise In-House 배포: manifestUrl 또는 installUrl 사용
      const updateUrl = updateInfo.manifestUrl || updateInfo.installUrl || undefined;
      await updateiOSApp(updateUrl);
      
      setUpdateState('completed');
    } catch (error: any) {
      console.error('iOS 업데이트 오류:', error);
      setErrorMessage(error.message);
      setUpdateState('error');
    }
  };

  const handleExitApp = () => {
    setShowExitDialog(true);
  };

  const confirmExitApp = () => {
    setShowExitDialog(false);
    
    if (Platform.OS === 'android') {
      BackHandler.exitApp();
    } else {
      Alert.alert(
        '앱 종료',
        '홈 버튼을 눌러 앱을 종료해주세요.',
        [{ text: '확인', style: 'default' }]
      );
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '알 수 없음';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const renderContent = () => {
    switch (updateState) {
      case 'checking':
        return (
          <View style={styles.contentContainer}>
            <Icon name="update" size={80} color="#F47725" style={styles.icon} />
            <Text variant="headlineSmall" style={styles.title}>업데이트 확인 중</Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              최신 버전을 확인하고 있습니다...
            </Text>
            <ProgressBar indeterminate color="#F47725" style={styles.progressBar} />
          </View>
        );

      case 'available':
        return (
          <View style={styles.contentContainer}>
            <Icon name="alert-circle" size={80} color="#F47725" style={styles.icon} />
            <Text variant="headlineSmall" style={styles.title}>필수 업데이트</Text>
            <Text variant="bodyMedium" style={[styles.subtitle, styles.forceUpdateText]}>
              앱을 계속 사용하려면 업데이트가 필요합니다.
            </Text>
            
            {updateInfo && (
              <Card style={styles.updateCard}>
                <Card.Content>
                  <Text variant="titleMedium" style={styles.versionText}>
                    버전 {updateInfo.versionName} ({updateInfo.versionCode})
                  </Text>
                  <Text variant="bodySmall" style={styles.sizeText}>
                    크기: {formatFileSize(updateInfo.fileSize)}
                  </Text>
                  <Text variant="bodyMedium" style={styles.releaseNotes}>
                    {updateInfo.releaseNotes}
                  </Text>
                </Card.Content>
              </Card>
            )}

            {currentVersion && (
              <Text variant="bodySmall" style={styles.currentVersion}>
                현재 버전: {currentVersion.versionName} ({currentVersion.versionCode})
              </Text>
            )}

            <View style={styles.buttonContainer}>
              <Button
                mode="contained"
                onPress={handleUpdate}
                style={styles.updateButton}
                buttonColor="#F47725"
                icon="download"
              >
                업데이트 설치
              </Button>
              
              <Button
                mode="outlined"
                onPress={handleExitApp}
                style={styles.exitButton}
                textColor="#F44336"
                icon="close"
              >
                앱 종료
              </Button>
            </View>
          </View>
        );

      case 'downloading':
        return (
          <View style={styles.contentContainer}>
            <Icon name="download" size={80} color="#F47725" style={styles.icon} />
            <Text variant="headlineSmall" style={styles.title}>다운로드 중</Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              업데이트 파일을 다운로드하고 있습니다...
            </Text>
            
            <Surface style={styles.progressContainer}>
              <ProgressBar 
                progress={downloadProgress.progress / 100} 
                color="#F47725" 
                style={styles.progressBar}
              />
              <Text variant="bodySmall" style={styles.progressText}>
                {downloadProgress.progress.toFixed(1)}% ({formatFileSize(downloadProgress.written)} / {formatFileSize(downloadProgress.total)})
              </Text>
            </Surface>
            
            <Text variant="bodySmall" style={styles.warningText}>
              다운로드 중에는 앱을 종료하지 마세요.
            </Text>
          </View>
        );

      case 'installing':
        return (
          <View style={styles.contentContainer}>
            <Icon name="cog" size={80} color="#F47725" style={styles.icon} />
            <Text variant="headlineSmall" style={styles.title}>설치 준비 중</Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              {Platform.OS === 'android' 
                ? '설치 화면이 곧 표시됩니다...' 
                : 'App Store로 이동합니다...'}
            </Text>
            <ProgressBar indeterminate color="#F47725" style={styles.progressBar} />
          </View>
        );

      case 'completed':
        return (
          <View style={styles.contentContainer}>
            <Icon name="check-circle" size={80} color="#4CAF50" style={styles.icon} />
            <Text variant="headlineSmall" style={styles.title}>업데이트 준비 완료</Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              {Platform.OS === 'android' 
                ? '설치 화면에서 앱을 설치해주세요.' 
                : 'App Store에서 업데이트를 완료해주세요.'}
            </Text>
          </View>
        );

      case 'no_update':
        return (
          <View style={styles.contentContainer}>
            <Icon name="check-circle" size={80} color="#4CAF50" style={styles.icon} />
            <Text variant="headlineSmall" style={styles.title}>최신 버전</Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              현재 최신 버전을 사용하고 있습니다.
            </Text>
            {currentVersion && (
              <Text variant="bodySmall" style={styles.currentVersion}>
                버전: {currentVersion.versionName} ({currentVersion.versionCode})
              </Text>
            )}
          </View>
        );

      case 'error':
        return (
          <View style={styles.contentContainer}>
            <Icon name="alert-circle" size={80} color="#F44336" style={styles.icon} />
            <Text variant="headlineSmall" style={styles.title}>오류 발생</Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              {errorMessage || '알 수 없는 오류가 발생했습니다.'}
            </Text>
            
            <View style={styles.buttonContainer}>
              <Button
                mode="contained"
                onPress={() => navigation.replace('Login')}
                style={styles.retryButton}
                buttonColor="#F47725"
                icon="refresh"
              >
                로그인으로 이동
              </Button>
              
              <Button
                mode="outlined"
                onPress={handleExitApp}
                style={styles.exitButton}
                textColor="#F44336"
                icon="close"
              >
                앱 종료
              </Button>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {renderContent()}
      
      {/* 저장 공간 부족 경고 다이얼로그 */}
      <Dialog visible={showStorageWarning} onDismiss={() => setShowStorageWarning(false)}>
        <Dialog.Title>저장 공간 부족</Dialog.Title>
        <Dialog.Content>
          <Paragraph>
            저장 공간이 부족할 수 있습니다. 업데이트를 계속하시겠습니까?
          </Paragraph>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setShowStorageWarning(false)}>취소</Button>
          <Button onPress={() => {
            setShowStorageWarning(false);
            handleUpdate();
          }}>계속</Button>
        </Dialog.Actions>
      </Dialog>

      {/* 앱 종료 확인 다이얼로그 */}
      <Dialog visible={showExitDialog} onDismiss={() => setShowExitDialog(false)}>
        <Dialog.Title>앱 종료</Dialog.Title>
        <Dialog.Content>
          <Paragraph>
            업데이트 없이는 앱을 사용할 수 없습니다. 정말로 앱을 종료하시겠습니까?
          </Paragraph>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setShowExitDialog(false)}>취소</Button>
          <Button 
            onPress={confirmExitApp}
            textColor="#F44336"
          >
            종료
          </Button>
        </Dialog.Actions>
      </Dialog>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    padding: 20,
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginBottom: 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  forceUpdateText: {
    color: '#F44336',
    fontWeight: '600',
  },
  updateCard: {
    width: '100%',
    marginBottom: 20,
    borderColor: '#F47725',
    borderWidth: 1,
  },
  versionText: {
    color: '#333',
    marginBottom: 5,
    fontWeight: '600',
  },
  sizeText: {
    color: '#666',
    marginBottom: 10,
  },
  releaseNotes: {
    color: '#333',
    lineHeight: 20,
  },
  currentVersion: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 20,
  },
  buttonContainer: {
    width: '100%',
    marginTop: 10,
  },
  updateButton: {
    marginBottom: 10,
  },
  exitButton: {
    borderColor: '#F44336',
  },
  progressContainer: {
    width: '100%',
    padding: 15,
    borderRadius: 8,
    elevation: 2,
    marginBottom: 10,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 10,
  },
  progressText: {
    textAlign: 'center',
    color: '#666',
  },
  warningText: {
    textAlign: 'center',
    color: '#FF9800',
    fontStyle: 'italic',
    marginTop: 10,
  },
  retryButton: {
    marginBottom: 10,
  },
});

export default UpdateCheckScreen;