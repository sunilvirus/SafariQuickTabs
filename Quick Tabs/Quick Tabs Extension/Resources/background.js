// Quick Tabs — Background Service Worker
// Tracks Most Recently Used (MRU) tab order per window.

const browser = globalThis.browser || globalThis.chrome;

// MRU state: Map<windowId, tabId[]> where index 0 = most recently used
const mruMap = new Map();

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

async function initializeMRU() {
  try {
    const windows = await browser.windows.getAll({ populate: true });
    for (const win of windows) {
      const tabs = win.tabs || [];
      const activeTab = tabs.find(t => t.active);
      const others = tabs.filter(t => !t.active);

      const mru = [];
      if (activeTab) mru.push(activeTab.id);
      for (const t of others) mru.push(t.id);

      mruMap.set(win.id, mru);
    }
  } catch (e) {
    console.error('[QuickTabs] initializeMRU failed:', e);
  }
}

// ---------------------------------------------------------------------------
// Tab event listeners — keep MRU up-to-date
// ---------------------------------------------------------------------------

browser.tabs.onActivated.addListener(({ tabId, windowId }) => {
  let mru = mruMap.get(windowId) || [];
  mru = mru.filter(id => id !== tabId);
  mru.unshift(tabId);
  mruMap.set(windowId, mru);
});

browser.tabs.onCreated.addListener((tab) => {
  const mru = mruMap.get(tab.windowId) || [];
  if (!mru.includes(tab.id)) {
    mru.push(tab.id);
    mruMap.set(tab.windowId, mru);
  }
});

browser.tabs.onRemoved.addListener((tabId, { windowId, isWindowClosing }) => {
  if (isWindowClosing) return;
  const mru = mruMap.get(windowId);
  if (mru) {
    mruMap.set(windowId, mru.filter(id => id !== tabId));
  }
});

browser.windows.onRemoved.addListener((windowId) => {
  mruMap.delete(windowId);
});

browser.tabs.onDetached.addListener((tabId, { oldWindowId }) => {
  const mru = mruMap.get(oldWindowId);
  if (mru) {
    mruMap.set(oldWindowId, mru.filter(id => id !== tabId));
  }
});

browser.tabs.onAttached.addListener((tabId, { newWindowId }) => {
  const mru = mruMap.get(newWindowId) || [];
  if (!mru.includes(tabId)) {
    mru.push(tabId);
    mruMap.set(newWindowId, mru);
  }
});

// ---------------------------------------------------------------------------
// Message handling — respond to popup requests
// ---------------------------------------------------------------------------

browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_MRU_TABS') {
    handleGetMRUTabs(message).then(sendResponse);
    return true; // keep message channel open for async response
  }
  if (message.type === 'SWITCH_TO_TAB') {
    handleSwitchToTab(message).then(sendResponse);
    return true;
  }
  if (message.type === 'OPEN_SETTINGS') {
    handleOpenSettings().then(sendResponse);
    return true;
  }
});

async function handleOpenSettings() {
  try {
    if (browser.runtime && typeof browser.runtime.sendNativeMessage === 'function') {
      const resp = await browser.runtime.sendNativeMessage('application.id', { action: 'open-preferences' });
      return { success: true, resp };
    }
  } catch (e) {
    console.error('[QuickTabs] sendNativeMessage error in background:', e);
    return { success: false, error: String(e) };
  }
  return { success: false, error: 'sendNativeMessage not available' };
}

async function handleGetMRUTabs({ maxTabs }) {
  try {
    const currentWindow = await browser.windows.getCurrent();
    const windowId = currentWindow.id;

    // Query actual tabs to reconcile with in-memory MRU
    const allTabs = await browser.tabs.query({ windowId });
    const tabMap = new Map(allTabs.map(t => [t.id, t]));

    let mru = mruMap.get(windowId) || [];

    // Remove stale entries
    mru = mru.filter(id => tabMap.has(id));

    // Append tabs we might have missed (e.g. after service-worker restart)
    for (const tab of allTabs) {
      if (!mru.includes(tab.id)) {
        mru.push(tab.id);
      }
    }
    mruMap.set(windowId, mru);

    // Build response — top N tabs with details
    const limit = maxTabs || 5;
    const tabs = mru.slice(0, limit).map(id => {
      const tab = tabMap.get(id);
      if (!tab) return null;
      return {
        id: tab.id,
        title: tab.title || 'Untitled',
        favIconUrl: tab.favIconUrl || '',
        url: tab.url || '',
        active: tab.active,
      };
    }).filter(Boolean);

    const currentShortcut = await getLiveShortcut();
    return { tabs, currentShortcut };
  } catch (e) {
    console.error('[QuickTabs] handleGetMRUTabs failed:', e);
    return { tabs: [], currentShortcut: null };
  }
}

async function getLiveShortcut() {
  if (browser.commands && typeof browser.commands.getAll === 'function') {
    try {
      const commands = await browser.commands.getAll();
      const action = commands.find(c => c.name === '_execute_action') || commands[0];
      if (action && action.shortcut && action.shortcut.trim()) {
        return action.shortcut;
      }
    } catch (e) {
      console.warn('[QuickTabs] browser.commands.getAll failed in background:', e);
    }
  }
  return null;
}

async function handleSwitchToTab({ tabId }) {
  try {
    await browser.tabs.update(tabId, { active: true });
    const tab = await browser.tabs.get(tabId);
    await browser.windows.update(tab.windowId, { focused: true });
    return { success: true };
  } catch (e) {
    console.error('[QuickTabs] handleSwitchToTab failed:', e);
    return { success: false, error: e.message };
  }
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

initializeMRU();
