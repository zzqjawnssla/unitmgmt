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
        message: '업데이트 파일을 다운로드하기 위해 저장소 접근 권한이 필요합니다.',
        buttonNeutral: '나중에',
        buttonNegative: '거부',
        buttonPositive: '허용',
      }
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
  onProgress?: (progress: DownloadProgress) => void
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
  
  // 파일명 생성 (타임스탬프와 랜덤 문자열 포함)
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(7);
  const fileName = `unitmgmt_update_${timestamp}_${randomString}.apk`;
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
      downloadDir: RNFS.DownloadDirectoryPath
    });

    const downloadOptions = {
      fromUrl: url,
      toFile: filePath,
      background: true,
      progressDivider: 10,
      headers: {
        'User-Agent': 'UNITMGMT-App/1.0',
        'Accept': 'application/vnd.android.package-archive,application/octet-stream',
        'Cache-Control': 'no-cache',
      },
      begin: (res: any) => {
        console.log('다운로드 시작됨:', {
          statusCode: res.statusCode,
          contentLength: res.contentLength,
          headers: res.headers
        });
      },
      progress: (res: any) => {
        const progress = res.contentLength > 0 ? (res.bytesWritten / res.contentLength) * 100 : 0;
        console.log(`다운로드 진행률: ${progress.toFixed(1)}% (${res.bytesWritten}/${res.contentLength})`);
        
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
        isFile: fileStats.isFile()
      });

      if (fileStats.size < 1024) { // 1KB 미만이면 오류로 간주
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
    if (error.message?.includes('ExpiredToken') || 
        error.message?.includes('SignatureDoesNotMatch') ||
        error.message?.includes('403')) {
      throw new Error('다운로드 URL이 만료되었습니다. 다시 시도해주세요.');
    }
    
    if (error.message?.includes('Network request failed') || 
        error.message?.includes('timeout')) {
      throw new Error('네트워크 연결을 확인하고 다시 시도해주세요.');
    }
    
    throw error;
  }
};

/**
 * iOS 앱 업데이트 (App Store 또는 TestFlight)
 */
export const updateiOSApp = async (appStoreUrl?: string): Promise<void> => {
  if (Platform.OS !== 'ios') {
    Alert.alert('오류', 'iOS 업데이트는 iOS에서만 가능합니다.');
    return;
  }

  try {
    // App Store URL이 제공된 경우 해당 URL로, 아니면 기본 App Store 링크
    const url = appStoreUrl || 'itms-apps://apps.apple.com/app/id1234567890'; // 실제 App Store ID로 변경 필요
    
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert(
        '업데이트 불가',
        'App Store를 열 수 없습니다. 직접 App Store에서 업데이트해주세요.',
        [{ text: '확인', style: 'default' }]
      );
    }
  } catch (error) {
    console.error('iOS 업데이트 오류:', error);
    Alert.alert(
      '업데이트 실패',
      'App Store를 열 수 없습니다. 직접 App Store에서 업데이트해주세요.',
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
    
    // FileViewer가 null인지 확인
    if (!FileViewer || !FileViewer.open) {
      console.error('FileViewer 모듈이 로드되지 않았습니다.');
      
      // 대체 방법: 다운로드 완료 알림
      Alert.alert(
        '다운로드 완료',
        `APK 파일이 다운로드되었습니다.\n\n경로: ${filePath}\n\n파일 관리자에서 해당 파일을 찾아 설치해주세요.`,
        [
          { text: '확인', style: 'default' }
        ]
      );
      return;
    }
    
    // FileViewer를 사용하여 APK 설치
    await FileViewer.open(filePath, {
      showOpenWithDialog: true,
      showAppsSuggestions: true,
      displayName: 'UNITMGMT Update',
    });
    
    console.log('APK 설치 화면 열림');
  } catch (error: any) {
    console.error('설치 오류:', error);
    
    // 에러 메시지에 따른 처리
    if (error.message?.includes('No app associated')) {
      Alert.alert(
        '설치 앱 없음',
        'APK 파일을 설치할 수 있는 앱이 없습니다. 파일 관리자에서 직접 설치해주세요.',
        [
          { text: '확인', style: 'default' }
        ]
      );
    } else if (error.message?.includes('파일을 찾을 수 없습니다')) {
      Alert.alert(
        '파일 없음',
        '설치 파일을 찾을 수 없습니다. 다시 다운로드해주세요.',
        [
          { text: '확인', style: 'default' }
        ]
      );
    } else {
      Alert.alert(
        '설치 실패',
        `앱 설치에 실패했습니다.\n\n다운로드 경로: ${filePath}\n\n파일 관리자에서 직접 설치해주세요.`,
        [
          { text: '확인', style: 'default' }
        ]
      );
    }
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
    const updateFiles = files.filter(file => 
      file.name.startsWith('unitmgmt_update_') && file.name.endsWith('.apk')
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
export const checkAvailableStorage = async (): Promise<{available: number, total: number}> => {
  try {
    if (Platform.OS === 'android') {
      const freeSpace = await RNFS.getFSInfo();
      return {
        available: freeSpace.freeSpace,
        total: freeSpace.totalSpace
      };
    }
    return { available: -1, total: -1 };
  } catch (error) {
    console.error('저장 공간 확인 오류:', error);
    return { available: -1, total: -1 };
  }
};