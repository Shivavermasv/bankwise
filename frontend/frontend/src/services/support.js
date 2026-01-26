import { apiFetch } from '../utils/apiClient';

export function createSupportTicket({ token, payload }) {
  return apiFetch('/api/support/tickets', {
    method: 'POST',
    token,
    body: payload
  });
}

export function listMySupportTickets({ token }) {
  return apiFetch('/api/support/tickets/my', {
    token
  });
}
