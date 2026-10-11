export function prospectDocumentReviewState(document: { status?: string; validated?: boolean }) {
  const status = document.status;
  if (status === 'rejected' || status === 'refused') return { status: 'rejected' as const, validated: false };
  if (status === 'quarantined') return { status: 'uploaded' as const, validated: false };
  const validated = document.validated === true || status === 'validated' || status === 'verified';
  return { status: validated ? 'validated' as const : 'uploaded' as const, validated };
}

export function documentValidationError(error: unknown): string {
  const code = error instanceof Error ? error.message : '';
  if (code === 'document_scan_blocked') return 'Validation bloquée par le contrôle antivirus. Le document doit être contrôlé avant de pouvoir être validé.';
  if (code === 'invalid_session' || code === 'native_session_required') return 'Votre session a expiré. Reconnectez-vous puis réessayez la validation.';
  if (code === 'not_found') return 'Ce document est introuvable. Actualisez la liste avant de réessayer.';
  if (code === 'platform_temporarily_unavailable') return 'L’API est temporairement indisponible. Réessayez dans quelques instants.';
  return 'La validation a échoué. Le document reste en attente ; actualisez puis réessayez.';
}
