import { apiFetch } from '../utils/apiClient';

export function fetchNotifications({ token, email }) {
  return apiFetch('/api/notification/notifications', {
    token,
    query: { userEmail: email }
  });
}

export function markNotificationSeen({ token, id }) {
  return apiFetch(`/api/notification/notifications/${id}/seen`, {
    method: 'PATCH',
    token
  });
}
