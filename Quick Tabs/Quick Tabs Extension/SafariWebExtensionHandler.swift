//
//  SafariWebExtensionHandler.swift
//  Quick Tabs Extension
//
//  Created by Sunil  Sayyaparaju  on 08/10/26.
//

import SafariServices
import os.log

class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {

    func beginRequest(with context: NSExtensionContext) {
        let request = context.inputItems.first as? NSExtensionItem

        let profile: UUID?
        if #available(iOS 17.0, macOS 14.0, *) {
            profile = request?.userInfo?[SFExtensionProfileKey] as? UUID
        } else {
            profile = request?.userInfo?["profile"] as? UUID
        }

        let message: Any?
        if #available(iOS 15.0, macOS 11.0, *) {
            message = request?.userInfo?[SFExtensionMessageKey]
        } else {
            message = request?.userInfo?["message"]
        }

        os_log(.default, "Received message from browser.runtime.sendNativeMessage: %@ (profile: %@)", String(describing: message), profile?.uuidString ?? "none")

        if let dict = message as? [String: Any], dict["action"] as? String == "open-preferences" {
            DispatchQueue.main.async {
                SFSafariApplication.showPreferencesForExtension(withIdentifier: "com.quicktabs.Quick-Tabs.Extension") { error in
                    if error != nil {
                        if let appURL = NSWorkspace.shared.urlForApplication(withBundleIdentifier: "com.quicktabs.Quick-Tabs") {
                            let config = NSWorkspace.OpenConfiguration()
                            config.arguments = ["--open-preferences"]
                            NSWorkspace.shared.openApplication(at: appURL, configuration: config, completionHandler: nil)
                        }
                    }
                }
            }
        }

        let response = NSExtensionItem()
        if #available(iOS 15.0, macOS 11.0, *) {
            response.userInfo = [ SFExtensionMessageKey: [ "echo": message ] ]
        } else {
            response.userInfo = [ "message": [ "echo": message ] ]
        }

        context.completeRequest(returningItems: [ response ], completionHandler: nil)
    }

}
