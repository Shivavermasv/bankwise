// Authentication & OTP flow API helpers
import { apiFetch, buildUrl, startGlobalLoading, stopGlobalLoading } from './apiClient';

// Attempt login with credentials. Returns:
// { step: 'otp', email } if OTP required (202)
// { step: 'authenticated', user } if fully logged in (200 with prior OTP verification)
// throws on other errors.
export async function loginWithCredentials({ email, password }) {
  startGlobalLoading();
  let res;
  try {
    res = await fetch(buildUrl('/api/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: email, password })
    });
  } finally {
    stopGlobalLoading();
  }
  if (res.status === 202) {
    return { step: 'otp', email };
  }
  if (res.ok) {
    const data = await res.json();
    return { step: 'authenticated', user: data };
  }
  const text = await res.text();
  throw new Error(text || 'Login failed');
}

export async function verifyOtpAndFetchToken({ email, otp }) {
  const data = await apiFetch('/api/verify-otp', {
    method: 'POST',
    body: { email, otp }
  });
  return data;
}
