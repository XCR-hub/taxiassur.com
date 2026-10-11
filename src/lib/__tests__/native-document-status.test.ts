import { describe, expect, it } from 'vitest';
import { documentValidationError, prospectDocumentReviewState } from '../native-document-status';

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
