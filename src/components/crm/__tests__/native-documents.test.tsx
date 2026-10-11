import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
const { call, update, errorToast } = vi.hoisted(() => ({ call: vi.fn(), update: vi.fn(), errorToast: vi.fn() }));
vi.mock('@/lib/native-admin-data', () => ({ nativeAdminCall: call, nativeAdminUpdateDocument: update }));
vi.mock('@/lib/toast', () => ({ toast: { error: errorToast, warning: vi.fn() } }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));
vi.mock('../SecureDocumentLink', () => ({ SecureDocumentLink: ({ bucket }: { bucket: string }) => <span data-testid="document-bucket">{bucket}</span> }));
import DocumentValidationPanel from '../DocumentValidationPanel';
import { PendingAttachmentsPanel } from '../PendingAttachmentsPanel';

const document = { id: 'doc-id', document_type: 'rib', file_name: 'rib.pdf', file_path: 'lead/rib.pdf', file_size: 100, uploaded_at: '2026-10-11T12:00:00Z', status: 'pending', bucket: 'native' };
const attachment = { attachment_id: 'mail-id:2', filename: 'email-piece.pdf', content_type: 'application/pdf', file_size: 200, storage_path: 'lead/email-piece.pdf', storage_bucket: 'email-attachments', received_at: '2026-10-11T12:00:00Z', source: 'email' };
beforeEach(() => { call.mockReset(); update.mockReset().mockResolvedValue({ ok: true }); errorToast.mockReset(); });

describe('native document validation panel', () => {
  it('validates through the native document ID route and refreshes the list', async () => {
    call.mockResolvedValue({ documents: [document] });
    const changed = vi.fn();
    render(<DocumentValidationPanel leadId="lead-id" onValidationChange={changed} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Valider' }));
    await waitFor(() => expect(changed).toHaveBeenCalledOnce());
    expect(update).toHaveBeenCalledWith('doc-id', { status: 'validated' });
    expect(call).toHaveBeenCalledWith('/v1/admin/documents?lead_id=lead-id&scope=all');
    expect(screen.getByTestId('document-bucket')).toHaveTextContent('native');
  });
  it('preserves the document and explains a failed antivirus validation', async () => {
    call.mockResolvedValue({ documents: [document] });
    update.mockRejectedValueOnce(new Error('document_scan_blocked'));
    const changed = vi.fn();
    render(<DocumentValidationPanel leadId="lead-id" onValidationChange={changed} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Valider' }));
    await waitFor(() => expect(errorToast).toHaveBeenCalledWith(expect.stringContaining('antivirus')));
    expect(screen.getByText('rib.pdf')).toBeInTheDocument();
    expect(changed).not.toHaveBeenCalled();
  });
  it('displays native validation statuses and prevents validating a quarantined document', async () => {
    call.mockResolvedValue({ documents: [{ ...document, status: 'quarantined' }] });
    const { unmount } = render(<DocumentValidationPanel leadId="lead-id" />);
    expect(await screen.findByText('En quarantaine')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Valider' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Rejeter' })).toBeEnabled();
    unmount();
    call.mockResolvedValue({ documents: [{ ...document, status: 'validated' }] });
    render(<DocumentValidationPanel leadId="lead-id" />);
    await screen.findByText('rib.pdf');
    expect(screen.queryByRole('button', { name: 'Valider' })).not.toBeInTheDocument();
  });
  it('sends the selected rejection reason and free-text details in one native operation', async () => {
    call.mockResolvedValue({ documents: [document] });
    const changed = vi.fn();
    render(<DocumentValidationPanel leadId="lead-id" onValidationChange={changed} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Rejeter' }));
    fireEvent.click(screen.getByRole('button', { name: 'Document illisible' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Le numéro est flou' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirmer/ }));
    await waitFor(() => expect(changed).toHaveBeenCalledOnce());
    expect(update).toHaveBeenCalledWith('doc-id', { status: 'rejected', rejection_reason: 'Document illisible : Le numéro est flou' });
  });
});

describe('native pending email attachments', () => {
  it('ignores an email attachment by its workspace reference without touching prospect uploads', async () => {
    call.mockResolvedValue({ attachments: [attachment, { ...attachment, attachment_id: 'prospect:doc-id', filename: 'prospect.pdf', source: 'prospect_documents' }] });
    render(<PendingAttachmentsPanel leadId="lead-id" />);
    await screen.findByText('email-piece.pdf');
    expect(screen.queryByText('prospect.pdf')).not.toBeInTheDocument();
    call.mockResolvedValueOnce({ ok: true });
    fireEvent.click(screen.getByRole('button', { name: /Ignorer/ }));
    await waitFor(() => expect(screen.queryByText('email-piece.pdf')).not.toBeInTheDocument());
    expect(call).toHaveBeenLastCalledWith('/v1/admin/leads/lead-id/document-workspace', { method: 'POST', body: JSON.stringify({ action: 'reject', attachment_id: 'mail-id:2' }) });
  });
  it('classifies an email attachment using the native workspace and refreshes its parent', async () => {
    call.mockResolvedValue({ attachments: [attachment] });
    const changed = vi.fn();
    render(<PendingAttachmentsPanel leadId="lead-id" onAttachmentClassified={changed} />);
    await screen.findByText('email-piece.pdf');
    fireEvent.click(screen.getByRole('button', { name: /Classifier/ }));
    call.mockResolvedValueOnce({ ok: true });
    fireEvent.click(screen.getByRole('button', { name: /Permis de Conduire/ }));
    await waitFor(() => expect(changed).toHaveBeenCalledOnce());
    expect(call).toHaveBeenLastCalledWith('/v1/admin/leads/lead-id/document-workspace', { method: 'POST', body: JSON.stringify({ action: 'classify', attachment_id: 'mail-id:2', document_type: 'permis_conduire' }) });
  });
});
