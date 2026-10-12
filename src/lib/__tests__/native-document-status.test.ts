import { describe, expect, it } from 'vitest';
import { documentValidationError, prospectDocumentReviewState, prospectDocumentCounts } from '../native-document-status';

describe('prospect document review state', () => {
  it('recognizes native validation even when a migrated boolean is stale', () => {
    for (const status of ['validated', 'verified']) {
      expect(prospectDocumentReviewState({ status, validated: false })).toEqual({ status: 'validated', validated: true });
    }
  });
  it('does not show rejected or quarantined documents as validated', () => {
    for (const status of ['rejected', 'refused']) {
      expect(prospectDocumentReviewState({ status, validated: true })).toEqual({ status: 'rejected', validated: false });
    }
    expect(prospectDocumentReviewState({ status: 'quarantined', validated: true }).validated).toBe(false);
  });
});

describe('document validation errors', () => {
  it('explains an antivirus block without asking staff to bypass the scan', () => {
    expect(documentValidationError(new Error('document_scan_blocked'))).toContain('antivirus');
  });
  it('asks staff to sign in again when the native session has expired', () => {
    for (const code of ['invalid_session', 'native_session_required']) {
      expect(documentValidationError(new Error(code))).toContain('Reconnectez-vous');
    }
  });
  it('keeps internal error details out of the displayed message', () => {
    expect(documentValidationError(new Error('psql_1:private details'))).not.toContain('private');
  });
});

describe('live prospect document counters', () => {
  it('increases received types and progress immediately after a file is uploaded', () => {
    expect(prospectDocumentCounts([], ['rib', 'carte_grise']).receivedTypes).toBe(0);
    const result = prospectDocumentCounts([{ id: 'one', document_type: 'rib', status: 'pending' }], ['rib', 'carte_grise']);
    expect(result).toMatchObject({ uploadedFiles: 1, receivedTypes: 1, validatedTypes: 0, progressPercentage: 50, documentsComplete: false });
  });
  it('counts multiple files of one type once and avoids duplicate migrated records', () => {
    const result = prospectDocumentCounts([{ id: 'one', document_type: 'rib', status: 'validated' }, { id: 'one', document_type: 'rib', status: 'validated' }, { id: 'two', document_type: 'rib', status: 'pending' }], ['rib']);
    expect(result).toMatchObject({ uploadedFiles: 2, receivedTypes: 1, validatedTypes: 1, validatedFiles: 1, documentsComplete: true });
  });
  it('keeps rejected and quarantined pieces out of completion and updates review counters', () => {
    const result = prospectDocumentCounts([{ id: 'one', document_type: 'rib', status: 'rejected', validated: true }, { id: 'two', document_type: 'carte_grise', status: 'quarantined', validated: true }], ['rib', 'carte_grise']);
    expect(result).toMatchObject({ receivedTypes: 0, validatedTypes: 0, rejectedFiles: 1, pendingFiles: 1, documentsComplete: false });
  });
});
