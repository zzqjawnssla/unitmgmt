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

# ===== 로그 제거 규칙 (보안 강화) =====
# Android 시스템 로그 제거 (MobSF 보안 진단 대응)
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int i(...);
    public static int w(...);
    public static int d(...);
    public static int e(...);
    public static int println(...);
}

# System.out/err 로그 제거
-assumenosideeffects class java.lang.System {
    public static void out.println(...);
    public static void err.println(...);
}

# 개발자 로그 제거 (앱에서 사용하는 경우)
-assumenosideeffects class java.io.PrintStream {
    public void println(...);
    public void print(...);
}