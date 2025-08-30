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
import { LoginScreen } from './src/screens/Intro/LoginScreen.tsx';
import { AuthContextProvider } from './src/store/AuthContext.tsx';

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
      <AuthContextProvider>
        <LoginScreen />
      </AuthContextProvider>
      {/*<Security/>*/}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
