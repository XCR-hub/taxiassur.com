import { beforeEach, describe, expect, it, vi } from 'vitest';

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock('../supabase', () => ({
  supabase: { functions: { invoke } },
}));

import { downloadSecureDocument, getSecureDocumentUrl } from '../secure-document-url';

describe('secure document URLs', () => {
  beforeEach(() => {
    invoke.mockReset();
    invoke.mockResolvedValue({
      data: { success: true, signedUrl: 'https://storage.test/signed-document' },
      error: null,
    });
  });

  it('binds signing to the bucket, path and prospect access token', async () => {
    await expect(getSecureDocumentUrl({
      path: 'lead/client/document.pdf',
      bucket: 'prospect-documents',
      accessToken: 'a'.repeat(64),
    })).resolves.toBe('https://storage.test/signed-document');

    expect(invoke).toHaveBeenCalledWith('sign-document-url', {
      body: expect.objectContaining({
        path: 'lead/client/document.pdf',
        bucket: 'prospect-documents',
        accessToken: 'a'.repeat(64),
        download: false,
      }),
    });
  });

  it('requests a content-disposition download and clicks a temporary link', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await downloadSecureDocument({
      path: 'lead/client/document.pdf',
      bucket: 'prospect-documents',
      accessToken: 'b'.repeat(64),
      fileName: 'permis.pdf',
    });

    expect(invoke).toHaveBeenCalledWith('sign-document-url', {
      body: expect.objectContaining({ download: true, fileName: 'permis.pdf' }),
    });
    expect(click).toHaveBeenCalledOnce();
    expect(document.querySelector('a[href="https://storage.test/signed-document"]')).toBeNull();
  });

  it('rejects a failed or unsigned response', async () => {
    invoke.mockResolvedValueOnce({ data: { success: false, error: 'Document non autorise' }, error: null });
    await expect(getSecureDocumentUrl({
      path: 'other/document.pdf',
      bucket: 'crm-documents',
      accessToken: 'c'.repeat(64),
    })).rejects.toThrow('Document non autorise');
  });
});
