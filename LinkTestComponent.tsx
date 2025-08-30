// LinkTestComponent.tsx
import React, {
  useCallback,
  useEffect,
  useMemo,
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
  Badge,
  ActivityIndicator,
  Dialog,
  Portal,
  Divider,
  useTheme,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// 동적 로드(링크 상태에 상관없이 앱이 죽지 않도록)
let JailMonkey: any;
let DeviceInfo: any;

try {
  JailMonkey = require('jail-monkey').default;
} catch (e) {
  console.log('jail-monkey not installed/linked:', e);
}

try {
  DeviceInfo = require('react-native-device-info').default;
} catch (e) {
  console.log('react-native-device-info not installed/linked:', e);
}

type TestStatus = 'success' | 'error' | 'not_available';

interface TestResult {
  name: string;
  status: TestStatus;
  result?: unknown;
  error?: string;
}

const LinkTestComponent: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const theme = useTheme();

  const getStatusIcon = (status: TestStatus) => {
    switch (status) {
      case 'success':
        return 'check-circle';
      case 'error':
        return 'alert-circle';
      case 'not_available':
        return 'help-circle';
      default:
        return 'circle';
    }
  };

  const getStatusColor = (status: TestStatus) => {
    switch (status) {
      case 'success':
        return theme.colors.primary;
      case 'error':
        return theme.colors.error;
      case 'not_available':
        return theme.colors.outline;
      default:
        return theme.colors.onSurfaceVariant;
    }
  };

  const showSummaryDialog = useCallback(() => {
    setShowDialog(true);
  }, []);

  const hideSummaryDialog = useCallback(() => {
    setShowDialog(false);
  }, []);

  const getSummaryStats = useMemo(() => {
    const successCount = testResults.filter(r => r.status === 'success').length;
    const errorCount = testResults.filter(r => r.status === 'error').length;
    const naCount = testResults.filter(r => r.status === 'not_available').length;
    return { successCount, errorCount, naCount };
  }, [testResults]);

  const headerNote = useMemo(
    () =>
      '버튼을 누르면 각 라이브러리의 대표 API를 호출해 링크/작동 여부를 점검합니다.',
    [],
  );

  // ⚠️ 입력 직후 suspend를 유발하는 업데이트 방지:
  // 무거운 렌더(큰 리스트/지연 로드)를 일으킬 수 있는 setState는 startTransition으로 감싼다.
  const runAllTests = useCallback(async () => {
    setIsLoading(true); // 급한 업데이트: 바로 반영

    const results: TestResult[] = [];
    console.log('🧪 Start link tests (platform:', Platform.OS, ')');

    // ===== jail-monkey =====
    if (JailMonkey) {
      try {
        const v = JailMonkey.isJailBroken();
        results.push({ name: 'JailMonkey.isJailBroken()', status: 'success', result: v });
      } catch (e: any) {
        results.push({
          name: 'JailMonkey.isJailBroken()',
          status: 'error',
          error: String(e),
        });
      }

      if (Platform.OS === 'ios') {
        try {
          const msg = JailMonkey.jailBrokenMessage?.();
          results.push({
            name: 'JailMonkey.jailBrokenMessage() [iOS]',
            status: 'success',
            result: msg,
          });
        } catch (e: any) {
          results.push({
            name: 'JailMonkey.jailBrokenMessage() [iOS]',
            status: 'error',
            error: String(e),
          });
        }
      }

      try {
        const trust = JailMonkey.trustFall?.();
        results.push({ name: 'JailMonkey.trustFall()', status: 'success', result: trust });
      } catch (e: any) {
        results.push({
          name: 'JailMonkey.trustFall()',
          status: 'error',
          error: String(e),
        });
      }

      try {
        const canMock = JailMonkey.canMockLocation?.();
        results.push({
          name: 'JailMonkey.canMockLocation()',
          status: 'success',
          result: canMock,
        });
      } catch (e: any) {
        results.push({
          name: 'JailMonkey.canMockLocation()',
          status: 'error',
          error: String(e),
        });
      }

      try {
        const hooked = JailMonkey.hookDetected?.();
        results.push({
          name: 'JailMonkey.hookDetected()',
          status: 'success',
          result: hooked,
        });
      } catch (e: any) {
        results.push({
          name: 'JailMonkey.hookDetected()',
          status: 'error',
          error: String(e),
        });
      }
    } else {
      results.push({
        name: 'jail-monkey',
        status: 'not_available',
        error: 'library not installed or not linked',
      });
    }

    // ===== react-native-device-info =====
    if (DeviceInfo) {
      try {
        const id = await DeviceInfo.getUniqueId();
        results.push({ name: 'DeviceInfo.getUniqueId()', status: 'success', result: id });
      } catch (e: any) {
        results.push({
          name: 'DeviceInfo.getUniqueId()',
          status: 'error',
          error: String(e),
        });
      }

      try {
        const model = DeviceInfo.getModel?.();
        results.push({ name: 'DeviceInfo.getModel()', status: 'success', result: model });
      } catch (e: any) {
        results.push({
          name: 'DeviceInfo.getModel()',
          status: 'error',
          error: String(e),
        });
      }
    } else {
      results.push({
        name: 'react-native-device-info',
        status: 'not_available',
        error: 'library not installed or not linked',
      });
    }

    // 입력 제스처가 끝난 뒤로 미뤄 UX 튐 방지(선택적이지만 도움됨)
    await new Promise<void>(resolve =>
      InteractionManager.runAfterInteractions(() => resolve()),
    );

    // ✅ 전환 업데이트: suspend될 수 있는 렌더는 전환으로 처리
    startTransition(() => {
      setTestResults(results);
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    // 마운트 시 자동 실행
    runAllTests();
  }, [runAllTests]);

  return (
    <Surface style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="Library Link Test" />
        <Appbar.Action 
          icon="information" 
          onPress={showSummaryDialog}
          disabled={testResults.length === 0}
        />
      </Appbar.Header>

      <Surface style={styles.header} elevation={1}>
        <View style={styles.headerContent}>
          <View style={styles.platformInfo}>
            <Icon 
              name={Platform.OS === 'ios' ? 'apple' : 'android'} 
              size={24} 
              color={theme.colors.primary} 
            />
            <Text variant="titleMedium" style={styles.platformText}>
              Platform: {Platform.OS}
            </Text>
          </View>
          <Text variant="bodyMedium" style={styles.note}>
            {headerNote}
          </Text>
          <View style={styles.statsRow}>
            <Badge style={[styles.statsBadge, { backgroundColor: theme.colors.primaryContainer }]}>
              {`${getSummaryStats.successCount} Success`}
            </Badge>
            <Badge style={[styles.statsBadge, { backgroundColor: theme.colors.errorContainer }]}>
              {`${getSummaryStats.errorCount} Error`}
            </Badge>
            <Badge style={[styles.statsBadge, { backgroundColor: theme.colors.surfaceVariant }]}>
              {`${getSummaryStats.naCount} N/A`}
            </Badge>
          </View>
        </View>
        <Button 
          mode="contained" 
          onPress={runAllTests} 
          loading={isLoading}
          disabled={isLoading}
          icon="play"
          style={styles.runButton}
        >
          {isLoading ? 'Running Tests...' : 'Run Tests'}
        </Button>
      </Surface>

      {isLoading ? (
        <Surface style={styles.loadingBox} elevation={2}>
          <ActivityIndicator size="large" />
          <Text variant="bodyLarge" style={styles.loadingText}>
            Running Tests...
          </Text>
        </Surface>
      ) : (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {testResults.map((r, idx) => (
            <Card key={`${r.name}-${idx}`} style={styles.testCard} mode="elevated">
              <Card.Content>
                <View style={styles.testHeader}>
                  <View style={styles.testTitleRow}>
                    <Icon 
                      name={getStatusIcon(r.status)} 
                      size={20} 
                      color={getStatusColor(r.status)} 
                    />
                    <Text variant="titleSmall" style={styles.testName}>
                      {r.name}
                    </Text>
                  </View>
                  <Badge style={[styles.statusBadge, { backgroundColor: getStatusColor(r.status) }]}>
                    {r.status.toUpperCase()}
                  </Badge>
                </View>
                
                {'result' in r && r.result !== undefined && (
                  <>
                    <Divider style={styles.divider} />
                    <Text variant="bodySmall" style={styles.resultLabel}>
                      Result:
                    </Text>
                    <Text variant="bodySmall" style={styles.resultText}>
                      {typeof r.result === 'object'
                        ? JSON.stringify(r.result, null, 2)
                        : String(r.result)}
                    </Text>
                  </>
                )}
                
                {r.error && (
                  <>
                    <Divider style={styles.divider} />
                    <Text variant="bodySmall" style={styles.errorLabel}>
                      Error:
                    </Text>
                    <Text variant="bodySmall" style={styles.errorText}>
                      {r.error}
                    </Text>
                  </>
                )}
              </Card.Content>
            </Card>
          ))}
        </ScrollView>
      )}

      <Portal>
        <Dialog visible={showDialog} onDismiss={hideSummaryDialog}>
          <Dialog.Title>Test Summary</Dialog.Title>
          <Dialog.Content>
            <View style={styles.summaryContent}>
              <View style={styles.summaryRow}>
                <Icon name="check-circle" size={20} color={theme.colors.primary} />
                <Text variant="bodyMedium">Success: {getSummaryStats.successCount}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Icon name="alert-circle" size={20} color={theme.colors.error} />
                <Text variant="bodyMedium">Error: {getSummaryStats.errorCount}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Icon name="help-circle" size={20} color={theme.colors.outline} />
                <Text variant="bodyMedium">Not Available: {getSummaryStats.naCount}</Text>
              </View>
              <Divider style={styles.summaryDivider} />
              <Text variant="titleMedium">Total: {testResults.length}</Text>
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={hideSummaryDialog}>Close</Button>
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
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerContent: {
    marginBottom: 12,
  },
  platformInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  platformText: {
    marginLeft: 8,
  },
  note: {
    marginBottom: 12,
    opacity: 0.7,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statsBadge: {
    paddingHorizontal: 8,
  },
  runButton: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  loadingBox: {
    margin: 16,
    padding: 24,
    alignItems: 'center',
    borderRadius: 12,
  },
  loadingText: {
    marginTop: 12,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
  testCard: {
    marginBottom: 8,
  },
  testHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  testTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  testName: {
    marginLeft: 8,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  divider: {
    marginVertical: 8,
  },
  resultLabel: {
    fontWeight: '600',
    marginBottom: 4,
  },
  resultText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    opacity: 0.8,
  },
  errorLabel: {
    fontWeight: '600',
    marginBottom: 4,
  },
  errorText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  summaryContent: {
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryDivider: {
    marginVertical: 8,
  },
});

export default LinkTestComponent;
