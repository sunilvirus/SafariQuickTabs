//
//  AppDelegate.swift
//  Quick Tabs
//
//  Created by Sunil  Sayyaparaju  on 08/10/26.
//

import Cocoa
import SafariServices

@main
class AppDelegate: NSObject, NSApplicationDelegate {

    func applicationDidFinishLaunching(_ notification: Notification) {
        if CommandLine.arguments.contains("--open-preferences") {
            SFSafariApplication.showPreferencesForExtension(withIdentifier: "com.quicktabs.Quick-Tabs.Extension") { _ in
                DispatchQueue.main.async {
                    NSApplication.shared.terminate(nil)
                }
            }
        }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        return true
    }

}
