// Authentication & OTP flow API helpers
import { apiFetch, buildUrl, startGlobalLoading, stopGlobalLoading } from './apiClient';

// Attempt login with credentials. Returns:
// { step: 'otp', email } if OTP required (202)
// { step: 'authenticated', user } if fully logged in (200 with prior OTP verification)
// throws on other errors.
// devPassword: optional developer password to bypass OTP
export async function loginWithCredentials({ email, password, devPassword }) {
  startGlobalLoading();
  let res;
  try {
    res = await fetch(buildUrl('/api/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: email, password, devPassword })
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
  // Parse error response properly
  let errorData;
  try {
    errorData = await res.json();
  } catch {
    errorData = { message: 'Login failed' };
  }
  // Throw an object with errorCode and message for proper error handling
  const error = new Error(errorData.message || 'Login failed');
  error.errorCode = errorData.errorCode;
  error.status = res.status;
  throw error;
}

// Developer-only login with just the dev password (no email/password required)
export async function developerLogin(devPassword) {
  startGlobalLoading();
  let res;
  try {
    res = await fetch(buildUrl('/api/developer/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ devPassword })
    });
  } finally {
    stopGlobalLoading();
  }
  if (res.ok) {
    const data = await res.json();
    return { step: 'authenticated', user: data };
  }
  const errorData = await res.json().catch(() => ({}));
  throw new Error(errorData.error || 'Developer login failed');
}

export async function verifyOtpAndFetchToken({ email, otp }) {
  const data = await apiFetch('/api/verify-otp', {
    method: 'POST',
    body: { email, otp }
  });
  return data;
}
