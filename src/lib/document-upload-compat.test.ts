import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { prepareCompatibleDocumentUpload, type DocumentUploadRequest } from './document-upload-compat';

const request: DocumentUploadRequest = {
  accessToken: 'a'.repeat(64),
  scope: 'prospect',
  documentType: 'kbis',
  fileName: 'kbis.pdf',
  fileSize: 128,
  mimeType: 'application/pdf',
};

function clientWith(invoke: ReturnType<typeof vi.fn>) {
  return { functions: { invoke } } as unknown as SupabaseClient;
}

describe('prepareCompatibleDocumentUpload', () => {
  it('keeps the requested type when the current Edge function accepts it', async () => {
    const invoke = vi.fn().mockResolvedValue({ data: { success: true }, error: null });
    const result = await prepareCompatibleDocumentUpload(clientWith(invoke), request);

    expect(result.wireDocumentType).toBe('kbis');
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it('retries legacy unsupported types as autre after a 400 response', async () => {
    const legacyError = { context: new Response('{}', { status: 400 }) };
    const invoke = vi.fn()
      .mockResolvedValueOnce({ data: null, error: legacyError })
      .mockResolvedValueOnce({ data: { success: true }, error: null });

    const result = await prepareCompatibleDocumentUpload(clientWith(invoke), request);

    expect(result.wireDocumentType).toBe('autre');
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(invoke.mock.calls[1][1].body.documentType).toBe('autre');
  });

  it('does not hide authorization or network failures', async () => {
    const authorizationError = { context: new Response('{}', { status: 403 }) };
    const invoke = vi.fn().mockResolvedValue({ data: null, error: authorizationError });

    const result = await prepareCompatibleDocumentUpload(clientWith(invoke), request);

    expect(result.error).toBe(authorizationError);
    expect(invoke).toHaveBeenCalledTimes(1);
  });
});
