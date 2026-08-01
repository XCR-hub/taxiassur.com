import { supabase } from './supabase';
import { toast } from './toast';

export function getDocumentUrl(filePath: string, bucketParam?: string): string {
  if (!filePath) return '';

  let bucket = bucketParam || 'crm-documents';
  let path = filePath;

  if (!bucketParam) {
    if (path.startsWith('prospect-documents/')) {
      bucket = 'prospect-documents';
      path = path.replace('prospect-documents/', '');
    } else if (path.startsWith('crm-documents/')) {
      bucket = 'crm-documents';
      path = path.replace('crm-documents/', '');
    } else if (path.startsWith('email-attachments/')) {
      bucket = 'email-attachments';
      path = path.replace('email-attachments/', '');
    }
  }

  return `${supabase.supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
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

  if (data?.storage_path) {
    return { path: data.storage_path, bucket: 'email-attachments' };
  }
  return null;
}

export async function openDocument(filePath: string, bucket?: string) {
  if (isOrphanEmailRef(filePath)) {
    const resolved = await resolveOrphanPath(filePath);
    if (!resolved) {
      toast.error("Ce fichier n'est plus disponible en stockage. Demandez au prospect de le renvoyer.");
      return;
    }
    window.open(getDocumentUrl(resolved.path, resolved.bucket), '_blank');
    return;
  }
  window.open(getDocumentUrl(filePath, bucket), '_blank');
}

export async function downloadDocument(filePath: string, fileName: string, bucket?: string) {
  let url = getDocumentUrl(filePath, bucket);

  if (isOrphanEmailRef(filePath)) {
    const resolved = await resolveOrphanPath(filePath);
    if (!resolved) {
      toast.error("Ce fichier n'est plus disponible en stockage. Demandez au prospect de le renvoyer.");
      throw new Error('Orphan email attachment');
    }
    url = getDocumentUrl(resolved.path, resolved.bucket);
  }

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error('Error downloading document:', error);
    throw error;
  }
}
