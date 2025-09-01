import {Platform} from 'react-native';
import DeviceInfo from 'react-native-device-info';

export interface VersionInfo {
  versionCode: number;
  versionName: string;
  platform: string;
  downloadUrl: string;
  fileSize: number;
  filename: string;
  releaseNotes: string;
  releaseDate: string;
  isForceUpdate?: boolean;
  manifestUrl?: string; // iOS 전용
  bundleId?: string; // iOS 전용
}

export interface VersionCheckResponse {
  needsUpdate: boolean;
  currentVersion: {
    versionCode: number;
    versionName: string;
  };
  latestVersion?: VersionInfo;
  message?: string;
}

/**
 * 버전 업데이트 확인
 * @param forceRefresh - 강제로 새로운 URL을 요청할지 여부
 * @returns 업데이트 정보 또는 null
 */
export const checkForUpdate = async (
  forceRefresh: boolean = false,
): Promise<VersionInfo | null> => {
  try {
    const currentVersionCode = parseInt(DeviceInfo.getBuildNumber(), 10);
    const currentVersionName = DeviceInfo.getVersion();
    const platform = Platform.OS;
    const apiUrl = process.env.API_GATEWAY_URL;

    console.log('Current version check:');
    console.log('- versionCode:', currentVersionCode);
    console.log('- versionName:', currentVersionName);
    console.log('- platform:', platform);

    if (!apiUrl) {
      console.error('API_GATEWAY_URL이 설정되지 않았습니다.');
      return null;
    }

    // 요청 데이터 구성 (Lambda 함수와 일치)
    const requestData = {
      app_id: 'sko.company.unitmgmt',
      platform: platform,
      current_version_code: currentVersionCode,
      current_version_name: currentVersionName
    };

    // forceRefresh인 경우 timestamp를 추가하여 캐시 무효화
    const timestamp = forceRefresh ? `?timestamp=${Date.now()}` : '';
    const url = `${apiUrl}/check-version${timestamp}`;

    console.log('API Request URL:', url);
    console.log('Request Data:', requestData);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      console.error('버전 확인 실패:', response.status, response.statusText);
      return null;
    }

    const responseText = await response.text();
    console.log('Raw response:', responseText);

    const parsedResponse: VersionCheckResponse = JSON.parse(responseText);

    // API Gateway 응답 형식 처리 (body가 있는 경우)
    const data = parsedResponse.body
      ? JSON.parse(parsedResponse.body)
      : parsedResponse;

    console.log('Parsed response:', data);

    // 업데이트가 필요한 경우에만 정보 반환
    if (data.needsUpdate || data.needs_update) {
      const latestVersion = data.latestVersion || data.latest_version;
      
      if (latestVersion) {
        console.log('Update required:', latestVersion);
        
        // VersionInfo 형식으로 변환
        const versionInfo: VersionInfo = {
          versionCode: latestVersion.version_code,
          versionName: latestVersion.version_name,
          platform: latestVersion.platform,
          downloadUrl: latestVersion.download_url,
          fileSize: latestVersion.file_size || 0,
          filename: latestVersion.filename || `unitmgmt-v${latestVersion.version_name}-${platform}.${platform === 'ios' ? 'ipa' : 'apk'}`,
          releaseNotes: latestVersion.release_notes || '새로운 업데이트가 있습니다.',
          releaseDate: latestVersion.release_date || new Date().toISOString().split('T')[0],
          isForceUpdate: true, // 현재는 강제 업데이트로 설정
        };

        // iOS 전용 필드 추가
        if (platform === 'ios') {
          versionInfo.manifestUrl = latestVersion.manifest_url;
          versionInfo.bundleId = latestVersion.bundle_id;
        }

        return versionInfo;
      }
    }

    console.log('No update needed');
    return null;
  } catch (error) {
    console.error('버전 확인 중 오류:', error);
    return null;
  }
};

/**
 * 현재 앱 버전 정보 가져오기
 */
export const getCurrentVersionInfo = async () => {
  try {
    const versionCode = parseInt(DeviceInfo.getBuildNumber(), 10);
    const versionName = DeviceInfo.getVersion();
    const platform = Platform.OS;

    return {
      versionCode,
      versionName,
      platform,
    };
  } catch (error) {
    console.error('현재 버전 정보 가져오기 오류:', error);
    return null;
  }
};