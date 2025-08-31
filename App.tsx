/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

// import { NewAppScreen } from '@react-native/new-app-screen';
import { StatusBar, StyleSheet, useColorScheme, View } from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RootNavigation from './src/navigation/RootStackNavigation';
import { AuthContextProvider } from './src/store/AuthContext.tsx';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
      staleTime: 15 * 60 * 1000, // 15 minutes default
      gcTime: 60 * 60 * 1000, // 1 hour cache retention
      refetchOnWindowFocus: false, // Disable refetch on window focus for mobile
      refetchOnReconnect: true, // Refetch when network reconnects
    },
  },
});

if (__DEV__) {
  require('./ReactotronConfig');
}

function App() {
  const isDarkMode = useColorScheme() === 'dark';

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
      {/*<NewAppScreen*/}
      {/*  templateFileName="App.tsx"*/}
      {/*  safeAreaInsets={safeAreaInsets}*/}
      {/*/>*/}
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
