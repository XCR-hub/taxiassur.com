import { beforeEach, expect, it, vi } from 'vitest';
import { nativeAdminCall } from '../native-admin-data';
import { loadNativeUltron } from '../native-ultron';

vi.mock('../native-admin-data', () => ({ nativeAdminCall: vi.fn() }));
beforeEach(() => { vi.mocked(nativeAdminCall).mockReset(); });

it('uses full supervision when the deployed API supports it', async () => {
  vi.mocked(nativeAdminCall).mockResolvedValue({ health: [{ score: 0 }] });
  expect(await loadNativeUltron()).toEqual({ limited: false, health: [{ score: 0 }] });
  expect(nativeAdminCall).toHaveBeenCalledTimes(1);
});

it('uses existing native data only when the new route is missing', async () => {
  vi.mocked(nativeAdminCall).mockRejectedValueOnce(Object.assign(new Error('not_found'), { status: 404 }))
    .mockResolvedValueOnce({ automations: [{ name: 'daily', is_enabled: true }, { name: 'paused', is_enabled: false }] })
    .mockResolvedValueOnce({ queries: [{ query: 'taxi' }] });
  const data = await loadNativeUltron();
  expect(data.limited).toBe(true);
  expect(data.crons.map((row: { active: boolean }) => row.active)).toEqual([true, false]);
  expect(data.gsc).toEqual([{ query: 'taxi' }]);
  expect(data.health).toBeUndefined();
});

it.each([401, 403, 500])('preserves HTTP %s failures without trying alternate endpoints', async status => {
  vi.mocked(nativeAdminCall).mockRejectedValue(Object.assign(new Error('unavailable'), { status }));
  await expect(loadNativeUltron()).rejects.toThrow('unavailable');
  expect(nativeAdminCall).toHaveBeenCalledTimes(1);
});
