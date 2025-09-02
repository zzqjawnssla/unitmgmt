import {
  Modal,
  StyleSheet,
  View,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from 'react-native';
import React, { useState } from 'react';
import { scale, verticalScale } from 'react-native-size-matters';
import { Button, Surface, Snackbar, Text } from 'react-native-paper';
import { SelectUnitType } from './SelectUnitType.tsx';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

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

interface SearchOptionModalProps {
  isVisible: boolean;
  onClose: () => void;
  detailType: { key: string; value: string };
  setManufacturer: React.Dispatch<
    React.SetStateAction<{ value: string; label: string }>
  >;
  setMainType: React.Dispatch<
    React.SetStateAction<{ value: string; label: string }>
  >;
  setSubType: React.Dispatch<
    React.SetStateAction<{ id: string; typename: string }>
  >;
  setDetailType: React.Dispatch<
    React.SetStateAction<{ key: string; value: string }>
  >;
}

export const SelectUnitModal: React.FC<SearchOptionModalProps> = ({
  isVisible,
  onClose,
  setManufacturer,
  setMainType,
  setSubType,
  detailType,
  setDetailType,
}) => {
  const [selectedManufacturer, setSelectedManufacturer] = useState({
    value: '',
    label: '',
  });

  const [selectedMainType, setSelectedMainType] = useState({
    value: '',
    label: '',
  });

  const [selectedSubType, setSelectedSubType] = useState({
    id: '',
    typename: '',
  });

  const [selectedDetailType, setSelectedDetailType] = useState({
    key: '',
    value: '',
  });

  const [snackbarVisible, setSnackbarVisible] = useState(false);

  const showSnackbar = () => {
    setSnackbarVisible(true);
  };

  const handleConfirm = () => {
    if (selectedDetailType.value === '') {
      showSnackbar();
      return;
    }

    setManufacturer(selectedManufacturer);
    setMainType(selectedMainType);
    setSubType(selectedSubType);
    setDetailType(selectedDetailType);

    onClose();
  };

  return (
    <>
      <Modal animationType="slide" transparent={true} visible={isVisible}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.modalContent}>
                {/* Header */}
                <View style={styles.header}>
                  <Text variant="titleMedium" style={styles.headerTitle}>
                    유니트 선택
                  </Text>
                  <TouchableWithoutFeedback onPress={onClose}>
                    <View style={styles.closeButton}>
                      <MaterialIcons
                        name="close"
                        size={scale(24)}
                        color={COLORS.textSecondary}
                      />
                    </View>
                  </TouchableWithoutFeedback>
                </View>

                {/* Content */}
                <ScrollView
                  style={styles.scrollContainer}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled={true}
                >
                  <View style={styles.contentContainer}>
                    <SelectUnitType
                      selectedDetailType={selectedDetailType}
                      selectedManufacturer={selectedManufacturer}
                      selectedMainType={selectedMainType}
                      selectedSubType={selectedSubType}
                      setSelectedManufacturer={setSelectedManufacturer}
                      setSelectedDetailType={setSelectedDetailType}
                      setSelectedMainType={setSelectedMainType}
                      setSelectedSubType={setSelectedSubType}
                    />
                  </View>
                </ScrollView>

                {/* Footer */}
                <View style={styles.footer}>
                  <Button
                    mode="contained"
                    onPress={handleConfirm}
                    style={styles.confirmButton}
                    buttonColor={COLORS.primary}
                    labelStyle={styles.confirmButtonText}
                  >
                    적용
                  </Button>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
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
        <Text style={styles.snackbarText}>유니트명을 선택해주세요.</Text>
      </Snackbar>
    </>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: scale(340),
    height: '85%',
    borderRadius: scale(16),
    backgroundColor: COLORS.background,
    overflow: 'hidden',
  },
  header: {
    backgroundColor: COLORS.background,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(16),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    color: COLORS.text,
    fontWeight: '800',
  },
  closeButton: {
    padding: scale(8),
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(20),
    paddingBottom: verticalScale(20),
  },
  footer: {
    backgroundColor: COLORS.background,
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(16),
    paddingBottom: verticalScale(20),
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
    borderRadius: scale(8),
    minHeight: verticalScale(42),
    justifyContent: 'center',
  },
  confirmButtonText: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.background,
  },
  snackbar: {
    backgroundColor: COLORS.text,
    marginBottom: verticalScale(20),
  },
  snackbarText: {
    color: COLORS.background,
  },
});
