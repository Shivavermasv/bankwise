import { fetchAnalytics } from '../utils/apiClient';

export function getAnalytics({ token }) {
  return fetchAnalytics({ token });
}

export function getRealtimeAnalytics({ token }) {
  return fetchAnalytics({ token, realtime: true });
}
