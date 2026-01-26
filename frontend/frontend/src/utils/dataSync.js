/**
 * Optimized data fetching with version-based cache invalidation.
 * Only fetches data when it has actually changed on the server.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

// In-memory cache for data versions
const versionCache = {
  transactions: 0,
  notifications: 0,
  deposits: 0,
  loans: 0,
  accounts: 0
};

// Data cache
const dataCache = new Map();

/**
 * Check which data types have changed on the server
 */
export const checkForChanges = async (token, dataTypes = ['transactions', 'notifications', 'deposits', 'loans']) => {
  try {
    const params = new URLSearchParams();
    dataTypes.forEach(type => {
      if (versionCache[type] !== undefined) {
        params.append(`${type}V`, versionCache[type]);
      }
    });

    const response = await fetch(`${API_BASE}/api/data/versions?${params}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) return { hasChanges: true, changed: {} };

    const result = await response.json();
    
    // Update local versions
    if (result.versions) {
      Object.entries(result.versions).forEach(([key, value]) => {
        versionCache[key] = value;
      });
    }

    return result;
  } catch (error) {
    console.warn('Version check failed:', error);
    return { hasChanges: true, changed: {} };
  }
};

/**
 * Fetch data only if it has changed
 */
export const fetchIfChanged = async (token, dataType, fetchFn) => {
  const { changed } = await checkForChanges(token, [dataType]);
  
  if (changed[dataType] === false && dataCache.has(dataType)) {
    return { data: dataCache.get(dataType), fromCache: true };
  }

  const data = await fetchFn();
  dataCache.set(dataType, data);
  return { data, fromCache: false };
};

/**
 * Get lightweight data summary (counts only)
 */
export const fetchDataSummary = async (token) => {
  try {
    const response = await fetch(`${API_BASE}/api/data/summary`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Failed to fetch summary');
    return await response.json();
  } catch (error) {
    console.warn('Summary fetch failed:', error);
    return null;
  }
};

/**
 * Clear cache for specific data type or all
 */
export const clearCache = (dataType = null) => {
  if (dataType) {
    dataCache.delete(dataType);
  } else {
    dataCache.clear();
  }
};

/**
 * Smart refresh hook configuration
 */
export const createSmartRefresh = (token, options = {}) => {
  const { interval = 30000, onDataChange = () => {} } = options;
  let intervalId = null;

  const start = () => {
    if (intervalId) return;
    
    intervalId = setInterval(async () => {
      const result = await checkForChanges(token);
      if (result.hasChanges) {
        onDataChange(result.changed);
      }
    }, interval);
  };

  const stop = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  return { start, stop };
};
