// background worker,

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "open-tab-switcher") {
    // Fetch all tabs first
    const allTabs = await chrome.tabs.query({});

    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    console.log("Background script received command:", command);
    console.log("Tab:", tab);

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

    // Send message with tabs included
    const message = {
      action: "OPEN_SWITCHER",
      tabs: allTabs,
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
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "FETCH_TABS") {
    chrome.tabs.query({}).then((tabs) => {
      sendResponse({ tabs });
    });
    return true; // Required for async sendResponse
  }

  if (request.type === "SWITCH_TAB" && request.tabId) {
    chrome.tabs.get(request.tabId).then((tab) => {
      chrome.tabs.update(request.tabId, { active: true });
      chrome.windows.update(tab.windowId, { focused: true });
    });
  }
});
