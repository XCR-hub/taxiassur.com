import { supabase } from './supabase';

/**
 * Génère l'URL publique d'un document à partir de son file_path et bucket
 *
 * Supporte les formats:
 * - Avec bucket explicite: getDocumentUrl('path/file.pdf', 'prospect-documents')
 * - Avec préfixe: getDocumentUrl('prospect-documents/path/file.pdf')
 * - Par défaut: getDocumentUrl('path/file.pdf') -> utilise crm-documents
 */
export function getDocumentUrl(filePath: string, bucketParam?: string): string {
  if (!filePath) return '';

  let bucket = bucketParam || 'crm-documents';
  let path = filePath;

  // Extraire le bucket du path si présent (et pas de bucket explicite)
  if (!bucketParam) {
    if (path.startsWith('prospect-documents/')) {
      bucket = 'prospect-documents';
      path = path.replace('prospect-documents/', '');
    } else if (path.startsWith('crm-documents/')) {
      bucket = 'crm-documents';
      path = path.replace('crm-documents/', '');
    }
  }

  return `${supabase.supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

/**
 * Télécharge un document et l'ouvre dans un nouvel onglet
 */
export function openDocument(filePath: string, bucket?: string) {
  const url = getDocumentUrl(filePath, bucket);
  window.open(url, '_blank');
}

/**
 * Télécharge un document
 */
export async function downloadDocument(filePath: string, fileName: string, bucket?: string) {
  const url = getDocumentUrl(filePath, bucket);

  try {
    const response = await fetch(url);
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
