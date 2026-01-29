import { apiFetch, invalidateCache } from '../utils/apiClient';

export async function createSupportTicket({ token, payload }) {
  const result = await apiFetch('/api/support/tickets', {
    method: 'POST',
    token,
    body: payload
  });
  invalidateCache('/api/support');
  return result;
}

export function listMySupportTickets({ token }) {
  return apiFetch('/api/support/tickets/my', {
    token
  });
}
