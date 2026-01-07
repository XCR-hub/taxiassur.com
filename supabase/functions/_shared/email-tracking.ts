/**
 * Bibliothèque partagée pour le tracking d'emails
 * Utilisable par toutes les edge functions
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

export interface EmailTrackingOptions {
  leadId?: string;
  emailTo: string;
  emailFrom: string;
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
}

export interface EmailTrackingResult {
  trackingId: string;
  emailSendId: string;
  trackedHtml: string;
}

/**
 * Ajoute le tracking des clics aux liens dans un email HTML
 */
export function addLinkTracking(html: string, trackingId: string, supabaseUrl: string): string {
  const urlRegex = /href="([^"]+)"/gi;
  return html.replace(urlRegex, (match, url) => {
    // Ne pas tracker les liens mailto:, tel: et ancres
    if (url.startsWith('mailto:') || url.startsWith('tel:') || url.startsWith('#')) {
      return match;
    }
    // Créer l'URL de tracking
    const trackedUrl = `${supabaseUrl}/functions/v1/track-email-click?id=${trackingId}&url=${encodeURIComponent(url)}`;
    return `href="${trackedUrl}"`;
  });
}

/**
 * Ajoute le pixel de tracking invisible pour détecter les ouvertures
 */
export function addTrackingPixel(html: string, trackingId: string, supabaseUrl: string): string {
  const pixelUrl = `${supabaseUrl}/functions/v1/track-email-open?id=${trackingId}`;
  const pixel = `<img src="${pixelUrl}" width="1" height="1" style="display:none;" alt="" />`;

  // Ajouter le pixel juste avant la fermeture du body
  if (html.includes('</body>')) {
    return html.replace('</body>', `${pixel}</body>`);
  }

  // Si pas de balise body, ajouter à la fin
  return html + pixel;
}

/**
 * Enregistre un email et ajoute le tracking complet
 */
export async function trackEmail(
  options: EmailTrackingOptions,
  supabaseUrl: string,
  supabaseKey: string
): Promise<EmailTrackingResult> {
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Créer l'enregistrement dans email_sends
  const { data: emailRecord, error } = await supabase
    .from('email_sends')
    .insert({
      lead_id: options.leadId || null,
      email_to: options.emailTo,
      email_from: options.emailFrom,
      subject: options.subject,
      body_html: options.bodyHtml || null,
      body_text: options.bodyText || null,
      status: 'sent'
    })
    .select('id, tracking_id')
    .single();

  if (error) {
    console.error('Erreur création tracking email:', error);
    throw error;
  }

  if (!emailRecord) {
    throw new Error('Impossible de créer l\'enregistrement email');
  }

  // Ajouter le tracking au HTML si fourni
  let trackedHtml = options.bodyHtml || '';
  if (trackedHtml) {
    trackedHtml = addLinkTracking(trackedHtml, emailRecord.tracking_id, supabaseUrl);
    trackedHtml = addTrackingPixel(trackedHtml, emailRecord.tracking_id, supabaseUrl);
  }

  return {
    trackingId: emailRecord.tracking_id,
    emailSendId: emailRecord.id,
    trackedHtml
  };
}

/**
 * Met à jour le statut d'un email
 */
export async function updateEmailStatus(
  trackingId: string,
  status: 'sent' | 'delivered' | 'bounced' | 'failed' | 'opened' | 'clicked' | 'replied',
  supabaseUrl: string,
  supabaseKey: string
): Promise<void> {
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { error } = await supabase
    .from('email_sends')
    .update({
      status,
      updated_at: new Date().toISOString()
    })
    .eq('tracking_id', trackingId);

  if (error) {
    console.error('Erreur mise à jour statut email:', error);
  }
}

/**
 * Enregistre une interaction CRM pour un email
 */
export async function logEmailInteraction(
  leadId: string,
  emailTo: string,
  emailFrom: string,
  subject: string,
  content: string,
  direction: 'inbound' | 'outbound',
  supabaseUrl: string,
  supabaseKey: string
): Promise<void> {
  const supabase = createClient(supabaseUrl, supabaseKey);

  await supabase.from('crm_interactions').insert({
    lead_id: leadId,
    type: 'email',
    direction,
    subject,
    content,
    to_email: emailTo,
    from_email: emailFrom
  });
}
