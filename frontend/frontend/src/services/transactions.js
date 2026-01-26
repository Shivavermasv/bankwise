import { apiFetch, buildUrl } from '../utils/apiClient';

export function transferFunds({ token, fromAccount, toAccount, amount }) {
  return apiFetch('/api/transaction/transfer', {
    method: 'POST',
    token,
    body: { fromAccount, toAccount, amount }
  });
}

export function fetchTransactions({ token, accountNumber, page, size, startDate, endDate }) {
  return apiFetch('/api/transaction/transaction', {
    token,
    query: { accountNumber, page, size, startDate, endDate }
  });
}

export function fetchRecentTransactions({ token, accountNumber, days = 7, size = 5 }) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const endDate = new Date().toISOString().split('T')[0];
  return fetchTransactions({ token, accountNumber, page: 0, size, startDate, endDate });
}

export async function requestTransactionsPdf({ token, accountNumber, startDate, endDate }) {
  const params = new URLSearchParams({ accountNumber, startDate, endDate });
  const res = await fetch(buildUrl(`/api/transaction/pdf?${params.toString()}`), {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  });
  return res;
}
