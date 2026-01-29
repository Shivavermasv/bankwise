/**
 * Optimized data fetching with version-based cache invalidation.
 * Only fetches data when it has actually changed on the server.
 * Supports both polling and WebSocket for real-time updates.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const WS_BASE = (import.meta.env.VITE_WS_BASE_URL || API_BASE).replace('http', 'ws');

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

// WebSocket instance for real-time updates
let wsInstance = null;
const wsListeners = new Map();

/**
 * Initialize WebSocket connection for real-time updates
 */
export const initializeWebSocket = (token, onUpdate = () => {}) => {
  if (wsInstance) return wsInstance;

  try {
    const wsUrl = `${WS_BASE}/ws/updates?token=${encodeURIComponent(token)}`;
    wsInstance = new WebSocket(wsUrl);

    wsInstance.onopen = () => {
      console.log('WebSocket connected for real-time updates');
    };

    wsInstance.onmessage = (event) => {
      try {
        const update = JSON.parse(event.data);
        console.log('Real-time update received:', update);
        
        // Update version cache
        if (update.type && update.version !== undefined) {
          versionCache[update.type] = update.version;
          clearCache(update.type); // Invalidate local cache
        }
        
        // Notify all listeners
        onUpdate(update);
        wsListeners.forEach((listener) => listener(update));
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    wsInstance.onerror = (error) => {
      console.error('WebSocket error:', error);
      wsInstance = null;
    };

    wsInstance.onclose = () => {
      console.log('WebSocket disconnected');
      wsInstance = null;
    };

    return wsInstance;
  } catch (error) {
    console.warn('Failed to initialize WebSocket:', error);
    return null;
  }
};

/**
 * Subscribe to real-time updates
 */
export const subscribeToUpdates = (dataType, callback) => {
  const key = `${dataType}-${Math.random()}`;
  wsListeners.set(key, (update) => {
    if (update.type === dataType) {
      callback(update);
    }
  });
  return () => wsListeners.delete(key);
};

/**
 * Close WebSocket connection
 */
export const closeWebSocket = () => {
  if (wsInstance) {
    wsInstance.close();
    wsInstance = null;
  }
  wsListeners.clear();
};

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
 * Smart refresh with fallback to polling if WebSocket unavailable
 */
export const createSmartRefresh = (token, options = {}) => {
  const { interval = 30000, onDataChange = () => {}, useWebSocket = true } = options;
  let intervalId = null;
  let unsubscribeFns = [];

  const start = () => {
    if (useWebSocket) {
      try {
        initializeWebSocket(token, onDataChange);
        
        // Subscribe to all data types
        ['transactions', 'notifications', 'deposits', 'loans'].forEach(type => {
          const unsubscribe = subscribeToUpdates(type, (update) => {
            onDataChange({ [type]: update.version });
          });
          unsubscribeFns.push(unsubscribe);
        });
      } catch {
        console.warn('WebSocket initialization failed, falling back to polling');
      }
    }

    // Always set up polling as fallback
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
    
    unsubscribeFns.forEach(fn => fn());
    unsubscribeFns = [];
    
    closeWebSocket();
  };

  return { start, stop };
};
