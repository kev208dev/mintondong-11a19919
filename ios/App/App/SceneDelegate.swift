import UIKit
import Capacitor

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

private final class MintondongBridgeViewController: CAPBridgeViewController {
    weak var nativeChromeDelegate: MintondongNativeChromeDelegate?
    private(set) var nativeChromePlugin: NativeChromePlugin?

    override func capacitorDidLoad() {
        let plugin = NativeChromePlugin()
        plugin.chromeDelegate = nativeChromeDelegate
        bridge?.registerPluginInstance(plugin)
        nativeChromePlugin = plugin
    }
}

private final class MintondongShellViewController: UIViewController,
    UITabBarDelegate,
    MintondongNativeChromeDelegate
{
    private enum Tab: Int, CaseIterable {
        case home
        case club
        case tournaments
        case me

        var identifier: String {
            switch self {
            case .home: return "home"
            case .club: return "club"
            case .tournaments: return "tournaments"
            case .me: return "me"
            }
        }

        var title: String {
            switch self {
            case .home: return "홈"
            case .club: return "동호회"
            case .tournaments: return "대회"
            case .me: return "마이"
            }
        }

        var systemImageName: String {
            switch self {
            case .home: return "house"
            case .club: return "person.3"
            case .tournaments: return "trophy"
            case .me: return "person"
            }
        }

        var route: String {
            switch self {
            case .home: return "/"
            case .club: return "/club"
            case .tournaments: return "/tournaments"
            case .me: return "/me"
            }
        }
    }

    private let navigationBar = UINavigationBar()
    private let tabBar = UITabBar()
    private let bridgeViewController = MintondongBridgeViewController()
    private var bridgeTopToSafeArea: NSLayoutConstraint!
    private var bridgeTopToNavigationBar: NSLayoutConstraint!
    private var tabBarHeight: NSLayoutConstraint!
    private var chromeState = MintondongNativeChromeState.hidden
    private var keyboardVisible = false
    private var keyboardObservers: [NSObjectProtocol] = []

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground

        configureBridgeContainment()
        configureNavigationBar()
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
        bridgeTopToNavigationBar = bridgeView.topAnchor.constraint(equalTo: navigationBar.bottomAnchor)
        bridgeTopToSafeArea.isActive = true

        NSLayoutConstraint.activate([
            bridgeView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            bridgeView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            bridgeView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
        bridgeViewController.didMove(toParent: self)
    }

    private func configureNavigationBar() {
        navigationBar.translatesAutoresizingMaskIntoConstraints = false
        navigationBar.tintColor = .systemTeal
        navigationBar.isHidden = true
        view.addSubview(navigationBar)

        NSLayoutConstraint.activate([
            navigationBar.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            navigationBar.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            navigationBar.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            navigationBar.heightAnchor.constraint(equalToConstant: 44)
        ])
    }

    private func configureTabBar() {
        tabBar.translatesAutoresizingMaskIntoConstraints = false
        tabBar.delegate = self
        tabBar.tintColor = .systemTeal
        tabBar.items = Tab.allCases.map { tab in
            let item = UITabBarItem(
                title: tab.title,
                image: UIImage(systemName: tab.systemImageName),
                tag: tab.rawValue
            )
            item.accessibilityLabel = tab.title
            return item
        }
        tabBar.isHidden = true
        view.addSubview(tabBar)

        tabBarHeight = tabBar.heightAnchor.constraint(equalToConstant: 49)
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
                self?.tabBar.isHidden = true
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

    private func applyChromeState(animated: Bool) {
        let apply = {
            self.navigationBar.isHidden = !self.chromeState.showsNavigationBar
            self.tabBar.isHidden = !self.chromeState.showsTabBar || self.keyboardVisible
            self.bridgeTopToSafeArea.isActive = false
            self.bridgeTopToNavigationBar.isActive = false
            if self.chromeState.showsNavigationBar {
                self.bridgeTopToNavigationBar.isActive = true
            } else {
                self.bridgeTopToSafeArea.isActive = true
            }

            let item = UINavigationItem(title: self.chromeState.title)
            if self.chromeState.showsBackButton {
                let image = UIImage(systemName: "chevron.backward")
                let backItem: UIBarButtonItem
                if #available(iOS 16.0, *) {
                    backItem = UIBarButtonItem(
                        title: "뒤로",
                        image: image,
                        target: self,
                        action: #selector(self.backRequested)
                    )
                } else {
                    backItem = UIBarButtonItem(
                        image: image,
                        style: .plain,
                        target: self,
                        action: #selector(self.backRequested)
                    )
                    backItem.accessibilityLabel = "뒤로"
                }
                item.leftBarButtonItem = backItem
            }
            self.navigationBar.setItems([item], animated: false)

            if let selectedTab = self.chromeState.selectedTab,
               let tab = Tab.allCases.first(where: { $0.identifier == selectedTab }),
               let tabItem = self.tabBar.items?.first(where: { $0.tag == tab.rawValue }) {
                self.tabBar.selectedItem = tabItem
            } else {
                self.tabBar.selectedItem = nil
            }
            self.view.layoutIfNeeded()
        }

        if animated {
            UIView.animate(withDuration: 0.15, animations: apply)
        } else {
            apply()
        }
    }

    @objc private func backRequested() {
        bridgeViewController.nativeChromePlugin?.emitBackRequested()
    }

    func tabBar(_ tabBar: UITabBar, didSelect item: UITabBarItem) {
        guard let tab = Tab(rawValue: item.tag) else { return }
        bridgeViewController.nativeChromePlugin?.emitTabSelected(route: tab.route)
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
