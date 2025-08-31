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
import { Button, Surface, Snackbar } from 'react-native-paper';
import { SelectUnitType } from './SelectUnitType.tsx';

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
              <Surface style={styles.modalContent}>
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

                <View style={styles.buttonContainer}>
                  <Button
                    mode="contained"
                    onPress={handleConfirm}
                    style={styles.confirmButton}
                  >
                    적용
                  </Button>
                </View>
              </Surface>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        유니트명을 선택해주세요.
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
    width: scale(320),
    height: '80%',
    borderRadius: scale(12),
    backgroundColor: '#FFFFFF',
    elevation: 5,
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(20),
    paddingBottom: verticalScale(10),
  },
  buttonContainer: {
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(20),
    paddingTop: verticalScale(16),
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  confirmButton: {
    backgroundColor: '#F47725',
  },
});
