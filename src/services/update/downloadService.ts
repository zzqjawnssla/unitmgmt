import RNFS from 'react-native-fs';
import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';

// FileViewer 동적 import
let FileViewer: any = null;
try {
  FileViewer = require('react-native-file-viewer').default;
} catch (error) {
  console.warn('react-native-file-viewer 모듈을 로드할 수 없습니다:', error);
}

export interface DownloadProgress {
  progress: number;
  written: number;
  total: number;
}

/**
 * Android 저장소 권한 요청
 */
export const requestStoragePermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    // Android 13 이상에서는 저장소 권한이 필요 없음
    if (Platform.Version >= 33) {
      return true;
    }

    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      {
        title: 'UNITMGMT 저장소 접근 권한',
        message:
          '업데이트 파일을 다운로드하기 위해 저장소 접근 권한이 필요합니다.',
        buttonNeutral: '나중에',
        buttonNegative: '거부',
        buttonPositive: '허용',
      },
    );

    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.error('권한 요청 오류:', err);
    return false;
  }
};

/**
 * APK 파일 다운로드 (Android 전용)
 */
export const downloadAPK = async (
  url: string,
  onProgress?: (progress: DownloadProgress) => void,
): Promise<string> => {
  // 플랫폼 검증
  if (Platform.OS !== 'android') {
    throw new Error('APK 다운로드는 Android에서만 지원됩니다.');
  }

  // URL 검증
  if (!url || typeof url !== 'string') {
    throw new Error('올바른 다운로드 URL이 필요합니다.');
  }

  // URL 형식 검증
  try {
    new URL(url);
  } catch (error) {
    throw new Error('잘못된 URL 형식입니다.');
  }

  // 권한 확인
  const hasPermission = await requestStoragePermission();
  if (!hasPermission) {
    throw new Error('저장소 접근 권한이 필요합니다.');
  }

  // 파일명 생성 (타임스탬프 포함)
  const fileName = `unitmgmt_update_${Date.now()}.apk`;
  const filePath = `${RNFS.DownloadDirectoryPath}/${fileName}`;

  try {
    // 기존 파일이 있으면 삭제
    const exists = await RNFS.exists(filePath);
    if (exists) {
      await RNFS.unlink(filePath);
    }

    console.log('APK 다운로드 시작:', {
      url,
      filePath,
      downloadDir: RNFS.DownloadDirectoryPath,
    });

    const downloadOptions = {
      fromUrl: url,
      toFile: filePath,
      background: true,
      progressDivider: 10,
      headers: {
        'User-Agent': 'UNITMGMT-App',
        Accept: 'application/vnd.android.package-archive',
      },
      begin: (res: any) => {
        console.log('다운로드 시작됨:', {
          statusCode: res.statusCode,
          contentLength: res.contentLength,
          headers: res.headers,
        });
      },
      progress: (res: any) => {
        const progress =
          res.contentLength > 0
            ? (res.bytesWritten / res.contentLength) * 100
            : 0;
        console.log(
          `다운로드 진행률: ${progress.toFixed(1)}% (${res.bytesWritten}/${
            res.contentLength
          })`,
        );

        onProgress?.({
          progress,
          written: res.bytesWritten,
          total: res.contentLength,
        });
      },
    };

    const result = await RNFS.downloadFile(downloadOptions).promise;

    console.log('다운로드 결과:', {
      statusCode: result.statusCode,
      filePath,
    });

    if (result.statusCode === 200) {
      // 파일 존재 및 크기 확인
      const fileExists = await RNFS.exists(filePath);
      if (!fileExists) {
        throw new Error('다운로드된 파일을 찾을 수 없습니다.');
      }

      const fileStats = await RNFS.stat(filePath);
      console.log('다운로드된 파일 정보:', {
        size: fileStats.size,
        path: fileStats.path,
        isFile: fileStats.isFile(),
      });

      if (fileStats.size < 1024) {
        // 1KB 미만이면 오류로 간주
        await RNFS.unlink(filePath); // 잘못된 파일 삭제
        throw new Error('다운로드된 파일이 손상되었습니다.');
      }

      console.log('APK 다운로드 성공:', filePath);
      return filePath;
    } else {
      // HTTP 상태 코드별 에러 메시지
      let errorMessage = 'APK 다운로드 실패';
      switch (result.statusCode) {
        case 400:
          errorMessage = '잘못된 요청입니다.';
          break;
        case 401:
          errorMessage = '인증이 필요합니다.';
          break;
        case 403:
          errorMessage = '다운로드 URL이 만료되었거나 접근 권한이 없습니다.';
          break;
        case 404:
          errorMessage = '다운로드 파일을 찾을 수 없습니다.';
          break;
        case 500:
        case 502:
        case 503:
          errorMessage = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
          break;
        default:
          errorMessage = `다운로드 실패 (HTTP ${result.statusCode})`;
      }

      throw new Error(errorMessage);
    }
  } catch (error: any) {
    console.error('다운로드 오류:', error);

    // 다운로드 실패 시 임시 파일 정리
    try {
      const exists = await RNFS.exists(filePath);
      if (exists) {
        await RNFS.unlink(filePath);
      }
    } catch (cleanupError) {
      console.warn('임시 파일 정리 실패:', cleanupError);
    }

    // 특정 에러 메시지 처리
    if (
      error.message?.includes('ExpiredToken') ||
      error.message?.includes('SignatureDoesNotMatch') ||
      error.message?.includes('403')
    ) {
      throw new Error('다운로드 URL이 만료되었습니다. 다시 시도해주세요.');
    }

    if (
      error.message?.includes('Network request failed') ||
      error.message?.includes('timeout')
    ) {
      throw new Error('네트워크 연결을 확인하고 다시 시도해주세요.');
    }

    throw error;
  }
};

/**
 * iOS 앱 업데이트 (Enterprise In-House 또는 App Store)
 */
export const updateiOSApp = async (manifestUrl?: string): Promise<void> => {
  if (Platform.OS !== 'ios') {
    Alert.alert('오류', 'iOS 업데이트는 iOS에서만 가능합니다.');
    return;
  }

  try {
    let installUrl: string;
    let alertTitle: string;
    let alertMessage: string;

    if (manifestUrl && manifestUrl.includes('manifest.plist')) {
      // Enterprise In-House 배포
      installUrl = `itms-services://?action=download-manifest&url=${encodeURIComponent(manifestUrl)}`;
      alertTitle = '회사 내부 배포 앱';
      alertMessage = '• 회사에서 배포하는 Enterprise 앱입니다.\n• 설치 후 "설정 > 일반 > VPN 및 기기 관리"에서 신뢰 설정이 필요할 수 있습니다.\n• "신뢰되지 않은 엔터프라이즈 개발자" 경고가 표시되면 개발자를 신뢰하세요.';
    } else {
      // App Store 배포 (fallback)
      installUrl = manifestUrl || 'itms-apps://apps.apple.com/app/id1234567890'; // 실제 App Store ID로 변경 필요
      alertTitle = 'App Store 업데이트';
      alertMessage = 'App Store로 이동하여 업데이트를 진행합니다.';
    }

    console.log('iOS 업데이트 URL:', installUrl);

    // 설치 안내 메시지 표시
    Alert.alert(
      alertTitle,
      alertMessage,
      [
        {
          text: '취소',
          style: 'cancel'
        },
        {
          text: '설치',
          style: 'default',
          onPress: async () => {
            try {
              const canOpen = await Linking.canOpenURL(installUrl);
              if (canOpen) {
                await Linking.openURL(installUrl);
              } else {
                throw new Error('URL을 열 수 없습니다');
              }
            } catch (linkError) {
              console.error('링크 열기 오류:', linkError);
              Alert.alert(
                '업데이트 실패',
                '설치 URL을 열 수 없습니다. 관리자에게 문의하세요.',
                [{ text: '확인', style: 'default' }]
              );
            }
          }
        }
      ]
    );
  } catch (error) {
    console.error('iOS 업데이트 오류:', error);
    Alert.alert(
      '업데이트 실패',
      '업데이트를 처리할 수 없습니다. 관리자에게 문의하세요.',
      [{ text: '확인', style: 'default' }]
    );
  }
};

/**
 * APK 파일 설치 (Android 전용)
 */
export const installAPK = async (filePath: string): Promise<void> => {
  if (Platform.OS !== 'android') {
    Alert.alert('오류', 'APK 설치는 Android에서만 가능합니다.');
    return;
  }

  try {
    // 파일 존재 확인
    const exists = await RNFS.exists(filePath);
    if (!exists) {
      throw new Error('설치 파일을 찾을 수 없습니다.');
    }

    console.log('APK 설치 시작:', filePath);

    if (!FileViewer || !FileViewer.open) {
      throw new Error('FileViewer 모듈을 사용할 수 없습니다.');
    }

    // FileViewer를 사용하여 APK 설치
    await FileViewer.open(filePath, {
      showOpenWithDialog: true,
      showAppsSuggestions: true,
      displayName: 'UNITMGMT Update',
    });

    console.log('APK 설치 화면 열림');

    // 설치 안내 메시지
    Alert.alert(
      '앱 업데이트',
      '• "출처를 알 수 없는 앱" 경고가 표시될 수 있습니다.\n• 이는 정상적인 보안 경고입니다.\n• "설치" 버튼을 눌러 업데이트를 완료해주세요.\n• 설치 완료 후 앱 아이콘을 눌러 앱을 실행할 수 있습니다.',
      [{ text: '확인', style: 'default' }],
    );
  } catch (error: any) {
    console.error('설치 오류:', error);

    Alert.alert(
      '설치 실패',
      `앱 설치에 실패했습니다.\n\n오류: ${error.message}\n\n파일 관리자에서 직접 설치해주세요.`,
      [{ text: '확인', style: 'default' }],
    );
  }
};

/**
 * 이전 업데이트 파일 정리
 */
export const cleanupDownloads = async (): Promise<void> => {
  // Android에서만 실행
  if (Platform.OS !== 'android') {
    return;
  }

  try {
    const files = await RNFS.readDir(RNFS.DownloadDirectoryPath);
    const updateFiles = files.filter(
      file =>
        file.name.startsWith('unitmgmt_update_') && file.name.endsWith('.apk'),
    );

    console.log(`정리할 이전 업데이트 파일: ${updateFiles.length}개`);

    for (const file of updateFiles) {
      try {
        await RNFS.unlink(file.path);
        console.log('이전 업데이트 파일 삭제:', file.name);
      } catch (deleteError) {
        console.warn('파일 삭제 실패:', file.name, deleteError);
      }
    }
  } catch (error) {
    console.error('파일 정리 오류:', error);
  }
};

/**
 * 다운로드 디렉토리 용량 확인
 */
export const checkAvailableStorage = async (): Promise<{
  available: number;
  total: number;
}> => {
  try {
    if (Platform.OS === 'android') {
      const freeSpace = await RNFS.getFSInfo();
      return {
        available: freeSpace.freeSpace,
        total: freeSpace.totalSpace,
      };
    }
    return { available: -1, total: -1 };
  } catch (error) {
    console.error('저장 공간 확인 오류:', error);
    return { available: -1, total: -1 };
  }
};
