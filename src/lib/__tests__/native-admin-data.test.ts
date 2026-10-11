import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { NATIVE_ADMIN_TOKEN_KEY } from '../native-admin-auth';

const response = (data: unknown) => ({ ok: true, json: async () => data });

beforeEach(() => {
  vi.resetModules();
  localStorage.clear();
});
afterEach(() => vi.unstubAllGlobals());

it('uploads the original file with authenticated, encoded notes through the native scanner', async () => {
  const fetchMock = vi.fn().mockResolvedValue(response({ ok: true }));
  vi.stubGlobal('fetch', fetchMock);
  localStorage.setItem(NATIVE_ADMIN_TOKEN_KEY, 'native-admin-token');
  const { nativeAdminUploadLeadDocument } = await import('../native-admin-data');
  const file = new File(['pdf'], 'carte.pdf', { type: 'application/pdf' });
  await nativeAdminUploadLeadDocument('lead-id', 'carte_grise', file, undefined, 'classified', 'Pièce reçue\nVérifier');
  expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/v1/admin/leads/lead-id/document-workspace/upload'), expect.objectContaining({
    method: 'POST', body: file, headers: expect.objectContaining({ Authorization: 'Bearer native-admin-token', 'X-Document-Notes': encodeURIComponent('Pièce reçue\nVérifier') })
  }));
  fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'infected_file' }) });
  await expect(nativeAdminUploadLeadDocument('lead-id', 'carte_grise', file)).rejects.toThrow('infected_file');
});

it('does not request private stored documents without a native admin session', async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  const { nativeAdminStoredDocumentUrl } = await import('../native-admin-data');
  await expect(nativeAdminStoredDocumentUrl('lead/file.pdf', 'crm-documents')).rejects.toThrow('native_session_required');
  expect(fetchMock).not.toHaveBeenCalled();
});

it('authenticates private stored document requests and propagates antivirus blocks', async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'document_scan_blocked' }) });
  vi.stubGlobal('fetch', fetchMock);
  localStorage.setItem(NATIVE_ADMIN_TOKEN_KEY, 'native-admin-token');
  const { nativeAdminStoredDocumentUrl } = await import('../native-admin-data');
  await expect(nativeAdminStoredDocumentUrl('lead/file.pdf', 'crm-documents', true, 'permis.pdf')).rejects.toThrow('document_scan_blocked');
  expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/v1/admin/documents/open'), expect.objectContaining({
    method: 'POST', headers: { Authorization: 'Bearer native-admin-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: 'lead/file.pdf', bucket: 'crm-documents', download: true, file_name: 'permis.pdf' }),
  }));
});

it('reuses dashboard requests only within the same authenticated session', async () => {
  const fetchMock = vi.fn().mockResolvedValueOnce(response({ account: 'A' }))
    .mockResolvedValueOnce(response({ account: 'B' }));
  vi.stubGlobal('fetch', fetchMock);
  const { nativeAdminDashboard } = await import('../native-admin-data');
  localStorage.setItem(NATIVE_ADMIN_TOKEN_KEY, 'session-A');
  await expect(nativeAdminDashboard()).resolves.toEqual({ account: 'A' });
  await nativeAdminDashboard();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  localStorage.setItem(NATIVE_ADMIN_TOKEN_KEY, 'session-B');
  await expect(nativeAdminDashboard()).resolves.toEqual({ account: 'B' });
  localStorage.removeItem(NATIVE_ADMIN_TOKEN_KEY);
  await expect(nativeAdminDashboard()).rejects.toThrow('native_session_required');
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it('rejects an old session response without evicting the new session cache', async () => {
  let finishOld!: (value: unknown) => void;
  vi.stubGlobal('fetch', vi.fn()
    .mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve; }))
    .mockResolvedValueOnce(response({ account: 'B' })));
  const { nativeAdminDashboard } = await import('../native-admin-data');
  localStorage.setItem(NATIVE_ADMIN_TOKEN_KEY, 'session-A');
  const old = nativeAdminDashboard();
  const rejected = expect(old).rejects.toThrow('native_session_changed');
  localStorage.setItem(NATIVE_ADMIN_TOKEN_KEY, 'session-B');
  await nativeAdminDashboard();
  finishOld(response({ account: 'A' }));
  await rejected;
  await expect(nativeAdminDashboard()).resolves.toEqual({ account: 'B' });
  expect(fetch).toHaveBeenCalledTimes(2);
});
