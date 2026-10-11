import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
const mocks = vi.hoisted(() => ({ call: vi.fn(), email: vi.fn(), sms: vi.fn(), patch: vi.fn(), timeline: vi.fn(), success: vi.fn(), error: vi.fn(), warning: vi.fn() }));
vi.mock('@/lib/native-admin-data', () => ({ nativeAdminCall: mocks.call, nativeAdminCommercialEmail: mocks.email, nativeAdminSendSms: mocks.sms, nativeAdminUpdateLead: mocks.patch, nativeAdminAddTimeline: mocks.timeline }));
vi.mock('@/lib/toast', () => ({ toast: { success: mocks.success, error: mocks.error, warning: mocks.warning } }));
import { DocumentReminderPanel } from '../DocumentReminderPanel';
const props = { leadId: 'lead-id', leadName: 'Camille', leadEmail: 'test@example.com', leadPhone: '0600000000', missingDocuments: ['Carte grise'] };
beforeEach(() => { localStorage.clear(); Object.values(mocks).forEach(mock => mock.mockReset()); mocks.call.mockImplementation(async (route: string, options: { body: string }) => {
  if (route.endsWith('/commercial-email')) return mocks.email(JSON.parse(options.body));
  if (route.endsWith('/sms')) return mocks.sms(JSON.parse(options.body));
  if (route.endsWith('/whatsapp')) return { ok: true };
  return { access_token: 'secure-token' };
}); mocks.email.mockResolvedValue({ ok: true, queued: true }); mocks.sms.mockResolvedValue({ ok: true }); mocks.patch.mockResolvedValue({ ok: true }); mocks.timeline.mockResolvedValue({ ok: true }); });
async function send(channel: string) {
  fireEvent.click(screen.getByRole('button', { name: channel }));
  fireEvent.click(screen.getByRole('button', { name: 'Envoyer la relance' }));
}
it('queues a plain-text native email and never claims delivery', async () => {
  render(<DocumentReminderPanel {...props} />);
  await send('Email');
  await waitFor(() => expect(mocks.success).toHaveBeenCalledWith('Relance email mise en file d’attente.'));
  expect(mocks.call).toHaveBeenCalledWith('/v1/admin/leads/lead-id/prospect-access', { method: 'POST', body: '{}' });
  expect(mocks.email).toHaveBeenCalledWith(expect.objectContaining({ subject: 'Documents manquants - Camille', content: expect.stringContaining('/espace-prospect/secure-token'), request_id: expect.any(String) }));
  expect(mocks.timeline).not.toHaveBeenCalled();
});
it('keeps provider failures visible without updating the contact date', async () => {
  mocks.sms.mockRejectedValueOnce(new Error('sms_provider_error'));
  render(<DocumentReminderPanel {...props} />);
  await send('SMS');
  await waitFor(() => expect(mocks.error).toHaveBeenCalled());
  expect(mocks.patch).not.toHaveBeenCalled();
  expect(mocks.success).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Envoyer la relance' })).toBeInTheDocument();
  const first = mocks.sms.mock.calls[0][0].request_id;
  fireEvent.click(screen.getByRole('button', { name: 'Envoyer la relance' }));
  await waitFor(() => expect(mocks.sms).toHaveBeenCalledTimes(2));
  expect(mocks.sms.mock.calls[1][0].request_id).toBe(first);
});
it('uses the native WhatsApp route and reports accepted delivery separately from a contact-date failure', async () => {
  mocks.patch.mockRejectedValueOnce(new Error('unavailable'));
  render(<DocumentReminderPanel {...props} />);
  await send('WhatsApp');
  await waitFor(() => expect(mocks.success).toHaveBeenCalledWith('Relance envoyée via whatsapp.'));
  expect(mocks.call).toHaveBeenLastCalledWith('/v1/admin/leads/lead-id/whatsapp', { method: 'POST', body: expect.stringContaining('Carte grise') });
  expect(mocks.warning).toHaveBeenCalledOnce();
  expect(mocks.error).not.toHaveBeenCalled();
});
it('does not send any reminder when access creation fails', async () => {
  mocks.call.mockRejectedValueOnce(new Error('invalid_session'));
  render(<DocumentReminderPanel {...props} />);
  await send('Email');
  await waitFor(() => expect(mocks.error).toHaveBeenCalled());
  expect(mocks.email).not.toHaveBeenCalled();
});
it('does not mark documents complete when the native stage update fails', async () => {
  mocks.patch.mockRejectedValueOnce(new Error('invalid_session'));
  const changed = vi.fn();
  render(<DocumentReminderPanel {...props} onDocumentsComplete={changed} />);
  fireEvent.click(screen.getByRole('button', { name: /Passer au devis/ }));
  await waitFor(() => expect(mocks.error).toHaveBeenCalled());
  expect(changed).not.toHaveBeenCalled();
  expect(mocks.timeline).not.toHaveBeenCalled();
});
