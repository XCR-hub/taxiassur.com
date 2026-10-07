import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import GoogleSearchStatus from '../GoogleSearchStatus';
const call = vi.hoisted(() => vi.fn());
vi.mock('@/lib/native-admin-data', () => ({ nativeAdminCall: call }));
beforeEach(() => { call.mockReset(); call.mockResolvedValue({ latest_date: '2026-08-14', stale: true }); });
afterEach(cleanup);
function mount() { render(<MemoryRouter><GoogleSearchStatus /></MemoryRouter>); }
it('warns about stale rows and sends a sync only after the administrator asks', async () => {
  mount();
  expect(await screen.findByText(/Les données sont anciennes/)).toBeInTheDocument();
  expect(call).toHaveBeenCalledTimes(2);
  call.mockImplementation((path: string) => Promise.resolve(path.endsWith('/sync') ? { ok: true, pages_imported: 4, queries_imported: 8 } : { latest_date: '2026-10-05', stale: false }));
  fireEvent.click(screen.getByRole('button', { name: 'Actualiser depuis Google' }));
  expect(await screen.findByRole('status')).toHaveTextContent('4 pages et 8 requêtes');
  await waitFor(() => expect(screen.getByText('Les données enregistrées sont récentes.')).toBeInTheDocument());
  expect(call).toHaveBeenCalledWith('/v1/admin/gsc/sync', expect.objectContaining({ method: 'POST', body: '{"days":30}' }));
});
it('explains missing Google configuration without claiming a successful sync', async () => {
  mount(); await screen.findByText(/Les données sont anciennes/);
  call.mockRejectedValueOnce(new Error('google_not_configured'));
  fireEvent.click(screen.getByRole('button', { name: 'Actualiser depuis Google' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('doit être configurée');
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Configurer Google' })).toHaveAttribute('href', '/backoffice/crm-killer/settings?tab=integrations');
});
it('does not display fresh data when loading the connection fails', async () => {
  call.mockRejectedValue(new Error('invalid_session')); mount();
  expect(await screen.findByRole('alert')).toHaveTextContent('session a expiré');
  expect(screen.queryByText('Les données enregistrées sont récentes.')).not.toBeInTheDocument();
});