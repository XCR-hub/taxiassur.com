import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const { storedUrl, errorToast } = vi.hoisted(() => ({ storedUrl: vi.fn(), errorToast: vi.fn() }));
vi.mock('../native-admin-data', () => ({ nativeAdminStoredDocumentUrl: storedUrl }));
vi.mock('../toast', () => ({ toast: { error: errorToast } }));
import { downloadDocument } from '../document-utils';
beforeEach(() => {
  vi.useFakeTimers();
  storedUrl.mockReset().mockResolvedValue('blob:document');
  errorToast.mockReset();
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });
it('keeps the file available while the browser starts its download', async () => {
  await downloadDocument('lead/permis.pdf', 'permis.pdf', 'native');
  expect(storedUrl).toHaveBeenCalledWith('lead/permis.pdf', 'crm-documents', true, 'permis.pdf');
  expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledOnce();
  expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  vi.advanceTimersByTime(60_000);
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:document');
});
it('shows a download failure instead of silently rejecting a button action', async () => {
  storedUrl.mockRejectedValueOnce(new Error('file_missing'));
  await downloadDocument('lead/missing.pdf', 'missing.pdf');
  expect(errorToast).toHaveBeenCalledWith(expect.stringContaining('Impossible de télécharger'));
  expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled();
});
