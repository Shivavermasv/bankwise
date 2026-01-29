import { useEffect, useRef, useCallback } from 'react';
import { createSmartRefresh, closeWebSocket } from '../utils/dataSync';

/**
 * Hook for smart data refresh with WebSocket or polling
 * Provides silent updates without forcing page reload
 * 
 * Usage:
 * const { isRefreshing, triggerRefresh } = useSmartDataRefresh(token, {
 *   interval: 30000,
 *   useWebSocket: true,
 *   onDataChange: (changedData) => {
 *     if (changedData.transactions) fetchTransactions();
 *     if (changedData.notifications) fetchNotifications();
 *   }
 * });
 */
export const useSmartDataRefresh = (token, options = {}) => {
  const {
    interval = 30000,
    useWebSocket = true,
    onDataChange = () => {},
    enabled = true
  } = options;

  const refresherRef = useRef(null);
  const onDataChangeRef = useRef(onDataChange);
  const isRefreshingRef = useRef(false);

  // Update callback ref when it changes
  useEffect(() => {
    onDataChangeRef.current = onDataChange;
  }, [onDataChange]);

  // Initialize smart refresh
  useEffect(() => {
    if (!token || !enabled) return;

    // Create refresher with our callback
    refresherRef.current = createSmartRefresh(token, {
      interval,
      useWebSocket,
      onDataChange: (changedData) => {
        isRefreshingRef.current = true;
        onDataChangeRef.current(changedData);
        isRefreshingRef.current = false;
      }
    });

    // Start the refresh mechanism
    refresherRef.current.start();

    // Cleanup on unmount
    return () => {
      if (refresherRef.current) {
        refresherRef.current.stop();
        refresherRef.current = null;
      }
      closeWebSocket();
    };
  }, [token, interval, useWebSocket, enabled]);

  // Manual trigger refresh
  const triggerRefresh = useCallback(async () => {
    isRefreshingRef.current = true;
    if (refresherRef.current) {
      await refresherRef.current.start();
    }
    isRefreshingRef.current = false;
  }, []);

  // Stop refresh
  const stopRefresh = useCallback(() => {
    if (refresherRef.current) {
      refresherRef.current.stop();
    }
  }, []);

  return {
    isRefreshing: isRefreshingRef.current,
    triggerRefresh,
    stopRefresh
  };
};
