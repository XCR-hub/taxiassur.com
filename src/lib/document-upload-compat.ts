import type { SupabaseClient } from '@supabase/supabase-js';
import { withTimeout } from '@/lib/promise-timeout';

const legacyUnsupportedTypes = new Set([
  'kbis',
  'carte_pro_vtc',
  'inscription_registre_vtc',
  'controle_technique',
]);

export interface DocumentUploadRequest {
  accessToken: string;
  scope: 'prospect' | 'client';
  documentType: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  requestId?: string;
}

function responseStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object' || !('context' in error)) return null;
  const context = (error as { context?: unknown }).context;
  return context instanceof Response ? context.status : null;
}

export async function prepareCompatibleDocumentUpload(
  client: SupabaseClient,
  request: DocumentUploadRequest,
) {
  const primary = await withTimeout(client.functions.invoke('upload-client-document', {
    body: { action: 'prepare', ...request },
  }), 20_000);

  if (
    !primary.error ||
    responseStatus(primary.error) !== 400 ||
    !legacyUnsupportedTypes.has(request.documentType)
  ) {
    return { ...primary, wireDocumentType: request.documentType };
  }

  const fallbackRequest = { ...request, documentType: 'autre' };
  const fallback = await withTimeout(client.functions.invoke('upload-client-document', {
    body: { action: 'prepare', ...fallbackRequest },
  }), 20_000);
  return { ...fallback, wireDocumentType: fallback.error ? request.documentType : 'autre' };
}
