import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { NATIVE_ADMIN_TOKEN_KEY } from '../native-admin-auth';

const response = (data: unknown) => ({ ok: true, json: async () => data });

beforeEach(() => {
  vi.resetModules();
  localStorage.clear();
});
afterEach(() => vi.unstubAllGlobals());

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
