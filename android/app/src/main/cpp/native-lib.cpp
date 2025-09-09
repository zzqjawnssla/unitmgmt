#include <jni.h>
#include <string>

extern "C"
JNIEXPORT jstring JNICALL
Java_com_unitmgmt_MainActivity_stringFromJNI(
        JNIEnv* env,
        jobject /* this */) {
    std::string msg = "Hello from NDK (hardened)";
    return env->NewStringUTF(msg.c_str());
}
