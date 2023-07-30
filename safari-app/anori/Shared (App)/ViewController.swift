import WebKit

#if os(iOS)
    import UIKit
    typealias PlatformViewController = UIViewController
#elseif os(macOS)
    import Cocoa
    import SafariServices
    typealias PlatformViewController = NSViewController
#endif

let extensionBundleIdentifier = "com.olegwock.anori.Extension"

class ViewController: PlatformViewController, WKNavigationDelegate, WKScriptMessageHandler {

    @IBOutlet var webView: WKWebView!

    override func viewDidLoad() {
        super.viewDidLoad()

        self.webView.navigationDelegate = self
        if #available(macOS 13.3, iOS 16.4, *) {
            self.webView.isInspectable = true
        }

        #if os(iOS)
            self.webView.scrollView.isScrollEnabled = false
        #endif

        self.webView.configuration.userContentController.add(self, name: "controller")
        self.webView.configuration.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")
        self.webView.loadFileURL(
            Bundle.main.url(forResource: "Main", withExtension: "html")!,
            allowingReadAccessTo: Bundle.main.resourceURL!)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        NSLog("Web view loaded")
        let langCode = NSLocalizedString("translationLangCode", comment: "")
        NSLog("Land code %@", langCode)
        #if os(iOS)
            webView.evaluateJavaScript("show('ios', '\(langCode)')")
        #elseif os(macOS)
            webView.evaluateJavaScript("show('mac', '\(langCode)')")
        #endif
    }

    func userContentController(
        _ userContentController: WKUserContentController, didReceive message: WKScriptMessage
    ) {
        NSLog("Got message %@", message.body as! String)
        if message.body as! String != "open-preferences" {
            return
        }
        #if os(iOS)
            let url = URL(string: "App-Prefs:Safari&path=WEB_EXTENSIONS/Anori")!
            guard UIApplication.shared.canOpenURL(url) else {
                assertionFailure()
                return
            }
            UIApplication.shared.open(url)
        #elseif os(macOS)
            SFSafariApplication.showPreferencesForExtension(
                withIdentifier: extensionBundleIdentifier
            ) {
                error in
                guard error == nil else {
                    // Insert code to inform the user that something went wrong.
                    return
                }

                DispatchQueue.main.async {
                    NSApplication.shared.terminate(nil)
                }
            }
        #endif
    }

}
