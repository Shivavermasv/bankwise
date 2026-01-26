import { apiFetch } from '../utils/apiClient';

export function registerUser(payload) {
  return apiFetch('/api/create', {
    method: 'POST',
    body: payload
  });
}
