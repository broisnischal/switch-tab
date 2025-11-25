// Options page for customizing keyboard shortcuts

// Extend Chrome commands API to include update method
interface ChromeCommands extends chrome.commands.Command {
  update?: (detail: { name: string; shortcut?: string }) => Promise<void>;
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
    } else {
      throw new Error("chrome.commands.update is not available in this browser");
    }

    showStatus("Shortcut updated successfully! Try it out.", "success");
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
    const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
    const defaultShortcut = isMac ? "MacCtrl+Shift+D" : "Ctrl+Shift+D";

    // Update the command (using type assertion since update might not be in types)
    const commandsAPI = chrome.commands as any;
    if (commandsAPI.update) {
      await commandsAPI.update({
        name: "open-tab-switcher",
        shortcut: defaultShortcut,
      });
    } else {
      throw new Error("chrome.commands.update is not available in this browser");
    }

    showStatus("Shortcut reset to default", "success");
    updateShortcutDisplay();
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

// Open Chrome shortcuts page
function openChromeShortcuts() {
  chrome.tabs.create({
    url: "chrome://extensions/shortcuts",
  });
}

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  // Update shortcut display
  await updateShortcutDisplay();

  // Record shortcut button
  const recordBtn = document.getElementById("record-shortcut-btn");
  if (recordBtn) {
    recordBtn.addEventListener("click", () => {
      startRecording();
    });
  }

  // Reset shortcut button
  const resetBtn = document.getElementById("reset-shortcut-btn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      resetShortcut();
    });
  }

  // Chrome shortcuts link
  const shortcutsLink = document.getElementById("chrome-shortcuts-link");
  if (shortcutsLink) {
    shortcutsLink.addEventListener("click", (e) => {
      e.preventDefault();
      openChromeShortcuts();
    });
  }

  // Keyboard event listeners for recording
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);

  // Focus on window to capture keyboard events
  window.focus();
});

