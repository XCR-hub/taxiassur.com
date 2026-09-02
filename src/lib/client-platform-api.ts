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

async function clientRequest(path: string, token: string, init: RequestInit = {}, timeoutMs = 20_000) {
  const response = await fetch(`${PLATFORM_BASE_URL}${path}`, {
    ...init,
    headers: { 'X-Client-Token': token, ...init.headers },
    credentials: 'omit',
    cache: 'no-store',
    signal: init.signal || AbortSignal.timeout(timeoutMs),
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

export async function createClientPlatformRequest(token: string, request: Record<string, unknown>) {
  const response = await clientRequest('/v1/client/requests', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  return response.json();
}

export async function loadClientPlatformConsents(token: string) {
  const response = await clientRequest('/v1/client/consents', token);
  return response.json() as Promise<{ ok: true; consents: Record<string, boolean> }>;
}

export async function updateClientPlatformConsent(token: string, update: Record<string, unknown>) {
  const response = await clientRequest('/v1/client/consents', token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update),
  });
  return response.json();
}

export async function uploadClientPlatformDocument(token: string, file: File, documentType = 'autre') {
  const extension = file.name.toLowerCase().split('.').pop() || '';
  const inferredMime = extension === 'pdf' ? 'application/pdf' : ['jpg', 'jpeg'].includes(extension) ? 'image/jpeg' : extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'application/octet-stream';
  const response = await clientRequest('/v1/prospect/documents', token, {
    method: 'POST',
    headers: {
      'Content-Type': file.type || inferredMime,
      'X-Document-Type': documentType,
      'X-File-Name': encodeURIComponent(file.name),
    },
    body: file,
  }, 60_000);
  return response.json();
}

export async function openClientPlatformDocument(token: string, downloadPath: string, fileName: string, download = false) {
  if (!/^\/v1\/prospect\/(documents|final-documents)\/[0-9a-f-]{36}\/download$/i.test(downloadPath)) {
    throw new Error('invalid_document_path');
  }
  const response = await clientRequest(downloadPath, token);
  const url = URL.createObjectURL(await response.blob());
  if (!download) {
    window.open(url, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName || 'document';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function saveClientPlatformSubscription(token: string, subscription: Record<string, unknown>) {
  const response = await clientRequest('/v1/client/subscription', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription),
  });
  return response.json();
}

export async function emailClientPlatformPaymentLink(token: string, paymentId: string) {
  const response = await clientRequest(`/v1/client/payments/${encodeURIComponent(paymentId)}/email`, token, {
    method: 'POST',
  });
  return response.json();
}
