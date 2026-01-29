import { apiFetch, invalidateCache } from '../utils/apiClient';

/**
 * Generate UUID v4 for idempotency key
 */
const generateIdempotencyKey = () => {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
};

export async function applyForLoan({ token, payload }) {
  // Generate idempotency key to prevent duplicate applications on retry
  const idempotencyKey = generateIdempotencyKey();
  const result = await apiFetch('/api/loan/apply', {
    method: 'POST',
    token,
    headers: {
      'Idempotency-Key': idempotencyKey
    },
    body: payload
  });
  
  // Invalidate caches after loan application
  invalidateCache('/api/loan');
  invalidateCache('/api/analytics');
  
  return result;
}

export function listPendingLoans({ token }) {
  return apiFetch('/api/loan/pending', { token });
}

export async function approveLoan({ token, loanId }) {
  const result = await apiFetch(`/api/loan/approve/${loanId}`, {
    method: 'POST',
    token
  });
  
  // Invalidate caches after loan approval
  invalidateCache('/api/loan');
  invalidateCache('/api/account');
  invalidateCache('/api/transaction');
  invalidateCache('/api/analytics');
  invalidateCache('/api/admin');
  invalidateCache('/api/emi');
  
  return result;
}

export async function rejectLoan({ token, loanId }) {
  const result = await apiFetch(`/api/loan/reject/${loanId}`, {
    method: 'POST',
    token
  });
  
  // Invalidate caches after loan rejection
  invalidateCache('/api/loan');
  invalidateCache('/api/analytics');
  invalidateCache('/api/admin');
  
  return result;
}

export async function updateLoanStatus({ token, loanId, status, adminRemark }) {
  const result = await apiFetch('/api/loan/status', {
    method: 'POST',
    token,
    body: { loanId, status, adminRemark }
  });
  
  invalidateCache('/api/loan');
  invalidateCache('/api/analytics');
  invalidateCache('/api/admin');
  
  return result;
}

export function getMyLoans({ token, accountNumber }) {
  return apiFetch(`/api/loan/my/${accountNumber}`, { token });
}

export function getActiveLoan({ token, accountNumber }) {
  return apiFetch(`/api/loan/active/${accountNumber}`, { token });
}

export async function repayLoan({ token, loanId, amount }) {
  const result = await apiFetch(`/api/loan/repay/${loanId}?amount=${amount}`, {
    method: 'POST',
    token
  });
  
  // Invalidate caches after loan repayment
  invalidateCache('/api/loan');
  invalidateCache('/api/account');
  invalidateCache('/api/transaction');
  invalidateCache('/api/analytics');
  invalidateCache('/api/emi');
  
  return result;
}

export function getEmiDetails({ token, loanId }) {
  return apiFetch(`/api/loan/emi-details/${loanId}`, { token });
}
