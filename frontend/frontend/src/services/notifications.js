import { apiFetch, invalidateCache } from '../utils/apiClient';

export function fetchNotifications({ token, email }) {
  return apiFetch('/api/notification/notifications', {
    token,
    query: { userEmail: email }
  });
}

export async function markNotificationSeen({ token, id }) {
  const result = await apiFetch(`/api/notification/notifications/${id}/seen`, {
    method: 'PATCH',
    token
  });
  invalidateCache('/api/notification');
  return result;
}
