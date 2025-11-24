// Tab caching with chrome.storage.local for fast access

const CACHE_KEY = 'switch_tab_cache';
const CACHE_TIMESTAMP_KEY = 'switch_tab_cache_timestamp';
const CACHE_DURATION = 5000; // 5 seconds cache validity

export interface CachedTab {
  id: number;
  title: string;
  url: string;
  windowId: number;
  active: boolean;
  pinned: boolean;
  favIconUrl?: string;
}

export async function getCachedTabs(): Promise<CachedTab[] | null> {
  try {
    const result = await chrome.storage.local.get([CACHE_KEY, CACHE_TIMESTAMP_KEY]);
    const cached = result[CACHE_KEY];
    const timestamp = result[CACHE_TIMESTAMP_KEY];
    
    if (!cached || !timestamp) {
      return null;
    }
    
    const age = Date.now() - parseInt(timestamp, 10);
    if (age > CACHE_DURATION) {
      // Cache expired
      return null;
    }
    
    return cached as CachedTab[];
  } catch (error) {
    console.error('Error reading cache:', error);
    return null;
  }
}

export async function setCachedTabs(tabs: chrome.tabs.Tab[]): Promise<void> {
  try {
    const cacheData: CachedTab[] = tabs.map(tab => ({
      id: tab.id!,
      title: tab.title || '',
      url: tab.url || '',
      windowId: tab.windowId,
      active: tab.active || false,
      pinned: tab.pinned || false,
      favIconUrl: tab.favIconUrl,
    }));
    
    await chrome.storage.local.set({
      [CACHE_KEY]: cacheData,
      [CACHE_TIMESTAMP_KEY]: Date.now().toString(),
    });
  } catch (error) {
    console.error('Error writing cache:', error);
  }
}

export async function clearCache(): Promise<void> {
  try {
    await chrome.storage.local.remove([CACHE_KEY, CACHE_TIMESTAMP_KEY]);
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}
