// background worker,
import { getCachedTabs, setCachedTabs } from "./storage.js";

async function getRecentlyClosedTabs() {
  try {
    // Get recently closed tabs (last 4)
    const sessions = await chrome.sessions.getRecentlyClosed({ maxResults: 10 });
    const closedTabs = sessions
      .filter((session: any) => session.tab) // Only get tab sessions, not windows
      .map((session: any) => ({
        id: null, // Closed tabs don't have IDs
        title: session.tab.title || '',
        url: session.tab.url || '',
        favIconUrl: session.tab.favIconUrl,
        windowId: session.tab.windowId,
        isClosed: true, // Mark as closed tab
      }))
      .slice(0, 4); // Limit to 4 most recent
    return closedTabs;
  } catch (error) {
    console.error('Error fetching recently closed tabs:', error);
    return [];
  }
}

async function openTabSwitcher() {
  // Try to get cached tabs first
  let allTabs = await getCachedTabs();

  // If cache is expired or doesn't exist, fetch fresh tabs
  if (!allTabs) {
    const freshTabs = await chrome.tabs.query({});
    allTabs = freshTabs as any;
    // Cache the tabs for fast access
    await setCachedTabs(freshTabs);
  }

  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (!tab.id) return;

  // Check if URL is injectable (not chrome:// or extension:// pages)
  const url = tab.url || "";
  if (
    url.startsWith("chrome://") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("edge://")
  ) {
    console.log("Cannot inject content script on this page:", url);
    return;
  }

  // Filter out the currently active tab from the list
  if (!allTabs) {
    console.error("No tabs available");
    return;
  }
  const filteredTabs = allTabs.filter((t: any) => t.id !== tab.id);

  // Get recently closed tabs
  let closedTabs = await getRecentlyClosedTabs();

  // Filter out closed tabs if their URL already exists in opened tabs
  const openedTabUrls = new Set(filteredTabs.map((t: any) => t.url).filter(Boolean));
  closedTabs = closedTabs.filter((closedTab: any) => {
    return closedTab.url && !openedTabUrls.has(closedTab.url);
  });

  // Send toggle message with filtered tabs and closed tabs
  // The content script will handle toggling (open if closed, close if open)
  const message = {
    action: "TOGGLE_SWITCHER",
    tabs: filteredTabs,
    closedTabs: closedTabs,
  };

  // Try to send message with retry logic
  let retries = 3;
  let lastError: any = null;

  while (retries > 0) {
    try {
      await chrome.tabs.sendMessage(tab.id, message);
      return; // Success, exit
    } catch (error: any) {
      lastError = error;
      // Check if it's a connection error
      if (
        error.message?.includes("Could not establish connection") ||
        error.message?.includes("Receiving end does not exist")
      ) {
        retries--;
        if (retries > 0) {
          // Wait a bit and retry (content script might still be loading)
          await new Promise((resolve) => setTimeout(resolve, 200));
          continue;
        }
      } else {
        // Different error, exit immediately
        console.error("Failed to send message to content script:", error);
        return;
      }
    }
  }

  // If we exhausted retries, try injecting the script
  if (lastError) {
    console.log("Content script not found, attempting to inject...");
    try {
      // Inject the content script
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["src/contentScript/index.js"],
      });

      // Inject the CSS
      await chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ["src/styles/styles.css"],
      });

      // Wait for script to initialize
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Try sending the message again with tabs
      await chrome.tabs.sendMessage(tab.id, message);
    } catch (injectError) {
      console.error("Failed to inject content script:", injectError);
    }
  }
}

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "open-tab-switcher") {
    await openTabSwitcher();
  }
});

// Handle action icon click
chrome.action.onClicked.addListener(async () => {
  await openTabSwitcher();
});

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.type === "FETCH_TABS") {
    // Try cache first
    let tabs = await getCachedTabs();
    if (!tabs) {
      // Fetch fresh tabs and cache them
      const freshTabs = await chrome.tabs.query({});
      await setCachedTabs(freshTabs);
      tabs = freshTabs as any;
    }

    // If excludeCurrent is requested, filter out the active tab
    if (request.excludeCurrent && tabs) {
      const [currentTab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      tabs = tabs.filter((t: any) => t.id !== currentTab?.id);
    }

    sendResponse({ tabs: tabs || [] });
    return true; // Required for async sendResponse
  }

  if (request.type === "SWITCH_TAB" && request.tabId) {
    chrome.tabs.get(request.tabId).then((tab) => {
      chrome.tabs.update(request.tabId, { active: true });
      chrome.windows.update(tab.windowId, { focused: true });
    });
  }

  if (request.type === "RESTORE_TAB" && request.url) {
    // Restore a recently closed tab
    chrome.tabs.create({ url: request.url, active: true });
  }

  if (request.type === "FETCH_CLOSED_TABS") {
    let closedTabs = await getRecentlyClosedTabs();

    // Filter out closed tabs if their URL already exists in opened tabs
    const allOpenedTabs = await chrome.tabs.query({});
    const openedTabUrls = new Set(allOpenedTabs.map((t: any) => t.url).filter(Boolean));
    closedTabs = closedTabs.filter((closedTab: any) => {
      return closedTab.url && !openedTabUrls.has(closedTab.url);
    });

    sendResponse({ closedTabs });
    return true;
  }

  // Listen for tab updates to refresh cache
  if (request.type === "TABS_UPDATED") {
    const freshTabs = await chrome.tabs.query({});
    await setCachedTabs(freshTabs);
  }
});

// Listen for tab changes to update cache (with debouncing)
let cacheUpdateTimeout: number | null = null;

function debouncedCacheUpdate() {
  if (cacheUpdateTimeout) {
    clearTimeout(cacheUpdateTimeout);
  }
  cacheUpdateTimeout = setTimeout(async () => {
    const freshTabs = await chrome.tabs.query({});
    await setCachedTabs(freshTabs);
  }, 500) as unknown as number; // Debounce cache updates by 500ms
}

chrome.tabs.onUpdated.addListener(debouncedCacheUpdate);
chrome.tabs.onCreated.addListener(debouncedCacheUpdate);
chrome.tabs.onRemoved.addListener(debouncedCacheUpdate);
