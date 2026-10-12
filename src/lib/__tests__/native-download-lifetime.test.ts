import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { downloadProspectPlatformDocument, downloadProspectFinalDocument, downloadProspectCompanyDocument, openProspectQuote } from '../platform-api';
import { openClientPlatformDocument } from '../client-platform-api';
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['test']) }));
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:download');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });
it.each([
  ['prospect document', () => downloadProspectPlatformDocument('token', 'id', 'file.pdf')],
  ['final document', () => downloadProspectFinalDocument('token', 'id', 'file.pdf')],
  ['company document', () => downloadProspectCompanyDocument('token', 'id', 'file.pdf')],
  ['quote', () => openProspectQuote('token', 'id', 'file.pdf', true)],
  ['client document', () => openClientPlatformDocument('token', '/v1/prospect/documents/12345678-1234-1234-1234-123456789012/download', 'file.pdf', true)],
])('keeps %s available until the browser starts downloading', async (_name, download) => {
  await download();
  expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledOnce();
  expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  vi.advanceTimersByTime(60_000);
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:download');
});
