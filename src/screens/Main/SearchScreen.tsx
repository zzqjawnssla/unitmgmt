import React, { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  View,
  StyleSheet,
} from 'react-native';
import {
  Text,
  SegmentedButtons,
  TextInput,
  Surface,
  Snackbar,
} from 'react-native-paper';
import { scale, verticalScale } from 'react-native-size-matters';
import {
  NavigationProp,
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/RootStackNavigation.tsx';
import { useAuth } from '../../store/AuthContext.tsx';
import { searchCodeList } from '../../store/AuthContext.tsx';

// Brand Colors
const BRAND_COLORS = {
  primary: '#F47725',
  background: '#FCFCFC',
  surface: '#FFFFFF',
  textSecondary: '#666666',
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
          {/* Header */}
          <View style={styles.headerContainer}>
            <Text variant="headlineLarge" style={styles.headerText}>
              중계기{' '}
              <Text
                variant="headlineLarge"
                style={{ color: 'grey', fontWeight: 'bold' }}
              >
                유니트 검색
              </Text>
            </Text>
          </View>

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
                  codeState.value === item.value && styles.segmentLabelSelected,
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
              style={styles.segmentedButtons}
            />
          </View>

          {/* Search Input */}
          <View style={styles.inputContainer}>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={`${codeState.label}를 입력하세요`}
              style={styles.textInput}
              mode="outlined"
              outlineStyle={styles.inputOutline}
              activeOutlineColor={BRAND_COLORS.primary}
              returnKeyType="search"
              left={
                <TextInput.Icon
                  icon="magnify"
                  size={scale(20)}
                  style={styles.leftIcon}
                />
              }
              right={
                <TextInput.Icon
                  icon={
                    codeState.value === '1' ? 'qrcode-scan' : 'barcode-scan'
                  }
                  style={styles.rightIcon}
                  size={scale(24)}
                  onPress={() => goToScanBarcode(codeState.value)}
                />
              }
              onSubmitEditing={() =>
                handleSearch(searchQuery, codeState.value, codeState.label)
              }
            />
          </View>

          {/* Search Instructions */}
          <View style={styles.instructionsContainer}>
            <Text variant="bodyMedium" style={styles.instructionsText}>
              {codeState.value === '1'
                ? 'SKT바코드를 입력하거나 스캔 버튼을 눌러주세요'
                : '제조사S/N을 입력하거나 스캔 버튼을 눌러주세요'}
            </Text>
          </View>

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
    backgroundColor: BRAND_COLORS.background,
    paddingHorizontal: scale(20),
    paddingTop:
      Platform.OS === 'android' ? verticalScale(40) : verticalScale(20),
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: verticalScale(50),
  },
  headerText: {
    color: BRAND_COLORS.primary,
    fontWeight: 'bold',
  },
  segmentContainer: {
    marginVertical: verticalScale(10),
  },
  segmentedButtons: {
    backgroundColor: 'transparent',
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
    borderBottomColor: BRAND_COLORS.primary,
  },
  segmentLabel: {
    color: BRAND_COLORS.textSecondary,
    fontSize: scale(16),
    paddingVertical: verticalScale(8),
  },
  segmentLabelSelected: {
    color: BRAND_COLORS.primary,
    fontWeight: 'bold',
  },
  inputContainer: {
    marginVertical: verticalScale(20),
  },
  textInput: {
    backgroundColor: 'transparent',
    fontSize: scale(16),
  },
  inputOutline: {
    borderRadius: scale(25),
    borderWidth: 1.5,
  },
  leftIcon: {
    marginLeft: scale(10),
  },
  rightIcon: {
    backgroundColor: '#F0F0F0',
    marginRight: scale(10),
    borderRadius: scale(20),
  },
  instructionsContainer: {
    alignItems: 'center',
    marginTop: verticalScale(10),
  },
  instructionsText: {
    color: BRAND_COLORS.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});