import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
const { call, update, open, download, upload, remove, errorToast } = vi.hoisted(() => ({ call: vi.fn(), update: vi.fn(), open: vi.fn(), download: vi.fn(), upload: vi.fn(), remove: vi.fn(), errorToast: vi.fn() }));
vi.mock('@/lib/native-admin-data', () => ({ nativeAdminCall: call, nativeAdminUpdateDocument: update, nativeAdminOpenDocument: open, nativeAdminDownloadDocument: download, nativeAdminUploadLeadDocument: upload, nativeAdminDeleteDocument: remove }));
vi.mock('@/lib/toast', () => ({ toast: { error: errorToast, warning: vi.fn() } }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));
vi.mock('../SecureDocumentLink', () => ({ SecureDocumentLink: ({ bucket }: { bucket: string }) => <span data-testid="document-bucket">{bucket}</span> }));
import DocumentValidationPanel from '../DocumentValidationPanel';
import { PendingAttachmentsPanel } from '../PendingAttachmentsPanel';
import DocumentValidationManager from '../DocumentValidationManager';
import { DocumentChecklistPanel } from '../DocumentChecklistPanel';
import { DocumentChecklistPanelV2 } from '../DocumentChecklistPanelV2';

const document = { id: 'doc-id', document_type: 'rib', file_name: 'rib.pdf', file_path: 'lead/rib.pdf', file_size: 100, uploaded_at: '2026-10-11T12:00:00Z', status: 'pending', bucket: 'native' };
const attachment = { attachment_id: 'mail-id:2', filename: 'email-piece.pdf', content_type: 'application/pdf', file_size: 200, storage_path: 'lead/email-piece.pdf', storage_bucket: 'email-attachments', received_at: '2026-10-11T12:00:00Z', source: 'email' };
beforeEach(() => { call.mockReset(); update.mockReset().mockResolvedValue({ ok: true }); open.mockReset().mockResolvedValue(undefined); download.mockReset().mockResolvedValue(undefined); upload.mockReset().mockResolvedValue({ ok: true }); remove.mockReset().mockResolvedValue({ ok: true }); errorToast.mockReset(); });

describe('native second document checklist', () => {
  const props = { leadId: 'lead-id', leadEmail: 'test@example.com', leadFirstName: 'Camille' };
  const piece = { ...document, document_type: 'carte_grise' };
  it('classifies a dragged email attachment by its native workspace reference', async () => {
    call.mockImplementation(async (route: string) => route.includes('/documents?') ? { documents: [piece] } : { attachments: [attachment, { ...attachment, filename: 'prospect.pdf', source: 'prospect_documents' }] });
    render(<DocumentChecklistPanelV2 {...props} />);
    const email = await screen.findByText('email-piece.pdf');
    expect(screen.queryByText('prospect.pdf')).not.toBeInTheDocument();
    fireEvent.dragStart(email.closest('[draggable]')!);
    const target = screen.getByText('rib.pdf').closest('.p-3')!;
    fireEvent.dragOver(target);
    fireEvent.drop(target);
    await waitFor(() => expect(call).toHaveBeenCalledWith('/v1/admin/leads/lead-id/document-workspace', { method: 'POST', body: JSON.stringify({ action: 'classify', attachment_id: 'mail-id:2', document_type: 'carte_grise' }) }));
  });
  it('validates the stored document ID and uses the recorded storage bucket', async () => {
    call.mockImplementation(async (route: string) => route.includes('/documents?') ? { documents: [piece] } : { attachments: [] });
    render(<DocumentChecklistPanelV2 {...props} />);
    fireEvent.click(await screen.findByTitle('Valider'));
    await waitFor(() => expect(update).toHaveBeenCalledWith('doc-id', { status: 'validated' }));
    expect(screen.getByTestId('document-bucket')).toHaveTextContent('native');
  });
  it('recognises verified documents and sends a reasoned native rejection', async () => {
    call.mockImplementation(async (route: string) => route.includes('/documents?') ? { documents: [{ ...piece, status: 'verified' }] } : { attachments: [] });
    render(<DocumentChecklistPanelV2 {...props} />);
    fireEvent.click(await screen.findByTitle('Redemander'));
    expect(screen.queryByTitle('Valider')).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Page manquante' } });
    fireEvent.click(screen.getByRole('button', { name: 'Rejeter et redemander' }));
    await waitFor(() => expect(update).toHaveBeenCalledWith('doc-id', { status: 'rejected', rejection_reason: 'Page manquante' }));
  });
  it('does not allow quarantine validation and displays failures for pending validation', async () => {
    call.mockImplementation(async (route: string) => route.includes('/documents?') ? { documents: [{ ...piece, status: 'quarantined' }] } : { attachments: [] });
    const { unmount } = render(<DocumentChecklistPanelV2 {...props} />);
    expect(await screen.findByTitle('Valider')).toBeDisabled();
    expect(screen.getByTitle('Rejeter')).toBeEnabled();
    unmount();
    call.mockImplementation(async (route: string) => route.includes('/documents?') ? { documents: [piece] } : { attachments: [] });
    update.mockRejectedValueOnce(new Error('document_scan_blocked'));
    render(<DocumentChecklistPanelV2 {...props} />);
    fireEvent.click(await screen.findByTitle('Valider'));
    await waitFor(() => expect(errorToast).toHaveBeenCalledWith(expect.stringContaining('antivirus')));
  });
});

describe('native document checklist', () => {
  it('retains upload notes and reports success only after the native upload succeeds', async () => {
    call.mockResolvedValue({ documents: [] });
    const changed = vi.fn();
    const { container } = render(<DocumentChecklistPanel leadId="lead-id" onDocumentUpload={changed} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter un autre document' }));
    const file = new File(['pdf'], 'carte.pdf', { type: 'application/pdf' });
    fireEvent.change(container.querySelector('input[type=file]')!, { target: { files: [file] } });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Reçue au bureau' } });
    upload.mockRejectedValueOnce(new Error('infected_file'));
    fireEvent.click(screen.getByRole('button', { name: 'Uploader' }));
    await waitFor(() => expect(errorToast).toHaveBeenCalled());
    expect(changed).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox')).toHaveValue('Reçue au bureau');
    fireEvent.click(screen.getByRole('button', { name: 'Uploader' }));
    await waitFor(() => expect(changed).toHaveBeenCalledOnce());
    expect(upload).toHaveBeenLastCalledWith('lead-id', 'carte_grise', file, undefined, 'classified', 'Reçue au bureau');
  });
  it('opens native documents and blocks quarantine validation without blocking rejection', async () => {
    call.mockResolvedValue({ documents: [{ ...document, document_type: 'carte_grise', status: 'quarantined' }] });
    render(<DocumentChecklistPanel leadId="lead-id" />);
    expect(await screen.findByTitle('Valider')).toBeDisabled();
    expect(screen.getByTitle('Rejeter')).toBeEnabled();
    fireEvent.click(screen.getByTitle('Voir'));
    fireEvent.click(screen.getByTitle('Telecharger'));
    expect(open).toHaveBeenCalledWith('doc-id');
    expect(download).toHaveBeenCalledWith('doc-id', 'rib.pdf');
  });
  it('deletes through the native file lifecycle only after confirmation', async () => {
    call.mockResolvedValue({ documents: [{ ...document, document_type: 'carte_grise' }] });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<DocumentChecklistPanel leadId="lead-id" />);
    fireEvent.click(await screen.findByTitle('Supprimer'));
    expect(remove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTitle('Supprimer'));
    await waitFor(() => expect(remove).toHaveBeenCalledWith('doc-id'));
    confirm.mockRestore();
  });
});

describe('native document validation manager', () => {
  it('deduplicates native records and validates only after confirmation', async () => {
    call.mockResolvedValue({ documents: [document, document] });
    const changed = vi.fn();
    render(<DocumentValidationManager leadId="lead-id" onValidationChange={changed} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Valider' }));
    expect(update).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer la validation' }));
    await waitFor(() => expect(changed).toHaveBeenCalledOnce());
    expect(update).toHaveBeenCalledWith('doc-id', { status: 'validated' });
  });
  it('keeps a failed validation open and never reports success', async () => {
    call.mockResolvedValue({ documents: [document] });
    update.mockRejectedValueOnce(new Error('document_scan_blocked'));
    const changed = vi.fn();
    render(<DocumentValidationManager leadId="lead-id" onValidationChange={changed} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Valider' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer la validation' }));
    await waitFor(() => expect(errorToast).toHaveBeenCalledWith(expect.stringContaining('antivirus')));
    expect(changed).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Confirmer la validation' })).toBeInTheDocument();
  });
  it('prevents quarantine validation but allows a reasoned rejection', async () => {
    call.mockResolvedValue({ documents: [{ ...document, status: 'quarantined' }] });
    render(<DocumentValidationManager leadId="lead-id" />);
    expect(await screen.findByRole('button', { name: 'Valider' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Refuser' }));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'incomplete' } });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Page 2 manquante' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer le refus' }));
    await waitFor(() => expect(update).toHaveBeenCalledWith('doc-id', { status: 'rejected', rejection_reason: 'Document incomplet : Page 2 manquante' }));
  });
  it('opens files by authenticated document ID and recognises verified documents', async () => {
    call.mockResolvedValue({ documents: [document] });
    const { unmount } = render(<DocumentValidationManager leadId="lead-id" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Voir' }));
    expect(open).toHaveBeenCalledWith('doc-id');
    unmount();
    call.mockResolvedValue({ documents: [{ ...document, status: 'verified' }] });
    render(<DocumentValidationManager leadId="lead-id" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Télécharger' }));
    expect(download).toHaveBeenCalledWith('doc-id', 'rib.pdf');
    expect(screen.queryByRole('button', { name: 'Valider' })).not.toBeInTheDocument();
  });
});

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
