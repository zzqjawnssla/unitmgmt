import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
// ⬆️ AppSafer는 Obj-C 프레임워크라서 Swift에서 import 하지 않음
//    (Bridging-Header에  #import <AppSaferFramework/AppSafer.h>  추가되어 있어야 함)

@main
class AppDelegate: UIResponder, UIApplicationDelegate {

  var window: UIWindow?
  var blurView: UIVisualEffectView?

  // React Native
  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  // AppSafer 인스턴스 (Obj-C 클래스)
  private let appSafer = AppSafer()

  // ⬇️ 콘솔에서 발급된 값으로 교체하세요
  private let APP_SAFER_SERVICE_CODE = "DEFAULT"
  private let APP_SAFER_KEY         = "AAAAPjA8MA0GCSqGSIb3DQEBAQUAAysAMCgCIQC/kL/WhzU1HgKXN0ZmirO/DX573kj5sVar39r1cGlicQIDAQABJyJkY06MPS4w9ONBh3mk205PRUxTQQ=="

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    // --- RN 부트스트랩 ---
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()
    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "unitmgmt",
      in: window,
      launchOptions: launchOptions
    )

    // --- AppSafer 초기화 ---
    let initRet = appSafer.initAppSafer(self,
                                        serviceCode: APP_SAFER_SERVICE_CODE,
                                        key: APP_SAFER_KEY)
    print("[AppSafer] init ret =", initRet)

    // (선택) 사용자 식별자 전달
    _ = appSafer.setUserId("user_\(UIDevice.current.identifierForVendor?.uuidString ?? "unknown")")

    // 스크린 보호/탐지 옵저버 등록 (SDK 제공 API)
    if let win = window {
      AppSafer.registerScreenProtectionObserver(
        win,
        observer: self,
        selector: #selector(onDetectedScreenCapture)
      )
    }

    // 앱 상태 전환 알림 등록 (블러 + SDK 연동)
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(onAppWillResignActive(_:)),
      name: UIApplication.willResignActiveNotification,
      object: nil
    )
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(onAppDidBecomeActive(_:)),
      name: UIApplication.didBecomeActiveNotification,
      object: nil
    )

    // (선택) 초기 무결성 검사 트리거
    _ = appSafer.checkTampering()

    return true
  }

  // MARK: - AppSafer / 화면 보호

  // SDK가 통지하는 캡처/녹화 감지 콜백용 셀렉터
  @objc private func onDetectedScreenCapture() {
    print("[AppSafer] screenshot/record detected")
    addBlurEffect()
  }

  @objc func onAppWillResignActive(_ notification: Notification) {
    // 백그라운드 전환: 화면 가림 + SDK 화면보호 on
    if let win = window {
      AppSafer.preventScreenshot(win, isInvisible: 1) // 1: 가림
    }
    addBlurEffect()
  }

  @objc func onAppDidBecomeActive(_ notification: Notification) {
    // 포그라운드 복귀: 해제
    if let win = window {
      AppSafer.preventScreenshot(win, isInvisible: 0) // 0: 해제
    }
    removeBlurEffect()

    // (선택) 복귀 시 재검사
    _ = appSafer.checkTampering()
  }

  // MARK: - 블러 처리 (네가 쓰던 로직 유지)
  private func addBlurEffect() {
    guard let window = window, blurView == nil else { return }
    let blurEffect = UIBlurEffect(style: .dark)
    let v = UIVisualEffectView(effect: blurEffect)
    v.frame = window.bounds
    v.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    window.addSubview(v)
    blurView = v
  }

  private func removeBlurEffect() {
    blurView?.removeFromSuperview()
    blurView = nil
  }
}

// MARK: - AppSaferDelegate 구현 (필수 2개 + 선택 콜백)
extension AppDelegate: AppSaferDelegate {
  func appSaferDidInitFinish(_ result: Int32) {
    // 0: SAFE/SUCCESS, 1: DETECT, 2: BLOCK, 3: BEFOREINIT, 4: BYPASS, -1: FAIL
    print("[AppSafer] didInitFinish =", result)
    if result == 2 { // BLOCK
      addBlurEffect()
    }
  }

  func appSaferDidCheckTamperingFinish(_ result: Int32) {
    print("[AppSafer] didCheckTamperingFinish =", result)
    switch result {
    case 0: // SAFE
      break
    case 1, 2: // DETECT or BLOCK
      let msg = appSafer.getDetectMessage() ?? ""
      print("[AppSafer] DETECT/BLOCK:", msg)
      addBlurEffect()
      // 필요 시 사용자 안내/종료 처리 등 추가
    default:
      break
    }
  }

  // 선택 콜백 (필요 시 사용)
  func appSaferDetectedJailbreak()      { print("[AppSafer] Jailbreak detected") }
  func appSaferDetectedSimulator()      { print("[AppSafer] Simulator detected") }
  func appSaferDetectedDebugging()      { print("[AppSafer] Debugging detected") }
  func appSaferDetectedMemoryTampered() { print("[AppSafer] Memory tampered detected") }
}

// 기존 RN delegate
class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? { self.bundleURL() }
  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
