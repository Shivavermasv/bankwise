import { apiFetch, listDepositRequests, performDepositAction, startGlobalLoading, stopGlobalLoading } from '../utils/apiClient';
import { buildUrl } from '../utils/apiClient';

export function createDepositRequest({ token, accountNumber, amount, reference }) {
  return apiFetch('/api/account/deposit', {
    method: 'POST',
    token,
    body: { accountNumber, amount, refferenceNumber: reference }
  });
}

export function updateInterestRate({ token, accountNumber, newInterestRate }) {
  return apiFetch('/api/account/interestRate', {
    token,
    query: { accountNumber, newInterestRate }
  });
}

export function updateAccountStatus({ token, accountNumber, status }) {
  return apiFetch(`/api/account/updateAccountStatus/${encodeURIComponent(accountNumber)}`, {
    method: 'PATCH',
    token,
    body: { status }
  });
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

export function depositAction({ token, action, depositRequestId }) {
  return performDepositAction({ token, action, depositRequestId });
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
