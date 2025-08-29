# React Native 0.81 × VisionCamera 4.7.x — Android 빌드 오류 한방 정리 가이드

> 대상: **RN 0.81** + **react-native-vision-camera 4.7.x**  
> 플랫폼: **Android**  
> 핵심 증상:  
> - `Return type mismatch: expected 'MutableMap<String, Any>?', actual 'Map<String, Any>'`  
> - `Unresolved reference 'currentActivity'`  
> - CMake/autolinking 에서 **GLOB mismatch**, **add_subdirectory ... jni/ not an existing directory**

---

## 0) TL;DR (가장 빠른 복구 순서)

1. **패치가 적용되었는지 확인** (루트에서):
   ```bash
   grep -n "build() as MutableMap<String, Any>?" node_modules/react-native-vision-camera/android/src/main/java/com/mrousavy/camera/react/CameraViewManager.kt
   grep -n "reactApplicationContext.currentActivity as? PermissionAwareActivity" node_modules/react-native-vision-camera/android/src/main/java/com/mrousavy/camera/react/CameraViewModule.kt
   ```
   둘 다 나오면 패치 OK.

2. 없으면 **패치 적용** (둘 중 하나):
   - A) `patch-package` 자동 적용(권장): `patches/` 커밋 + `postinstall`에 `"patch-package || echo skip"` 설정 → `npm i`  
   - B) **수동 수정**(아래 §1 참고) → 필요 시 `npx patch-package react-native-vision-camera`로 패치 생성

3. **클린 & 재빌드**:
   ```bash
   cd android
   ./gradlew clean
   rm -rf app/.cxx app/build build
   cd ..
   npm run android
   ```

4. **CMake/autolinking 에러**가 나오면 **임시로** `android/gradle.properties`에서 `newArchEnabled=false`로 내려 빌드 통과 → 아래 §2의 “제대로 고치기” 수행 후 다시 true로 복귀.

---

## 1) VisionCamera 소스 2곳만 고치면 되는 컴파일 오류

### A. `Return type mismatch` (CameraViewManager.kt)
- 경로:  
  `node_modules/react-native-vision-camera/android/src/main/java/com/mrousavy/camera/react/CameraViewManager.kt`

- 수정 전 (마지막 체인의 `.build()`):
  ```kotlin
  .build()
  ```
- 수정 후:
  ```kotlin
  .build() as MutableMap<String, Any>?
  ```

### B. `Unresolved reference 'currentActivity'` (CameraViewModule.kt)
- 경로:  
  `node_modules/react-native-vision-camera/android/src/main/java/com/mrousavy/camera/react/CameraViewModule.kt`

1) import 추가(없다면):
```kotlin
import com.facebook.react.modules.core.PermissionAwareActivity
```

2) `canRequestPermission` 함수 안 변경:
```kotlin
// before
val activity = currentActivity as? PermissionAwareActivity

// after
val activity = reactApplicationContext.currentActivity as? PermissionAwareActivity
```

### C. 터미널에서 일괄 적용 (macOS)
```bash
# 1) Manager 캐스팅
sed -i '' -e 's/^[[:space:]]*\.build()[[:space:]]*$/        .build() as MutableMap<String, Any]?/' \
node_modules/react-native-vision-camera/android/src/main/java/com/mrousavy/camera/react/CameraViewManager.kt

# 2-1) Module import
grep -q 'import com.facebook.react.modules.core.PermissionAwareActivity' \
node_modules/react-native-vision-camera/android/src/main/java/com/mrousavy/camera/react/CameraViewModule.kt || \
awk 'NR==1{print;next} NR==2{print "import com.facebook.react.modules.core.PermissionAwareActivity"; print; next} {print}' \
node_modules/react-native-vision-camera/android/src/main/java/com/mrousavy/camera/react/CameraViewModule.kt > \
node_modules/react-native-vision-camera/android/src/main/java/com/mrousavy/camera/react/CameraViewModule.kt.tmp && \
mv node_modules/react-native-vision-camera/android/src/main/java/com/mrousavy/camera/react/CameraViewModule.kt.tmp \
node_modules/react-native-vision-camera/android/src/main/java/com/mrousavy/camera/react/CameraViewModule.kt

# 2-2) currentActivity → reactApplicationContext.currentActivity
perl -0777 -pe 'BEGIN{$/=undef} s/(fun\s+canRequestPermission\([^\)]*\)\s*:\s*Boolean\s*\{\s*[\s\S]*?val\s+activity\s*=\s*)currentActivity(\s+as\?\s+PermissionAwareActivity)/\1reactApplicationContext.currentActivity\2/s' \
node_modules/react-native-vision-camera/android/src/main/java/com/mrousavy/camera/react/CameraViewModule.kt > \
node_modules/react-native-vision-camera/android/src/main/java/com/mrousavy/camera/react/CameraViewModule.kt.tmp && \
mv node_modules/react-native-vision-camera/android/src/main/java/com/mrousavy/camera/react/CameraViewModule.kt.tmp \
node_modules/react-native-vision-camera/android/src/main/java/com/mrousavy/camera/react/CameraViewModule.kt
```

### D. 클린 & 재빌드
```bash
cd android
./gradlew clean
rm -rf app/.cxx app/build build
cd ..
npm run android
```

> 참고: **@Suppress 중복 금지** — 어노테이션은 중복 적용하면 _This annotation is not repeatable_ 에러가 납니다. 불필요한 `@Suppress("UNCHECKED_CAST")` 줄이 중복되었는지 확인하고, 필요하면 `@Suppress("A", "UNCHECKED_CAST")`처럼 한 줄로 합치세요.

---

## 2) CMake/autolinking “GLOB mismatch / jni not found / add_subdirectory …” 해결

### 증상
- `.../Android-autolinking.cmake: add_subdirectory ... jni/ not an existing directory`
- `GLOB mismatch`
- JNI/Codegen이 **없는** 패키지(예: `async-storage`, `bottom-tabs`, `permissions`, `vector-icons`)가 `add_subdirectory()`에 끼어 있음

### 2-1) 임시 우회
`android/gradle.properties`
```properties
newArchEnabled=false
```
→ 빌드 통과 확인 후 “제대로 고치기” 진행

### 2-2) 제대로 고치기(정상 재생성 루틴)

> **중요 순서**: _clean → 산출물 삭제 → node_modules 설치 → codegen 재생성 → 빌드_

```bash
# (A) clean & 산출물 제거
cd android
./gradlew clean
rm -rf app/.cxx app/build build app/build/generated
cd ..

# (B) node_modules 재설치
# postinstall(패치) 때문에 뻗는 경우가 있으므로 우선 스크립트 무시로 설치
npm i --ignore-scripts

# (C) codegen 태스크 확인/실행
cd android
./gradlew :app:tasks --all | grep -i codegen
# 보통 RN 0.81은 아래 두 개가 존재
./gradlew :app:generateCodegenSchemaFromJavaScript
./gradlew :app:generateCodegenArtifactsFromSchema
cd ..

# (D) 빌드
cd android && ./gradlew assembleDebug && cd ..
```

- `Android-autolinking.cmake` 확인 (생성 파일):  
  `android/app/build/generated/autolinking/src/main/jni/Android-autolinking.cmake`  
  → **JNI가 없는 패키지**가 `add_subdirectory()`에 보이면 비정상.  
  **루트의 `react-native.config.js`/앱의 `package.json`** 에 불필요한 `codegenConfig`가 있는지 제거하세요.

- settings.gradle 주의: node_modules 삭제된 상태에서는 Gradle 플러그인을 찾지 못하므로, **항상 설치 후** Gradle 실행
  ```groovy
  // android/settings.gradle
  pluginManagement { includeBuild("../node_modules/@react-native/gradle-plugin") }
  plugins { id("com.facebook.react.settings") }
  ```

### 2-3) newArch 다시 켜기
정상화 확인 후:
```properties
# android/gradle.properties
newArchEnabled=true
```
그리고 §2-2의 루틴을 한 번 더(클린 → 재생성 → 빌드).

---

## 3) 패치 유지/재적용 전략

- `patches/` 폴더의 패치 파일을 **레포에 커밋**  
- `package.json`:
  ```json
  {
    "devDependencies": { "patch-package": "..." },
    "scripts": {
      "postinstall": "patch-package || echo skip"
    }
  }
  ```
- 설치 방식에 따른 동작:
  - `npm i`/`npm ci` → **자동 재적용**
  - `npm i --ignore-scripts` → 설치 후 **직접** `npx patch-package`
- 검증 스니펫(패치 적용 확인):
  ```bash
  grep -n "build() as MutableMap<String, Any>?" node_modules/react-native-vision-camera/android/src/main/java/com/mrousavy/camera/react/CameraViewManager.kt
  grep -n "reactApplicationContext.currentActivity as? PermissionAwareActivity" node_modules/react-native-vision-camera/android/src/main/java/com/mrousavy/camera/react/CameraViewModule.kt
  ```

---

## 4) Frame Processors 관련 (선택)

- 로그: `react-native-worklets-core not found, Frame Processors are disabled!`  
  → 프레임 프로세서가 필요 없으면 무시. 필요하면:
  ```bash
  npm i react-native-worklets-core
  ```
  이후 §2-2 루틴(클린 → 재생성 → 빌드).

- 옵션 플래그:
  ```properties
  # android/gradle.properties
  VisionCamera_enableFrameProcessors=true|false
  ```

---

## 5) CI/로컬 공통 빌드 루틴(권장 스크립트)

```bash
cd android
./gradlew clean
rm -rf app/.cxx app/build build app/build/generated
./gradlew :app:generateCodegenSchemaFromJavaScript
./gradlew :app:generateCodegenArtifactsFromSchema
./gradlew assembleDebug
```

> 첫 줄 전/후로 node_modules 상태를 항상 확실히 유지하세요. (settings.gradle이 RN 플러그인을 node_modules에서 include)

---

## 부록 A) 흔한 에러 → 빠른 대응 표

| 증상/로그 | 조치 |
|---|---|
| `Return type mismatch ... Map vs MutableMap` | §1-A의 `.build() as MutableMap<String, Any>?` 적용 |
| `Unresolved reference 'currentActivity'` | §1-B의 `reactApplicationContext.currentActivity` + import |
| `annotation is not repeatable` | 중복 `@Suppress` 줄 합치기/삭제 |
| `add_subdirectory ... jni not an existing directory` | §2-2로 autolinking/codegen 재생성. 루트 설정에서 불필요한 codegenConfig 제거 |
| `GLOB mismatch!` | §2-2 루틴으로 클린 재생성 |
| `settings.gradle ... gradle-plugin does not exist` | node_modules 먼저 설치 후 Gradle 실행 |
| `postinstall-postinstall`로 npm install 실패 | `npm i --ignore-scripts`로 설치 → `npx patch-package` 수동 호출 또는 postinstall을 `patch-package || echo skip` |

---

## 부록 B) 설치/재설치 시 기억할 점

- node_modules 삭제 후 재설치 시 `postinstall`이 막히면 → `--ignore-scripts`로 설치하고 이후 `npx patch-package` 수동 실행
- `patches/` 커밋 + `postinstall` 설정만 제대로 되어 있으면 **자동 재적용**이라서 별도 조치가 필요 없습니다.
- RN/VC를 업그레이드하면 upstream에서 문제를 해결했을 수 있으므로, 패치 제거 전 **빌드 확인** 후 `patches/…` 정리.

---

**Happy building!** 👷‍♂️📸


Claude Code에 던질 “복붙 프롬프트” 예시

아래 통째로 붙여서 시작하세요. (에러/버전/파일 내용은 당신 환경으로 바꿔 붙이기)

당신은 RN/Android 빌드 닥터입니다. 안전하게, 재현 가능한 순서로 문제를 해결해 주세요.
제 프로젝트 요약:
- React Native: 0.81.x
- react-native-vision-camera: 4.7.x
- Node/Java/Gradle(AGP) 버전: <붙여넣기>
- newArchEnabled: <true/false>
- 에러 로그 (마지막 150줄): <붙여넣기>

아래는 우리 팀의 표준 가이드입니다. 이 가이드를 우선 적용하되, 내 현재 로그/버전에 맞게 최소 수정안을 제시해 주세요. 잘못된 가정은 지양하고, 각 스텝마다 “검증 커맨드(예: grep, ./gradlew tasks …)”도 함께 제시해 주세요.

<여기에 RN81_VisionCamera_Fix_Guide.md 원문 전체 붙여넣기>

요청사항:
1) 내 로그와 버전에 맞춘 “즉시 실행 커맨드” 시퀀스(복붙용) 제시
2) vision-camera 2군데 수정이 필요한지 판정하고, 필요 시 정확한 sed/perl/awk 커맨드 제공 (어노테이션 중복 금지)
3) codegen/autolinking 재생성 루틴과 점검 포인트(어떤 파일/라인을 봐야 하는지) 제공
4) 실패 케이스별 분기(예: codegen 태스크 없음, add_subdirectory… 오류 재발 등)도 대응 커맨드 포함
5) 마지막에 “검증용 grep”과 “빌드 커맨드”까지 포함

주의 & 팁

자동 실행 스크립트 권한: 외부 도구가 레포를 직접 수정/실행하려면 권한이 필요합니다. 일반적으로 명령어 제안까지만 해 주니, 실행은 직접 하세요.

버전 드리프트: vision-camera나 RN 버전이 바뀌면, 예전 패치가 충돌할 수 있어요. 그럴 땐 가이드의 “패치 재생성” 경로(수술 스크립트 → npx patch-package)로 가면 안정적.

postinstall 실패 방지: package.json scripts에
"postinstall": "patch-package || echo skip"
로 걸어두면, 패치가 없어도 설치가 안 멈춥니다.

민감정보: CI 토큰/키는 로그에서 지우고 공유하세요.