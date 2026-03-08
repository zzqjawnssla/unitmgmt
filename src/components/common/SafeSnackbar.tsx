import React from 'react';
import { Snackbar, SnackbarProps } from 'react-native-paper';

/**
 * SafeSnackbar - Snackbar wrapper that only renders when visible.
 *
 * Workaround for react-native-paper Snackbar causing
 * "Layout: -1 < 0" crash on Samsung tablets with Fabric/New Architecture.
 * The crash occurs because Snackbar performs text layout measurement
 * even when hidden (visible=false).
 */
export const SafeSnackbar: React.FC<SnackbarProps> = (props) => {
  if (!props.visible) {
    return null;
  }

  return <Snackbar {...props} />;
};
