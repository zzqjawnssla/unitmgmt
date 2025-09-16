# Add project specific ProGuard rules here.
# Optimized ProGuard rules for React Native APK size reduction
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# Vision Camera 관련 (필수 유지)
-keep class com.mrousavy.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Firebase Messaging (필수 유지)
-keep class com.google.firebase.messaging.** { *; }
-keep class com.google.firebase.iid.** { *; }
-keep class com.google.android.gms.** { *; }

# React Native Reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# React Native Device Info (보안 정보 접근)
-keep class com.learnium.RNDeviceInfo.** { *; }
-keepclassmembers class com.learnium.RNDeviceInfo.** { *; }

# React Native Permissions (보안 권한 관리)
-keep class com.zoontek.rnpermissions.** { *; }
-keepclassmembers class com.zoontek.rnpermissions.** { *; }

# React Native SVG
-keep class com.horcrux.svg.** { *; }

# Blob Util & FS
-keep class com.RNFetchBlob.** { *; }
-keep class com.rnfs.** { *; }

# React Native Config
-keep class com.lugg.ReactNativeConfig.ReactNativeConfigPackage { *; }
-keepclassmembers class com.lugg.ReactNativeConfig.ReactNativeConfigModule { *; }

# React Native 기본 규칙
-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStrip
-keep,allowobfuscation @interface com.facebook.proguard.annotations.KeepGettersAndSetters
-keep,allowobfuscation @interface com.facebook.common.internal.DoNotStrip
-keep,allowobfuscation @interface com.facebook.jni.annotations.DoNotStrip

# Do not strip any method/class that is annotated with @DoNotStrip
-keep @com.facebook.proguard.annotations.DoNotStrip class *
-keep @com.facebook.common.internal.DoNotStrip class *
-keep @com.facebook.jni.annotations.DoNotStrip class *
-keepclassmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
    @com.facebook.common.internal.DoNotStrip *;
    @com.facebook.jni.annotations.DoNotStrip *;
}

# React Native 관련
-keepclassmembers @com.facebook.proguard.annotations.KeepGettersAndSetters class * {
  void set*(***);
  *** get*();
}

-keep class * implements com.facebook.react.bridge.JavaScriptModule { *; }
-keep class * implements com.facebook.react.bridge.NativeModule { *; }
-keepclassmembers,includedescriptorclasses class * { native <methods>; }
-keepclassmembers class *  { @com.facebook.react.uimanager.annotations.ReactProp <methods>; }
-keepclassmembers class *  { @com.facebook.react.uimanager.annotations.ReactPropGroup <methods>; }

-dontwarn com.facebook.react.**
-keep,includedescriptorclasses class com.facebook.react.bridge.** { *; }

# okhttp
-keepattributes Signature
-keepattributes *Annotation*
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }
-dontwarn okhttp3.**

# okio
-keep class sun.misc.Unsafe { *; }
-dontwarn java.nio.file.*
-dontwarn org.codehaus.mojo.animal_sniffer.IgnoreJRERequirement
-keep class okio.** { *; }
-dontwarn okio.**

# WebRTC (필요한 경우)
-keep class org.webrtc.** { *; }
-dontwarn org.chromium.build.BuildHooksAndroid

# Hermes
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }

# 앱 패키지 보호
-keep class com.unitmgmt.** { *; }

# BuildConfig 보호
-keep class com.unitmgmt.BuildConfig { *; }

# R 파일 보호
-keepclassmembers class **.R$* {
    public static <fields>;
}

# Enum 보호
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# Serializable 보호
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# 크래시 리포트를 위한 라인 번호 보존
-keepattributes SourceFile,LineNumberTable

# ===== App Safer 호환성을 위한 보안 설정 =====
# App Safer 검증에 필요한 클래스들 보호
-keep class com.naver.** { *; }
-keep class kr.co.shiftworks.** { *; }

# 디바이스 보안 모듈 보호 (jail-monkey)
-keep class com.gantix.JailMonkey.** { *; }
-keepclassmembers class com.gantix.JailMonkey.** { *; }

# 네이티브 라이브러리 인터페이스 보호
-keep class **.*JNI* { *; }
-keep class **.toolChecker** { *; }

# 보안 관련 네이티브 라이브러리 보호
-keep,allowshrinking,allowoptimization class * {
    native <methods>;
}

# ===== 조건부 로그 제거 규칙 (App Safer 호환) =====
# 릴리즈 빌드에서만 로그 제거, 보안 검증 클래스는 제외
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int d(...);
    # 경고와 에러 로그는 App Safer 검증을 위해 유지
    # public static int w(...);
    # public static int e(...);
    public static int println(...);
}

# 중요: System.out 완전 제거는 App Safer 검증을 방해할 수 있음
# -assumenosideeffects class java.lang.System {
#     public static void out.println(...);
#     public static void err.println(...);
# }

# ===== App Safer 추가 호환성 규칙 =====
# Application 클래스 보호
-keep public class * extends android.app.Application { *; }

# 매니페스트 등록 컴포넌트 보호 (App Safer 검증 필요)
-keep public class * extends android.app.Activity { *; }
-keep public class * extends android.content.BroadcastReceiver { *; }
-keep public class * extends android.content.ContentProvider { *; }

# 리플렉션 사용 클래스 보호
-keepattributes Signature
-keepattributes *Annotation*
-keepattributes InnerClasses

# 빌드 정보 보호 (App Safer에서 참조할 수 있음)
-keep class **.BuildConfig { *; }

# 보안 검증 우회 방지
-keep class * {
    @com.facebook.proguard.annotations.DoNotStrip <fields>;
    @com.facebook.proguard.annotations.DoNotStrip <methods>;
}

# ===== R8 Missing Classes 해결 =====
# Coil3 관련 완전 제거 (사용하지 않는 라이브러리)
-dontwarn coil3.**
-dontwarn coil3.network.**
-dontwarn coil3.PlatformContext
-dontwarn coil3.network.ConnectivityChecker
-dontwarn coil3.network.okhttp.**
-dontwarn coil3.network.okhttp.OkHttpNetworkFetcher**

# Recoil 관련 제거 (더 이상 사용하지 않음)
-dontwarn recoil.**

# Kotlin coroutines 관련 missing class 대응
-dontwarn kotlin.coroutines.jvm.internal.**
-dontwarn kotlinx.coroutines.**
-dontwarn kotlinx.coroutines.flow.**

# OkHttp/Okio 관련 missing class 대응
-dontwarn okhttp3.**
-dontwarn okio.**

# React Native Paper 이미지 로딩 보호
-keep class com.facebook.react.views.image.** { *; }
-keep class com.facebook.drawee.** { *; }
-keep class com.facebook.imagepipeline.** { *; }