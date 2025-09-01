import { Platform } from 'react-native';

// 동적 로드
let JailMonkey: any;

try {
  JailMonkey = require('jail-monkey').default;
} catch (e) {
  console.log('jail-monkey not installed/linked:', e);
}

export type SecurityStatus = 'secure' | 'warning' | 'danger' | 'checking';

export interface SecurityCheck {
  id: string;
  name: string;
  description: string;
  status: SecurityStatus;
  result?: boolean;
  error?: string;
}

export interface SecurityCheckResult {
  overall: SecurityStatus;
  checks: SecurityCheck[];
  issues: string[];
  warnings: string[];
  hasError: boolean;
  hasWarning: boolean;
}

/**
 * 기기 보안 상태를 종합적으로 검사합니다.
 * @returns SecurityCheckResult - 보안 검사 결과
 */
export const checkDeviceSecurity = async (): Promise<SecurityCheckResult> => {
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

  // 사용자 경험을 위해 잠시 대기
  await new Promise(resolve => setTimeout(resolve, 1000));

  const updatedChecks = [...checks];
  const issues: string[] = [];
  const warnings: string[] = [];

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
        if (isJailBroken) {
          issues.push('탈옥/루팅된 기기에서 실행');
        }
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
        if (isDebugged) {
          warnings.push('디버거가 연결되어 있음');
        }
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
        if (hookDetected) {
          issues.push('후킹 도구가 감지됨');
        }
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
        if (canMockLocation) {
          warnings.push('위치 스푸핑이 가능한 상태');
        }
      }

      // 외부 저장소 검사
      const isOnExternalStorage = JailMonkey.isOnExternalStorage();
      const storageIndex = updatedChecks.findIndex(c => c.id === 'external_storage');
      if (storageIndex >= 0) {
        updatedChecks[storageIndex] = {
          ...updatedChecks[storageIndex],
          status: isOnExternalStorage ? 'warning' : 'secure',
          result: isOnExternalStorage,
        };
        if (isOnExternalStorage) {
          warnings.push('외부 저장소에서 실행 (자체 배포 앱)');
        }
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
            if (adbEnabled) {
              warnings.push('ADB 디버깅이 활성화됨');
            }
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
            if (isDevelopmentMode) {
              warnings.push('개발자 모드가 활성화됨');
            }
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

  return {
    overall,
    checks: updatedChecks,
    issues,
    warnings,
    hasError,
    hasWarning,
  };
};