// This script gets injected into any opened page
// whose URL matches the pattern defined in the manifest
// (see "content_script" key).
// Several foreground scripts can be declared
// and injected into the same or different pages.
console.log("Content script loaded");

let palette: HTMLDivElement | null = null;
let allTabsCache: any[] = [];
let selectedIndex = 0;
let currentTabList: any[] = [];

chrome.runtime.onMessage.addListener(async (msg) => {
  console.log("Content script received:", msg);
  if (msg.action === "OPEN_SWITCHER" || msg.type === "OPEN_SWITCHER") {
    // Use tabs from message if provided, otherwise fetch them
    if (msg.tabs && Array.isArray(msg.tabs)) {
      openPalette(msg.tabs);
    } else {
      openPalette();
    }
  }
});

async function openPalette(tabs?: any[]) {
  console.log("Opening palette");

  // Use provided tabs or fetch them
  if (tabs) {
    allTabsCache = tabs;
  } else {
    // Fallback: fetch tabs if not provided
    const response = await chrome.runtime.sendMessage({ type: "FETCH_TABS" });
    allTabsCache = response?.tabs || [];
  }
  console.log("Tabs:", allTabsCache);

  if (!palette) renderPalette();

  selectedIndex = 0;
  currentTabList = allTabsCache;
  renderTabList(allTabsCache); // Populate list initially

  palette!.style.display = "flex";
  (document.getElementById("tab-input") as HTMLInputElement)?.focus();
}

function renderPalette() {
  palette = document.createElement("div");
  palette.id = "tab-switcher";

  // Overlay + centered search UI
  palette.innerHTML = `
    <div id="tab-overlay"></div>
    <div id="tab-box">
      <input id="tab-input" type="text" placeholder="Search tabs..." />
      <ul id="tab-results"></ul>
    </div>
  `;

  document.body.appendChild(palette);

  const input = document.getElementById("tab-input") as HTMLInputElement;
  input.addEventListener("input", handleSearch);

  // Keyboard navigation
  input.addEventListener("keydown", handleKeyNav);
}

function renderTabList(tabs: any[]) {
  const list = document.getElementById("tab-results");
  if (!list) return;

  currentTabList = tabs;

  // Reset selected index if it's out of bounds
  if (selectedIndex >= tabs.length) {
    selectedIndex = Math.max(0, tabs.length - 1);
  }

  const html = tabs
    .map(
      (t, index) =>
        `<li data-tab-id="${t.id}" class="result-item ${
          index === selectedIndex ? "selected" : ""
        }">${t.title}</li>`
    )
    .join("");

  list.innerHTML = html;

  // clicking a result switches tab
  list.querySelectorAll("li").forEach((li) => {
    li.addEventListener("click", () => {
      const tabId = Number(li.getAttribute("data-tab-id"));
      switchToTab(tabId);
    });
  });

  // Scroll selected item into view
  const selectedItem = list.querySelector(`li:nth-child(${selectedIndex + 1})`);
  if (selectedItem) {
    selectedItem.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
}

function handleSearch(event: Event) {
  const q = (event.target as HTMLInputElement).value.toLowerCase().trim();

  // Reset selection when searching
  selectedIndex = 0;

  if (!q) {
    renderTabList(allTabsCache);
    return;
  }

  const filtered = allTabsCache.filter((t) =>
    t.title.toLowerCase().includes(q)
  );

  renderTabList(filtered);
}

function handleKeyNav(event: KeyboardEvent) {
  const list = document.getElementById("tab-results");
  if (!list) return;

  if (event.key === "Escape") {
    palette!.style.display = "none";
    return;
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();
    selectedIndex = Math.min(selectedIndex + 1, currentTabList.length - 1);
    renderTabList(currentTabList);
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    selectedIndex = Math.max(selectedIndex - 1, 0);
    renderTabList(currentTabList);
    return;
  }

  if (event.key === "Enter") {
    event.preventDefault();
    if (
      currentTabList.length > 0 &&
      selectedIndex >= 0 &&
      selectedIndex < currentTabList.length
    ) {
      const selectedTab = currentTabList[selectedIndex];
      switchToTab(selectedTab.id);
    }
    return;
  }
}

function switchToTab(tabId: number) {
  chrome.runtime.sendMessage({
    type: "SWITCH_TAB",
    tabId,
  });
  // Close palette after switching
  palette!.style.display = "none";
}
