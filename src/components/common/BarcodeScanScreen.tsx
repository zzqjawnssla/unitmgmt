import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Linking, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, IconButton, Surface, Appbar } from 'react-native-paper';
import { useAuth } from '../../store/AuthContext';
import { searchCodeList } from '../../store/AuthContext';
import {
  RouteProp,
  useNavigation,
  useRoute,
  NavigationProp,
} from '@react-navigation/native';
import { scale, verticalScale } from 'react-native-size-matters';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
} from 'react-native-vision-camera';
import { Snackbar } from 'react-native-paper';
import type { RootStackParamList } from '../../navigation/RootStackNavigation';

// Brand Colors
const BRAND_COLORS = {
  primary: '#F47725',
  background: '#FCFCFC',
  surface: '#FFFFFF',
  textSecondary: '#666666',
};

type BarcodeScanScreenRouteProp = RouteProp<
  RootStackParamList,
  'BarcodeScanScreen'
>;

type BarcodeScanScreenNavigationProp = NavigationProp<RootStackParamList>;

export const BarcodeScanScreen: React.FC = () => {
  const { setSearchTerm, setSearchCode } = useAuth();
  const navigation = useNavigation<BarcodeScanScreenNavigationProp>();
  const route = useRoute<BarcodeScanScreenRouteProp>();
  const { code } = route.params;

  const { hasPermission, requestPermission } = useCameraPermission();

  const [hasScanned, setHasScanned] = useState(false);
  const [scanCode, setScanCode] = useState<string>('');
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const showSnackbar = useCallback((message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  }, []);

  useEffect(() => {
    const checkPermission = async () => {
      if (!hasPermission) {
        const permission = await requestPermission();
        console.log('permission', permission);
        if (permission === false) {
          setSnackbarMessage('카메라 권한이 필요합니다.');
          setSnackbarVisible(true);
          setTimeout(() => {
            Linking.openSettings();
          }, 1000);
        }
      }
    };
    checkPermission();
  }, [hasPermission]);

  const device = useCameraDevice('back');

  const codeTypes = useMemo(() => {
    return code === '1' ? ['qr'] : ['ean-13', 'code-128'];
  }, [code]);

  const codeScanner = useCodeScanner({
    codeTypes: codeTypes,
    onCodeScanned: codes => {
      if (!hasScanned && codes.length > 0) {
        setScanCode(codes[0].value || '');
        setHasScanned(true);
      }
    },
  });

  if (device == null || !hasPermission) {
    return (
      <Surface style={styles.container}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content
            title={code === '1' ? 'SKT 바코드 스캔' : '제조사 S/N 스캔'}
          />
        </Appbar.Header>
        <View style={styles.errorContainer}>
          <Text variant="titleMedium">
            {device == null
              ? '카메라를 사용할 수 없습니다.'
              : '카메라 권한이 필요합니다.'}
          </Text>
        </View>
      </Surface>
    );
  }

  // 스캔 영역 크기 계산
  const { scanAreaWidth, scanAreaHeight } = useMemo(
    () => ({
      scanAreaWidth: code === '1' ? scale(200) : scale(280),
      scanAreaHeight: code === '1' ? scale(200) : scale(120),
    }),
    [code],
  );

  const handleConfirm = useCallback(() => {
    if (code === '1') {
      // SKT 바코드
      setSearchTerm({ sktbarcode: scanCode, serial: '' });
      setSearchCode({ value: '1', label: 'SKT바코드' });
    } else {
      // 제조사 S/N
      setSearchTerm({ sktbarcode: '', serial: scanCode });
      setSearchCode({ value: '2', label: '제조사S/N' });
    }

    // SearchResultScreen으로 이동
    navigation.navigate('SearchStack', {
      screen: 'SearchResult',
    });
  }, [code, scanCode, setSearchTerm, setSearchCode, navigation]);

  const handleRescan = useCallback(() => {
    setScanCode('');
    setHasScanned(false);
  }, []);

  return (
    <Surface style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content
          title={code === '1' ? 'SKT 바코드 스캔' : '제조사 S/N 스캔'}
        />
      </Appbar.Header>

      <Camera
        device={device}
        codeScanner={codeScanner}
        isActive={!hasScanned}
        style={styles.camera}
      />

      <View style={styles.overlay}>
        {/* 상단 반투명 영역 */}
        <View style={styles.overlaySection} />

        <View style={styles.centerRow}>
          {/* 왼쪽 반투명 영역 */}
          <View style={styles.overlaySection} />

          {/* 스캔 영역 (투명) */}
          <View
            style={[
              styles.scanArea,
              {
                width: scanAreaWidth,
                height: scanAreaHeight,
                borderColor: BRAND_COLORS.primary,
              },
            ]}
          />

          {/* 오른쪽 반투명 영역 */}
          <View style={styles.overlaySection} />
        </View>

        {/* 하단 반투명 영역 */}
        <View style={styles.overlaySection} />
      </View>

      {/* 스캔 가이드 텍스트 */}
      <View style={styles.guideContainer}>
        <Text variant="bodyLarge" style={styles.guideText}>
          {code === '1'
            ? 'QR 코드를 스캔 영역에 맞춰주세요'
            : '바코드를 스캔 영역에 맞춰주세요'}
        </Text>
      </View>

      {scanCode !== '' && (
        <View style={styles.resultContainer}>
          <View style={styles.resultContent}>
            <Text variant="titleMedium" style={styles.resultLabel}>
              스캔 결과
            </Text>
            <Text variant="headlineSmall" style={styles.resultValue}>
              {scanCode}
            </Text>
          </View>
          <View style={styles.buttonContainer}>
            <IconButton
              icon="check"
              size={scale(28)}
              iconColor="white"
              containerColor={BRAND_COLORS.primary}
              onPress={handleConfirm}
            />
            <IconButton
              icon="refresh"
              size={scale(28)}
              iconColor="white"
              containerColor="#666666"
              onPress={handleRescan}
            />
          </View>
        </View>
      )}

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        action={{
          label: '확인',
          onPress: () => setSnackbarVisible(false),
        }}
      >
        {snackbarMessage}
      </Snackbar>
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND_COLORS.background,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'column',
  },
  centerRow: {
    flexDirection: 'row',
  },
  overlaySection: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  scanArea: {
    borderWidth: 3,
    backgroundColor: 'transparent',
    borderRadius: scale(10),
  },
  guideContainer: {
    position: 'absolute',
    top: '30%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  guideText: {
    color: 'white',
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    borderRadius: scale(8),
  },
  resultContainer: {
    position: 'absolute',
    bottom: verticalScale(40),
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingVertical: verticalScale(16),
    paddingHorizontal: scale(20),
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  resultContent: {
    flex: 1,
    marginRight: scale(16),
  },
  resultLabel: {
    color: '#CCCCCC',
    marginBottom: verticalScale(4),
  },
  resultValue: {
    color: 'white',
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: scale(12),
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
