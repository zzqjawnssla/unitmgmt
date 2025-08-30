import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?
  var blurView: UIVisualEffectView?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
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

    // 스크린샷 방지를 위한 알림 리스너 등록 (원래 코드 유지)
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

    return true
  }



  @objc func onAppWillResignActive(_ notification: Notification) {
  addBlurEffect()
  }

  @objc func onAppDidBecomeActive(_ notification: Notification) {
  removeBlurEffect()
  }

  private func addBlurEffect() {
    guard let window = window, blurView == nil else { return }
    let blurEffect = UIBlurEffect(style: .dark)
    blurView = UIVisualEffectView(effect: blurEffect)
    blurView?.frame = window.bounds
    blurView?.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    window.addSubview(blurView!)
  }

  private func removeBlurEffect() {
    blurView?.removeFromSuperview()
    blurView = nil
  }
}

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
