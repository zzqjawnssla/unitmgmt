// src/context/AuthContext.tsx
import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {BASE_URL} from '@env';
import axios from 'axios';
import {jwtDecode} from 'jwt-decode';
import { Snackbar } from 'react-native-paper';

// Snackbar duration constants
const SNACKBAR_DURATION = {
  SHORT: 4000,    // 4초 - 일반적인 알림
  MEDIUM: 7000,   // 7초 - 중요한 알림, 에러 메시지
  LONG: 10000,    // 10초 - 매우 중요한 에러, 긴 메시지
} as const;

export type Auth = {
  children: ReactNode;
};

export type WarehouseItem = {
  id: number;
  warehouse_name: string;
  zp_code: string;
  warehouse_manage_region: string;
  warehouse_manage_team: string;
  operating_company: string;
  warehouse_type: string;
};

export type User = {
  username: string;
  first_name: string;
  region: string;
  team: string;
  my_warehouse: WarehouseItem[];
};

export type AuthContextType = {
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUserData: () => Promise<User>;
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  initializeAuth: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthContextProvider: React.FC<Auth> = ({children}) => {
  const [user, setUser] = useState<AuthContextType['user']>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarDuration, setSnackbarDuration] = useState<number>(SNACKBAR_DURATION.SHORT);
  
  const showSnackbar = (message: string, duration: number = SNACKBAR_DURATION.SHORT) => {
    setSnackbarMessage(message);
    setSnackbarDuration(duration);
    setSnackbarVisible(true);
  };

  const refreshUserData = async (): Promise<User> => {
    const access = await AsyncStorage.getItem('accessToken');
    const response = await axios.get(`${BASE_URL}/accounts/aboutme/`, {
      headers: {Authorization: `Bearer ${access}`},
    });
    const updatedUser: User = response.data;
    setUser(updatedUser);
    return updatedUser;
  };

  const refreshAccessToken = async () => {
    const refresh = await AsyncStorage.getItem('refreshToken');
    if (!refresh) {
      showSnackbar('토큰이 만료되었습니다. 다시 로그인해주세요.', SNACKBAR_DURATION.MEDIUM);
      return logout();
    }
    try {
      const refreshResponse = await axios.post(
        `${BASE_URL}/accounts/api/token/refresh/`,
        {refresh: refresh},
      );
      await AsyncStorage.setItem('accessToken', refreshResponse.data.access);
      return refreshResponse.data.access;
    } catch (e: any) {
      if (e.response && e.response.status === 401) {
        showSnackbar('토큰이 만료되었습니다. 다시 로그인해주세요.', SNACKBAR_DURATION.MEDIUM);
        logout();
      } else {
        showSnackbar('토큰을 갱신하는 중 오류가 발생했습니다.\n계속하여 오류 발생 시 관리자에게 문의해주세요.', SNACKBAR_DURATION.LONG);
      }
      throw e;
    }
  };

  // initializeAuth 함수로 분리하여 외부에서 호출 가능하도록 함
  const initializeAuth = async () => {
    const latestAccessToken = await AsyncStorage.getItem('accessToken');
    const latestRefreshToken = await AsyncStorage.getItem('refreshToken');
    if (!latestAccessToken || !latestRefreshToken) {
      return logout();
    }
    const tokenExpiration = (jwtDecode(latestAccessToken)?.exp ?? 0) * 1000;
    const currentTime = new Date().getTime();
    if (tokenExpiration < currentTime) {
      console.log('access token expired');
      try {
        const newAccessToken = await refreshAccessToken();
        const userResponse = await axios.get(`${BASE_URL}/accounts/aboutme/`, {
          headers: {Authorization: `Bearer ${newAccessToken}`},
        });
        const userData = userResponse.data;
        setUser(userData);
      } catch (error) {
        showSnackbar('토큰 갱신 또는 사용자 정보 불러오기 실패', SNACKBAR_DURATION.MEDIUM);
        logout();
      }
    } else {
      try {
        const accessToken = await AsyncStorage.getItem('accessToken');
        const userResponse = await axios.get(`${BASE_URL}/accounts/aboutme/`, {
          headers: {Authorization: `Bearer ${accessToken}`},
        });
        const userData = userResponse.data;
        setUser(userData);
      } catch (error) {
        showSnackbar('사용자 정보 불러오기 실패', SNACKBAR_DURATION.MEDIUM);
        logout();
      }
    }
  };

  const login = async (session: string, code: string) => {
    try {
      const authResponse = await axios.post(
        `${BASE_URL}/accounts/api/v1/accounts/login/`,
        {
          session_id: session,
          sms_code: code,
        },
      );

      const {access_token: access} = authResponse.data;
      const {refresh_token: refresh} = authResponse.data;

      await AsyncStorage.setItem('accessToken', access);
      await AsyncStorage.setItem('refreshToken', refresh);

      try {
        const userResponse = await axios.get(`${BASE_URL}/accounts/aboutme/`, {
          headers: {Authorization: `Bearer ${access}`},
        });

        const userData = userResponse.data;
        await AsyncStorage.setItem('userData', JSON.stringify(userData));

        setUser(userData);
      } catch (e) {
        console.log('UserData Error', e);
        showSnackbar('사용자 정보 불러오기 실패', SNACKBAR_DURATION.MEDIUM);
      }
    } catch (e) {
      console.log('Login Error', e);
      showSnackbar('로그인 실패\n아이디와 비밀번호를 확인해주세요.', SNACKBAR_DURATION.MEDIUM);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('userData');
      await AsyncStorage.removeItem('accessToken');
      await AsyncStorage.removeItem('refreshToken');
      setUser(null);
      showSnackbar('로그아웃 되었습니다.', SNACKBAR_DURATION.SHORT);
    } catch (e) {
      showSnackbar('로그아웃 실패', SNACKBAR_DURATION.MEDIUM);
    }
  };

  return (
    <>
      <AuthContext.Provider
        value={{user, setUser, login, logout, refreshUserData, initializeAuth}}>
        {children}
      </AuthContext.Provider>
      
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={snackbarDuration}
        style={{ marginBottom: 50 }}
      >
        {snackbarMessage}
      </Snackbar>
    </>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};