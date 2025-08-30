import {
  Image,
  View,
  StyleSheet,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import * as Yup from 'yup';
import React, { useEffect, useState } from 'react';
import { TextInput, Text, Snackbar, Button, Surface } from 'react-native-paper';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import { Formik } from 'formik';
import { useAuth } from '../../store/AuthContext.tsx';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import axios from 'axios';
import { BASE_URL } from '@env';

// Brand Colors
const BRAND_COLORS = {
  primary: '#F47725',
  light: 'rgba(244, 119, 37, 0.1)',
  background: '#FFFFFF',
  surface: '#FCFCFC',
  text: '#333333',
  textSecondary: '#666666',
  error: '#F44336',
  border: '#E0E0E0',
};

const LoginSchema = Yup.object().shape({
  username: Yup.string().required('아이디를 입력해주세요.'),
  password: Yup.string().required('비밀번호를 입력해주세요.'),
});

export const LoginScreen: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const [validate, setValidate] = useState(false);
  const [timer, setTimer] = useState<number>(0);

  const [session, setSession] = useState<string | null>(null);
  const [code, setCode] = useState<string>('');

  const { login } = useAuth();

  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Snackbar state
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  const handleLogin = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const authResponse = await axios.post(
        `${BASE_URL}/accounts/api/v1/accounts/login/`,
        {
          username,
          password,
        },
      );
      setSession(authResponse.data.session_id);
      setTimer(authResponse.data.expires_in);

      setIsLoading(false);
      setError(false);
      if (authResponse.data.success) {
        setValidate(true);
      }
    } catch (e) {
      setError(true);
      setErrorMessage(
        (e as any)?.response?.data?.details?.original_message ??
          (e as any)?.response?.data?.error_message ??
          '알 수 없는 오류가 발생했습니다.',
      );
      setIsLoading(false);
      showSnackbar('로그인 실패');
    }
  };

  const handleSecondAuth = async () => {
    if (!session) return;

    try {
      await login(session, code);
      setError(false);
    } catch (e) {
      console.log(e);
      setCode('');
      setError(true);
      setErrorMessage('인증번호를 확인해주세요.');
    }
  };

  useEffect(() => {
    if (validate) {
      const interval = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            setValidate(false);
            setCode('');
            showSnackbar('인증에 실패하였습니다.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setTimer(10);
    }
  }, [validate]);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <Surface style={styles.container}>
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <Image
            source={require('../../assets/images/main_logo.png')}
            style={styles.logoImage}
          />
        </View>

        {/* Content Section */}
        <View style={styles.contentSection}>
          {/* Error Message */}
          {error && (
            <View style={styles.errorContainer}>
              <MaterialCommunityIcons
                name="alert-circle"
                size={20}
                color={BRAND_COLORS.error}
              />
              <Text variant="bodyMedium" style={styles.errorText}>
                {errorMessage}
              </Text>
            </View>
          )}

          {!validate ? (
            /* Login Form */
            <Formik
              initialValues={{ username: '', password: '' }}
              validationSchema={LoginSchema}
              onSubmit={values => handleLogin(values.username, values.password)}
            >
              {({
                handleChange,
                handleBlur,
                handleSubmit,
                values,
                errors,
                touched,
              }) => (
                <View style={styles.formContainer}>
                  {/*<Text variant="headlineSmall" style={styles.formTitle}>*/}
                  {/*  로그인*/}
                  {/*</Text>*/}

                  <View style={styles.inputGroup}>
                    <TextInput
                      mode="flat"
                      label="i-NET ID"
                      style={styles.textInput}
                      value={values.username}
                      onBlur={handleBlur('username')}
                      onChangeText={handleChange('username')}
                      underlineColor={BRAND_COLORS.border}
                      activeUnderlineColor={BRAND_COLORS.primary}
                      autoCapitalize="none"
                      autoComplete="username"
                      left={
                        <TextInput.Icon
                          icon="account"
                          color={BRAND_COLORS.textSecondary}
                        />
                      }
                    />
                    {errors.username && touched.username && (
                      <Text variant="bodySmall" style={styles.errorFieldText}>
                        {errors.username}
                      </Text>
                    )}
                  </View>

                  <View style={styles.inputGroup}>
                    <TextInput
                      mode="flat"
                      label="Password"
                      style={styles.textInput}
                      onChangeText={handleChange('password')}
                      onBlur={handleBlur('password')}
                      value={values.password}
                      underlineColor={BRAND_COLORS.border}
                      activeUnderlineColor={BRAND_COLORS.primary}
                      autoCapitalize="none"
                      autoComplete="password"
                      secureTextEntry={!isPasswordVisible}
                      left={
                        <TextInput.Icon
                          icon="lock"
                          color={BRAND_COLORS.textSecondary}
                        />
                      }
                      right={
                        <TextInput.Icon
                          icon={isPasswordVisible ? 'eye-off' : 'eye'}
                          onPress={() =>
                            setIsPasswordVisible(!isPasswordVisible)
                          }
                          color={BRAND_COLORS.textSecondary}
                        />
                      }
                    />
                    {errors.password && touched.password && (
                      <Text variant="bodySmall" style={styles.errorFieldText}>
                        {errors.password}
                      </Text>
                    )}
                  </View>

                  <Button
                    mode="contained"
                    onPress={() => handleSubmit()}
                    style={styles.loginButton}
                    contentStyle={styles.loginButtonContent}
                    labelStyle={styles.loginButtonText}
                    loading={isLoading}
                    disabled={isLoading}
                  >
                    {isLoading ? '로그인 중...' : '로그인'}
                  </Button>
                </View>
              )}
            </Formik>
          ) : (
            /* Two-Factor Authentication */
            <View style={styles.formContainer}>
              <View style={styles.twoFactorHeader}>
                <MaterialCommunityIcons
                  name="shield-check"
                  size={32}
                  color={BRAND_COLORS.primary}
                />
                <Text variant="headlineSmall" style={styles.formTitle}>
                  2단계 인증
                </Text>
                <Text variant="bodyMedium" style={styles.twoFactorSubtitle}>
                  SMS로 전송된 인증번호를 입력해주세요
                </Text>
              </View>

              <View style={styles.authCodeContainer}>
                <TextInput
                  mode="flat"
                  placeholder="인증번호 6자리"
                  style={styles.authCodeInput}
                  value={code}
                  onChangeText={setCode}
                  underlineColor={BRAND_COLORS.border}
                  activeUnderlineColor={BRAND_COLORS.primary}
                  maxLength={6}
                  keyboardType="numeric"
                  textAlign="center"
                />

                <View style={styles.timerContainer}>
                  <MaterialCommunityIcons
                    name="timer-outline"
                    size={20}
                    color={
                      timer > 30 ? BRAND_COLORS.primary : BRAND_COLORS.error
                    }
                  />
                  <Text
                    variant="bodyLarge"
                    style={[
                      styles.timerText,
                      {
                        color:
                          timer > 30
                            ? BRAND_COLORS.primary
                            : BRAND_COLORS.error,
                      },
                    ]}
                  >
                    {String(Math.floor(timer / 60)).padStart(2, '0')}:
                    {String(timer % 60).padStart(2, '0')}
                  </Text>
                </View>
              </View>

              <Button
                mode="contained"
                onPress={handleSecondAuth}
                style={styles.loginButton}
                contentStyle={styles.loginButtonContent}
                labelStyle={styles.loginButtonText}
              >
                인증 완료
              </Button>
            </View>
          )}
        </View>

        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => setSnackbarVisible(false)}
          duration={4000}
          style={styles.snackbar}
          theme={{ colors: { primary: BRAND_COLORS.primary } }}
        >
          {snackbarMessage}
        </Snackbar>
      </Surface>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND_COLORS.background,
  },
  logoSection: {
    flex: 0.35,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: verticalScale(24),
    paddingBottom: verticalScale(24),
  },
  logoImage: {
    width: scale(240),
    height: verticalScale(80),
    resizeMode: 'contain',
  },
  contentSection: {
    flex: 0.65,
    paddingHorizontal: scale(24),
    justifyContent: 'flex-start',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFEBEE',
    marginBottom: verticalScale(16),
    borderLeftWidth: 4,
    borderLeftColor: BRAND_COLORS.error,
    padding: scale(16),
    borderRadius: 8,
  },
  errorText: {
    color: BRAND_COLORS.error,
    flex: 1,
  },
  formContainer: {
    paddingVertical: verticalScale(16),
  },
  formTitle: {
    color: BRAND_COLORS.text,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: verticalScale(24),
  },
  inputGroup: {
    marginBottom: verticalScale(16),
  },
  textInput: {
    backgroundColor: BRAND_COLORS.background,
  },
  errorFieldText: {
    color: BRAND_COLORS.error,
    marginTop: verticalScale(4),
    marginLeft: scale(8),
  },
  loginButton: {
    backgroundColor: BRAND_COLORS.primary,
    borderRadius: 12,
    marginTop: verticalScale(16),
  },
  loginButtonContent: {
    paddingVertical: verticalScale(6),
  },
  loginButtonText: {
    color: BRAND_COLORS.background,
    fontSize: moderateScale(16),
    fontWeight: '600',
  },
  twoFactorHeader: {
    alignItems: 'center',
    marginBottom: verticalScale(24),
  },
  twoFactorSubtitle: {
    color: BRAND_COLORS.textSecondary,
    textAlign: 'center',
    marginTop: verticalScale(8),
  },
  authCodeContainer: {
    alignItems: 'center',
    gap: verticalScale(16),
    marginBottom: verticalScale(16),
  },
  authCodeInput: {
    width: scale(240),
    backgroundColor: BRAND_COLORS.background,
    fontSize: moderateScale(18),
    fontWeight: '600',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    borderRadius: 20,
    backgroundColor: BRAND_COLORS.light,
  },
  timerText: {
    fontWeight: '600',
    fontSize: moderateScale(16),
  },
  snackbar: {
    marginBottom: verticalScale(24),
    // backgroundColor: BRAND_COLORS.primary,
  },
});
