import { apiFetch, buildUrl, invalidateCache } from '../utils/apiClient';

/**
 * Generate UUID v4 for idempotency key
 */
const generateIdempotencyKey = () => {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
};

export async function transferFunds({ token, fromAccount, toAccount, amount }) {
  // Generate idempotency key to prevent duplicate transfers on retry
  const idempotencyKey = generateIdempotencyKey();
  const result = await apiFetch('/api/transaction/transfer', {
    method: 'POST',
    token,
    headers: {
      'Idempotency-Key': idempotencyKey
    },
    body: { fromAccount, toAccount, amount }
  });
  
  // Update balance in sessionStorage if newBalance is returned
  if (result?.newBalance !== undefined && result?.newBalance !== null) {
    try {
      const user = JSON.parse(sessionStorage.getItem('user') || '{}');
      user.balance = result.newBalance;
      sessionStorage.setItem('user', JSON.stringify(user));
      // Do NOT update localStorage - security risk
    } catch (e) {
      console.error('Failed to update balance in storage:', e);
    }
  }
  
  // Invalidate transaction and account caches after successful transfer
  invalidateCache('/api/transaction');
  invalidateCache('/api/account');
  invalidateCache('/api/analytics');
  
  return result;
}

export function fetchTransactions({ token, accountNumber, page, size, startDate, endDate }) {
  return apiFetch('/api/transaction/transaction', {
    token,
    cache: false, // Always fetch fresh transaction data
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
