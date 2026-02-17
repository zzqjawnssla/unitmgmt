import React, { useEffect } from 'react';
import {
  AppState,
  AppStateStatus,
  StatusBar,
  StyleSheet,
  useColorScheme,
  View,
  Platform,
} from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ScreenshotPrevent from 'react-native-screenshot-prevent';
import RootNavigation from './src/navigation/RootStackNavigation';
import { AuthContextProvider } from './src/store/AuthContext.tsx';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 15 * 60 * 1000,
      gcTime: 60 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});

if (__DEV__) {
  require('./ReactotronConfig');
}

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const envMode = process.env.ENV_MODE;

  useEffect(() => {
    // 프로덕션 환경에서만 스크린샷 방지 활성화
    if (Platform.OS === 'ios' && envMode === 'prd') {
      try {
        ScreenshotPrevent.enableSecureView();
        console.log(
          'Screenshot protemction enabled for production environment',
        );
      } catch (error) {
        console.error('Failed to enable screenshot protection:', error);
      }
    } else if (Platform.OS === 'ios' && envMode === 'dev') {
      console.log('Screenshot protection disabled for development environment');
    }
  }, [envMode]);

  useEffect(() => {
    // 앱 상태 변화 감지 (프로덕션에서만)
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        nextAppState === 'active' &&
        Platform.OS === 'ios' &&
        envMode === 'prd'
      ) {
        try {
          ScreenshotPrevent.enableSecureView();
          console.log('Screenshot protection re-enabled on app activation');
        } catch (error) {
          console.error('Failed to re-enable screenshot protection:', error);
        }
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );

    return () => subscription?.remove();
  }, [envMode]);

  return (
    <PaperProvider>
      <SafeAreaProvider>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <AppContent />
      </SafeAreaProvider>
    </PaperProvider>
  );
}

function AppContent() {
  const safeAreaInsets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <QueryClientProvider client={queryClient}>
        <AuthContextProvider>
          <RootNavigation />
        </AuthContextProvider>
      </QueryClientProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
