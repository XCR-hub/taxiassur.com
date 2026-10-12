export function prospectDocumentReviewState(document: { status?: string; validated?: boolean }) {
  const status = document.status;
  if (status === 'rejected' || status === 'refused') return { status: 'rejected' as const, validated: false };
  if (status === 'quarantined') return { status: 'uploaded' as const, validated: false };
  const validated = document.validated === true || status === 'validated' || status === 'verified';
  return { status: validated ? 'validated' as const : 'uploaded' as const, validated };
}

export function prospectDocumentCounts(documents: Array<{ id: string; document_type?: string; status?: string; validated?: boolean }>, requiredTypes: string[]) {
  const unique = documents.filter((doc, index) => documents.findIndex(other => other.id === doc.id) === index);
  const states = unique.map(prospectDocumentReviewState);
  const required = [...new Set(requiredTypes)];
  const current = required.map(type => unique.find(doc => doc.document_type === type));
  const receivedTypes = current.filter(doc => doc && doc.status !== 'quarantined' && prospectDocumentReviewState(doc).status !== 'rejected').length;
  const validatedTypes = current.filter(doc => doc && prospectDocumentReviewState(doc).validated).length;
  return { uploadedFiles: unique.length, validatedFiles: states.filter(state => state.validated).length,
    rejectedFiles: states.filter(state => state.status === 'rejected').length,
    pendingFiles: states.filter(state => state.status === 'uploaded').length,
    requiredTypes: required.length, receivedTypes, validatedTypes,
    progressPercentage: required.length ? Math.round(receivedTypes * 100 / required.length) : 100,
    documentsComplete: validatedTypes === required.length };
}

export function documentValidationError(error: unknown): string {
  const code = error instanceof Error ? error.message : '';
  if (code === 'document_scan_blocked') return 'Validation bloquée par le contrôle antivirus. Le document doit être contrôlé avant de pouvoir être validé.';
  if (code === 'invalid_session' || code === 'native_session_required') return 'Votre session a expiré. Reconnectez-vous puis réessayez la validation.';
  if (code === 'not_found') return 'Ce document est introuvable. Actualisez la liste avant de réessayer.';
  if (code === 'platform_temporarily_unavailable') return 'L’API est temporairement indisponible. Réessayez dans quelques instants.';
  return 'La validation a échoué. Le document reste en attente ; actualisez puis réessayez.';
}
