# Quick Tabs — Safari Web Extension

A lightweight, keyboard-driven **Most Recently Used (MRU)** tab switcher for Safari on macOS. Switch between your recent tabs just like `⌘-Tab` for apps or `Alt-Tab` on Windows.

[![macOS](https://img.shields.io/badge/macOS-13%2B-007AFF?logo=apple&logoColor=white)](https://apple.com/macos)
[![Safari](https://img.shields.io/badge/Safari-Web%20Extension-006CFF?logo=safari&logoColor=white)](https://developer.apple.com/safari/extensions/)
[![Permissions](https://img.shields.io/badge/Permissions-tabs%20only-34C759)](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/permissions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## What is Quick Tabs?

By default, Safari cycles tabs spatially (left-to-right in the tab bar). If you are switching back and forth between two working tabs in a window with 30 open tabs, Safari forces you to scroll through all intervening tabs or find them with the mouse.

**Quick Tabs** solves this by tracking your active tab history per window:
- Press the keyboard shortcut to bring up a floating visual picker of your **most recently used tabs**.
- Press the shortcut repeatedly to cycle deeper into your history.
- **Release the modifier key (e.g. `Control`) to switch immediately**.

---

## Why Isn't Control-Tab the Default Shortcut?

> [!IMPORTANT]
> **Why `Control-Tab` cannot be used:**
> 1. **Safari Native Reservation:** In macOS Safari, `Control+Tab` is hard-coded at the application level to Safari's native "Show Next Tab" (spatial navigation). Safari intercepts this shortcut before any web extension or web page can receive it.
> 2. **WebExtensions Standard Restriction:** The cross-browser WebExtensions specification (`manifest.json` `commands` API) strictly disallows the `Tab` key in shortcut definitions.
>
> For these reasons, **`⌃S` (Control + S)** is the default shortcut. It can be triggered quickly with your left hand (`Control` with pinky, `S` with ring finger). You can also customize it to any key combination you prefer via the Change button in Settings.

---

## Features

- **True MRU Cycling** — Tabs are ordered by when you last viewed them, not where they sit on the tab bar.
- **Visual Picker** — Floating macOS-native overlay displaying tab favicons, page titles, and hostnames.
- **Effortless Modifier-Release Selection** — Hold the modifier, tap the key to cycle, and let go to select. No Enter or mouse click needed.
- **Customizable Shortcuts** — Click "Change" in the popup settings to open Safari Extension settings, set your preferred keys (e.g. `⌥S`, `⌃E`, `⌘⇧K`), and Quick Tabs immediately syncs with them.
- **Configurable Tab History** — Choose to display anywhere from 2 to 10 recent tabs (default: 5).
- **Per-Window Isolation** — Each Safari window maintains its own separate tab history.
- **System Appearance** — Seamlessly adapts to macOS Light and Dark mode.
- **Minimal Permissions** — Only requires the `tabs` permission. No content scripts, no web page tracking, no analytics, and zero external network access.

---

## Default Keyboard Controls

| Action | Shortcut / Keystroke |
|---|---|
| **Open & Cycle Forward** | **`⌃S`** (Control + S) |
| **Cycle Next / Previous** | **`Tab`** / **`Shift + Tab`** |
| **Confirm & Switch** | **Release `⌃` (Control)** |
| **Select Specific Tab** | Click any tab in the list |

---

## Installation

### Option 1: Installing a Pre-Built Release (`.dmg` or `.zip`)

1. Download **`QuickTabs.app.zip`** (or `QuickTabs.dmg`) from the [Releases](https://github.com/your-username/QuickTabs/releases) page.
2. Open the file and drag **`Quick Tabs.app`** to your **`/Applications`** folder.

---

## Running Unsigned Releases on macOS

Because Quick Tabs is an open-source project distributed outside the Mac App Store, macOS Gatekeeper and Safari enforce two standard security checks before running it. Follow these steps to set it up:
### 1. Bypassing Gatekeeper in macOS Sequoia/Sonoma
> [!TIP]
> **Terminal One-Liner (if macOS Sequoia/Sonoma blocks the app completely):**
> If macOS displays *"Quick Tabs.app is damaged"* or persistently blocks launch due to download quarantine, run this in Terminal:
> `bash
> xattr -cr /Applications/"Quick Tabs.app"
> ```
> This strips the quarantine flag (`com.apple.quarantine`) and allows the app to launch immediately.

Opening the app once registers the extension with Safari. You can then close the app window.

### 2. Bypassing Gatekeeper in older versions of macOS

When you first open an app downloaded from the internet, macOS may show an alert:
> *"Apple cannot check it for malicious software"* or *"Quick Tabs.app cannot be opened."*

To bypass this check:
- In Finder, open your **`/Applications`** folder.
- **Right-click (or Control-click)** on **`Quick Tabs.app`** and select **Open**.
- In the dialog that appears, click **Open**.
- *(Alternatively on macOS Sequoia / Sonoma)*: Open **System Settings → Privacy & Security**, scroll down to the **Security** section, and click **Open Anyway**.

### 3. Enabling the Extension in Safari

By default, Safari only loads extensions signed with a paid Apple Developer ID. To enable open-source/unsigned extensions:

1. Open **Safari**.
2. Press **`⌘ ,`** (or go to **Safari → Settings…**) and navigate to the **Advanced** tab.
3. Check **"Show features for web developers"** (on older macOS versions, *"Show Develop menu in menu bar"*).
4. In Safari’s top menu bar, click **Develop → Allow Unsigned Extensions**.
   *(Enter your Mac password or Touch ID when prompted)*.
5. In **Safari Settings**, switch to the **Extensions** tab and check the box next to **Quick Tabs** to turn it on.

You're all set! Press **`⌃S`** anywhere in Safari to cycle recent tabs.

---

### Option 2: Building from Source (with Xcode)

Requirements: macOS 13 (Ventura) or newer, and Xcode 14+.

1. Clone this repository:
   ```bash
   git clone https://github.com/your-username/QuickTabs.git
   cd QuickTabs
   ```
2. Open the Xcode project:
   ```bash
   open "Quick Tabs/Quick Tabs.xcodeproj"
   ```
3. Select the **Quick Tabs** scheme and press **⌘R** (Run) or build from the command line:
   ```bash
   xcodebuild -project "Quick Tabs/Quick Tabs.xcodeproj" -scheme "Quick Tabs" build
   ```
4. Enable the extension in **Safari → Settings → Extensions**.

### Generating Release Artifacts (`.app`, `.dmg`, `.zip`)

To generate clean production release packages:
```bash
./scripts/release.sh
```
This builds the Release configuration and outputs:
- `dist/Quick Tabs.app` (macOS application bundle)
- `dist/QuickTabs.dmg` (drag-and-drop installer with `/Applications` shortcut)
- `dist/QuickTabs.zip` (compressed application archive for GitHub releases)

---

## Customizing Quick Tabs

Click the **⚙ (Settings)** icon in the top right of the Quick Tabs popup to customize your experience:

### 1. Change the Keyboard Shortcut
In macOS Safari, global extension shortcuts are managed natively by Safari:
1. In Safari, press **⌘,** (Command-comma) to open Settings, then click the **Extensions** tab.
2. Select **Quick Tabs** and click the **Keyboard shortcut** field.
3. Press your desired shortcut (for example, `⌥S`, `⌃E`, or `⌘⇧K`).
4. Quick Tabs automatically detects and adapts to your new shortcut when you cycle tabs! You can also view or synchronize display hints in the popup's Settings (⚙) menu.

### 2. Adjust the Number of Recent Tabs
Use the **"Tabs to show"** slider to set how many tabs appear in the picker (between **2** and **10** tabs).

---

## Privacy & Permissions

Quick Tabs is built with a strict **minimal permissions** principle:

| Permission | Reason |
|---|---|
| **`tabs`** | Required solely to read open tab titles, favicons, and URLs for rendering the switcher list, and to activate the selected tab. |

- ❌ **No Host Permissions (`<all_urls>`)** — Quick Tabs cannot read or modify any web page content.
- ❌ **No Content Scripts** — No code is ever injected into websites.
- ❌ **No Analytics / Telemetry** — Nothing leaves your device; settings are stored exclusively in your local Safari storage.

---

## Architecture

Quick Tabs is structured as a native macOS container app embedding a modern Safari Web Extension:

```
Quick Tabs/
├── Quick Tabs.xcodeproj/
├── Quick Tabs/                                 # macOS Host Application (Cocoa / AppKit)
│   ├── AppDelegate.swift                       # App lifecycle management
│   ├── ViewController.swift                    # Status screen & link to Safari Preferences
│   ├── Assets.xcassets/                        # App icons (16px to 1024px)
│   ├── Base.lproj/Main.storyboard              # Window interface
│   └── Resources/                              # Host app status view
│       └── Base.lproj/Main.html
└── Quick Tabs Extension/                       # Safari Web Extension Target
    ├── Info.plist                              # Web extension bundle configuration
    ├── SafariWebExtensionHandler.swift          # Native messaging bridge
    └── Resources/
        ├── manifest.json                       # WebExtension Manifest V3
        ├── background.js                       # Service worker maintaining per-window MRU order
        ├── popup.html                          # Visual tab picker overlay & settings view
        ├── popup.css                           # Native macOS system appearance styles (Light/Dark)
        ├── popup.js                            # Keyboard cycling controller & shortcut sync
        ├── _locales/en/messages.json           # Localization strings
        └── images/                             # Extension & toolbar icon assets
```

### How MRU Tracking Works Under the Hood
1. **Event Listening**: [`background.js`](Quick%20Tabs/Quick%20Tabs%20Extension/Resources/background.js) monitors `browser.tabs.onActivated`, `onCreated`, `onRemoved`, `onAttached`, and `onDetached`.
2. **Per-Window Map**: An in-memory MRU list is maintained for each Safari window, placing active tabs at index `0`.
3. **Popup Request**: When the shortcut opens [`popup.html`](Quick%20Tabs/Quick%20Tabs%20Extension/Resources/popup.html), [`popup.js`](Quick%20Tabs/Quick%20Tabs%20Extension/Resources/popup.js) fetches the window's MRU list, pre-selects the previous tab (index `1`), and listens for keystrokes.
4. **Instant Switch**: Upon modifier key release, [`popup.js`](Quick%20Tabs/Quick%20Tabs%20Extension/Resources/popup.js) messages the background script to activate the selected tab via `browser.tabs.update(tabId, { active: true })`.

---

## Contributing

Contributions, bug reports, and suggestions are welcome!

1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/my-new-feature`).
3. Commit your changes (`git commit -am 'Add some feature'`).
4. Push to the branch (`git push origin feature/my-new-feature`).
5. Open a Pull Request.

---

## License

This project is licensed under the [MIT License](LICENSE) — created by **Sunil Sayyaparaju**.
