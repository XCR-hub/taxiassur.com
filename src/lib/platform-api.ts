const PLATFORM_BASE_URL = (import.meta.env.VITE_PLATFORM_API_URL || 'https://postgres-read-api.taxiassur.com/platform').replace(/\/$/, '');

export interface ProspectPlatformSession {
  ok: true;
  lead: Record<string, unknown> & { id: string };
  documents: Array<Record<string, unknown>>;
  document_requests: Array<Record<string, unknown>>;
  payments: Array<Record<string, unknown>>;
}

async function platformRequest(path: string, token: string, init: RequestInit = {}) {
  const response = await fetch(`${PLATFORM_BASE_URL}${path}`, {
    ...init,
    headers: { 'X-Prospect-Token': token, ...init.headers },
    credentials: 'omit',
    cache: 'no-store',
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
  const headers: Record<string, string> = {
    'Content-Type': file.type,
    'X-Document-Type': documentType,
    'X-File-Name': encodeURIComponent(file.name),
  };
  if (requestId) headers['X-Document-Request-Id'] = requestId;
  const response = await platformRequest('/v1/prospect/documents', token, { method: 'POST', headers, body: file });
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

function platformError(code: string | undefined, status: number) {
  if (code === 'invalid_access' || status === 401 || status === 403) return 'Lien invalide ou expiré';
  if (code === 'invalid_file') return 'Fichier invalide. Formats acceptés : PDF, JPG, PNG ou WebP (10 Mo maximum).';
  if (code === 'infected_file') return 'Ce fichier a été refusé par le contrôle antivirus.';
  if (code === 'scan_failed') return 'Le contrôle antivirus est momentanément indisponible.';
  if (code === 'rate_limited') return 'Trop de tentatives. Réessayez dans une minute.';
  return 'Le service documentaire est momentanément indisponible.';
}
