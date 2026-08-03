/**
 * Shared email send ledger and optional tracking helpers.
 * Open/click tracking is opt-in only.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

export interface EmailTrackingOptions {
  leadId?: string;
  emailTo: string;
  emailFrom: string;
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
  trackOpens?: boolean;
  trackClicks?: boolean;
  trackingConsent?: boolean;
  trackingPurpose?: string;
  metadata?: Record<string, unknown>;
}

export interface EmailTrackingResult {
  trackingId: string;
  emailSendId: string;
  trackedHtml: string;
  trackingAllowed: boolean;
}

/**
 * Returns true only when open/click tracking is explicitly allowed.
 */
function isTrackingAllowed(options: EmailTrackingOptions): boolean {
  return options.trackingConsent === true && (options.trackOpens === true || options.trackClicks === true);
}

export function addLinkTracking(html: string, trackingId: string, supabaseUrl: string): string {
  const urlRegex = /href="([^"]+)"/gi;
  return html.replace(urlRegex, (match, url) => {
    // Do not track mailto, tel or anchor links.
    if (url.startsWith('mailto:') || url.startsWith('tel:') || url.startsWith('#')) {
      return match;
    }
    // Build the tracking redirect URL.
    const trackedUrl = `${supabaseUrl}/functions/v1/track-email-click?id=${trackingId}&url=${encodeURIComponent(url)}`;
    return `href="${trackedUrl}"`;
  });
}

/**
 * Adds the open pixel after explicit opt-in.
 */
export function addTrackingPixel(html: string, trackingId: string, supabaseUrl: string): string {
  const pixelUrl = `${supabaseUrl}/functions/v1/track-email-open?id=${trackingId}`;
  const pixel = `<img src="${pixelUrl}" width="1" height="1" style="display:none;" alt="" />`;

  // Add the pixel before the closing body tag.
  if (html.includes('</body>')) {
    return html.replace('</body>', `${pixel}</body>`);
  }

  // If there is no body tag, append it at the end.
  return html + pixel;
}

/**
 * Records an email send and injects tracking only after explicit opt-in.
 */
export async function trackEmail(
  options: EmailTrackingOptions,
  supabaseUrl: string,
  supabaseKey: string
): Promise<EmailTrackingResult> {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const trackingAllowed = isTrackingAllowed(options);

  // Create the email_sends record.
  const { data: emailRecord, error } = await supabase
    .from('email_sends')
    .insert({
      lead_id: options.leadId || null,
      email_to: options.emailTo,
      email_from: options.emailFrom,
      subject: options.subject,
      body_html: options.bodyHtml || null,
      body_text: options.bodyText || null,
      status: 'sent',
      metadata: {
        ...(options.metadata || {}),
        email_tracking_allowed: trackingAllowed,
        tracking_requested: options.trackOpens === true || options.trackClicks === true,
        track_opens: trackingAllowed && options.trackOpens === true,
        track_clicks: trackingAllowed && options.trackClicks === true,
        tracking_purpose: options.trackingPurpose || null,
        tracking_disabled_reason: trackingAllowed ? null : 'missing_explicit_tracking_consent'
      }
    })
    .select('id, tracking_id')
    .single();

  if (error) {
    console.error('Email tracking record creation failed:', error);
    throw error;
  }

  if (!emailRecord) {
    throw new Error('Unable to create email send record');
  }

  // Add tracking to HTML only if explicitly allowed.
  let trackedHtml = options.bodyHtml || '';
  if (trackedHtml && trackingAllowed) {
    if (options.trackClicks === true) {
      trackedHtml = addLinkTracking(trackedHtml, emailRecord.tracking_id, supabaseUrl);
    }
    if (options.trackOpens === true) {
      trackedHtml = addTrackingPixel(trackedHtml, emailRecord.tracking_id, supabaseUrl);
    }
  }

  return {
    trackingId: emailRecord.tracking_id,
    emailSendId: emailRecord.id,
    trackedHtml,
    trackingAllowed
  };
}

/**
 * Updates an email status.
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
    console.error('Email status update failed:', error);
  }
}

/**
 * Logs a CRM email interaction.
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
