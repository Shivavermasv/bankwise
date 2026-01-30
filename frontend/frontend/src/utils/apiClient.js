// Centralized API client wrapper to handle auth headers, error envelope parsing,
// idempotent responses, and defaulting numeric analytics fields.

export const API_BASE = import.meta.env.VITE_API_BASE_URL ;

// Global loading tracking
let activeRequests = 0;
const loadingListeners = new Set();

// ===== REQUEST DEDUPLICATION & CACHING =====
const pendingRequests = new Map(); // In-flight request deduplication
const responseCache = new Map();   // Response cache for GET requests
const CACHE_TTL = 30000;           // 30 second cache TTL

// Request deduplication: If same GET request is in-flight, return same promise
const generateRequestKey = (url, method) => `${method}:${url}`;

// Cache management
const getCachedResponse = (key) => {
  const cached = responseCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  if (cached) responseCache.delete(key);
  return null;
};

const setCachedResponse = (key, data, ttl = CACHE_TTL) => {
  responseCache.set(key, { data, timestamp: Date.now(), ttl });
  // Cleanup old entries if cache gets too large
  if (responseCache.size > 100) {
    const now = Date.now();
    for (const [k, v] of responseCache) {
      if (now - v.timestamp > v.ttl) responseCache.delete(k);
    }
  }
};

// Force clear cache for a path pattern
export const invalidateCache = (pathPattern) => {
  for (const key of responseCache.keys()) {
    if (key.includes(pathPattern)) responseCache.delete(key);
  }
};

// Clear all cache
export const clearApiCache = () => responseCache.clear();

const notifyLoading = () => {
  const isLoading = activeRequests > 0;
  loadingListeners.forEach((listener) => {
    try { listener(isLoading); } catch { /* ignore */ }
  });
};

export const onGlobalLoadingChange = (listener) => {
  loadingListeners.add(listener);
  return () => loadingListeners.delete(listener);
};

export const startGlobalLoading = () => {
  activeRequests += 1;
  notifyLoading();
};

export const stopGlobalLoading = () => {
  activeRequests = Math.max(0, activeRequests - 1);
  notifyLoading();
};

// Default analytics shape per backend specification
export const emptyAnalytics = () => ({
  totalUsers: 0,
  activeUsers: 0,
  totalAccounts: 0,
  verifiedAccounts: 0,
  pendingAccounts: 0,
  suspendedAccounts: 0,
  totalLoans: 0,
  activeLoans: 0,
  pendingLoans: 0,
  rejectedLoans: 0,
  totalDepositRequests: 0,
  pendingDeposits: 0,
  approvedDeposits: 0,
  rejectedDeposits: 0,
  totalApprovedDepositAmount: 0,
  totalSuccessfulTransactionVolume: 0,
  generatedAt: null
});

export const buildUrl = (path) => {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
};

export async function apiFetch(path, { method = 'GET', headers = {}, body, token, query, cache = true, retries = 2 } = {}) {
  const url = new URL(buildUrl(path));
  if (query) {
    Object.entries(query).forEach(([k,v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    });
  }
  
  const urlString = url.toString();
  const requestKey = generateRequestKey(urlString, method);
  
  // For GET requests, check cache first
  if (method === 'GET' && cache) {
    const cached = getCachedResponse(requestKey);
    if (cached !== null) {
      return cached; // Return cached response without loading indicator
    }
  }
  
  // Request deduplication: return existing promise if same request is in-flight
  if (method === 'GET' && pendingRequests.has(requestKey)) {
    return pendingRequests.get(requestKey);
  }
  
  startGlobalLoading();
  const finalHeaders = { ...headers };
  if (token) finalHeaders['Authorization'] = `Bearer ${token}`;
  if (body && !(body instanceof FormData)) finalHeaders['Content-Type'] = finalHeaders['Content-Type'] || 'application/json';

  const executeRequest = async (attemptNum) => {
    try {
      const response = await fetch(urlString, {
        method,
        headers: finalHeaders,
        body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined
      });

      let parsed;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try { parsed = await response.json(); } catch { /* ignore */ }
      } else {
        try { parsed = await response.text(); } catch { /* ignore */ }
      }

      // Normalize error envelope
      if (!response.ok) {
        const errorObj = typeof parsed === 'object' && parsed !== null ? parsed : { message: parsed };
        throw { status: response.status, ...errorObj };
      }

      // Cache successful GET responses
      if (method === 'GET' && cache && parsed !== undefined) {
        setCachedResponse(requestKey, parsed);
      }
      
      // Invalidate related caches on mutations
      if (method !== 'GET') {
        invalidateCache(path.split('?')[0]);
      }

      return parsed;
    } catch (error) {
      // Retry on network errors or 5xx errors
      if (attemptNum < retries && (error.status >= 500 || !error.status)) {
        await new Promise(r => setTimeout(r, 1000 * attemptNum)); // Exponential backoff
        return executeRequest(attemptNum + 1);
      }
      throw error;
    }
  };

  const promise = executeRequest(1).finally(() => {
    stopGlobalLoading();
    pendingRequests.delete(requestKey);
  });

  // Store pending request for deduplication
  if (method === 'GET') {
    pendingRequests.set(requestKey, promise);
  }

  return promise;
}

/**
 * Extract a user-friendly error message from an API error object.
 * Handles various error formats: { error: "..." }, { message: "..." }, string, etc.
 * @param {any} err - The error object from a catch block
 * @param {string} fallback - Default message if no specific error found
 * @returns {string} - The error message to display to user
 */
export function getErrorMessage(err, fallback = 'An unexpected error occurred') {
  if (!err) return fallback;
  
  // Handle string errors
  if (typeof err === 'string') return err;
  
  // Check common error properties in order of preference
  if (err.error && typeof err.error === 'string') return err.error;
  if (err.message && typeof err.message === 'string') return err.message;
  if (err.msg && typeof err.msg === 'string') return err.msg;
  if (err.detail && typeof err.detail === 'string') return err.detail;
  
  // Handle nested error objects
  if (err.response?.data?.error) return err.response.data.error;
  if (err.response?.data?.message) return err.response.data.message;
  
  return fallback;
}

// Helper to fetch analytics (base or realtime) guaranteeing all numeric fields present
export async function fetchAnalytics({ token, realtime = false } = {}) {
  try {
    const path = realtime ? '/api/admin-dashboard/analytics/realtime' : '/api/admin-dashboard/analytics';
    const data = await apiFetch(path, { token });
    const base = emptyAnalytics();
    return { ...base, ...data };
  } catch (e) {
    console.warn('Analytics fetch failed', e);
    return emptyAnalytics();
  }
}

// Deposit action unified endpoint (approve/reject) with idempotent handling
export async function performDepositAction({ token, action, depositRequestId }) {
  try {
    const text = await apiFetch('/api/account/depositAction', {
      method: 'PUT',
      token,
      query: { action, depositRequestId }
    });
    // apiFetch returns parsed JSON or text; if backend sends plain string success
    const message = typeof text === 'string' ? text : (text?.message || 'Success');
    // Idempotent messages treated as success
    return { success: true, message };
  } catch (e) {
    const msg = e.message || e.error || 'Failed to process deposit action';
    // Idempotent fallback just in case backend responded with 4xx but included message
    if (/Already approved|Already rejected/i.test(msg)) {
      return { success: true, message: msg };
    }
    return { success: false, message: msg, status: e.status };
  }
}

// Fetch user details with ownership 403 handling
export async function fetchUserDetailsOwned({ token, accountNumber }) {
  try {
    return await apiFetch(`/api/user/details/${accountNumber}`, { token });
  } catch (e) {
    if (e.status === 403) {
      return { __error: true, ownershipDenied: true, message: e.message || 'You are not authorized to access this account' };
    }
    return { __error: true, message: e.message || 'Failed to load user details' };
  }
}

// List deposit requests by status (ALL|PENDING|DEPOSITED|REJECTED)
export async function listDepositRequests({ token, status = 'PENDING' }) {
  try {
    const data = await apiFetch('/api/account/depositRequests', {
      method: 'GET',
      token,
      query: { status }
    });
    // Backend returns array (or possibly paged); normalize to array
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.content)) return data.content;
    return [];
  } catch (e) {
    console.warn('Failed to list deposit requests', e);
    throw e; // Let caller decide UI handling
  }
}
