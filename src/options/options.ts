// Options page for customizing keyboard shortcuts

// Detect if we're running in Firefox
function isFirefox(): boolean {
  // Check for Firefox-specific APIs
  if (typeof (window as any).browser !== "undefined" && (window as any).browser.runtime) {
    return true;
  }
  // Check user agent
  if (navigator.userAgent.toLowerCase().indexOf("firefox") > -1) {
    return true;
  }
  // Check if chrome.runtime.getBrowserInfo exists (Firefox-specific)
  try {
    if (typeof chrome !== "undefined" && chrome.runtime && typeof (chrome.runtime as any).getBrowserInfo === "function") {
      return true;
    }
  } catch {}
  return false;
}

// Check if browser supports chrome.commands.update
async function supportsCommandsUpdate(): Promise<boolean> {
  try {
    const commandsAPI = chrome.commands as any;
    return typeof commandsAPI.update === "function";
  } catch {
    return false;
  }
}

// Format shortcut for display (e.g., "Ctrl+Shift+D" -> "Ctrl + Shift + D")
function formatShortcut(shortcut: string | undefined): string {
  if (!shortcut) return "Not set";
  
  // Replace common modifiers with display-friendly versions
  return shortcut
    .replace(/Ctrl\+/g, "Ctrl + ")
    .replace(/Command\+/g, "Cmd + ")
    .replace(/Alt\+/g, "Alt + ")
    .replace(/Shift\+/g, "Shift + ")
    .replace(/MacCtrl\+/g, "MacCtrl + ");
}

// Get current shortcut
async function getCurrentShortcut(): Promise<string> {
  try {
    const commands = await chrome.commands.getAll();
    const switcherCommand = commands.find(
      (cmd) => cmd.name === "open-tab-switcher"
    );
    return formatShortcut(switcherCommand?.shortcut);
  } catch (error) {
    console.error("Error getting shortcut:", error);
    return "Error loading shortcut";
  }
}

// Update shortcut display
async function updateShortcutDisplay() {
  const display = document.getElementById("shortcut-display");
  if (display) {
    const shortcut = await getCurrentShortcut();
    display.textContent = shortcut;
  }
}

// Record new shortcut
let isRecording = false;
let recordedKeys: string[] = [];

function startRecording() {
  isRecording = true;
  recordedKeys = [];
  const btn = document.getElementById("record-shortcut-btn") as HTMLButtonElement;
  const display = document.getElementById("shortcut-display");
  
  if (btn) {
    btn.textContent = "Press keys...";
    btn.disabled = true;
    btn.classList.add("recording");
  }
  
  if (display) {
    display.textContent = "Press keys...";
    display.classList.add("recording");
  }

  showStatus("Press your desired keyboard shortcut...", "info");
}

function stopRecording() {
  isRecording = false;
  const btn = document.getElementById("record-shortcut-btn") as HTMLButtonElement;
  const display = document.getElementById("shortcut-display");
  
  if (btn) {
    btn.textContent = "Record Shortcut";
    btn.disabled = false;
    btn.classList.remove("recording");
  }
  
  if (display) {
    display.classList.remove("recording");
  }
}

// Handle keyboard input for recording
function handleKeyDown(event: KeyboardEvent) {
  if (!isRecording) return;

  // Ignore modifier keys by themselves
  if (
    event.key === "Control" ||
    event.key === "Meta" ||
    event.key === "Alt" ||
    event.key === "Shift"
  ) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  const keys: string[] = [];
  
  // Check modifiers (order matters: Ctrl/Cmd, Alt, Shift)
  if (event.ctrlKey || event.metaKey) {
    keys.push(event.metaKey ? "Command" : "Ctrl");
  }
  if (event.altKey) {
    keys.push("Alt");
  }
  if (event.shiftKey) {
    keys.push("Shift");
  }

  // Add the main key
  let mainKey = event.key;
  
  // Handle special keys
  const specialKeyMap: Record<string, string> = {
    " ": "Space",
    "ArrowUp": "Up",
    "ArrowDown": "Down",
    "ArrowLeft": "Left",
    "ArrowRight": "Right",
    "Enter": "Enter",
    "Tab": "Tab",
    "Escape": "Esc",
    "Backspace": "Backspace",
    "Delete": "Delete",
    "Home": "Home",
    "End": "End",
    "PageUp": "PageUp",
    "PageDown": "PageDown",
  };

  if (specialKeyMap[mainKey]) {
    mainKey = specialKeyMap[mainKey];
  } else if (mainKey.length === 1) {
    // Convert single character keys to uppercase
    mainKey = mainKey.toUpperCase();
  }

  // Only proceed if we have at least one modifier and a key
  if (keys.length > 0 && mainKey) {
    keys.push(mainKey);
    recordedKeys = keys;
    const shortcutString = keys.join("+");
    
    // Update display
    const display = document.getElementById("shortcut-display");
    if (display) {
      display.textContent = formatShortcut(shortcutString);
    }

    // Save the shortcut
    saveShortcut(shortcutString);
    
    // Stop recording after a short delay
    setTimeout(() => {
      stopRecording();
      updateShortcutDisplay();
    }, 300);
  } else if (keys.length === 0) {
    // No modifiers - show error
    showStatus("Please use at least one modifier key (Ctrl, Alt, or Shift)", "error");
    setTimeout(() => {
      stopRecording();
      updateShortcutDisplay();
    }, 2000);
  }
}

function handleKeyUp(event: KeyboardEvent) {
  // This is handled in handleKeyDown with setTimeout now
}

// Save shortcut using chrome.commands.update
async function saveShortcut(shortcut: string) {
  try {
    // Check if update is supported
    const supportsUpdate = await supportsCommandsUpdate();
    if (!supportsUpdate) {
      showStatus(
        "Firefox doesn't support programmatic shortcut updates. Please use the 'Manage Extension Shortcuts' button below.",
        "error"
      );
      return;
    }

    // Parse the shortcut
    const parts = shortcut.split("+").map((p) => p.trim());
    const modifiers: string[] = [];
    let key = "";

    for (const part of parts) {
      const upperPart = part.toUpperCase();
      if (upperPart === "CTRL") {
        modifiers.push("Ctrl");
      } else if (upperPart === "COMMAND" || upperPart === "CMD") {
        // On Mac, Command maps to MacCtrl in Chrome's API
        modifiers.push("MacCtrl");
      } else if (upperPart === "ALT") {
        modifiers.push("Alt");
      } else if (upperPart === "SHIFT") {
        modifiers.push("Shift");
      } else {
        key = part;
      }
    }

    if (!key) {
      showStatus("Please include a key (not just modifiers)", "error");
      return;
    }

    if (modifiers.length === 0) {
      showStatus("Please use at least one modifier key", "error");
      return;
    }

    // Build the shortcut string for chrome.commands.update
    // Chrome expects format like "Ctrl+Shift+D" or "MacCtrl+Shift+D"
    const shortcutString = `${modifiers.join("+")}+${key}`;

    // Update the command (using type assertion since update might not be in types)
    const commandsAPI = chrome.commands as any;
    if (commandsAPI.update) {
      await commandsAPI.update({
        name: "open-tab-switcher",
        shortcut: shortcutString,
      });
      showStatus("Shortcut updated successfully! Try it out.", "success");
    } else {
      throw new Error("chrome.commands.update is not available in this browser");
    }
  } catch (error: any) {
    console.error("Error saving shortcut:", error);
    const errorMsg = error.message || "Failed to update shortcut";
    
    // Provide helpful error messages
    if (errorMsg.includes("conflict") || errorMsg.includes("reserved")) {
      showStatus(
        "This shortcut conflicts with a browser shortcut. Please choose another.",
        "error"
      );
    } else {
      showStatus(`Error: ${errorMsg}`, "error");
    }
  }
}

// Reset shortcut to default
async function resetShortcut() {
  try {
    // Check if update is supported
    const supportsUpdate = await supportsCommandsUpdate();
    if (!supportsUpdate) {
      showStatus(
        "Firefox doesn't support programmatic shortcut updates. Please use the 'Manage Extension Shortcuts' button below.",
        "error"
      );
      return;
    }

    const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
    const defaultShortcut = isMac ? "MacCtrl+Shift+D" : "Ctrl+Shift+D";

    // Update the command (using type assertion since update might not be in types)
    const commandsAPI = chrome.commands as any;
    if (commandsAPI.update) {
      await commandsAPI.update({
        name: "open-tab-switcher",
        shortcut: defaultShortcut,
      });
      showStatus("Shortcut reset to default", "success");
      updateShortcutDisplay();
    } else {
      throw new Error("chrome.commands.update is not available in this browser");
    }
  } catch (error: any) {
    console.error("Error resetting shortcut:", error);
    showStatus(
      `Error: ${error.message || "Failed to reset shortcut"}`,
      "error"
    );
  }
}

// Show status message
function showStatus(message: string, type: "success" | "error" | "info" = "info") {
  const statusEl = document.getElementById("status-message");
  if (!statusEl) return;

  statusEl.textContent = message;
  statusEl.className = `status-message ${type}`;

  // Auto-hide after 5 seconds for success/info messages
  if (type === "success" || type === "info") {
    setTimeout(() => {
      statusEl.className = "status-message";
    }, 5000);
  }
}

// Open browser shortcuts page
function openBrowserShortcuts() {
  const firefox = isFirefox();
  const url = firefox 
    ? "about:addons" 
    : "chrome://extensions/shortcuts";
  
  chrome.tabs.create({ url });
  
  if (firefox) {
    showStatus(
      "In Firefox: Click the gear icon → 'Manage Extension Shortcuts' to customize shortcuts.",
      "info"
    );
  }
}

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  const firefox = isFirefox();
  const supportsUpdate = await supportsCommandsUpdate();

  // Update shortcut display
  await updateShortcutDisplay();

  // Record shortcut button
  const recordBtn = document.getElementById("record-shortcut-btn") as HTMLButtonElement;
  if (recordBtn) {
    if (!supportsUpdate) {
      recordBtn.disabled = true;
      recordBtn.title = "Not available in Firefox. Use 'Manage Extension Shortcuts' instead.";
    } else {
      recordBtn.addEventListener("click", () => {
        startRecording();
      });
    }
  }

  // Reset shortcut button
  const resetBtn = document.getElementById("reset-shortcut-btn") as HTMLButtonElement;
  if (resetBtn) {
    if (!supportsUpdate) {
      resetBtn.disabled = true;
      resetBtn.title = "Not available in Firefox. Use 'Manage Extension Shortcuts' instead.";
    } else {
      resetBtn.addEventListener("click", () => {
        resetShortcut();
      });
    }
  }

  // Browser shortcuts link
  const shortcutsLink = document.getElementById("chrome-shortcuts-link");
  if (shortcutsLink) {
    shortcutsLink.textContent = firefox 
      ? "Open Firefox Extension Shortcuts" 
      : "Open Extension Shortcuts";
    shortcutsLink.addEventListener("click", (e) => {
      e.preventDefault();
      openBrowserShortcuts();
    });
  }

  // Show Firefox-specific message
  if (firefox) {
    const infoSection = document.querySelector(".settings-section > div:last-child");
    if (infoSection) {
      const firefoxInfo = document.createElement("div");
      firefoxInfo.style.cssText = `
        font-size: 14px; 
        color: #666666; 
        margin-top: 12px; 
        padding: 12px; 
        background: #f5f5f5; 
        border-radius: 6px; 
        border-left: 3px solid #0066cc;
      `;
      firefoxInfo.innerHTML = "🔥 <strong>Firefox Note:</strong> Firefox doesn't support programmatic shortcut updates. Please use the 'Manage Extension Shortcuts' button above to customize your keyboard shortcuts.";
      
      // Dark mode support
      if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        firefoxInfo.style.background = "#2e2e2e";
        firefoxInfo.style.color = "#999999";
        firefoxInfo.style.borderLeftColor = "#66b3ff";
      }
      
      if (infoSection.parentElement) {
        infoSection.parentElement.insertBefore(firefoxInfo, infoSection);
      }
    }
  }

  // Keyboard event listeners for recording (only if supported)
  if (supportsUpdate) {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.focus();
  }
});

