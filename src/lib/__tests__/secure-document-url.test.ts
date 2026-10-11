import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const { adminUrl, prospectUrl } = vi.hoisted(() => ({ adminUrl: vi.fn(), prospectUrl: vi.fn() }));
vi.mock('../native-admin-data', () => ({ nativeAdminStoredDocumentUrl: adminUrl }));
vi.mock('../platform-api', () => ({ prospectStoredDocumentUrl: prospectUrl }));
import { downloadSecureDocument, getSecureDocumentUrl, viewSecureDocument } from '../secure-document-url';

describe('native secure document URLs', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    adminUrl.mockReset().mockResolvedValue('blob:admin-document');
    prospectUrl.mockReset().mockResolvedValue('blob:prospect-document');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });
  it('uses the native admin route and releases the document URL after use', async () => {
    await expect(getSecureDocumentUrl({ path: 'lead/file.pdf', bucket: 'native' })).resolves.toBe('blob:admin-document');
    expect(adminUrl).toHaveBeenCalledWith('lead/file.pdf', 'crm-documents', false, 'document');
    expect(prospectUrl).not.toHaveBeenCalled();
    vi.advanceTimersByTime(60_000);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:admin-document');
  });
  it('keeps prospect access on its own route without falling back to admin access', async () => {
    await getSecureDocumentUrl({ path: 'lead/file.pdf', bucket: 'prospect-documents', accessToken: 'prospect-token' });
    expect(prospectUrl).toHaveBeenCalledWith('prospect-token', 'lead/file.pdf', 'prospect-documents');
    expect(adminUrl).not.toHaveBeenCalled();
    prospectUrl.mockRejectedValueOnce(new Error('Document non autorisé'));
    await expect(getSecureDocumentUrl({ path: 'other/file.pdf', bucket: 'prospect-documents', accessToken: 'prospect-token' })).rejects.toThrow('Document non autorisé');
    expect(adminUrl).not.toHaveBeenCalled();
  });
  it('downloads through a temporary link with the selected filename', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await downloadSecureDocument({ path: 'lead/file.pdf', bucket: 'crm-documents', fileName: 'permis.pdf' });
    expect(adminUrl).toHaveBeenCalledWith('lead/file.pdf', 'crm-documents', true, 'permis.pdf');
    expect(click).toHaveBeenCalledOnce();
    expect(document.querySelector('a[href="blob:admin-document"]')).toBeNull();
  });
  it('opens a popup before awaiting the API and closes it if access fails', async () => {
    const popup = { opener: {}, location: { replace: vi.fn() }, close: vi.fn() };
    const open = vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window);
    adminUrl.mockRejectedValueOnce(new Error('document_scan_blocked'));
    await expect(viewSecureDocument({ path: 'lead/file.pdf', bucket: 'crm-documents' })).rejects.toThrow('document_scan_blocked');
    expect(open).toHaveBeenCalledWith('about:blank', '_blank');
    expect(popup.close).toHaveBeenCalledOnce();
  });
  it('limits the wait and releases a blob returned after the timeout', async () => {
    let finish!: (url: string) => void;
    adminUrl.mockImplementationOnce(() => new Promise<string>(resolve => { finish = resolve; }));
    const result = getSecureDocumentUrl({ path: 'lead/file.pdf', bucket: 'crm-documents' });
    const rejected = expect(result).rejects.toThrow('Le service met trop de temps');
    await vi.advanceTimersByTimeAsync(20_000);
    await rejected;
    finish('blob:late-document');
    await vi.advanceTimersByTimeAsync(60_000);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:late-document');
  });
});
