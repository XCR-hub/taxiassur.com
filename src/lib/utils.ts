import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function formatDateShort(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.replace(/<[^>]*>/g, '').split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}

export function getAverageRating(reviews: { rating: number }[]): number {
  if (reviews.length === 0) return 0;
  const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
  return Math.round((sum / reviews.length) * 10) / 10;
}

export function generateStars(rating: number): string {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  
  return '★'.repeat(fullStars) + 
         (hasHalfStar ? '☆' : '') + 
         '☆'.repeat(emptyStars);
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

export function sanitizeHtml(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  
  // Supprimer les scripts et autres éléments dangereux
  const scripts = div.querySelectorAll('script, object, embed, iframe');
  scripts.forEach(script => script.remove());
  
  return div.innerHTML;
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Génère une URL publique pour un document stocké dans Supabase Storage
 * Cette fonction gère intelligemment les différents buckets en fonction de la source
 *
 * @param filePath - Chemin du fichier dans le storage
 * @param source - Source du document ('prospect_documents', 'email_attachments', 'crm_lead_documents')
 * @param supabase - Instance Supabase client
 * @returns URL publique du document
 */
export function getDocumentPublicUrl(
  filePath: string,
  source: 'prospect_documents' | 'email_attachments' | 'crm_lead_documents' | string,
  supabase: any
): string {
  // Nettoyer le path initial (enlever les slashes au début)
  let normalizedPath = filePath.replace(/^\/+/, '');

  // Détecter le bucket depuis le path ou depuis la source
  let bucket = 'prospect-documents';
  let cleanPath = normalizedPath;

  // D'abord, vérifier si le path contient déjà le préfixe du bucket
  if (normalizedPath.startsWith('email-attachments/')) {
    bucket = 'email-attachments';
    cleanPath = normalizedPath.replace(/^email-attachments\//, '');
  } else if (normalizedPath.startsWith('prospect-documents/')) {
    bucket = 'prospect-documents';
    cleanPath = normalizedPath.replace(/^prospect-documents\//, '');
  } else if (normalizedPath.startsWith('crm-documents/')) {
    bucket = 'crm-documents';
    cleanPath = normalizedPath.replace(/^crm-documents\//, '');
  } else {
    // Pas de préfixe de bucket dans le path, déduire depuis la source
    if (source === 'email_attachments') {
      bucket = 'email-attachments';
    } else if (source === 'prospect_documents') {
      bucket = 'prospect-documents';
    } else if (source === 'crm_lead_documents') {
      // Pour crm_lead_documents, utiliser crm-documents
      bucket = 'crm-documents';
    }
    cleanPath = normalizedPath;
  }

  // Générer l'URL publique
  const { data } = supabase.storage.from(bucket).getPublicUrl(cleanPath);

  return data.publicUrl;
}