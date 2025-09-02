src/component, src/screens 위 경로에 속하는 모든 tsx파일의 스타일을 일괄적으로 적용하고싶다.

brand color 반영 : primary : #F47725
나머지는 심플하고 깔끔한 색상이나, 어울리는 조합으로
심플하고 모던한 느낌
react-native-paper는 컴포넌트만 사용하고 스타일은 별도로 커스텀 해라
platform별 safe area padding 적용
font size 통일
ligth mode only로 react-native-paper text, textInput 사용 시 검정색 고정
이외 dark mode로 인해 스타일이 깨지는 부분들 수정

이외에 더 고려해야할 부분이 있는가?

내 요구는 src폴더 내 component와 screen폴더에 존재하는 모든 tsx파일에 적용할 전역 styles를 선언하고, 각 컴포넌트에서 import하여 사용하는 방식이다.
추가로, react-native-paper의 theme를 커스텀하여 brand color를 반영하고, light mode 전용으로 설정하는 것도 필요하다.
추가로 고려해야 할 부분들은 다음과 같습니다:
1. **폰트 패밀리 통일**: 전체 앱에서 사용할 폰트 패밀리를 정하고, 이를 전역 스타일에 반영합니다.
2. **반응형 디자인**: 다양한 화면 크기와 해상도에 대응
3. **접근성 고려**: 색상 대비, 폰트 크기 조절 등 접근성 측면을 고려하여 스타일을 설계합니다.
4. **Platform-specific 스타일**: iOS와 Android의 디자인 가이드라인 차이를 반영하여 플랫폼별로 약간의 스타일 차이를 둘 수 있습니다.
5. React-Native-Paper의 컴포넌트를 사용하나, 스타일은 별도의 심플하고 모던한 UI를 위해 커스텀 스타일을 적용합니다.
6. UI는 기존의 React-native-Paper의 기본 스타일이 별로여서 더 감각적인 스타일로 커스텀합니다.
7. 기존의 임의로 지정된 스타일은 무시하고, 전역 스타일을 우선적으로 적용합니다.