import UIKit
import Capacitor
import AuthenticationServices
import CryptoKit
import Security

private struct MintondongNativeChromeState {
    let title: String
    let selectedTab: String?
    let showsTabBar: Bool
    let showsNavigationBar: Bool
    let showsBackButton: Bool

    static let hidden = MintondongNativeChromeState(
        title: "민턴동",
        selectedTab: nil,
        showsTabBar: false,
        showsNavigationBar: false,
        showsBackButton: false
    )
}

private protocol MintondongNativeChromeDelegate: AnyObject {
    func nativeChromeDidUpdate(_ state: MintondongNativeChromeState)
}

@objc(NativeChromePlugin)
public final class NativeChromePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeChromePlugin"
    public let jsName = "NativeChrome"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setState", returnType: CAPPluginReturnPromise)
    ]

    fileprivate weak var chromeDelegate: MintondongNativeChromeDelegate?

    @objc public func setState(_ call: CAPPluginCall) {
        guard let title = call.getString("title") else {
            call.reject("Native chrome title is required")
            return
        }

        let state = MintondongNativeChromeState(
            title: title,
            selectedTab: call.getString("selectedTab"),
            showsTabBar: call.getBool("showsTabBar") ?? false,
            showsNavigationBar: call.getBool("showsNavigationBar") ?? false,
            showsBackButton: call.getBool("showsBackButton") ?? false
        )

        DispatchQueue.main.async { [weak self] in
            self?.chromeDelegate?.nativeChromeDidUpdate(state)
            call.resolve()
        }
    }

    fileprivate func emitTabSelected(route: String) {
        notifyListeners("tabSelected", data: ["route": route])
    }

    fileprivate func emitBackRequested() {
        notifyListeners("backRequested", data: [:])
    }
}

@objc(NativeAuthPlugin)
public final class NativeAuthPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeAuthPlugin"
    public let jsName = "NativeAuth"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "signInWithApple", returnType: CAPPluginReturnPromise)
    ]

    private var currentCall: CAPPluginCall?
    private var currentNonce: String?
    private var authorizationController: ASAuthorizationController?

    @objc public func signInWithApple(_ call: CAPPluginCall) {
        guard currentCall == nil else {
            call.reject("APPLE_SIGN_IN_IN_PROGRESS")
            return
        }
        guard let nonce = Self.randomNonce() else {
            call.reject("APPLE_NONCE_GENERATION_FAILED")
            return
        }

        let request = ASAuthorizationAppleIDProvider().createRequest()
        request.requestedScopes = [.fullName, .email]
        request.nonce = Self.sha256(nonce)

        currentCall = call
        currentNonce = nonce
        let controller = ASAuthorizationController(authorizationRequests: [request])
        controller.delegate = self
        controller.presentationContextProvider = self
        authorizationController = controller
        controller.performRequests()
    }

    private static func randomNonce(length: Int = 32) -> String? {
        let characters = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        var bytes = [UInt8](repeating: 0, count: length)
        guard SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes) == errSecSuccess else {
            return nil
        }
        return bytes.map { characters[Int($0) % characters.count] }.map(String.init).joined()
    }

    private static func sha256(_ value: String) -> String {
        SHA256.hash(data: Data(value.utf8)).map { String(format: "%02x", $0) }.joined()
    }

    private func finish(_ result: Result<[String: Any], Error>) {
        guard let call = currentCall else { return }
        currentCall = nil
        currentNonce = nil
        authorizationController = nil
        DispatchQueue.main.async {
            switch result {
            case .success(let data): call.resolve(data)
            case .failure(let error):
                if let authorizationError = error as? ASAuthorizationError,
                   authorizationError.code == .canceled {
                    call.reject("Apple sign-in was cancelled", "APPLE_SIGN_IN_CANCELLED")
                } else {
                    call.reject("Apple sign-in failed", "APPLE_SIGN_IN_FAILED")
                }
            }
        }
    }
}

extension NativeAuthPlugin: ASAuthorizationControllerDelegate,
    ASAuthorizationControllerPresentationContextProviding
{
    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        bridge?.viewController?.view.window ?? ASPresentationAnchor()
    }

    public func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithAuthorization authorization: ASAuthorization
    ) {
        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
              let identityToken = credential.identityToken,
              let idToken = String(data: identityToken, encoding: .utf8),
              let nonce = currentNonce else {
            finish(.failure(NSError(domain: "NativeAuth", code: 1)))
            return
        }

        var result: [String: Any] = ["idToken": idToken, "nonce": nonce]
        if let email = credential.email { result["email"] = email }
        if let givenName = credential.fullName?.givenName { result["givenName"] = givenName }
        if let familyName = credential.fullName?.familyName { result["familyName"] = familyName }
        finish(.success(result))
    }

    public func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithError error: Error
    ) {
        finish(.failure(error))
    }
}

private final class MintondongBridgeViewController: CAPBridgeViewController {
    weak var nativeChromeDelegate: MintondongNativeChromeDelegate?
    private(set) var nativeChromePlugin: NativeChromePlugin?
    private(set) var nativeAuthPlugin: NativeAuthPlugin?

    /// The bundled mobile-web shell intentionally redirects to Production for Release builds.
    /// Debug Simulator builds instead load Vite directly so local routes/server functions are visible.
    override func instanceDescriptor() -> InstanceDescriptor {
        let descriptor = super.instanceDescriptor()
#if DEBUG
        descriptor.serverURL = "http://127.0.0.1:5173"
        descriptor.allowedNavigationHostnames = Array(
            Set(descriptor.allowedNavigationHostnames + ["127.0.0.1", "localhost"])
        )
#else
        // Do not let a stale local server.url from a Debug sync leak into an Archive/Release build.
        descriptor.serverURL = nil
#endif
        return descriptor
    }

    override func capacitorDidLoad() {
        let plugin = NativeChromePlugin()
        plugin.chromeDelegate = nativeChromeDelegate
        bridge?.registerPluginInstance(plugin)
        nativeChromePlugin = plugin

        let authPlugin = NativeAuthPlugin()
        bridge?.registerPluginInstance(authPlugin)
        nativeAuthPlugin = authPlugin
    }
}

private final class MintondongShellViewController: UIViewController,
    MintondongNativeChromeDelegate,
    UITabBarDelegate
{
    private enum Tab: Int, CaseIterable {
        case home
        case club
        case guest
        case tournaments
        case me

        var identifier: String {
            switch self {
            case .home: return "home"
            case .club: return "club"
            case .guest: return "guest"
            case .tournaments: return "tournaments"
            case .me: return "me"
            }
        }

        var title: String {
            switch self {
            case .home: return "홈"
            case .club: return "동호회"
            case .guest: return "게스트"
            case .tournaments: return "대회"
            case .me: return "마이"
            }
        }

        var systemImageName: String {
            switch self {
            case .home: return "house"
            case .club: return "person.3"
            case .guest: return "person.2"
            case .tournaments: return "trophy"
            case .me: return "person"
            }
        }

        var selectedSystemImageName: String {
            switch self {
            case .home: return "house.fill"
            case .club: return "person.3.fill"
            case .guest: return "person.badge.plus"
            case .tournaments: return "trophy.fill"
            case .me: return "person.fill"
            }
        }

        var route: String {
            switch self {
            case .home: return "/"
            case .club: return "/club"
            case .guest: return "/guest"
            case .tournaments: return "/tournaments"
            case .me: return "/me"
            }
        }
    }

    private let tabBar = UITabBar()
    private var tabItems: [UITabBarItem] = []
    private var displayedTab: Tab?
    private let bridgeViewController = MintondongBridgeViewController()
    private var bridgeTopToSafeArea: NSLayoutConstraint!
    private var bridgeBottomToView: NSLayoutConstraint!
    private var bridgeBottomToTabBar: NSLayoutConstraint!
    private var tabBarHeight: NSLayoutConstraint!
    private var chromeState = MintondongNativeChromeState.hidden
    private var keyboardVisible = false
    private var keyboardObservers: [NSObjectProtocol] = []

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground

        configureBridgeContainment()
        configureTabBar()
        configureKeyboardObservers()
        applyChromeState(animated: false)
    }

    override func viewSafeAreaInsetsDidChange() {
        super.viewSafeAreaInsetsDidChange()
        tabBarHeight?.constant = 49 + view.safeAreaInsets.bottom
    }

    deinit {
        for observer in keyboardObservers {
            NotificationCenter.default.removeObserver(observer)
        }
    }

    private func configureBridgeContainment() {
        bridgeViewController.nativeChromeDelegate = self
        addChild(bridgeViewController)
        let bridgeView = bridgeViewController.view!
        bridgeView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(bridgeView)

        bridgeTopToSafeArea = bridgeView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor)
        bridgeTopToSafeArea.isActive = true

        NSLayoutConstraint.activate([
            bridgeView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            bridgeView.trailingAnchor.constraint(equalTo: view.trailingAnchor)
        ])
        bridgeBottomToView = bridgeView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        bridgeBottomToTabBar = bridgeView.bottomAnchor.constraint(equalTo: tabBar.topAnchor)
        bridgeBottomToView.isActive = true
        bridgeViewController.didMove(toParent: self)
    }

    private func configureTabBar() {
        tabBar.translatesAutoresizingMaskIntoConstraints = false
        tabBar.delegate = self
        tabBar.tintColor = .label
        tabBar.unselectedItemTintColor = .secondaryLabel

        let appearance = UITabBarAppearance()
        appearance.configureWithDefaultBackground()
        appearance.backgroundColor = .systemBackground
        tabBar.standardAppearance = appearance
        if #available(iOS 15.0, *) {
            tabBar.scrollEdgeAppearance = appearance
        }

        tabItems = Tab.allCases.map { tab in
            let item = UITabBarItem(
                title: tab.title,
                image: UIImage(systemName: tab.systemImageName),
                selectedImage: UIImage(systemName: tab.selectedSystemImageName)
            )
            item.tag = tab.rawValue
            item.accessibilityLabel = tab.title
            return item
        }
        tabBar.items = tabItems
        tabBar.isHidden = true
        view.addSubview(tabBar)

        tabBarHeight = tabBar.heightAnchor.constraint(equalToConstant: 49 + view.safeAreaInsets.bottom)
        NSLayoutConstraint.activate([
            tabBar.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            tabBar.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            tabBar.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            tabBarHeight
        ])
    }

    private func configureKeyboardObservers() {
        keyboardObservers.append(
            NotificationCenter.default.addObserver(
                forName: UIResponder.keyboardWillShowNotification,
                object: nil,
                queue: .main
            ) { [weak self] _ in
                self?.keyboardVisible = true
                self?.applyChromeState(animated: true)
            }
        )
        keyboardObservers.append(
            NotificationCenter.default.addObserver(
                forName: UIResponder.keyboardWillHideNotification,
                object: nil,
                queue: .main
            ) { [weak self] _ in
                self?.keyboardVisible = false
                self?.applyChromeState(animated: true)
            }
        )
    }

    func nativeChromeDidUpdate(_ state: MintondongNativeChromeState) {
        chromeState = state
        applyChromeState(animated: true)
    }

    func tabBar(_ tabBar: UITabBar, didSelect item: UITabBarItem) {
        guard let tab = Tab(rawValue: item.tag) else { return }
        guard displayedTab?.identifier != tab.identifier else { return }
        displayedTab = tab
        bridgeViewController.nativeChromePlugin?.emitTabSelected(route: tab.route)
    }

    private func updateTabSelection(selected: Tab?) {
        displayedTab = selected
        if let selected, tabItems.indices.contains(selected.rawValue) {
            tabBar.selectedItem = tabItems[selected.rawValue]
        } else {
            tabBar.selectedItem = nil
        }
    }

    private func applyChromeState(animated: Bool) {
        let apply = {
            let shouldShowTabBar = self.chromeState.showsTabBar && !self.keyboardVisible
            self.tabBar.isHidden = !shouldShowTabBar
            self.bridgeBottomToView.isActive = !shouldShowTabBar
            self.bridgeBottomToTabBar.isActive = shouldShowTabBar

            if let selectedTab = self.chromeState.selectedTab,
               let tab = Tab.allCases.first(where: { $0.identifier == selectedTab }) {
                self.updateTabSelection(selected: tab)
            } else {
                self.updateTabSelection(selected: nil)
            }
            self.view.layoutIfNeeded()
        }

        if animated {
            UIView.animate(withDuration: 0.15, animations: apply)
        } else {
            apply()
        }
    }

}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = MintondongShellViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
