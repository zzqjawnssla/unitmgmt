// LinkTestComponent.tsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  startTransition,
} from 'react';
import {
  Alert,
  ActivityIndicator,
  Button,
  InteractionManager,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

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

  const getStatusColor = (status: TestStatus) => {
    switch (status) {
      case 'success':
        return '#28a745';
      case 'error':
        return '#dc3545';
      case 'not_available':
        return '#ffc107';
      default:
        return '#6c757d';
    }
  };

  const showSummaryAlert = useCallback(() => {
    const successCount = testResults.filter(r => r.status === 'success').length;
    const errorCount = testResults.filter(r => r.status === 'error').length;
    const naCount = testResults.filter(r => r.status === 'not_available').length;

    Alert.alert(
      'Test Summary',
      `✅ Success: ${successCount}\n❌ Error: ${errorCount}\n⚠️ Not Available: ${naCount}\n\nTotal: ${testResults.length}`,
      [{ text: 'OK' }],
    );
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Library Link Test</Text>
        <Text style={styles.subtitle}>Platform: {Platform.OS}</Text>
        <Text style={styles.note}>{headerNote}</Text>

        <View style={styles.buttonRow}>
          <Button title="Run Tests" onPress={runAllTests} disabled={isLoading} />
          <Button
            title="Show Summary"
            onPress={showSummaryAlert}
            disabled={testResults.length === 0}
          />
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>Running…</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll}>
          {testResults.map((r, idx) => (
            <View key={`${r.name}-${idx}`} style={styles.item}>
              <Text style={[styles.name, { color: getStatusColor(r.status) }]}>
                {r.status.toUpperCase()} · {r.name}
              </Text>
              {'result' in r && r.result !== undefined ? (
                <Text style={styles.result}>
                  {typeof r.result === 'object'
                    ? JSON.stringify(r.result)
                    : String(r.result)}
                </Text>
              ) : null}
              {r.error ? <Text style={styles.error}>{r.error}</Text> : null}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 16, paddingBottom: 8 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#666' },
  note: { marginTop: 8, fontSize: 12, color: '#888' },
  buttonRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  loadingBox: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  loadingText: { marginTop: 10, color: '#666' },
  scroll: { flex: 1, padding: 16 },
  item: {
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#eee',
    marginBottom: 10,
    backgroundColor: '#fafafa',
  },
  name: { fontSize: 14, fontWeight: '600' },
  result: {
    marginTop: 6,
    fontSize: 13,
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  error: {
    marginTop: 6,
    fontSize: 13,
    color: '#dc3545',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});

export default LinkTestComponent;
