const runtimeEnv = typeof window !== 'undefined'
  ? (window as Window & { ENV_CONFIG?: Record<string, string> }).ENV_CONFIG
  : undefined;
const BASE = (runtimeEnv?.VITE_NATIVE_PLATFORM_URL || runtimeEnv?.VITE_PLATFORM_API_URL ||
  import.meta.env.VITE_NATIVE_PLATFORM_URL || import.meta.env.VITE_PLATFORM_API_URL ||
  '/api/platform').replace(/\/$/, '');
export const NATIVE_ADMIN_TOKEN_KEY = 'taxiassur-native-admin-token';

async function request(path: string, init: RequestInit = {}) {
  const token = localStorage.getItem(NATIVE_ADMIN_TOKEN_KEY);
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    cache: 'no-store',
    credentials: 'omit',
    signal: init.signal || AbortSignal.timeout(20_000),
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(String(data.error || 'native_auth_error')) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return data;
}

export async function nativeAdminLogin(email: string, password: string) {
  const data = await request('/v1/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  localStorage.setItem(NATIVE_ADMIN_TOKEN_KEY, data.access_token);
  localStorage.setItem('taxiassur_user', JSON.stringify({ ...data.user, cachedAt: Date.now() }));
  localStorage.setItem('taxiassur_permissions', JSON.stringify(data.permissions || []));
  return data;
}

export async function nativeAdminSession() { return request('/v1/auth/session'); }
export async function nativeAdminRequestPasswordReset(email: string) { return request('/v1/auth/request-password-reset', { method: 'POST', body: JSON.stringify({ email }) }); }
export async function nativeAdminResetPassword(token: string, password: string) { return request('/v1/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }); }
export async function nativeAdminLogout() {
  try { await request('/v1/auth/logout', { method: 'POST' }); }
  finally { localStorage.removeItem(NATIVE_ADMIN_TOKEN_KEY); }
}
export async function nativeAdminChangePassword(currentPassword: string, newPassword: string) {
  const data = await request('/v1/auth/change-password', { method: 'POST', body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }) });
  localStorage.removeItem(NATIVE_ADMIN_TOKEN_KEY);
  localStorage.removeItem('taxiassur_user');
  return data;
}
