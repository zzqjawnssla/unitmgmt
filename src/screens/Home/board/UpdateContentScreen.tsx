import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  View,
  Keyboard,
  TouchableWithoutFeedback,
  BackHandler,
  TouchableOpacity,
  Modal,
} from 'react-native';

import {
  TextInput,
  Text,
  Button,
  Snackbar,
  Surface,
  Appbar,
} from 'react-native-paper';
import { scale, verticalScale } from 'react-native-size-matters';

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../../store/AuthContext.tsx';
import { HomeStackParamList } from '../../../navigation/RootStackNavigation.tsx';
import { useRoute } from '@react-navigation/native';

// KakaoTalk-style colors
const COLORS = {
  primary: '#F47725',
  primaryLight: 'rgba(244, 119, 37, 0.1)',
  background: '#FFFFFF',
  surface: '#F9F9F9',
  text: '#000000',
  textSecondary: '#666666',
  textTertiary: '#999999',
  border: '#E0E0E0',
  divider: '#F0F0F0',
};

const BoardTypeList = [
  { id: 1, name: '공지' },
  { id: 2, name: 'Q&A' },
  { id: 3, name: '사례' },
];

export const UpdateContentScreen: React.FC = () => {
  const { user } = useAuth();
  const route = useRoute();
  const sampleData = route.params.sampleData;

  console.log('sampleData', sampleData.title);
  console.log('sampleData', sampleData.title);

  const bodyInputRef = useRef<any>(null);
  const navigation =
    useNavigation<NativeStackNavigationProp<HomeStackParamList>>();

  const [showModal, setShowModal] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const [selectedBoardType, setSelectedBoardType] = useState(
    sampleData.type
      ? BoardTypeList.find(item => item.name === sampleData.type)
      : BoardTypeList[0],
  );
  const [title, setTitle] = useState(sampleData.title);
  const [content, setContent] = useState(sampleData.content);

  console.log('selectedBoardType', selectedBoardType);
  console.log('title', title);
  console.log('content', content);

  // 뒤로가기(하드웨어) 처리
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (title || content) {
          setShowModal(true);
          return true;
        }
        return false;
      };
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress,
      );
      return () => subscription?.remove();
    }, [title, content]),
  );

  // 네비게이션(헤더 뒤로가기 등) 처리
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', e => {
      if (!showModal && (title || content)) {
        e.preventDefault();
        setShowModal(true);
      }
    });
    return unsubscribe;
  }, [navigation, showModal]);

  const handleConfirmLeave = () => {
    setShowModal(false);
    navigation.goBack();
  };

  const handleCancelLeave = () => {
    setShowModal(false);
  };

  const [expanded, setExpanded] = useState<string | null>(null);

  const changeBoardType = (item: any) => {
    setSelectedBoardType({ id: item.id, name: item.name });
    setExpanded(null);
  };

  const handleSubmit = () => {
    const data = {
      title: title,
      content: content,
      type: selectedBoardType.name,
    };

    try {
      Keyboard.dismiss();
      console.log('Submit data', data);
      setSnackbarMessage('게시글이 수정되었습니다.');
      setSnackbarVisible(true);
      setTimeout(() => navigation.goBack(), 1000);
    } catch (e) {
      console.log(e);
      setSnackbarMessage('게시글 수정에 실패했습니다.');
      setSnackbarVisible(true);
    }
  };

  return (
    <>
      <Surface style={styles.screenContainer}>
        <Appbar.Header style={styles.appbar}>
          <Appbar.BackAction
            onPress={() => navigation.goBack()}
            iconColor={COLORS.text}
          />
          <Appbar.Content title="게시글 수정" titleStyle={styles.appbarTitle} />
        </Appbar.Header>

        <KeyboardAvoidingView style={styles.container}>
          <TouchableWithoutFeedback
            onPress={Keyboard.dismiss}
            accessible={false}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
            >
              <View style={styles.formContainer}>
                <View style={styles.section}>
                  <Text style={styles.label}>제목</Text>
                  <TextInput
                    value={title}
                    onChangeText={text => setTitle(text)}
                    mode="outlined"
                    returnKeyType="go"
                    onSubmitEditing={() => bodyInputRef.current?.focus()}
                    style={styles.textInput}
                    textColor={COLORS.text}
                    theme={{
                      colors: {
                        primary: COLORS.primary,
                        outline: COLORS.border,
                      },
                    }}
                  />
                </View>
                <View style={styles.section}>
                  <Text style={styles.label}>게시글 타입</Text>
                  <TouchableOpacity
                    style={styles.typeSelector}
                    onPress={() => setExpanded(expanded ? null : 'boardType')}
                  >
                    <Text style={styles.typeSelectorText}>
                      {selectedBoardType.name}
                    </Text>
                    <Text style={styles.typeSelectorIcon}>
                      {expanded ? '▲' : '▼'}
                    </Text>
                  </TouchableOpacity>

                  {expanded && (
                    <View style={styles.typeOptions}>
                      {BoardTypeList.map((item, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.typeOption}
                          onPress={() => changeBoardType(item)}
                        >
                          <Text style={styles.typeOptionText}>{item.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                <View style={styles.section}>
                  <Text style={styles.label}>내용</Text>
                  <TextInput
                    value={content}
                    onChangeText={text => setContent(text)}
                    returnKeyType="default"
                    multiline={true}
                    style={styles.contentInput}
                    mode="outlined"
                    ref={bodyInputRef}
                    textColor={COLORS.text}
                    theme={{
                      colors: {
                        primary: COLORS.primary,
                        outline: COLORS.border,
                      },
                    }}
                  />
                </View>
                <View style={styles.attachmentSection}>
                  <Text style={styles.label}>첨부 파일</Text>
                  <View style={styles.attachmentBox}>
                    <Text style={styles.attachmentText}>
                      모바일에서는 파일 첨부가 불가능합니다.
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          </TouchableWithoutFeedback>
          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={handleSubmit}
              style={styles.submitButton}
              buttonColor={COLORS.primary}
              labelStyle={styles.submitButtonText}
            >
              수정 완료
            </Button>
          </View>
        </KeyboardAvoidingView>
      </Surface>

      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={handleCancelLeave}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.contentHeader}>
              <Text style={styles.modalTitle}>작성 중인 내용이 있습니다.</Text>
            </View>
            <View style={styles.contentBody}>
              <Text style={styles.modalText}>정말 나가시겠습니까?</Text>
            </View>
            <View style={styles.contentFooter}>
              <TouchableOpacity
                onPress={handleCancelLeave}
                style={styles.modalButton}
              >
                <Text style={styles.modalButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleConfirmLeave}>
                <Text
                  style={[styles.modalButtonText, styles.modalButtonPrimary]}
                >
                  나가기
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
    </>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
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
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  scrollContent: {
    paddingBottom: verticalScale(20),
  },
  formContainer: {
    padding: scale(20),
  },
  section: {
    marginBottom: verticalScale(20),
  },
  label: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: verticalScale(8),
  },
  textInput: {
    backgroundColor: COLORS.background,
    fontSize: scale(16),
  },
  typeSelector: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: scale(8),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeSelectorText: {
    fontSize: scale(16),
    color: COLORS.text,
  },
  typeSelectorIcon: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
  },
  typeOptions: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: scale(8),
    marginTop: verticalScale(8),
    overflow: 'hidden',
  },
  typeOption: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  typeOptionText: {
    fontSize: scale(16),
    color: COLORS.text,
  },
  contentInput: {
    backgroundColor: COLORS.background,
    fontSize: scale(16),
    minHeight: verticalScale(120),
    textAlignVertical: 'top',
  },
  attachmentSection: {
    marginTop: verticalScale(10),
  },
  attachmentBox: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: scale(8),
    borderStyle: 'dashed',
    padding: scale(20),
  },
  attachmentText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: scale(14),
  },
  buttonContainer: {
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(16),
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: scale(8),
  },
  submitButtonText: {
    fontSize: scale(16),
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: scale(280),
    padding: scale(24),
    backgroundColor: COLORS.background,
    borderRadius: scale(12),
    marginHorizontal: scale(20),
  },
  contentHeader: {
    marginBottom: verticalScale(16),
  },
  modalTitle: {
    fontSize: scale(18),
    fontWeight: '600',
    color: COLORS.text,
  },
  contentBody: {
    marginBottom: verticalScale(24),
  },
  modalText: {
    fontSize: scale(16),
    color: COLORS.textSecondary,
  },
  contentFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: scale(16),
  },
  modalButton: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
  },
  modalButtonText: {
    fontSize: scale(16),
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  modalButtonPrimary: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  snackbar: {
    backgroundColor: COLORS.text,
    marginBottom: verticalScale(20),
  },
  snackbarText: {
    color: COLORS.background,
  },
});
