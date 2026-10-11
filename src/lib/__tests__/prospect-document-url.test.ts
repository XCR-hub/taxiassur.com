import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { prospectStoredDocumentUrl } from '../platform-api';

describe('native prospect document access', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:document');
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
  const session = (documents: unknown[], final_documents: unknown[] = []) => ({ ok: true, json: async () => ({ documents, final_documents }) });
  const file = () => ({ ok: true, blob: async () => new Blob(['document']) });
  it('resolves paths only among documents returned by the token-bound session', async () => {
    fetchMock.mockResolvedValueOnce(session([{ id: 'doc-id', file_path: 'lead/file.pdf', bucket: 'native' }])).mockResolvedValueOnce(file());
    await expect(prospectStoredDocumentUrl('secret-token', 'prospect-documents/lead/file.pdf', 'prospect-documents')).resolves.toBe('blob:document');
    expect(fetchMock).toHaveBeenLastCalledWith(expect.stringContaining('/v1/prospect/documents/doc-id/download'), expect.objectContaining({ headers: { 'X-Prospect-Token': 'secret-token' }, credentials: 'omit' }));
  });
  it('does not request files outside the session or in a different bucket', async () => {
    fetchMock.mockResolvedValue(session([{ id: 'doc-id', file_path: 'lead/file.pdf', bucket: 'crm-documents' }]));
    await expect(prospectStoredDocumentUrl('secret-token', 'other/file.pdf', 'crm-documents')).rejects.toThrow('Document non autorisé');
    await expect(prospectStoredDocumentUrl('secret-token', 'lead/file.pdf', 'prospect-documents')).rejects.toThrow('Document non autorisé');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it('uses the final document route without including the token in the URL', async () => {
    fetchMock.mockResolvedValueOnce(session([], [{ id: 'final-id', file_path: 'lead/contract.pdf', bucket: 'contract-documents' }])).mockResolvedValueOnce(file());
    await prospectStoredDocumentUrl('secret-token', 'lead/contract.pdf', 'contract-documents');
    const [url] = fetchMock.mock.calls[1];
    expect(url).toContain('/v1/prospect/final-documents/final-id/download');
    expect(url).not.toContain('secret-token');
  });
  it('rejects unsupported buckets before requesting any data', async () => {
    await expect(prospectStoredDocumentUrl('secret-token', 'file.pdf', 'email-attachments')).rejects.toThrow('Document non autorisé');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
