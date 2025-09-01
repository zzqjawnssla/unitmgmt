import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, Surface } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { scale, verticalScale } from 'react-native-size-matters';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Screens
import { LoginScreen } from '../screens/Intro/LoginScreen';
import Security from '../screens/Intro/Security';
import UpdateCheckScreen from '../screens/Intro/UpdateCheckScreen';
import InitializationScreen from '../screens/Intro/InitializationScreen';

// Main App Screens
import HomeScreen from '../screens/Main/HomeScreen';
import ServiceScreen from '../screens/Main/ServiceScreen';
import SearchScreen from '../screens/Main/SearchScreen';
import TransScreen from '../screens/Main/TransScreen';
import UserinfoScreen from '../screens/Main/UserinfoScreen';

// Service Screens
import SearchUnitCountScreen from '../screens/Service/SearchUnitCount/SearchUnitCountScreen';
import { DetailUnitCountScreen } from '../screens/Service/SearchUnitCount/DetailUnitCountScreen';

// Search Screens
import { SearchResultScreen } from '../screens/Search/SearchResultScreen';
import { UseUnitScreen } from '../screens/Search/UseUnitScreen';

// Common Components
import { BarcodeScanScreen } from '../components/common/BarcodeScanScreen';

// Home Board Screens
import BoardListScreen from '../screens/Home/board/BoardListScreen';
import DetailContentScreen from '../screens/Home/board/DetailContentScreen';
import { CreateContentScreen } from '../screens/Home/board/CreateContentsScreen';
import { UpdateContentScreen } from '../screens/Home/board/UpdateContentScreen';

// UserInfo Screens
import ChangeUserInfoScreen from '../screens/UserInfo/ChangeUserInfoScreen';
import MailBoxScreen from '../screens/UserInfo/MailBoxScreen';
import MyUnitListScreen from '../screens/UserInfo/MyUnitListScreen';

import { useAuth } from '../store/AuthContext.tsx';

// Navigation Types
export type RootStackParamList = {
  IntroStack: undefined;
  MainTabs: undefined;
  HomeStack: {
    screen: keyof HomeStackParamList;
    params?: HomeStackParamList[keyof HomeStackParamList];
  };
  ServiceStack: undefined;
  SearchStack: undefined;
  TransStack: undefined;
  UserinfoStack: {
    screen: keyof UserinfoStackParamList;
    params?: UserinfoStackParamList[keyof UserinfoStackParamList];
  };
  BarcodeScanScreen: {
    code: string;
  };
};

export type IntroStackParamList = {
  Initialization: undefined;
  Login: undefined;
  Security: {
    issues: string[];
    hasError: boolean;
    hasWarning: boolean;
    overall: string;
    showRejectScreen?: boolean;
  };
  UpdateCheck: {
    updateInfo: any;
  };
};

export type MainTabParamList = {
  HomeMain: undefined;
  ServiceMain: undefined;
  SearchMain: undefined;
  TransMain: undefined;
  UserinfoMain: undefined;
};

export type HomeStackParamList = {
  BoardListScreen: {
    boardType: 'qna' | 'insight' | 'notice';
    title: string;
  };
  DetailContentScreen: {
    boardType: 'qna' | 'insight' | 'notice';
    postId: string;
    title: string;
  };
  CreateContentScreen: undefined;
  UpdateContentScreen: {
    sampleData: {
      title: string;
      content: string;
      type: string;
    };
  };
  UseUnitScreen: {
    result: any;
    initialActionType?: string;
  };
};

export type ServiceStackParamList = {
  SearchUnitCountScreen: undefined;
  DetailUnitCountScreen: {
    locationId: number | string;
    locationInstanceId: number;
    detailTypeId: number;
  };
};

export type SearchStackParamList = {
  SearchResult: undefined;
  UseUnitScreen: {
    result: any;
    initialActionType?: string;
  };
};

export type TransStackParamList = {};

export type UserinfoStackParamList = {
  ChangeUserInfoScreen: undefined;
  MailBoxScreen: undefined;
  MyUnitListScreen: undefined;
};

// Convenience type for navigation props
export type RootStackNavigationParams = HomeStackParamList;

const RootStack = createNativeStackNavigator<RootStackParamList>();
const IntroStack = createNativeStackNavigator<IntroStackParamList>();
const BottomTab = createBottomTabNavigator<MainTabParamList>();

// Stack navigators for each tab
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const ServiceStack = createNativeStackNavigator<ServiceStackParamList>();
const SearchStack = createNativeStackNavigator<SearchStackParamList>();
// const TransStack = createNativeStackNavigator<TransStackParamList>();
const UserinfoStack = createNativeStackNavigator<UserinfoStackParamList>();

// Brand Colors
const BRAND_COLORS = {
  primary: '#F47725',
  background: '#FFFFFF',
  surface: '#EFEFEF',
  textSecondary: '#666666',
};

// Safe Area aware Tab Bar Component
const SafeAreaTabBar = ({ state, descriptors, navigation }: any) => {
  const insets = useSafeAreaInsets();

  // 플랫폼별 탭 바 높이 조정
  const getTabBarHeight = () => {
    const baseHeight = verticalScale(30);
    if (Platform.OS === 'ios') {
      return baseHeight + verticalScale(10) + insets.bottom; // iOS: 더 큰 크기 + Safe Area
    } else {
      return (
        baseHeight +
        verticalScale(8) +
        Math.max(insets.bottom, verticalScale(5))
      ); // Android: 조금 큰 크기
    }
  };

  const getPaddingBottom = () => {
    if (Platform.OS === 'ios') {
      return Math.max(insets.bottom, verticalScale(5));
    } else {
      return Math.max(insets.bottom * 0.5, verticalScale(3));
    }
  };

  return (
    <View
      style={[
        customTabStyles.tabContainer,
        {
          height: getTabBarHeight(),
          paddingBottom: getPaddingBottom(),
        },
      ]}
    >
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={customTabStyles.tabButton}
            activeOpacity={0.7}
          >
            <View style={customTabStyles.iconContainer}>
              {options.tabBarIcon &&
                options.tabBarIcon({
                  focused: isFocused,
                  color: isFocused
                    ? BRAND_COLORS.primary
                    : BRAND_COLORS.textSecondary,
                  size: route.name === 'Search' ? 40 : 28,
                })}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// Wrapper function for tab bar
const CustomBottomTabBar = (props: any) => {
  return <SafeAreaTabBar {...props} />;
};

// Stack Navigation Components for each tab
const HomeStackNavigation = () => {
  return (
    <HomeStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <HomeStack.Screen name="BoardListScreen" component={BoardListScreen} />
      <HomeStack.Screen
        name="DetailContentScreen"
        component={DetailContentScreen}
      />
      <HomeStack.Screen
        name="CreateContentScreen"
        component={CreateContentScreen}
      />
      <HomeStack.Screen
        name="UpdateContentScreen"
        component={UpdateContentScreen}
      />
      <HomeStack.Screen
        name="UseUnitScreen"
        component={UseUnitScreen}
      />
    </HomeStack.Navigator>
  );
};

// Intro Stack Navigator
const IntroStackNavigator = () => {
  return (
    <IntroStack.Navigator
      initialRouteName="Initialization"
      screenOptions={{
        headerShown: false,
      }}
    >
      <IntroStack.Screen name="Initialization" component={InitializationScreen} />
      <IntroStack.Screen name="Security" component={Security} />
      <IntroStack.Screen name="UpdateCheck" component={UpdateCheckScreen} />
      <IntroStack.Screen name="Login" component={LoginScreen} />
    </IntroStack.Navigator>
  );
};

// Service Stack Navigator
const ServiceStackNavigator = () => {
  return (
    <ServiceStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <ServiceStack.Screen 
        name="SearchUnitCountScreen" 
        component={SearchUnitCountScreen} 
      />
      <ServiceStack.Screen 
        name="DetailUnitCountScreen" 
        component={DetailUnitCountScreen} 
      />
    </ServiceStack.Navigator>
  );
};

// Search Stack Navigator
const SearchStackNavigator = () => {
  return (
    <SearchStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <SearchStack.Screen 
        name="SearchResult" 
        component={SearchResultScreen} 
      />
      <SearchStack.Screen 
        name="UseUnitScreen" 
        component={UseUnitScreen} 
      />
    </SearchStack.Navigator>
  );
};

// Trans Stack Navigator
// const TransStackNavigator = () => {
//   return (
// <TransStack.Navigator
//       screenOptions={{
//         headerShown: false,
//       }}
//       >
//       {/* Add Trans stack screens here */}
//     </TransStack.Navigator>
//   )
// }

// Userinfo Stack Navigator
const UserinfoStackNavigator = () => {
  return (
    <UserinfoStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <UserinfoStack.Screen 
        name="ChangeUserInfoScreen" 
        component={ChangeUserInfoScreen} 
      />
      <UserinfoStack.Screen 
        name="MailBoxScreen" 
        component={MailBoxScreen} 
      />
      <UserinfoStack.Screen 
        name="MyUnitListScreen" 
        component={MyUnitListScreen} 
      />
    </UserinfoStack.Navigator>
  );
};

// Main Bottom Tab Navigator
const MainTabNavigator = () => {
  return (
    <BottomTab.Navigator
      initialRouteName="HomeMain"
      tabBar={CustomBottomTabBar}
      screenOptions={{
        headerShown: false,
      }}
    >
      <BottomTab.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{
          tabBarLabel: '',
          tabBarIcon: ({ color, focused }) => (
            <Icon
              name={focused ? 'home' : 'home-outline'}
              color={color}
              size={28}
            />
          ),
        }}
      />
      <BottomTab.Screen
        name="ServiceMain"
        component={ServiceScreen}
        options={{
          tabBarLabel: '',
          tabBarIcon: ({ color, focused }) => (
            <Icon
              name={focused ? 'view-grid' : 'view-grid-outline'}
              color={color}
              size={28}
            />
          ),
        }}
      />
      <BottomTab.Screen
        name="SearchMain"
        component={SearchScreen}
        options={{
          tabBarLabel: '',
          tabBarIcon: ({ color, focused }) => (
            <Icon
              name={focused ? 'magnify' : 'magnify'}
              color={color}
              size={30}
            />
          ),
        }}
      />
      <BottomTab.Screen
        name="TransMain"
        component={TransScreen}
        options={{
          tabBarLabel: '',
          tabBarIcon: ({ color, focused }) => (
            <Icon
              name={focused ? 'truck-delivery' : 'truck-delivery-outline'}
              color={color}
              size={28}
            />
          ),
        }}
      />
      <BottomTab.Screen
        name="UserinfoMain"
        component={UserinfoScreen}
        options={{
          tabBarLabel: '',
          tabBarIcon: ({ color, focused }) => (
            <Icon
              name={focused ? 'account' : 'account-outline'}
              color={color}
              size={28}
            />
          ),
        }}
      />
    </BottomTab.Navigator>
  );
};

// Loading Screen Component
const LoadingScreen = () => (
  <Surface style={styles.loadingContainer}>
    <ActivityIndicator size="large" />
  </Surface>
);

// Root Stack Navigator
const RootStackNavigator = () => {
  const { user, isAuthLoading } = useAuth();

  console.log('RootStackNavigator user:', user, 'loading:', isAuthLoading);

  // Show loading screen while checking authentication
  if (isAuthLoading) {
    return <LoadingScreen />;
  }

  return (
    <RootStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
      // initialRouteName="IntroStack"
    >
      {user ? (
        <>
          <RootStack.Screen name="MainTabs" component={MainTabNavigator} />
          <RootStack.Screen name="HomeStack" component={HomeStackNavigation} />
          <RootStack.Screen name="ServiceStack" component={ServiceStackNavigator} />
          <RootStack.Screen name="SearchStack" component={SearchStackNavigator} />
          <RootStack.Screen name="UserinfoStack" component={UserinfoStackNavigator} />
          <RootStack.Screen name="BarcodeScanScreen" component={BarcodeScanScreen} />
        </>
      ) : (
        <RootStack.Screen name="IntroStack" component={IntroStackNavigator} />
      )}
    </RootStack.Navigator>
  );
};

// Main Navigation Container
const RootNavigation = () => {
  return (
    <NavigationContainer>
      <RootStackNavigator />
    </NavigationContainer>
  );
};

export default RootNavigation;

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});

const customTabStyles = StyleSheet.create({
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: BRAND_COLORS.surface,
    borderTopWidth: 0,
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: scale(5),
    paddingTop: Platform.OS === 'ios' ? verticalScale(1) : verticalScale(1),
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical:
      Platform.OS === 'ios' ? verticalScale(4) : verticalScale(3),
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
