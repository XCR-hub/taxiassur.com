import { Lead } from './schema';
import { SecureLead } from './security';
import { PLATFORM_BASE_URL } from './platform-api';
import { logger } from '@/lib/logger';

export async function submitLead(leadData: Lead): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/lead.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(leadData)
    });
    
    const result = await response.json();
    
    if (response.ok && (result.success || result.ok)) {
      return { success: true };
    } else {
      return { success: false, error: result.error || 'Erreur lors de l\'envoi' };
    }
  } catch (error) {
    logger.error('Lead submission error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur de connexion' 
    };
  }
}

export async function submitSecureLead(leadData: SecureLead): Promise<{ success: boolean; error?: string; accessToken?: string }> {
  if (leadData.honeypot) return { success: false, error: 'Soumission refusée' };
  try {
    const response = await fetch(`${PLATFORM_BASE_URL}/v1/public/leads`, {
      method: 'POST', credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(20_000),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...leadData, source: 'website_form' })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok !== true) return { success: false, error: response.status === 429 ? 'Trop de demandes. Réessayez dans quelques instants.' : 'Impossible d’enregistrer votre demande. Réessayez dans quelques instants.' };
    return { success: true, accessToken: typeof result.access_token === 'string' ? result.access_token : undefined };
  } catch (error) {
    logger.error('Native lead submission failed:', error);
    return { success: false, error: 'Connexion indisponible. Réessayez dans quelques instants.' };
  }
}

// Fonction pour declencher les analytics si configures
export function trackLeadSubmission(leadData: Partial<Lead>) {
  // Google Analytics
  if (typeof gtag !== 'undefined') {
    gtag('event', 'lead_submission', {
      event_category: 'engagement',
      event_label: leadData.status,
      value: 1
    });
  }
  
  // Meta Pixel
  if (typeof fbq !== 'undefined') {
    fbq('track', 'Lead', {
      content_category: 'insurance',
      content_name: 'taxi_insurance_quote'
    });
  }
}