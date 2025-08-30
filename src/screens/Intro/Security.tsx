// Security.tsx
import React, {
  useCallback,
  useEffect,
  useState,
  startTransition,
} from 'react';
import {
  InteractionManager,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  Appbar,
  Card,
  Button,
  Text,
  Surface,
  ActivityIndicator,
  Dialog,
  Portal,
  Divider,
  useTheme,
  IconButton,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// 동적 로드
let JailMonkey: any;

try {
  JailMonkey = require('jail-monkey').default;
} catch (e) {
  console.log('jail-monkey not installed/linked:', e);
}

type SecurityStatus = 'secure' | 'warning' | 'danger' | 'checking';

interface SecurityCheck {
  id: string;
  name: string;
  description: string;
  status: SecurityStatus;
  result?: boolean;
  error?: string;
}

const Security: React.FC = () => {
  const [securityChecks, setSecurityChecks] = useState<SecurityCheck[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [overallStatus, setOverallStatus] = useState<SecurityStatus>('checking');
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const theme = useTheme();

  const getStatusIcon = (status: SecurityStatus) => {
    switch (status) {
      case 'secure':
        return 'shield-check';
      case 'warning':
        return 'shield-alert';
      case 'danger':
        return 'shield-off';
      case 'checking':
        return 'shield-sync';
      default:
        return 'shield';
    }
  };

  const getStatusColor = (status: SecurityStatus) => {
    switch (status) {
      case 'secure':
        return theme.colors.primary;
      case 'warning':
        return '#FF9800';
      case 'danger':
        return theme.colors.error;
      case 'checking':
        return theme.colors.outline;
      default:
        return theme.colors.onSurfaceVariant;
    }
  };

  const getStatusText = (status: SecurityStatus) => {
    switch (status) {
      case 'secure':
        return '보안';
      case 'warning':
        return '주의';
      case 'danger':
        return '위험';
      case 'checking':
        return '확인중';
      default:
        return '알 수 없음';
    }
  };

  const runSecurityChecks = useCallback(async () => {
    setIsChecking(true);
    setOverallStatus('checking');

    const checks: SecurityCheck[] = [
      {
        id: 'jailbreak',
        name: '탈옥/루팅 검사',
        description: '기기의 탈옥 또는 루팅 상태를 확인합니다',
        status: 'checking',
      },
      {
        id: 'debugger',
        name: '디버거 검사',
        description: '앱이 디버깅 모드에서 실행되고 있는지 확인합니다',
        status: 'checking',
      },
      {
        id: 'hook',
        name: '후킹 검사',
        description: '악성 후킹 도구가 감지되는지 확인합니다',
        status: 'checking',
      },
      {
        id: 'location_mock',
        name: '위치 스푸핑 검사',
        description: '위치 정보 조작 여부를 확인합니다',
        status: 'checking',
      },
      {
        id: 'external_storage',
        name: '외부 저장소 검사',
        description: '앱이 안전하지 않은 외부 저장소에서 실행되고 있는지 확인합니다',
        status: 'checking',
      },
    ];

    // Platform specific checks
    if (Platform.OS === 'android') {
      checks.push({
        id: 'adb',
        name: 'ADB 디버깅 검사',
        description: 'ADB 디버깅이 활성화되어 있는지 확인합니다',
        status: 'checking',
      });
      checks.push({
        id: 'dev_settings',
        name: '개발자 모드 검사',
        description: '개발자 설정이 활성화되어 있는지 확인합니다',
        status: 'checking',
      });
    }

    setSecurityChecks(checks);

    // 사용자 경험을 위해 잠시 대기
    await new Promise(resolve => setTimeout(resolve, 1000));

    const updatedChecks = [...checks];

    if (JailMonkey) {
      try {
        // 탈옥/루팅 검사
        const isJailBroken = JailMonkey.isJailBroken();
        const jailbreakIndex = updatedChecks.findIndex(c => c.id === 'jailbreak');
        if (jailbreakIndex >= 0) {
          updatedChecks[jailbreakIndex] = {
            ...updatedChecks[jailbreakIndex],
            status: isJailBroken ? 'danger' : 'secure',
            result: isJailBroken,
          };
        }

        // 디버거 검사
        const isDebugged = JailMonkey.isDebuggedMode();
        const debuggerIndex = updatedChecks.findIndex(c => c.id === 'debugger');
        if (debuggerIndex >= 0) {
          updatedChecks[debuggerIndex] = {
            ...updatedChecks[debuggerIndex],
            status: isDebugged ? 'warning' : 'secure',
            result: isDebugged,
          };
        }

        // 후킹 검사
        const hookDetected = JailMonkey.hookDetected();
        const hookIndex = updatedChecks.findIndex(c => c.id === 'hook');
        if (hookIndex >= 0) {
          updatedChecks[hookIndex] = {
            ...updatedChecks[hookIndex],
            status: hookDetected ? 'danger' : 'secure',
            result: hookDetected,
          };
        }

        // 위치 스푸핑 검사
        const canMockLocation = JailMonkey.canMockLocation();
        const locationIndex = updatedChecks.findIndex(c => c.id === 'location_mock');
        if (locationIndex >= 0) {
          updatedChecks[locationIndex] = {
            ...updatedChecks[locationIndex],
            status: canMockLocation ? 'warning' : 'secure',
            result: canMockLocation,
          };
        }

        // 외부 저장소 검사
        const isOnExternalStorage = JailMonkey.isOnExternalStorage();
        const storageIndex = updatedChecks.findIndex(c => c.id === 'external_storage');
        if (storageIndex >= 0) {
          updatedChecks[storageIndex] = {
            ...updatedChecks[storageIndex],
            status: isOnExternalStorage ? 'danger' : 'secure',
            result: isOnExternalStorage,
          };
        }

        // Android 전용 검사
        if (Platform.OS === 'android') {
          try {
            const adbEnabled = JailMonkey.AdbEnabled();
            const adbIndex = updatedChecks.findIndex(c => c.id === 'adb');
            if (adbIndex >= 0) {
              updatedChecks[adbIndex] = {
                ...updatedChecks[adbIndex],
                status: adbEnabled ? 'warning' : 'secure',
                result: adbEnabled,
              };
            }
          } catch (e) {
            const adbIndex = updatedChecks.findIndex(c => c.id === 'adb');
            if (adbIndex >= 0) {
              updatedChecks[adbIndex] = {
                ...updatedChecks[adbIndex],
                status: 'warning',
                error: String(e),
              };
            }
          }

          try {
            const isDevelopmentMode = await JailMonkey.isDevelopmentSettingsMode();
            const devIndex = updatedChecks.findIndex(c => c.id === 'dev_settings');
            if (devIndex >= 0) {
              updatedChecks[devIndex] = {
                ...updatedChecks[devIndex],
                status: isDevelopmentMode ? 'warning' : 'secure',
                result: isDevelopmentMode,
              };
            }
          } catch (e) {
            const devIndex = updatedChecks.findIndex(c => c.id === 'dev_settings');
            if (devIndex >= 0) {
              updatedChecks[devIndex] = {
                ...updatedChecks[devIndex],
                status: 'warning',
                error: String(e),
              };
            }
          }
        }
      } catch (error) {
        console.error('Security check error:', error);
        updatedChecks.forEach(check => {
          if (check.status === 'checking') {
            check.status = 'warning';
            check.error = '보안 검사 실패';
          }
        });
      }
    } else {
      // JailMonkey가 없는 경우 모든 검사를 경고로 설정
      updatedChecks.forEach(check => {
        check.status = 'warning';
        check.error = '보안 모듈을 사용할 수 없습니다';
      });
    }

    // 전체 보안 상태 결정
    const hasError = updatedChecks.some(c => c.status === 'danger');
    const hasWarning = updatedChecks.some(c => c.status === 'warning');
    
    let overall: SecurityStatus = 'secure';
    if (hasError) {
      overall = 'danger';
    } else if (hasWarning) {
      overall = 'warning';
    }

    await new Promise(resolve => 
      InteractionManager.runAfterInteractions(() => resolve(undefined))
    );

    startTransition(() => {
      setSecurityChecks(updatedChecks);
      setOverallStatus(overall);
      setIsChecking(false);
    });
  }, []);

  const showDetailsDialogHandler = useCallback(() => {
    setShowDetailsDialog(true);
  }, []);

  const hideDetailsDialog = useCallback(() => {
    setShowDetailsDialog(false);
  }, []);

  const getOverallMessage = () => {
    switch (overallStatus) {
      case 'secure':
        return '기기가 안전한 상태입니다';
      case 'warning':
        return '일부 보안 주의사항이 발견되었습니다';
      case 'danger':
        return '심각한 보안 위험이 감지되었습니다';
      case 'checking':
        return '보안 상태를 확인하고 있습니다...';
      default:
        return '보안 상태를 확인할 수 없습니다';
    }
  };

  useEffect(() => {
    runSecurityChecks();
  }, [runSecurityChecks]);

  return (
    <Surface style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="보안 검사" />
        <Appbar.Action 
          icon="information" 
          onPress={showDetailsDialogHandler}
        />
      </Appbar.Header>

      <Surface style={styles.statusSection} elevation={1}>
        <View style={styles.statusContent}>
          <View style={styles.statusHeader}>
            <Icon 
              name={getStatusIcon(overallStatus)} 
              size={48} 
              color={getStatusColor(overallStatus)} 
            />
            <View style={styles.statusTextContainer}>
              <Text variant="headlineSmall" style={styles.statusTitle}>
                {getStatusText(overallStatus)}
              </Text>
              <Text variant="bodyMedium" style={styles.statusMessage}>
                {getOverallMessage()}
              </Text>
            </View>
          </View>

          {!isChecking && (
            <Button 
              mode="outlined" 
              onPress={runSecurityChecks}
              icon="refresh"
              style={styles.refreshButton}
            >
              다시 검사
            </Button>
          )}
        </View>
      </Surface>

      {isChecking ? (
        <Surface style={styles.loadingSection} elevation={2}>
          <ActivityIndicator size="large" />
          <Text variant="bodyLarge" style={styles.loadingText}>
            보안 검사 진행 중...
          </Text>
        </Surface>
      ) : (
        <ScrollView style={styles.checksContainer} showsVerticalScrollIndicator={false}>
          {securityChecks.map((check) => (
            <Card key={check.id} style={styles.checkCard} mode="elevated">
              <Card.Content>
                <View style={styles.checkHeader}>
                  <View style={styles.checkTitleRow}>
                    <Icon 
                      name={getStatusIcon(check.status)} 
                      size={24} 
                      color={getStatusColor(check.status)} 
                    />
                    <View style={styles.checkTextContainer}>
                      <Text variant="titleMedium" style={styles.checkName}>
                        {check.name}
                      </Text>
                      <Text variant="bodySmall" style={styles.checkDescription}>
                        {check.description}
                      </Text>
                    </View>
                  </View>
                  <View style={[
                    styles.statusBadge, 
                    { backgroundColor: getStatusColor(check.status) + '20' }
                  ]}>
                    <Text 
                      variant="labelSmall" 
                      style={[styles.statusBadgeText, { color: getStatusColor(check.status) }]}
                    >
                      {getStatusText(check.status)}
                    </Text>
                  </View>
                </View>
                
                {check.error && (
                  <>
                    <Divider style={styles.divider} />
                    <Text variant="bodySmall" style={styles.errorText}>
                      오류: {check.error}
                    </Text>
                  </>
                )}
                
                {check.result !== undefined && (
                  <>
                    <Divider style={styles.divider} />
                    <Text variant="bodySmall" style={styles.resultText}>
                      결과: {check.result ? '감지됨' : '정상'}
                    </Text>
                  </>
                )}
              </Card.Content>
            </Card>
          ))}
        </ScrollView>
      )}

      <Portal>
        <Dialog visible={showDetailsDialog} onDismiss={hideDetailsDialog}>
          <Dialog.Title>보안 검사 정보</Dialog.Title>
          <Dialog.Content>
            <ScrollView style={styles.dialogContent}>
              <Text variant="bodyMedium" style={styles.dialogText}>
                이 화면에서는 기기의 보안 상태를 종합적으로 점검합니다.
              </Text>
              
              <Divider style={styles.dialogDivider} />
              
              <Text variant="titleSmall" style={styles.dialogSectionTitle}>
                검사 항목:
              </Text>
              <Text variant="bodySmall" style={styles.dialogListItem}>
                • 탈옥/루팅: 기기의 무단 수정 여부
              </Text>
              <Text variant="bodySmall" style={styles.dialogListItem}>
                • 디버거: 앱 분석 도구 감지
              </Text>
              <Text variant="bodySmall" style={styles.dialogListItem}>
                • 후킹: 악성 코드 삽입 감지
              </Text>
              <Text variant="bodySmall" style={styles.dialogListItem}>
                • 위치 스푸핑: 위치 정보 조작 감지
              </Text>
              <Text variant="bodySmall" style={styles.dialogListItem}>
                • 외부 저장소: 안전하지 않은 설치 위치
              </Text>
              {Platform.OS === 'android' && (
                <>
                  <Text variant="bodySmall" style={styles.dialogListItem}>
                    • ADB 디버깅: 개발자 도구 연결 상태
                  </Text>
                  <Text variant="bodySmall" style={styles.dialogListItem}>
                    • 개발자 모드: 개발자 설정 활성화 상태
                  </Text>
                </>
              )}
              
              <Divider style={styles.dialogDivider} />
              
              <Text variant="titleSmall" style={styles.dialogSectionTitle}>
                상태 정보:
              </Text>
              <View style={styles.statusExplanation}>
                <Icon name="shield-check" size={16} color={theme.colors.primary} />
                <Text variant="bodySmall" style={styles.statusExplanationText}>
                  보안: 모든 검사 통과
                </Text>
              </View>
              <View style={styles.statusExplanation}>
                <Icon name="shield-alert" size={16} color="#FF9800" />
                <Text variant="bodySmall" style={styles.statusExplanationText}>
                  주의: 일부 보안 주의사항 발견
                </Text>
              </View>
              <View style={styles.statusExplanation}>
                <Icon name="shield-off" size={16} color={theme.colors.error} />
                <Text variant="bodySmall" style={styles.statusExplanationText}>
                  위험: 심각한 보안 위험 감지
                </Text>
              </View>
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={hideDetailsDialog}>확인</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statusSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  statusContent: {
    alignItems: 'center',
    gap: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusTitle: {
    fontWeight: 'bold',
  },
  statusMessage: {
    marginTop: 4,
    opacity: 0.8,
  },
  refreshButton: {
    minWidth: 120,
  },
  loadingSection: {
    margin: 16,
    padding: 32,
    alignItems: 'center',
    borderRadius: 12,
    gap: 16,
  },
  loadingText: {
    textAlign: 'center',
  },
  checksContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  checkCard: {
    marginBottom: 12,
  },
  checkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  checkTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 12,
    gap: 12,
  },
  checkTextContainer: {
    flex: 1,
  },
  checkName: {
    fontWeight: '600',
    marginBottom: 2,
  },
  checkDescription: {
    opacity: 0.7,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontWeight: '600',
    fontSize: 11,
  },
  divider: {
    marginVertical: 12,
  },
  errorText: {
    color: '#d32f2f',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  resultText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    opacity: 0.8,
  },
  dialogContent: {
    maxHeight: 400,
  },
  dialogText: {
    lineHeight: 20,
  },
  dialogDivider: {
    marginVertical: 16,
  },
  dialogSectionTitle: {
    fontWeight: '600',
    marginBottom: 8,
  },
  dialogListItem: {
    lineHeight: 18,
    marginBottom: 4,
    paddingLeft: 8,
  },
  statusExplanation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  statusExplanationText: {
    flex: 1,
    lineHeight: 18,
  },
});

export default Security;