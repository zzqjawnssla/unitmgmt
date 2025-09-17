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




android의 배포 방식을 변경해야한다. ios는 기존과 동일하게 xCode에서 수동 빌드 및 배포한다.
스크립트도 유지 (/scripts/ios-upload-only.sh).
스크립트를 통폐합하고, package.json의 명령어도 변경해야한다.
aws의 s3 업로드 및 dynamodb 버전 정보 업데이트는 기존과 동일하다.

# 기존
 - patch, minor, major 버전업 시 배포, upload-only 배포

# 변경
 - patch, minor, major 버전업, 버전업 없이 release 파일 생성
 - 생성된 release 파일 서명
 - 생성된 release 파일은 개발자가 직접 수동으로 AppSafer에 업로드
 - 업로드 후 AppSafer가 적용된 apk 파일을 프로젝트 내에 저장
 - 저장된 파일을 다시 zipalign 및 apksigner로 서명
 - 스크립트를 통한 aws s3 업로드 및 dynamodb 버전 정보 업데이트(기존 스크립트 동작과 동일)

# 참고사항
 - 별도의 폴더를 생성하여 appSafer가 최종 적용된 apk 파일을 저장
 - ios 스크립트와는 통합하지 않고, android 전용 스크립트로 유지
 - package.json의 명령어도 변경된 스크립트에 맞게 수정
 - AppSafer 업로드 및 다운로드는 개발자가 직접 수동으로 진행
 - AppSafer가 적용된 apk 파일은 /android/downloaded-apks 폴더에 개발자가 직접 업로드 (파일명 : com.unitmgmt.apk)
 - 배포 스크립트 작성 시, zipalign 및 apksigner 서명이 완료된 apk파일은 unitmgmt-v{version}.apk 형태로 저장
 - aws s3 업로드 및 dynamodb 버전 정보 업데이트는 기존 스크립트와 동일하게 동작
 - 기존 스크립트는 /scripts/를 참고하라