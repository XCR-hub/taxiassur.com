import { supabase } from './supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';

export function getDocumentUrl(filePath: string, bucketParam?: string): string {
  if (!filePath) return '';

  // If the path is already a full URL, clean any double-https issue and return
  if (filePath.startsWith('http')) {
    return filePath.replace(/^https?:\/\/https?:\/\//, 'https://');
  }

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

  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${encodeURI(path)}`;
}

export function isOrphanEmailRef(filePath?: string | null): boolean {
  return !!filePath && filePath.startsWith('email_ref/');
}

async function resolveOrphanPath(filePath: string): Promise<{ path: string; bucket: string } | null> {
  const match = filePath.match(/^email_ref\/([^/]+)\/(.+)$/);
  if (!match) return null;
  const [, emailId, filename] = match;

  // Try email_attachments table first
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

  // Fallback: search storage.objects for this email_id pattern
  const { data: storageObjects } = await supabase
    .rpc('find_storage_object_by_email', { p_email_id: emailId, p_filename: filename });

  if (storageObjects && storageObjects.length > 0) {
    return { path: storageObjects[0].name, bucket: 'email-attachments' };
  }

  return null;
}

async function verifyUrlAccessible(url: string): Promise<boolean> {
  try {
    const resp = await fetch(url, { method: 'HEAD' });
    return resp.ok;
  } catch {
    return false;
  }
}

export async function openDocument(filePath: string, bucket?: string) {
  if (isOrphanEmailRef(filePath)) {
    const resolved = await resolveOrphanPath(filePath);
    if (resolved) {
      window.open(getDocumentUrl(resolved.path, resolved.bucket), '_blank');
      return;
    }
    const { toast } = await import('./toast');
    toast.error("Ce fichier n'est plus disponible en stockage. Demandez au prospect de le renvoyer.");
    return;
  }

  const url = getDocumentUrl(filePath, bucket);

  // Quick check: if url has double https or looks wrong, try to fix
  const cleanUrl = url.replace(/^https?:\/\/https?:\/\//, 'https://');
  const accessible = await verifyUrlAccessible(cleanUrl);

  if (accessible) {
    window.open(cleanUrl, '_blank');
  } else {
    // Try alternative bucket paths
    const altBuckets = ['email-attachments', 'prospect-documents', 'crm-documents'];
    const currentBucket = bucket || 'crm-documents';
    for (const altBucket of altBuckets) {
      if (altBucket === currentBucket) continue;
      const altUrl = getDocumentUrl(filePath, altBucket);
      const altAccessible = await verifyUrlAccessible(altUrl);
      if (altAccessible) {
        window.open(altUrl, '_blank');
        return;
      }
    }
    const { toast } = await import('./toast');
    toast.error("Ce fichier n'est plus disponible en stockage. Demandez au prospect de le renvoyer.");
  }
}

export async function downloadDocument(filePath: string, fileName: string, bucket?: string) {
  if (isOrphanEmailRef(filePath)) {
    const resolved = await resolveOrphanPath(filePath);
    if (!resolved) {
      const { toast } = await import('./toast');
      toast.error("Ce fichier n'est plus disponible en stockage.");
      throw new Error('Orphan email attachment');
    }
    filePath = resolved.path;
    bucket = resolved.bucket;
  }

  const url = getDocumentUrl(filePath, bucket).replace(/^https?:\/\/https?:\/\//, 'https://');

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
