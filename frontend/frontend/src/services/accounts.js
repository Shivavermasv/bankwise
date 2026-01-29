import { apiFetch, listDepositRequests, performDepositAction, startGlobalLoading, stopGlobalLoading, invalidateCache } from '../utils/apiClient';
import { buildUrl } from '../utils/apiClient';

/**
 * Generate UUID v4 for idempotency key
 */
const generateIdempotencyKey = () => {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
};

export async function createDepositRequest({ token, accountNumber, amount, reference }) {
  // Generate idempotency key to prevent duplicate deposits on retry
  const idempotencyKey = generateIdempotencyKey();
  const result = await apiFetch('/api/account/deposit', {
    method: 'POST',
    token,
    headers: {
      'Idempotency-Key': idempotencyKey
    },
    body: { accountNumber, amount, refferenceNumber: reference }
  });
  
  // Invalidate caches after deposit request
  invalidateCache('/api/account');
  invalidateCache('/api/transaction');
  invalidateCache('/api/analytics');
  
  return result;
}

export async function updateInterestRate({ token, accountNumber, newInterestRate }) {
  const result = await apiFetch('/api/account/interestRate', {
    token,
    query: { accountNumber, newInterestRate }
  });
  invalidateCache('/api/account');
  return result;
}

export async function updateAccountStatus({ token, accountNumber, status }) {
  const result = await apiFetch(`/api/account/updateAccountStatus/${encodeURIComponent(accountNumber)}`, {
    method: 'PATCH',
    token,
    body: { status }
  });
  invalidateCache('/api/account');
  invalidateCache('/api/admin');
  return result;
}

export function submitKyc({ token, formData }) {
  startGlobalLoading();
  return fetch(buildUrl('/api/account/submit'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData
  }).then(async (res) => {
    if (res.ok) return res;
    const contentType = res.headers.get('content-type') || '';
    let message = 'Verification failed';
    try {
      if (contentType.includes('application/json')) {
        const data = await res.json();
        message = data?.message || message;
      } else {
        const text = await res.text();
        if (text) message = text;
      }
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }).finally(() => {
    stopGlobalLoading();
  });
}

export function listDeposits({ token, status }) {
  return listDepositRequests({ token, status });
}

export async function depositAction({ token, action, depositRequestId }) {
  const result = await performDepositAction({ token, action, depositRequestId });
  // Invalidate caches after deposit approval/rejection
  invalidateCache('/api/account');
  invalidateCache('/api/transaction');
  invalidateCache('/api/analytics');
  invalidateCache('/api/deposit');
  invalidateCache('/api/admin');
  return result;
}

export function listAdminAccounts({ token, status, query }) {
  const queryParams = {};
  if (status && status !== 'ALL') queryParams.status = status;
  if (query) queryParams.q = query;
  return apiFetch('/api/account/admin/accounts', {
    token,
    query: queryParams
  });
}

export function fetchKycDetails({ token, accountNumber }) {
  return apiFetch(`/api/account/admin/kyc/${encodeURIComponent(accountNumber)}`, {
    token
  });
}

export async function fetchKycPdf({ token, accountNumber }) {
  const res = await fetch(buildUrl(`/api/account/admin/kyc/${encodeURIComponent(accountNumber)}/pdf`), {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Failed to load KYC PDF');
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export async function fetchKycDocument({ token, accountNumber, type }) {
  const res = await fetch(buildUrl(`/api/account/admin/kyc/${encodeURIComponent(accountNumber)}/document/${type}`), {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Failed to load document');
  }
  const contentType = res.headers.get('content-type') || '';
  const blob = await res.blob();
  return { url: URL.createObjectURL(blob), contentType };
}

export function searchRecipients({ token, query }) {
  return apiFetch('/api/account/recipients/search', {
    token,
    query: { q: query }
  });
}
