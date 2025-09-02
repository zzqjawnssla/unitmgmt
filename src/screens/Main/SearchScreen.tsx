import React, { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  SegmentedButtons,
  TextInput,
  Surface,
  Snackbar,
  Appbar,
} from 'react-native-paper';
import { scale, verticalScale } from 'react-native-size-matters';
import {
  NavigationProp,
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootStackParamList } from '../../navigation/RootStackNavigation.tsx';
import { useAuth } from '../../store/AuthContext.tsx';
import { searchCodeList } from '../../store/AuthContext.tsx';

// KakaoTalk-style colors
const COLORS = {
  primary: '#F47725',
  primaryLight: 'rgba(244, 119, 37, 0.1)',
  background: '#FFFFFF',
  surface: '#F7F7F7',
  text: '#000000',
  textSecondary: '#666666',
  textTertiary: '#999999',
  border: '#E6E6E6',
};

export default function SearchScreen(): React.JSX.Element {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { searchTerm, setSearchTerm, searchCode, setSearchCode } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [codeState, setCodeState] = useState(searchCodeList[0]);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  const goToScanBarcode = (code: string) => {
    navigation.navigate('BarcodeScanScreen', { code });
  };

  useFocusEffect(
    useCallback(() => {
      // 화면이 포커스될 때마다 searchTerm을 초기화
      setSearchTerm({ sktbarcode: '', serial: '' });
      setSearchCode(searchCodeList[0]);
      setCodeState(searchCodeList[0]);
      setSearchQuery('');
    }, [setSearchTerm, setSearchCode]),
  );

  useEffect(() => {
    if (searchTerm.sktbarcode || searchTerm.serial) {
      setSearchQuery(
        codeState.value === '1' ? searchTerm.sktbarcode : searchTerm.serial,
      );
    }
  }, [searchTerm, codeState]);

  const handleSearch = (
    query: string,
    code_val: string,
    code_label: string,
  ) => {
    if (!query.trim()) {
      showSnackbar('검색어를 입력해주세요.');
      return;
    }

    // AuthContext에 검색 코드 설정
    setSearchCode({ label: code_label, value: code_val });

    // AuthContext에 검색어 설정
    if (code_val === '1') {
      setSearchTerm({ sktbarcode: query, serial: '' });
    } else {
      setSearchTerm({ sktbarcode: '', serial: query });
    }

    try {
      // SearchResultScreen으로 네비게이션
      navigation.navigate('SearchStack');
    } catch (error) {
      console.error('Navigation error:', error);
      showSnackbar('검색 중 오류가 발생했습니다.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={
        Platform.OS === 'ios' ? verticalScale(80) : verticalScale(40)
      }
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <Surface style={styles.container}>
          <Appbar.Header style={styles.appbar}>
            <Appbar.Content
              title="바코드 검색"
              titleStyle={styles.appbarTitle}
            />
          </Appbar.Header>

          <View style={styles.content}>
            {/* Header */}
            {/*<View style={styles.headerContainer}>*/}
            {/*  <Text variant="headlineLarge" style={styles.headerText}>*/}
            {/*    중계기{' '}*/}
            {/*    <Text*/}
            {/*      variant="headlineLarge"*/}
            {/*      style={{ color: 'grey', fontWeight: 'bold' }}*/}
            {/*    >*/}
            {/*      유니트 검색*/}
            {/*    </Text>*/}
            {/*  </Text>*/}
            {/*</View>*/}

            {/* Search Type Selector */}
            <View style={styles.segmentContainer}>
              <SegmentedButtons
                buttons={searchCodeList.map(item => ({
                  value: item.value,
                  label: item.label,
                  style: [
                    styles.segmentButton,
                    codeState.value === item.value &&
                      styles.segmentButtonSelected,
                  ],
                  labelStyle: [
                    styles.segmentLabel,
                    codeState.value === item.value &&
                      styles.segmentLabelSelected,
                  ],
                }))}
                value={codeState.value}
                onValueChange={(val: string) => {
                  const selectedItem = searchCodeList.find(
                    item => item.value === val,
                  );
                  if (selectedItem) {
                    setCodeState(selectedItem);
                    setSearchQuery('');
                  }
                }}
                theme={{
                  colors: {
                    primary: COLORS.primary,
                    onPrimary: COLORS.background,
                    secondaryContainer: 'transparent',
                    onSecondaryContainer: COLORS.textSecondary,
                  },
                }}
              />
            </View>

            {/* Search Input */}
            <View style={styles.inputContainer}>
              <View style={styles.searchInputWrapper}>
                <View style={styles.searchInputContainer}>
                  <Icon
                    name="magnify"
                    size={scale(20)}
                    color={COLORS.textSecondary}
                    style={styles.searchIcon}
                  />
                  <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder={`${codeState.label}를 입력하세요`}
                    style={styles.searchInput}
                    mode="flat"
                    underlineColor="transparent"
                    activeUnderlineColor="transparent"
                    placeholderTextColor={COLORS.textSecondary}
                    textColor={COLORS.text}
                    theme={{
                      colors: {
                        onSurfaceVariant: COLORS.textSecondary,
                        onSurface: COLORS.text,
                        primary: COLORS.primary,
                        outline: COLORS.primary,
                      },
                    }}
                    cursorColor={COLORS.primary}
                    selectionColor={COLORS.primary}
                    onSubmitEditing={() =>
                      handleSearch(
                        searchQuery,
                        codeState.value,
                        codeState.label,
                      )
                    }
                  />
                  <TouchableOpacity
                    onPress={() => goToScanBarcode(codeState.value)}
                    style={styles.scanButton}
                  >
                    <Icon
                      name={
                        codeState.value === '1' ? 'qrcode-scan' : 'barcode-scan'
                      }
                      size={scale(24)}
                      color={COLORS.primary}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Search Instructions */}
            <View style={styles.instructionsContainer}>
              <Text variant="bodyMedium" style={styles.instructionsText}>
                {codeState.value === '1'
                  ? 'SKT바코드를 입력하거나 스캔 버튼을 눌러주세요'
                  : '제조사S/N을 입력하거나 스캔 버튼을 눌러주세요'}
              </Text>
            </View>
          </View>

          <Snackbar
            visible={snackbarVisible}
            onDismiss={() => setSnackbarVisible(false)}
            duration={3000}
            style={styles.snackbar}
            theme={{ colors: { primary: COLORS.primary } }}
            action={{
              label: '확인',
              labelStyle: { color: COLORS.primary },
              onPress: () => setSnackbarVisible(false),
            }}
          >
            <Text style={styles.snackbarText}>{snackbarMessage}</Text>
          </Snackbar>
        </Surface>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  appbar: {
    backgroundColor: COLORS.background,
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  appbarTitle: {
    color: COLORS.text,
    fontWeight: '800',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    backgroundColor: COLORS.surface,
    paddingHorizontal: scale(20),
    paddingTop:
      Platform.OS === 'android' ? verticalScale(20) : verticalScale(10),
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: verticalScale(50),
  },
  headerText: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  segmentContainer: {
    marginVertical: verticalScale(10),
  },
  segmentButton: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    borderRadius: 0,
    marginHorizontal: scale(16),
  },
  segmentButtonSelected: {
    borderBottomColor: COLORS.primary,
  },
  segmentLabel: {
    color: COLORS.textSecondary,
    fontSize: scale(16),
    paddingVertical: verticalScale(8),
  },
  segmentLabelSelected: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  inputContainer: {
    marginVertical: verticalScale(20),
  },
  searchInputWrapper: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: scale(25),
    backgroundColor: COLORS.background,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
  },
  searchIcon: {
    marginRight: scale(12),
  },
  searchInput: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  scanButton: {
    padding: scale(8),
    borderRadius: scale(20),
    backgroundColor: COLORS.primaryLight,
    marginLeft: scale(12),
  },
  instructionsContainer: {
    alignItems: 'center',
    marginTop: verticalScale(10),
  },
  instructionsText: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  snackbar: {
    backgroundColor: COLORS.text,
    marginBottom: verticalScale(20),
  },
  snackbarText: {
    color: COLORS.background,
  },
});
