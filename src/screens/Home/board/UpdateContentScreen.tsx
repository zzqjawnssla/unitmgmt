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

import { List, TextInput, Text, Button, Snackbar, Surface, Appbar } from 'react-native-paper';
import { scale, verticalScale } from 'react-native-size-matters';

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../../store/AuthContext.tsx';
import { HomeStackParamList } from '../../../navigation/RootStackNavigation.tsx';
import { useRoute } from '@react-navigation/native';

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
        setShowModal(true);
        return true; // 기본 동작 막기
      };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription?.remove();
    }, []),
  );

  // 네비게이션(헤더 뒤로가기 등) 처리
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', e => {
      if (!showModal) {
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
        <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title="게시글 수정" />
        </Appbar.Header>
        
        <KeyboardAvoidingView style={styles.container}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.container}>
                <View style={styles.section}>
                  <Text variant="titleMedium" style={styles.label}>
                    제목
                  </Text>
                  <TextInput
                    value={title}
                    onChangeText={text => setTitle(text)}
                    mode={'outlined'}
                    returnKeyType={'go'}
                    onSubmitEditing={() => bodyInputRef.current?.focus()}
                    style={styles.textInput}
                  />
                </View>
                <View style={styles.section}>
                  <Text variant="titleMedium" style={styles.label}>
                    게시글 타입
                  </Text>
                  <List.AccordionGroup
                    expandedId={expanded}
                    onAccordionPress={id =>
                      setExpanded(id === expanded ? null : id)
                    }
                  >
                    <List.Accordion
                      title={
                        <Text
                          variant="titleMedium"
                          style={{
                            fontWeight: 'bold',
                            color: 'black',
                          }}
                        >
                          {selectedBoardType.name}
                        </Text>
                      }
                      id="boardType"
                      style={styles.accordion}
                    >
                      {BoardTypeList.map((item, index) => (
                        <List.Item
                          key={index}
                          title={
                            <Text
                              variant="titleMedium"
                              style={{ fontWeight: 'bold' }}
                            >
                              {item.name}
                            </Text>
                          }
                          onPress={() => changeBoardType(item)}
                        />
                      ))}
                    </List.Accordion>
                  </List.AccordionGroup>
                </View>

                <View>
                  <Text variant="titleMedium" style={styles.label}>
                    내용
                  </Text>
                  <TextInput
                    value={content}
                    onChangeText={text => setContent(text)}
                    returnKeyType={'default'}
                    multiline={true}
                    style={styles.contentInput}
                    mode={'outlined'}
                    ref={bodyInputRef}
                  />
                </View>
                <View style={styles.attachmentSection}>
                  <Text variant="titleMedium" style={styles.label}>
                    첨부 파일
                  </Text>
                  <View style={styles.attachmentBox}>
                    <Text variant="bodyMedium" style={styles.attachmentText}>
                      모바일에서는 파일 첨부가 불가능합니다.
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          </TouchableWithoutFeedback>
          <View style={styles.buttonContainer}>
            <Button mode="contained" onPress={handleSubmit}>
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
              <Text variant="titleMedium">작성 중인 내용이 있습니다.</Text>
            </View>
            <View style={styles.contentBody}>
              <Text variant="bodyMedium">정말 나가시겠습니까?</Text>
            </View>
            <View style={styles.contentFooter}>
              <TouchableOpacity
                onPress={handleCancelLeave}
                style={styles.modalButton}
              >
                <Text variant="bodyMedium">취소</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleConfirmLeave}>
                <Text variant="bodyMedium" style={styles.modalButtonText}>
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
      >
        {snackbarMessage}
      </Snackbar>
    </>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    marginTop: verticalScale(1),
  },
  section: {
    marginBottom: verticalScale(2),
  },
  label: {
    marginBottom: verticalScale(1),
    paddingHorizontal: scale(1),
    color: 'grey',
    fontWeight: 'bold',
  },
  textInput: {
    backgroundColor: 'white',
    fontSize: scale(2.2),
  },
  accordion: {
    backgroundColor: 'white',
    borderColor: '#000000',
    borderWidth: 0.5,
    borderRadius: 5,
    height: verticalScale(6),
    marginBottom: verticalScale(0.5),
  },
  contentInput: {
    minHeight: verticalScale(40),
    fontSize: scale(2.2),
    paddingVertical: verticalScale(1),
    backgroundColor: 'white',
  },
  attachmentSection: {
    marginTop: verticalScale(2),
  },
  attachmentBox: {
    backgroundColor: '#f0f0f0',
    borderColor: 'grey',
    borderWidth: 1,
    borderRadius: 5,
    borderStyle: 'dashed',
    padding: scale(5),
  },
  attachmentText: {
    textAlign: 'center',
    color: 'grey',
    fontWeight: 'bold',
  },
  buttonContainer: {
    paddingVertical: verticalScale(2),
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: scale(90),
    padding: scale(5),
    backgroundColor: 'white',
    borderRadius: 10,
  },
  contentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contentBody: {
    marginTop: verticalScale(1),
  },
  contentFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: verticalScale(3),
  },
  modalButton: {
    marginRight: scale(8),
  },
  modalButtonText: {
    fontWeight: 'bold',
  },
});