import React, { useState } from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Text, Button, Snackbar } from 'react-native-paper';
import { scale, verticalScale } from 'react-native-size-matters';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import type {
  HomeStackParamList,
  SearchStackParamList,
} from '../../navigation/RootStackNavigation';
import { useAuth } from '../../store/AuthContext';

// Brand Colors
const BRAND_COLORS = {
  primary: '#F47725',
  background: '#FCFCFC',
  surface: '#FFFFFF',
  text: '#000000',
  textSecondary: '#666666',
  disabled: '#CCCCCC',
  light: 'rgba(244, 119, 37, 0.1)',
};

interface ActionButtonsProps {
  result: any;
}

type ButtonMap = {
  [key: string]: string[];
};

// Action type mapping to determine which actions are available
const actionTypeMapping: { [key: string]: string } = {
  '창고 출고': 'release',
  '창고 입고': 'incoming',
  장착: 'mounting',
  탈장: 'unmounting',
  '수리 출고': 'repair_release',
};

export const ActionButtons: React.FC<ActionButtonsProps> = ({ result }) => {
  const navigation =
    useNavigation<NavigationProp<HomeStackParamList & SearchStackParamList>>();
  const { user } = useAuth();
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  // Define available actions based on current unit movement status
  const buttonMap: ButtonMap = {
    창고출고: ['창고 입고', '장착', '수리 출고'],
    창고입고: ['창고 출고', '수리 출고'],
    장착: ['탈장'],
    탈장: ['창고 입고', '장착', '수리 출고'],
    수리출고: ['창고 입고'],
    대기: ['창고 출고', '창고 입고', '장착', '탈장', '수리 출고'],
  };

  const navigateToUseUnitScreen = (actionText: string) => {
    const actionType = actionTypeMapping[actionText];
    if (actionType) {
      // Navigate to UseUnitScreen with the action type preset
      navigation.navigate('UseUnitScreen', {
        result,
        initialActionType: actionType,
      });
    } else {
      console.warn('Unknown action type:', actionText);
    }
  };

  const getAvailableButtons = (): string[] => {
    const currentMovement = result?.last_manage_history?.unit_movement;
    return (
      buttonMap[currentMovement] || [
        '잘못 된 상태의 유니트 입니다.\n 관리자에게 문의 주세요.',
      ]
    );
  };

  const shouldShowRentalButton = (): boolean => {
    const location = result?.last_manage_history?.location;
    const warehouseManageTeam =
      result?.last_manage_history?.location_context_instance?.warehouse_manage_team;
    return location === '창고' && warehouseManageTeam !== user?.team;
  };

  const availableButtons = getAvailableButtons();

  // Handle error case
  if (
    availableButtons.length === 1 &&
    availableButtons[0].includes('잘못 된 상태')
  ) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text variant="bodyMedium" style={styles.errorText}>
            {availableButtons[0]}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/*<Text variant="titleMedium" style={styles.sectionTitle}>*/}
      {/*  사용 가능한 작업*/}
      {/*</Text>*/}

      {availableButtons.map((buttonText: string, index: number) => (
        <Button
          key={index}
          mode="contained"
          // onPress={() => navigateToUseUnitScreen(buttonText)}
          onPress={() => setSnackbarVisible(true)}
          style={[
            styles.actionButton,
            { backgroundColor: BRAND_COLORS.disabled },
          ]}
          labelStyle={styles.actionButtonText}
        >
          {buttonText}
        </Button>
      ))}

      {shouldShowRentalButton() && (
        <Button
          mode="contained"
          onPress={() => navigation.navigate('RequestCreateScreen', { result })}
          style={[
            styles.actionButton,
            { backgroundColor: BRAND_COLORS.primary },
          ]}
          labelStyle={styles.actionButtonText}
        >
          대여 요청
        </Button>
      )}

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={2000}
        style={styles.snackbar}
        theme={{ colors: { primary: BRAND_COLORS.primary } }}
      >
        <Text style={styles.snackbarText}>현재 비활성화된 기능입니다.</Text>
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: verticalScale(6),
    paddingHorizontal: scale(10),
    paddingBottom: verticalScale(16),
  },
  sectionTitle: {
    marginBottom: verticalScale(12),
    fontWeight: 'bold',
    color: BRAND_COLORS.textSecondary,
  },
  actionButton: {
    marginVertical: verticalScale(4),
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: scale(16),
    fontWeight: 'bold',
    paddingVertical: verticalScale(4),
    color: BRAND_COLORS.background,
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: scale(16),
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  errorText: {
    textAlign: 'center',
    color: '#C62828',
    fontWeight: 'bold',
  },
  snackbar: {
    backgroundColor: BRAND_COLORS.text,
    marginBottom: verticalScale(20),
    width: '100%',
  },
  snackbarText: {
    color: BRAND_COLORS.background,
  },
});
