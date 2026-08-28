import { PLATFORM_BASE_URL } from './platform-api';

export interface ClientPlatformSession {
  ok: true;
  user: Record<string, unknown>;
  lead: Record<string, unknown>;
  documents: Array<Record<string, unknown>>;
  quotes: Array<Record<string, unknown>>;
  notifications: Array<Record<string, unknown>>;
  payments: Array<Record<string, unknown>>;
  claims: Array<Record<string, unknown>>;
  requests: Array<Record<string, unknown>>;
  contracts: Array<Record<string, unknown>>;
  referrals: Array<Record<string, unknown>>;
  referral_code: string;
  insurance_company: Record<string, unknown> | null;
  subscription: Record<string, unknown> | null;
}

async function clientRequest(path: string, token: string, init: RequestInit = {}) {
  const response = await fetch(`${PLATFORM_BASE_URL}${path}`, {
    ...init,
    headers: { 'X-Client-Token': token, ...init.headers },
    credentials: 'omit',
    cache: 'no-store',
    signal: init.signal || AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const error = new Error(String(payload?.error || 'client_platform_unavailable')) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return response;
}

export async function loadClientPlatformSession(token: string): Promise<ClientPlatformSession> {
  const response = await clientRequest('/v1/client/session', token);
  return response.json();
}

export async function markClientPlatformNotifications(token: string, notificationId?: string) {
  const response = await clientRequest('/v1/client/notifications', token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(notificationId ? { notification_id: notificationId } : {}),
  });
  return response.json();
}

export async function createClientPlatformReferral(token: string, referredEmail: string, permissionConfirmed: boolean) {
  const response = await clientRequest('/v1/client/referrals', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ referred_email: referredEmail, permission_confirmed: permissionConfirmed }),
  });
  return response.json();
}

export async function createClientPlatformClaim(token: string, claim: Record<string, unknown>) {
  const response = await clientRequest('/v1/client/claims', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(claim),
  });
  return response.json();
}
