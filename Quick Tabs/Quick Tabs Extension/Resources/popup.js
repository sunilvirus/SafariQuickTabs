// Quick Tabs — Popup Controller
// Renders the MRU tab list, handles keyboard cycling, and syncs
// the active shortcut configured in Safari Settings.

const browser = globalThis.browser || globalThis.chrome;

// ---------------------------------------------------------------------------
// Constants & Defaults
// ---------------------------------------------------------------------------
const DEFAULT_MAX_TABS = 5;

// How long (ms) between two popup opens counts as "rapid" cycling.
const RAPID_REOPEN_WINDOW_MS = 1500;

const DEFAULT_SHORTCUT = {
  raw: 'MacCtrl+S',
  ctrl: true,
  alt: false,
  shift: false,
  meta: false,
  key: 'S',
  code: 'KeyS',
  display: '⌃S',
  modifierDisplay: '⌃'
};

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let tabs = [];
let selectedIndex = 0;
let isSettingsView = false;
let isLoadingTabs = true;
let modifierReleased = false;
let currentActiveShortcut = DEFAULT_SHORTCUT;

// ---------------------------------------------------------------------------
// Default favicon (inline SVG data-URI — simple globe)
// ---------------------------------------------------------------------------
const DEFAULT_FAVICON = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">' +
  '<circle cx="8" cy="8" r="6" fill="none" stroke="#86868b" stroke-width="1.2"/>' +
  '<ellipse cx="8" cy="8" rx="3" ry="6" fill="none" stroke="#86868b" stroke-width="1.2"/>' +
  '<line x1="2" y1="8" x2="14" y2="8" stroke="#86868b" stroke-width="1.2"/>' +
  '</svg>'
);

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  // Bind listeners immediately so early key events are never missed
  bindEvents();
  const cached = loadCustomShortcut();
  updateShortcutUI(cached);
  init();
});

async function init() {
  const maxTabs = loadMaxTabs();

  // Resolve active shortcut (custom recorded or Safari's live command)
  const activeShortcut = await resolveActiveShortcut();
  updateShortcutUI(activeShortcut);

  // Request MRU list from background
  try {
    const response = await browser.runtime.sendMessage({
      type: 'GET_MRU_TABS',
      maxTabs,
    });
    tabs = response.tabs || [];
    if (response.currentShortcut) {
      const live = parseBrowserCommandShortcut(response.currentShortcut);
      if (live) {
        currentActiveShortcut = live;
        saveCustomShortcut(live);
        updateShortcutUI(live);
      }
    }
  } catch (e) {
    console.error('[QuickTabs] Failed to get MRU tabs:', e);
    tabs = [];
  } finally {
    isLoadingTabs = false;
  }

  // --- Rapid-reopen detection -------------------------------------------
  // If the popup was opened very recently (Safari closed & reopened it on
  // a repeated shortcut press), advance the cycle index automatically.
  const now = Date.now();
  const lastOpen = parseInt(localStorage.getItem('quicktabs_lastOpenTime') || '0', 10);
  const lastIdx  = parseInt(localStorage.getItem('quicktabs_lastIndex')    || '0', 10);

  if (tabs.length > 0 && (now - lastOpen) < RAPID_REOPEN_WINDOW_MS) {
    // Advance from where we left off
    selectedIndex = (lastIdx + 1) % tabs.length;
  } else {
    // Fresh open — pre-select the second tab (previous tab)
    selectedIndex = tabs.length > 1 ? 1 : 0;
  }

  saveCycleState(now);
  renderTabs();

  // If the user released the modifier key while tabs were loading,
  // confirm and switch to the tab immediately.
  if (modifierReleased) {
    confirmSelection();
  }
}

// ---------------------------------------------------------------------------
// Shortcut Resolution
// ---------------------------------------------------------------------------

async function resolveActiveShortcut() {
  // 1. If user recorded a custom shortcut, respect it
  const custom = loadCustomShortcut();
  if (localStorage.getItem('quicktabs_shortcut') && custom && custom.display) {
    return custom;
  }

  // 2. Otherwise query Safari's live command configuration
  if (browser.commands && typeof browser.commands.getAll === 'function') {
    try {
      const commands = await browser.commands.getAll();
      const actionCmd = commands.find(c => c.name === '_execute_action') || commands[0];
      if (actionCmd && actionCmd.shortcut && actionCmd.shortcut.trim()) {
        const parsed = parseBrowserCommandShortcut(actionCmd.shortcut);
        if (parsed) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[QuickTabs] browser.commands.getAll error:', e);
    }
  }

  return DEFAULT_SHORTCUT;
}

function parseBrowserCommandShortcut(rawShortcut) {
  if (!rawShortcut || typeof rawShortcut !== 'string') return null;

  const parts = rawShortcut.split('+').map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) return null;

  let ctrl = false;
  let alt = false;
  let shift = false;
  let meta = false;
  let key = '';

  for (const part of parts) {
    const l = part.toLowerCase();
    if (l === 'macctrl' || l === 'ctrl' || l === 'control') {
      ctrl = true;
    } else if (l === 'command' || l === 'cmd' || l === 'maccmd' || l === 'meta') {
      meta = true;
    } else if (l === 'alt' || l === 'option') {
      alt = true;
    } else if (l === 'shift') {
      shift = true;
    } else {
      key = part;
    }
  }

  if (!key) return null;

  const { display, modifierDisplay } = formatShortcut(ctrl, alt, shift, meta, key);
  return {
    raw: rawShortcut,
    ctrl,
    alt,
    shift,
    meta,
    key,
    code: key.length === 1 && /^[a-zA-Z]$/.test(key) ? `Key${key.toUpperCase()}` : key,
    display,
    modifierDisplay
  };
}

function formatShortcut(ctrl, alt, shift, meta, keyName) {
  let modSymbols = '';
  let mainMod = '⌃';

  // Standard macOS HIG symbol order: ⌃ Control, ⌥ Option, ⇧ Shift, ⌘ Command
  if (ctrl)  { modSymbols += '⌃'; mainMod = '⌃'; }
  if (alt)   { modSymbols += '⌥'; mainMod = '⌥'; }
  if (shift) { modSymbols += '⇧'; }
  if (meta)  { modSymbols += '⌘'; mainMod = '⌘'; }

  let prettyKey = keyName;
  if (keyName === ' ') prettyKey = 'Space';
  else if (keyName === 'ArrowUp') prettyKey = '↑';
  else if (keyName === 'ArrowDown') prettyKey = '↓';
  else if (keyName === 'ArrowLeft') prettyKey = '←';
  else if (keyName === 'ArrowRight') prettyKey = '→';
  else if (keyName.length === 1) prettyKey = keyName.toUpperCase();

  return {
    display: `${modSymbols}${prettyKey}`,
    modifierDisplay: modSymbols || mainMod
  };
}

function updateShortcutUI(shortcut) {
  currentActiveShortcut = shortcut || DEFAULT_SHORTCUT;

  // 1. Settings view shortcut display
  const shortcutSpan = document.getElementById('current-shortcut');
  if (shortcutSpan) shortcutSpan.textContent = currentActiveShortcut.display;

  // 2. Main picker footer hints
  const kbdShortcut = document.getElementById('footer-shortcut-kbd');
  const kbdMod = document.getElementById('footer-mod-kbd');
  if (kbdShortcut) kbdShortcut.textContent = currentActiveShortcut.display;
  if (kbdMod) kbdMod.textContent = currentActiveShortcut.modifierDisplay || '⌃';
}

function autoDetectShortcutFromEvent(e) {
  if (!e.ctrlKey && !e.altKey && !e.metaKey) return;
  if (['Control', 'Alt', 'Shift', 'Meta', 'Tab', 'Escape', 'Enter', 'ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
    return;
  }

  const { display, modifierDisplay } = formatShortcut(e.ctrlKey, e.altKey, e.shiftKey, e.metaKey, e.key);
  const detected = {
    raw: display,
    ctrl: e.ctrlKey,
    alt: e.altKey,
    shift: e.shiftKey,
    meta: e.metaKey,
    key: e.key,
    code: e.code,
    display,
    modifierDisplay
  };

  if (!currentActiveShortcut || currentActiveShortcut.display !== display) {
    currentActiveShortcut = detected;
    saveCustomShortcut(detected);
    updateShortcutUI(detected);
  }
}

// ---------------------------------------------------------------------------
// Cycle-state persistence (survives popup close/reopen)
// ---------------------------------------------------------------------------

function saveCycleState(timestamp) {
  try {
    localStorage.setItem('quicktabs_lastOpenTime', String(timestamp || Date.now()));
    localStorage.setItem('quicktabs_lastIndex', String(selectedIndex));
  } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function renderTabs() {
  const list = document.getElementById('tab-list');
  list.innerHTML = '';

  if (tabs.length === 0) {
    list.innerHTML = '<li class="empty-state">No recent tabs</li>';
    return;
  }

  tabs.forEach((tab, index) => {
    const li = document.createElement('li');
    li.className = 'tab-item' + (index === selectedIndex ? ' selected' : '');
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', String(index === selectedIndex));
    li.dataset.index = index;

    // Favicon
    const favicon = document.createElement('img');
    favicon.className = 'tab-favicon';
    favicon.src = tab.favIconUrl || DEFAULT_FAVICON;
    favicon.alt = '';
    favicon.loading = 'eager';
    favicon.onerror = () => { favicon.src = DEFAULT_FAVICON; };

    // Info block
    const info = document.createElement('div');
    info.className = 'tab-info';

    const title = document.createElement('div');
    title.className = 'tab-title';
    title.textContent = tab.title || 'Untitled';

    const url = document.createElement('div');
    url.className = 'tab-url';
    url.textContent = prettyHost(tab.url);

    info.appendChild(title);
    info.appendChild(url);

    li.appendChild(favicon);
    li.appendChild(info);

    // Active tab indicator (green dot)
    if (tab.active) {
      const dot = document.createElement('div');
      dot.className = 'tab-active-dot';
      dot.title = 'Current tab';
      li.appendChild(dot);
    }

    // Click to switch
    li.addEventListener('click', () => {
      selectedIndex = index;
      confirmSelection();
    });

    list.appendChild(li);
  });

  // Scroll selected item into view
  const sel = list.querySelector('.selected');
  if (sel) sel.scrollIntoView({ block: 'nearest' });
}

function prettyHost(urlStr) {
  try {
    return new URL(urlStr).hostname.replace(/^www\./, '');
  } catch {
    return urlStr || '';
  }
}

// ---------------------------------------------------------------------------
// Keyboard handling
// ---------------------------------------------------------------------------

function bindEvents() {
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  // Settings view toggles
  const settingsBtn = document.getElementById('settings-btn');
  if (settingsBtn) settingsBtn.addEventListener('click', showSettings);

  const backBtn = document.getElementById('back-btn');
  if (backBtn) backBtn.addEventListener('click', showPicker);

  // Change shortcut button (opens Safari Extension settings)
  const changeBtn = document.getElementById('change-shortcut-btn');
  if (changeBtn) changeBtn.addEventListener('click', openExtensionSettings);

  // Max-tabs slider
  const slider = document.getElementById('max-tabs-slider');
  const valueEl = document.getElementById('max-tabs-value');
  if (slider && valueEl) {
    slider.value = loadMaxTabs();
    valueEl.textContent = slider.value;

    slider.addEventListener('input', () => {
      valueEl.textContent = slider.value;
      saveMaxTabs(parseInt(slider.value, 10));
    });
  }
}

async function openExtensionSettings() {
  // 1. Ask background script to trigger nativeMessaging
  try {
    const res = await browser.runtime.sendMessage({ type: 'OPEN_SETTINGS' });
    if (res && res.success) {
      window.close();
      return;
    }
  } catch (e) {
    console.warn('[QuickTabs] background OPEN_SETTINGS error:', e);
  }

  // 2. Try direct sendNativeMessage if supported in popup
  try {
    if (browser.runtime && typeof browser.runtime.sendNativeMessage === 'function') {
      await browser.runtime.sendNativeMessage('application.id', { action: 'open-preferences' });
      window.close();
      return;
    }
  } catch (e) {
    console.warn('[QuickTabs] sendNativeMessage error:', e);
  }

  // 3. Fallback to openOptionsPage
  try {
    if (browser.runtime && typeof browser.runtime.openOptionsPage === 'function') {
      await browser.runtime.openOptionsPage();
      window.close();
      return;
    }
  } catch (e) {
    console.warn('[QuickTabs] openOptionsPage error:', e);
  }
}

function onKeyDown(e) {
  if (isSettingsView) return;

  // 1. Arrow navigation
  if (e.key === 'ArrowDown' || e.key === 'Down') {
    e.preventDefault();
    cycleForward();
    return;
  }
  if (e.key === 'ArrowUp' || e.key === 'Up') {
    e.preventDefault();
    cycleBackward();
    return;
  }

  // 2. Tab cycling (Tab cycles forward, Shift+Tab cycles backward)
  if (e.key === 'Tab') {
    e.preventDefault();
    if (e.shiftKey) {
      cycleBackward();
    } else {
      cycleForward();
    }
    return;
  }

  // 3. Enter selects current tab
  if (e.key === 'Enter') {
    e.preventDefault();
    confirmSelection();
    return;
  }

  // 4. Escape closes picker
  if (e.key === 'Escape') {
    e.preventDefault();
    window.close();
    return;
  }

  // 5. Shortcut cycling:
  // If ANY modifier is held with a letter/symbol key, auto-detect the shortcut and cycle forward
  const isModifierCombo = (e.ctrlKey || e.altKey || e.metaKey) && !['Control', 'Alt', 'Shift', 'Meta'].includes(e.key);
  if (isModifierCombo) {
    e.preventDefault();
    autoDetectShortcutFromEvent(e);
    cycleForward();
    return;
  }

  // 6. Match configured shortcut key even without modifier flags (e.g. if key repeat swallowed modifier state)
  const shortcut = currentActiveShortcut || DEFAULT_SHORTCUT;
  if (shortcut && shortcut.key && e.key.toLowerCase() === shortcut.key.toLowerCase()) {
    e.preventDefault();
    cycleForward();
    return;
  }
}

function onKeyUp(e) {
  if (isSettingsView) return;

  // When the user releases ANY modifier key (Control, Option/Alt, Command/Meta, Shift),
  // confirm selection immediately if no primary modifier remains held.
  if (['Control', 'Alt', 'Meta', 'Shift'].includes(e.key)) {
    if (!e.ctrlKey && !e.altKey && !e.metaKey) {
      if (isLoadingTabs) {
        modifierReleased = true;
      } else {
        confirmSelection();
      }
    }
  }
}

function cycleForward() {
  if (tabs.length === 0) return;
  selectedIndex = (selectedIndex + 1) % tabs.length;
  saveCycleState();
  renderTabs();
}

function cycleBackward() {
  if (tabs.length === 0) return;
  selectedIndex = (selectedIndex - 1 + tabs.length) % tabs.length;
  saveCycleState();
  renderTabs();
}

async function confirmSelection() {
  if (tabs.length === 0 || !tabs[selectedIndex]) return;

  // Clear cycle state so next session starts fresh
  try {
    localStorage.removeItem('quicktabs_lastOpenTime');
    localStorage.removeItem('quicktabs_lastIndex');
  } catch { /* ignore */ }

  const tab = tabs[selectedIndex];
  try {
    await browser.runtime.sendMessage({
      type: 'SWITCH_TO_TAB',
      tabId: tab.id,
    });
  } catch (e) {
    console.error('[QuickTabs] Failed to switch tab:', e);
  }
  window.close();
}

// ---------------------------------------------------------------------------
// View switching
// ---------------------------------------------------------------------------

function showSettings() {
  isSettingsView = true;
  document.getElementById('picker-view').hidden = true;
  document.getElementById('settings-view').hidden = false;
}

function showPicker() {
  isSettingsView = false;
  document.getElementById('settings-view').hidden = true;
  document.getElementById('picker-view').hidden = false;
}

// ---------------------------------------------------------------------------
// Settings persistence
// ---------------------------------------------------------------------------

function loadCustomShortcut() {
  try {
    const raw = localStorage.getItem('quicktabs_shortcut');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.display && parsed.key) return parsed;
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_SHORTCUT };
}

function saveCustomShortcut(shortcut) {
  try {
    localStorage.setItem('quicktabs_shortcut', JSON.stringify(shortcut));
  } catch { /* ignore */ }
}

function loadMaxTabs() {
  try {
    const v = localStorage.getItem('quicktabs_maxTabs');
    if (v !== null) {
      const n = parseInt(v, 10);
      if (n >= 2 && n <= 10) return n;
    }
  } catch { /* ignore */ }
  return DEFAULT_MAX_TABS;
}

function saveMaxTabs(value) {
  try {
    localStorage.setItem('quicktabs_maxTabs', String(value));
  } catch { /* ignore */ }
}
