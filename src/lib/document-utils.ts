import { toast } from './toast';
import { nativeAdminStoredDocumentUrl } from './native-admin-data';

function resolveBucket(filePath: string, bucket?: string): string {
  if (bucket) return bucket;
  if (filePath.startsWith('prospect-documents/')) return 'prospect-documents';
  if (filePath.startsWith('email-attachments/')) return 'email-attachments';
  return 'crm-documents';
}

export function isOrphanEmailRef(filePath?: string | null): boolean {
  return !!filePath && filePath.startsWith('email_ref/');
}

async function resolveStoredDocument(
  filePath: string,
  bucket?: string,
): Promise<{ path: string; bucket: string } | null> {
  return { path: filePath, bucket: isOrphanEmailRef(filePath) ? 'email-attachments' : resolveBucket(filePath, bucket) };
}

export async function openDocument(filePath: string, bucket?: string) {
  const resolved = await resolveStoredDocument(filePath, bucket);
  if (!resolved) return;
  try {
    const documentUrl = await nativeAdminStoredDocumentUrl(resolved.path, resolved.bucket);
    const popup = window.open(documentUrl, '_blank', 'noopener,noreferrer');
    if (!popup) window.location.assign(documentUrl);
    window.setTimeout(() => URL.revokeObjectURL(documentUrl), 60_000);
  } catch (error: unknown) {
    console.error('Document open failure', error instanceof Error ? error.name : 'unknown');
    toast.error("Impossible d'ouvrir ce document.");
  }
}

export async function downloadDocument(filePath: string, fileName: string, bucket?: string) {
  const resolved = await resolveStoredDocument(filePath, bucket);
  if (!resolved) throw new Error('Orphan email attachment');

  try {
    const downloadUrl = await nativeAdminStoredDocumentUrl(resolved.path, resolved.bucket, true, fileName);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error: unknown) {
    console.error('Document download failure', error instanceof Error ? error.name : 'unknown');
    throw error;
  }
}
