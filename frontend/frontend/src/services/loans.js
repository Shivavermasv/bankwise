import { apiFetch } from '../utils/apiClient';

export function applyForLoan({ token, payload }) {
  return apiFetch('/api/loan/apply', {
    method: 'POST',
    token,
    body: payload
  });
}

export function listPendingLoans({ token }) {
  return apiFetch('/api/loan/pending', { token });
}

export function approveLoan({ token, loanId }) {
  return apiFetch(`/api/loan/approve/${loanId}`, {
    method: 'POST',
    token
  });
}

export function rejectLoan({ token, loanId }) {
  return apiFetch(`/api/loan/reject/${loanId}`, {
    method: 'POST',
    token
  });
}

export function updateLoanStatus({ token, loanId, status, adminRemark }) {
  return apiFetch('/api/loan/status', {
    method: 'POST',
    token,
    body: { loanId, status, adminRemark }
  });
}

export function getMyLoans({ token, accountNumber }) {
  return apiFetch(`/api/loan/my/${accountNumber}`, { token });
}

export function getActiveLoan({ token, accountNumber }) {
  return apiFetch(`/api/loan/active/${accountNumber}`, { token });
}

export function repayLoan({ token, loanId, amount }) {
  return apiFetch(`/api/loan/repay/${loanId}?amount=${amount}`, {
    method: 'POST',
    token
  });
}

export function getEmiDetails({ token, loanId }) {
  return apiFetch(`/api/loan/emi-details/${loanId}`, { token });
}
