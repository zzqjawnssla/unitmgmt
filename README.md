# UnitMgmt

React Native 기반 단위 관리 애플리케이션

## 📱 프로젝트 개요

이 앱은 React Native를 사용하여 구축된 단위 관리 시스템입니다.

## 🚀 주요 기능

- 네이티브 라이브러리 링크 테스트
- 보안 검증 (JailMonkey)
- 디바이스 정보 수집
- 카메라 및 미디어 처리

## 📦 설치된 패키지

### 네비게이션
- `@react-navigation/native`
- `@react-navigation/native-stack`
- `react-native-bottom-tabs`

### 상태 관리
- `AuthContext` (커스텀 컨텍스트)
- `react-query`

### UI 컴포넌트
- `react-native-paper`
- `react-native-vector-icons`

### 디바이스 & 보안
- `jail-monkey`
- `react-native-device-info`
- `react-native-permissions`

### 미디어 & 파일
- `react-native-vision-camera`
- `react-native-file-viewer`
- `react-native-fs`

### 기타
- `@react-native-async-storage/async-storage`
- `axios`
- `formik`
- `yup`
- `jwt-decode`
- `moment`
- `react-native-dotenv`

## 🛠️ 개발 환경 설정

### 요구사항
- Node.js >= 20
- React Native CLI
- Android Studio (Android)
- Xcode (iOS)

### 설치 및 실행

```bash
# 의존성 설치
npm install

# iOS 의존성 설치
cd ios && pod install && cd ..

# Android 실행
npm run android

# iOS 실행
npm run ios

# Metro 서버 시작
npm start
```

## 🔧 호환성 이슈 해결

### React Native Vision Camera
- React Native 0.81.1과의 호환성을 위한 패치 적용
- `patches/react-native-vision-camera+4.7.1.patch` 파일 사용

### iOS CocoaPods
- Swift/Objective-C 모듈 호환성을 위한 `modular_headers` 설정

## 📁 프로젝트 구조

```
├── android/           # Android 네이티브 코드
├── ios/              # iOS 네이티브 코드
├── patches/          # 패키지 패치 파일
├── App.tsx           # 메인 앱 컴포넌트
├── LinkTestComponent.tsx  # 라이브러리 테스트 컴포넌트
└── package.json      # 의존성 관리
```

## 🧪 테스트

LinkTestComponent를 통해 설치된 네이티브 라이브러리들의 링크 상태를 확인할 수 있습니다.

# Troubleshooting

If you're having issues getting the above steps to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.

## 📄 라이선스

MIT License

## 🤝 기여하기

이슈나 PR은 언제든 환영합니다.