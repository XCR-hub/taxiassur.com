import { supabase } from './supabase';
import { toast } from './toast';
import { getSecureDocumentUrl } from './secure-document-url';

function resolveBucket(filePath: string, bucket?: string): string {
  if (bucket) return bucket;
  if (filePath.startsWith('prospect-documents/')) return 'prospect-documents';
  if (filePath.startsWith('email-attachments/')) return 'email-attachments';
  return 'crm-documents';
}

export function isOrphanEmailRef(filePath?: string | null): boolean {
  return !!filePath && filePath.startsWith('email_ref/');
}

async function resolveOrphanPath(filePath: string): Promise<{ path: string; bucket: string } | null> {
  const match = filePath.match(/^email_ref\/([^/]+)\/(.+)$/);
  if (!match) return null;
  const [, emailId, filename] = match;

  const { data } = await supabase
    .from('email_attachments')
    .select('storage_path')
    .eq('email_message_id', emailId)
    .ilike('filename', filename)
    .not('storage_path', 'is', null)
    .maybeSingle();

  return data?.storage_path
    ? { path: data.storage_path, bucket: 'email-attachments' }
    : null;
}

async function resolveStoredDocument(
  filePath: string,
  bucket?: string,
): Promise<{ path: string; bucket: string } | null> {
  if (!isOrphanEmailRef(filePath)) {
    return { path: filePath, bucket: resolveBucket(filePath, bucket) };
  }
  const resolved = await resolveOrphanPath(filePath);
  if (!resolved) {
    toast.error("Ce fichier n'est plus disponible en stockage. Demandez au prospect de le renvoyer.");
  }
  return resolved;
}

export async function openDocument(filePath: string, bucket?: string) {
  const resolved = await resolveStoredDocument(filePath, bucket);
  if (!resolved) return;
  try {
    const signedUrl = await getSecureDocumentUrl(resolved);
    window.open(signedUrl, '_blank', 'noopener,noreferrer');
  } catch (error: unknown) {
    console.error('Document open failure', error instanceof Error ? error.name : 'unknown');
    toast.error("Impossible d'ouvrir ce document.");
  }
}

export async function downloadDocument(filePath: string, fileName: string, bucket?: string) {
  const resolved = await resolveStoredDocument(filePath, bucket);
  if (!resolved) throw new Error('Orphan email attachment');

  try {
    const url = await getSecureDocumentUrl({
      ...resolved,
      download: true,
      fileName,
    });
    const response = await fetch(url);
    if (!response.ok) throw new Error('Download failed');
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
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