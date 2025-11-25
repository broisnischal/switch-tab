// This script gets injected into any opened page
// whose URL matches the pattern defined in the manifest
// (see "content_script" key).
// Several foreground scripts can be declared
// and injected into the same or different pages.
console.log("Content script loaded");

let palette: HTMLDivElement | null = null;
let allTabsCache: any[] = [];
let closedTabsCache: any[] = [];
let selectedIndex = 0;
let currentTabList: any[] = [];

chrome.runtime.onMessage.addListener(async (msg) => {
  console.log("Content script received:", msg);

  // Handle both OPEN_SWITCHER and TOGGLE_SWITCHER - both will toggle
  if (msg.action === "OPEN_SWITCHER" || msg.action === "TOGGLE_SWITCHER" ||
    msg.type === "OPEN_SWITCHER" || msg.type === "TOGGLE_SWITCHER") {
    togglePalette(msg.tabs, msg.closedTabs);
  }
});

function closePalette() {
  if (palette) {
    palette.style.display = "none";
    // Clear input when closing
    const input = document.getElementById("tab-input") as HTMLInputElement;
    if (input) {
      input.value = "";
    }
    // Restore body scroll
    document.body.style.overflow = "";
  }
}

function togglePalette(tabs?: any[], closedTabs?: any[]) {
  // Check if palette is currently visible
  if (palette && palette.style.display === "flex") {
    closePalette();
  } else {
    openPalette(tabs, closedTabs);
  }
}

async function openPalette(tabs?: any[], closedTabs?: any[]) {
  console.log("Opening palette");

  // Use provided tabs (already filtered by background script) or fetch them
  if (tabs) {
    // Tabs from background script are already filtered (current tab excluded)
    allTabsCache = tabs;
  } else {
    // Fallback: fetch tabs if not provided
    // Request filtered tabs from background script
    const response = await chrome.runtime.sendMessage({
      type: "FETCH_TABS",
      excludeCurrent: true
    });
    allTabsCache = response?.tabs || [];
  }

  // Use provided closed tabs or fetch them
  if (closedTabs) {
    closedTabsCache = closedTabs;
  } else {
    // Fallback: fetch closed tabs if not provided
    const response = await chrome.runtime.sendMessage({
      type: "FETCH_CLOSED_TABS"
    });
    closedTabsCache = response?.closedTabs || [];
  }

  console.log("Tabs (excluding current):", allTabsCache);
  console.log("Closed tabs:", closedTabsCache);

  if (!palette) renderPalette();

  selectedIndex = 0;
  currentTabList = [...allTabsCache, ...closedTabsCache];
  renderTabList(allTabsCache, closedTabsCache); // Populate list with groups

  palette!.style.display = "flex";

  // Prevent body scroll when palette is open
  document.body.style.overflow = "hidden";

  // Clear input and focus - use double requestAnimationFrame for better reliability
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const input = document.getElementById("tab-input") as HTMLInputElement;
      if (input) {
        input.value = "";
        input.focus();
        // Force focus if needed
        input.select();
      }
    });
  });
}

function renderPalette() {
  palette = document.createElement("div");
  palette.id = "tab-switcher";

  // Tab switching icon SVG
  const tabIconSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 -16 175 175" fill="none" class="tab-icon">
      <g clip-path="url(#clip0)">
        <path d="M174.473 73.5416C174.473 71.7457 174.42 69.9146 174.367 68.1921C174.204 62.8544 174.038 57.5166 173.87 52.1784C173.632 44.5279 173.397 36.8766 173.163 29.2253L173.069 26.1181C172.87 19.607 172.665 12.8746 172.552 6.25369C172.583 5.2993 172.348 4.35513 171.874 3.52801C171.399 2.70088 170.703 2.02373 169.865 1.57356C168.516 0.871322 167.035 0.463063 165.518 0.375127C162.436 0.168427 159.291 0.100426 156.168 0.175176C140.635 0.545026 125.336 0.955341 110.695 1.38694C107.871 1.47079 105.019 1.78233 102.261 2.08328L102.067 2.10487C99.9709 2.33302 98.7626 3.59992 98.5737 5.75857C98.4379 7.29841 98.2936 8.83794 98.1494 10.3771C97.7516 14.6249 97.3402 19.0181 97.1105 23.3556C96.6099 32.8144 96.1791 42.4344 95.7625 51.7378C95.5711 56.0322 95.377 60.3271 95.1804 64.6223C95.1571 64.9691 95.1157 65.3146 95.0575 65.6571C95.0497 65.7097 95.0413 65.7617 95.0335 65.8157L78.9919 66.7042C78.9706 66.6393 78.9505 66.5827 78.9311 66.5275C78.8651 66.3675 78.8173 66.2011 78.7881 66.0308C78.499 60.0075 78.2131 53.9843 77.9311 47.961C77.5727 40.3399 77.2099 32.7194 76.8431 25.0992C76.4718 17.4409 76.1316 11.0977 75.7687 5.13524C75.6025 2.39874 74.64 1.25849 71.9562 0.618242C70.8314 0.349701 69.68 0.211171 68.5234 0.20501C67.1586 0.19786 65.7938 0.180015 64.4285 0.163115C60.4278 0.113715 56.2899 0.0639344 52.2219 0.260234C46.2244 0.549484 40.1312 0.90973 34.2397 1.25618C26.1245 1.73588 17.7325 2.23135 9.47618 2.5492C4.36612 2.7442 1.8584 5.08402 1.09771 10.3568C0.948935 11.2659 0.864944 12.1849 0.846617 13.106C0.846617 16.0527 0.837366 18.9991 0.818823 21.9457C0.785834 29.3226 0.750945 36.9497 0.924945 44.452C1.06013 50.3078 1.32081 56.2546 1.57179 62.0064C1.88356 69.1287 2.20568 76.4933 2.29301 83.7343C2.43531 95.4486 2.32735 107.366 2.22321 118.89C2.18008 123.607 2.14272 128.322 2.11124 133.038C2.08472 137.645 3.25032 138.953 7.77823 139.399C8.1922 139.441 8.6087 139.453 9.02527 139.464C9.28401 139.472 9.53821 139.479 9.79372 139.494C11.4755 139.593 13.1573 139.677 14.8391 139.76C18.5054 139.942 22.2958 140.13 25.9996 140.492C37.8899 141.654 49.9974 141.896 61.7111 142.129C65.2965 142.2 68.8818 142.271 72.4653 142.368C72.6923 142.374 72.9323 142.379 73.18 142.379C73.6412 142.383 74.1024 142.357 74.5598 142.301C75.1684 142.261 75.7622 142.096 76.3056 141.819C76.8489 141.541 77.3302 141.156 77.7209 140.685C78.0456 140.219 78.272 139.691 78.3865 139.134C78.501 138.577 78.501 138.002 78.3871 137.445C77.3308 130.204 77.7273 122.811 78.1103 115.661C78.2338 113.356 78.3612 110.973 78.4389 108.628C78.5294 105.873 78.6562 103.071 78.7791 100.361C79.1407 92.3662 79.5145 84.106 79.0197 75.9395C79.0184 75.4961 79.0721 75.0541 79.1808 74.6245C79.1976 74.54 79.2144 74.4536 79.2312 74.3678L94.8447 73.6749C94.8615 73.7568 94.8777 73.8335 94.8932 73.9062C94.9585 74.1702 95.0019 74.4392 95.0226 74.7103C95.1183 77.8355 95.2062 80.9607 95.2852 84.0872C95.454 90.4039 95.6286 96.9357 95.9048 103.358C96.2774 112.035 96.9023 121.062 97.4049 128.318C97.5821 130.788 97.9476 133.241 98.4967 135.654C99.2406 138.952 100.596 139.506 103.553 139.554C110.569 139.675 117.583 139.806 124.597 139.951C128.311 140.026 132.026 140.099 135.74 140.171C136.407 140.183 137.075 140.198 137.746 140.213C139.816 140.26 141.953 140.309 144.063 140.272C149.722 140.17 155.473 140.026 161.035 139.886L166.933 139.743C167.741 139.743 168.548 139.701 169.352 139.616C172.77 139.194 173.759 138.232 174.165 134.936C174.405 132.923 174.521 130.898 174.512 128.871C174.525 110.521 174.506 91.8644 174.488 73.8224L174.473 73.5416ZM118.628 73.0132C118.455 73.3557 118.245 73.6774 118.003 73.9745C116.968 75.1341 115.893 76.293 114.851 77.4137C114.175 78.1404 113.501 78.869 112.83 79.5996C110.825 81.7934 110.545 84.1788 112.097 85.824C112.419 86.1815 112.811 86.4682 113.248 86.6677C113.685 86.8673 114.157 86.9752 114.637 86.9843H114.691C115.961 86.9843 117.296 86.3206 118.555 85.0622C119.59 84.0287 120.555 82.9094 121.488 81.8271L121.711 81.5671C122.953 80.128 124.191 78.6837 125.422 77.2336C126.491 75.9817 127.561 74.7311 128.632 73.4831C129.966 71.9335 130.528 70.6316 130.401 69.3842C130.271 68.1531 129.487 67.0188 127.921 65.815C124.029 62.825 120.053 59.8049 116.209 56.887L113.642 54.937C111.684 53.4498 110.096 53.3776 108.924 54.7263C107.752 56.0751 107.901 57.9147 109.306 59.5416C110.231 60.563 111.225 61.5189 112.282 62.4019C112.516 62.6073 112.75 62.8128 112.983 63.0182L113.357 63.3432C113.974 63.8512 114.542 64.4168 115.053 65.0331L103.951 65.4647C103.346 59.4885 104.256 16.1604 105.131 9.6624L165.284 8.51346L165.315 8.70898C165.414 9.24022 165.476 9.77751 165.5 10.3175C165.831 27.3089 166.148 44.3008 166.454 61.2936C166.544 66.3714 166.631 71.4492 166.713 76.5264C166.833 83.8896 166.962 91.2522 167.101 98.6141C167.185 102.904 167.304 107.269 167.42 111.488C167.521 115.193 167.623 118.893 167.703 122.596C167.75 124.771 167.738 126.934 167.726 129.223C167.722 130.072 167.716 130.933 167.715 131.811H105.709L103.351 73.6521C108.426 73.1236 113.53 72.9105 118.632 73.0132H118.628ZM10.4801 103.923L10.4652 99.9771C10.4361 91.6499 10.4063 83.0387 10.1146 74.5738C9.91215 68.714 9.5919 62.764 9.28271 57.0096C8.73031 46.7396 8.15921 36.1252 8.24072 25.6673C8.26788 22.1255 8.3151 18.5822 8.36362 14.9227L8.4219 10.3784C17.3722 10.4213 26.3678 9.98395 35.0716 9.5621C46.2057 9.02455 57.7111 8.46796 69.059 8.92101L70.0293 66.7465C69.167 66.8037 68.3132 66.8635 67.4672 66.9252C65.1387 67.0923 62.9395 67.2502 60.7105 67.3152C57.8792 67.3971 54.9962 67.4309 52.2083 67.4634C49.7736 67.4921 47.2567 67.5213 44.7793 67.5824C43.3851 67.5752 41.9993 67.7982 40.6766 68.2409C40.2034 68.4742 39.7932 68.8187 39.481 69.2451C39.1687 69.6715 38.9634 70.1674 38.8828 70.6907C38.7773 71.6163 39.8401 72.746 40.5801 73.0275C41.7873 73.4675 43.0577 73.7093 44.3416 73.7424C50.9064 73.9654 57.581 74.1403 64.0358 74.3086L66.5713 74.3736C67.4613 74.397 68.341 74.3912 69.3585 74.3853L70.3547 74.3801C70.3786 74.7051 70.4038 75.0203 70.4284 75.333C70.5125 76.3847 70.5914 77.3773 70.5914 78.3607C70.5914 84.5273 70.5869 90.6932 70.5772 96.8591C70.5655 105.691 70.5629 114.525 70.5694 123.358C70.5746 125.932 70.6832 128.474 70.7984 131.165C70.8424 132.198 70.887 133.245 70.9277 134.313C50.3131 134.447 29.7197 133.066 10.3585 131.637V131.15C10.3585 130.389 10.3585 129.655 10.3585 128.918C10.3727 126.318 10.3912 123.717 10.414 121.114C10.4567 115.478 10.5027 109.655 10.4801 103.923Z" fill="currentColor"/>
      </g>
      <defs>
        <clipPath id="clip0">
          <rect width="174" height="143" fill="white" transform="translate(0.777344)"/>
        </clipPath>
      </defs>
    </svg>
  `;

  // Overlay + centered search UI
  palette.innerHTML = `
    <div id="tab-overlay"></div>
    <div id="tab-box">
      <div id="tab-input-wrapper">
        ${tabIconSvg}
        <input id="tab-input" type="text" placeholder="Search tabs..." autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" />
      </div>
      <ul id="tab-results"></ul>
    </div>
  `;

  document.body.appendChild(palette);

  const input = document.getElementById("tab-input") as HTMLInputElement;
  // Additional attributes to prevent browser suggestions
  input.setAttribute("autocomplete", "off");
  input.setAttribute("data-form-type", "other");
  input.setAttribute("name", "tab-search-input");
  input.addEventListener("input", handleSearch);

  // Keyboard navigation
  input.addEventListener("keydown", handleKeyNav);

  // Prevent scroll events from propagating to background
  const overlay = document.getElementById("tab-overlay");
  if (overlay) {
    overlay.addEventListener("wheel", (e) => {
      e.preventDefault();
    }, { passive: false });
    overlay.addEventListener("touchmove", (e) => {
      e.preventDefault();
    }, { passive: false });
  }

  // Prevent scroll on the palette container
  palette.addEventListener("wheel", (e) => {
    const target = e.target as HTMLElement;
    const results = document.getElementById("tab-results");
    // Only prevent if scrolling outside the results list
    if (results && !results.contains(target)) {
      e.preventDefault();
    }
  }, { passive: false });
}

// Escape HTML to prevent XSS
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Escape HTML attribute values
function escapeAttr(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function renderTabList(openedTabs: any[], closedTabs: any[] = []) {
  const list = document.getElementById("tab-results");
  if (!list) return;

  // Combine all tabs for navigation purposes
  const allTabs = [...openedTabs, ...closedTabs];
  currentTabList = allTabs;

  // Reset selected index if it's out of bounds
  if (selectedIndex >= allTabs.length) {
    selectedIndex = Math.max(0, allTabs.length - 1);
  }

  // Show "no tabs found" message if no results
  if (allTabs.length === 0) {
    // Clear list safely
    while (list.firstChild) {
      list.removeChild(list.firstChild);
    }
    const noResults = document.createElement('li');
    noResults.className = 'no-results';
    noResults.textContent = 'No tabs found';
    list.appendChild(noResults);
    return;
  }

  // Create default tab icon SVG element (safe, no innerHTML)
  function createDefaultTabIcon(): HTMLElement {
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(
      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M18.9999 4C20.6568 4 21.9999 5.34315 21.9999 7V17C21.9999 18.6569 20.6568 20 18.9999 20H4.99994C3.34308 20 1.99994 18.6569 1.99994 17V7C1.99994 5.34315 3.34308 4 4.99994 4H18.9999ZM19.9999 9.62479H13C12.4478 9.62479 11.8442 9.20507 11.652 8.68732L10.6542 6H4.99994C4.44765 6 3.99994 6.44772 3.99994 7V17C3.99994 17.5523 4.44765 18 4.99994 18H18.9999C19.5522 18 19.9999 17.5523 19.9999 17V9.62479Z" fill="currentColor"/></svg>',
      'image/svg+xml'
    );
    const svgElement = svgDoc.documentElement;
    const container = document.createElement('span');
    container.className = 'tab-favicon-default';
    container.appendChild(svgElement);
    return container;
  }

  // Clear the list safely
  while (list.firstChild) {
    list.removeChild(list.firstChild);
  }
  let itemIndex = 0;

  // Render opened tabs group
  if (openedTabs.length > 0) {
    const groupHeader = document.createElement('li');
    groupHeader.className = 'tab-group-header';
    groupHeader.textContent = 'Opened Tabs';
    list.appendChild(groupHeader);

    openedTabs.forEach((t) => {
      const li = document.createElement('li');
      li.className = `result-item ${itemIndex === selectedIndex ? "selected" : ""}`;
      li.setAttribute('data-tab-id', String(t.id));
      li.setAttribute('data-tab-type', 'opened');

      const faviconUrl = t.favIconUrl || '';
      if (faviconUrl) {
        const img = document.createElement('img');
        img.src = faviconUrl;
        img.alt = '';
        img.className = 'tab-favicon';
        const fallback = createDefaultTabIcon();
        fallback.style.display = 'none';
        img.onerror = () => {
          img.style.display = 'none';
          fallback.style.display = 'inline-block';
        };
        li.appendChild(img);
        li.appendChild(fallback);
      } else {
        const fallback = createDefaultTabIcon();
        li.appendChild(fallback);
      }

      const titleSpan = document.createElement('span');
      titleSpan.className = 'tab-title';
      titleSpan.textContent = t.title || '';
      li.appendChild(titleSpan);
      list.appendChild(li);
      itemIndex++;
    });
  }

  // Render closed tabs group
  if (closedTabs.length > 0) {
    const groupHeader = document.createElement('li');
    groupHeader.className = 'tab-group-header';
    groupHeader.textContent = 'Recently Closed Tabs';
    list.appendChild(groupHeader);

    closedTabs.forEach((t) => {
      const li = document.createElement('li');
      li.className = `result-item ${itemIndex === selectedIndex ? "selected" : ""}`;
      li.setAttribute('data-tab-url', escapeAttr(t.url || ''));
      li.setAttribute('data-tab-type', 'closed');

      const faviconUrl = t.favIconUrl || '';
      if (faviconUrl) {
        const img = document.createElement('img');
        img.src = faviconUrl;
        img.alt = '';
        img.className = 'tab-favicon';
        const fallback = createDefaultTabIcon();
        fallback.style.display = 'none';
        img.onerror = () => {
          img.style.display = 'none';
          fallback.style.display = 'inline-block';
        };
        li.appendChild(img);
        li.appendChild(fallback);
      } else {
        const fallback = createDefaultTabIcon();
        li.appendChild(fallback);
      }

      const titleSpan = document.createElement('span');
      titleSpan.className = 'tab-title';
      titleSpan.textContent = t.title || '';
      li.appendChild(titleSpan);
      list.appendChild(li);
      itemIndex++;
    });
  }

  // Handle clicks - switch tab or restore closed tab
  list.querySelectorAll("li.result-item").forEach((li) => {
    li.addEventListener("click", () => {
      const tabType = li.getAttribute("data-tab-type");
      if (tabType === "closed") {
        const url = li.getAttribute("data-tab-url");
        if (url) {
          restoreTab(url);
        }
      } else {
        const tabId = Number(li.getAttribute("data-tab-id"));
        if (tabId) {
          switchToTab(tabId);
        }
      }
    });
  });

  // Scroll selected item into view
  const selectedItems = list.querySelectorAll("li.result-item");
  if (selectedItems[selectedIndex]) {
    selectedItems[selectedIndex].scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
}

function handleSearch(event: Event) {
  const q = (event.target as HTMLInputElement).value.toLowerCase().trim();

  // Reset selection when searching
  selectedIndex = 0;

  if (!q) {
    renderTabList(allTabsCache, closedTabsCache);
    return;
  }

  // Filter both opened and closed tabs by search query
  const filteredOpened = allTabsCache.filter((t) =>
    t.title.toLowerCase().includes(q)
  );
  const filteredClosed = closedTabsCache.filter((t) =>
    t.title.toLowerCase().includes(q)
  );

  renderTabList(filteredOpened, filteredClosed);
}

function handleKeyNav(event: KeyboardEvent) {
  const list = document.getElementById("tab-results");
  if (!list) return;

  if (event.key === "Escape") {
    closePalette();
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
      if (selectedTab.isClosed) {
        restoreTab(selectedTab.url);
      } else {
        switchToTab(selectedTab.id);
      }
    }
    return;
  }

  // Tab key: only switch if there's a valid selection (not when typing)
  if (event.key === "Tab" && !event.shiftKey) {
    if (
      currentTabList.length > 0 &&
      selectedIndex >= 0 &&
      selectedIndex < currentTabList.length
    ) {
      event.preventDefault();
      const selectedTab = currentTabList[selectedIndex];
      if (selectedTab.isClosed) {
        restoreTab(selectedTab.url);
      } else {
        switchToTab(selectedTab.id);
      }
    }
    // If no selection, allow default Tab behavior (focus next element)
    return;
  }
}

function switchToTab(tabId: number) {
  chrome.runtime.sendMessage({
    type: "SWITCH_TAB",
    tabId,
  });

  // Clear input field
  const input = document.getElementById("tab-input") as HTMLInputElement;
  if (input) {
    input.value = "";
  }

  // Close palette after switching
  closePalette();
}

function restoreTab(url: string) {
  chrome.runtime.sendMessage({
    type: "RESTORE_TAB",
    url,
  });

  // Clear input field
  const input = document.getElementById("tab-input") as HTMLInputElement;
  if (input) {
    input.value = "";
  }

  // Close palette after restoring
  closePalette();
}
