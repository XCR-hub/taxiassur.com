const runtimeEnv = typeof window !== 'undefined'
  ? (window as Window & { ENV_CONFIG?: Record<string, string> }).ENV_CONFIG
  : undefined;
export const PLATFORM_BASE_URL = (
  runtimeEnv?.VITE_NATIVE_PLATFORM_URL || runtimeEnv?.VITE_PLATFORM_API_URL ||
  import.meta.env.VITE_NATIVE_PLATFORM_URL || import.meta.env.VITE_PLATFORM_API_URL ||
  '/api/platform'
).replace(/\/$/, '');

export interface ProspectPlatformSession {
  ok: true;
  lead: Record<string, unknown> & { id: string };
  documents: Array<Record<string, unknown>>;
  final_documents: Array<Record<string, unknown>>;
  document_requests: Array<Record<string, unknown>>;
  payments: Array<Record<string, unknown>>;
  quotes: Array<Record<string, unknown>>;
  company_documents: Array<Record<string, unknown>>;
}

export interface PublicPaymentRecord {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  description: string | null;
  lead_id: string | null;
  created_at: string;
  paid_at: string | null;
}

export interface PublicPaymentFormData {
  action: string;
  fields: Record<string, string>;
}

export interface PublicInsuranceCompany {
  description: string | null;
  target_profile: string[];
  product_features: Array<Record<string, unknown>>;
  formulas: Array<Record<string, unknown>>;
  broker_advantages: Array<Record<string, unknown>>;
}

export async function loadPublicInsuranceCompany(code: string): Promise<PublicInsuranceCompany | null> {
  const response = await fetch(
    `${PLATFORM_BASE_URL}/v1/public/insurance-company?code=${encodeURIComponent(code)}`,
    {
      credentials: 'omit',
      cache: 'no-store',
      signal: AbortSignal.timeout(20_000),
    },
  );
  if (response.status === 404) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(platformError(payload?.error, response.status));
  return payload?.company as PublicInsuranceCompany || null;
}

async function publicPlatformRequest(path: string, body: Record<string, string>) {
  const response = await fetch(`${PLATFORM_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'omit',
    cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(platformError(payload?.error, response.status));
  return payload;
}

export async function lookupPublicPlatformPayment(reference: string, accessToken: string): Promise<PublicPaymentRecord> {
  const payload = await publicPlatformRequest('/v1/public/payments/lookup', { reference, accessToken });
  if (!payload?.payment) throw new Error('Paiement introuvable');
  return payload.payment as PublicPaymentRecord;
}

export async function createPublicPlatformPaymentForm(reference: string, accessToken: string): Promise<PublicPaymentFormData> {
  const payload = await publicPlatformRequest('/v1/public/payments/form', { reference, accessToken });
  if (!payload?.success || !payload?.formData) throw new Error('Formulaire de paiement indisponible');
  return payload.formData as PublicPaymentFormData;
}

export async function unsubscribePublicPlatformNewsletter(token: string): Promise<string> {
  const payload = await publicPlatformRequest('/v1/public/newsletter/unsubscribe', { token });
  if (!payload?.success) throw new Error('Lien de désabonnement invalide');
  return typeof payload.message === 'string'
    ? payload.message
    : 'Vous avez été désabonné avec succès';
}

async function platformRequest(path: string, token: string, init: RequestInit = {}, timeoutMs = 20_000) {
  const response = await fetch(`${PLATFORM_BASE_URL}${path}`, {
    ...init,
    headers: { 'X-Prospect-Token': token, ...init.headers },
    credentials: 'omit',
    cache: 'no-store',
    signal: init.signal || AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(platformError(payload?.error, response.status));
  }
  return response;
}

export async function loadProspectPlatformSession(token: string): Promise<ProspectPlatformSession> {
  const response = await platformRequest('/v1/prospect/session', token);
  return response.json();
}

export async function uploadProspectPlatformDocument(token: string, documentType: string, file: File, requestId?: string) {
  const extension=file.name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1]||'';
  const inferredMime:Record<string,string>={pdf:'application/pdf',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'};
  const headers: Record<string, string> = {
    'Content-Type': file.type || inferredMime[extension] || 'application/octet-stream',
    'X-Document-Type': documentType,
    'X-File-Name': encodeURIComponent(file.name),
  };
  if (requestId) headers['X-Document-Request-Id'] = requestId;
  const response = await platformRequest('/v1/prospect/documents', token, { method: 'POST', headers, body: file }, 60_000);
  return response.json();
}

export async function downloadProspectPlatformDocument(token: string, documentId: string, fileName: string) {
  const response = await platformRequest(`/v1/prospect/documents/${encodeURIComponent(documentId)}/download`, token);
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName || 'document';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function downloadProspectFinalDocument(token: string, documentId: string, fileName: string) {
  const response = await platformRequest(`/v1/prospect/final-documents/${encodeURIComponent(documentId)}/download`, token);
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName || 'document';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function updateProspectQuote(token: string, quoteId: string, action: 'validate' | 'refuse' | 'request_modification', details: Record<string, unknown> = {}) {
  const response = await platformRequest(`/v1/prospect/quotes/${encodeURIComponent(quoteId)}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...details }),
  });
  return response.json();
}

export async function openProspectQuote(token: string, quoteId: string, fileName: string, download = false, kind: 'quote' | 'rc_pro' = 'quote') {
  const response = await platformRequest(`/v1/prospect/quotes/${encodeURIComponent(quoteId)}/download?kind=${kind}`, token);
  const url = URL.createObjectURL(await response.blob());
  if (!download) {
    window.open(url, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName || 'devis.pdf';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function downloadProspectCompanyDocument(token: string, documentId: string, fileName: string) {
  const response = await platformRequest(`/v1/prospect/company-documents/${encodeURIComponent(documentId)}/download`, token);
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName || 'document.pdf';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function platformError(code: string | undefined, status: number) {
  if (code === 'invalid_access' || status === 401 || status === 403) return 'Lien invalide ou expiré';
  if (code === 'invalid_file') return 'Fichier invalide. Formats acceptés : PDF, JPG, PNG ou WebP (10 Mo maximum).';
  if (code === 'infected_file') return 'Ce fichier a été refusé par le contrôle antivirus.';
  if (code === 'scan_failed') return 'Le contrôle antivirus est momentanément indisponible.';
  if (code === 'rate_limited') return 'Trop de tentatives. Réessayez dans une minute.';
  return 'Le service documentaire est momentanément indisponible.';
}
