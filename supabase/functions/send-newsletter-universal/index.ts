import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

function base64Encode(str: string): string {
  return btoa(str);
}

function addLinkTracking(html: string, trackingId: string, supabaseUrl: string): string {
  const urlRegex = /href="([^"]+)"/gi;
  return html.replace(urlRegex, (match, url) => {
    if (url.startsWith('mailto:') || url.startsWith('tel:') || url.startsWith('#')) {
      return match;
    }
    const trackedUrl = `${supabaseUrl}/functions/v1/track-email-click?id=${trackingId}&url=${encodeURIComponent(url)}`;
    return `href="${trackedUrl}"`;
  });
}

function addTrackingPixel(html: string, trackingId: string, supabaseUrl: string): string {
  const pixelUrl = `${supabaseUrl}/functions/v1/track-email-open?id=${trackingId}`;
  const pixel = `<img src="${pixelUrl}" width="1" height="1" style="display:none;" alt="" />`;
  if (html.includes('</body>')) {
    return html.replace('</body>', `${pixel}</body>`);
  }
  return html + pixel;
}

async function sendEmailSMTP(
  to: string,
  toName: string,
  subject: string,
  htmlBody: string,
  fromEmail: string = "contact@taxiassur.com",
  fromName: string = "TaxiAssur"
): Promise<void> {
  const SMTP_HOST = Deno.env.get("SMTP_HOST") || Deno.env.get("HMAIL_SMTP_HOST") || Deno.env.get("IONOS_SMTP_HOST") || "mail.xcr.fr";
  const SMTP_PORT = parseInt(Deno.env.get("SMTP_PORT") || Deno.env.get("HMAIL_SMTP_PORT") || Deno.env.get("IONOS_SMTP_PORT") || "587");
  const SMTP_USER = Deno.env.get("SMTP_USER") || Deno.env.get("HMAIL_SMTP_USER") || Deno.env.get("IONOS_EMAIL_USER") || "tcerda@xcr.fr";
  const SMTP_PASS = Deno.env.get("SMTP_PASS") || Deno.env.get("HMAIL_SMTP_PASS") || Deno.env.get("IONOS_EMAIL_PASSWORD") || Deno.env.get("IONOS_SMTP_PASSWORD");

  if (!SMTP_PASS) throw new Error("SMTP_PASS not configured");

  const conn = await Deno.connect({ hostname: SMTP_HOST, port: SMTP_PORT });
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  async function readResponse(): Promise<string> {
    const buffer = new Uint8Array(1024);
    const n = await conn.read(buffer);
    return n === null ? "" : decoder.decode(buffer.subarray(0, n));
  }

  async function sendCommand(command: string): Promise<string> {
    await conn.write(encoder.encode(command + "\r\n"));
    return await readResponse();
  }

  try {
    await readResponse();
    await sendCommand(`EHLO taxiassur.com`);
    await sendCommand("STARTTLS");
    const tlsConn = await Deno.startTls(conn, { hostname: SMTP_HOST });

    async function readResponseTLS(): Promise<string> {
      const buffer = new Uint8Array(1024);
      const n = await tlsConn.read(buffer);
      return n === null ? "" : decoder.decode(buffer.subarray(0, n));
    }

    async function sendCommandTLS(command: string): Promise<string> {
      await tlsConn.write(encoder.encode(command + "\r\n"));
      return await readResponseTLS();
    }

    await sendCommandTLS(`EHLO taxiassur.com`);
    await sendCommandTLS("AUTH LOGIN");
    await sendCommandTLS(base64Encode(SMTP_USER));
    await sendCommandTLS(base64Encode(SMTP_PASS));
    await sendCommandTLS(`MAIL FROM:<${fromEmail}>`);
    await sendCommandTLS(`RCPT TO:<${to}>`);
    await sendCommandTLS("DATA");

    const emailContent = [
      `From: ${fromName} <${fromEmail}>`,
      `To: ${toName} <${to}>`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=UTF-8`,
      ``,
      htmlBody,
      `.`,
    ].join("\r\n");

    await sendCommandTLS(emailContent);
    await sendCommandTLS("QUIT");
    tlsConn.close();
  } catch (error) {
    conn.close();
    throw error;
  }
}

function hasNewsletterTrackingConsent(payload: any, campaign: any): boolean {
  return payload?.tracking_consent === true ||
    payload?.trackingConsent === true ||
    campaign?.tracking_consent === true ||
    campaign?.email_tracking_consent === true;
}

function isNewsletterTrackingRequested(campaign: any): boolean {
  return campaign?.tracking_enabled === true ||
    campaign?.email_tracking_enabled === true ||
    campaign?.track_opens === true ||
    campaign?.track_clicks === true;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload = await req.json();
    const { campaign_id, test_mode = false, test_email } = payload;

    if (!campaign_id) {
      return new Response(
        JSON.stringify({ error: 'campaign_id requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer la campagne
    const { data: campaign, error: campaignError } = await supabase
      .from('newsletter_campaigns')
      .select('*')
      .eq('id', campaign_id)
      .single();

    if (campaignError || !campaign) {
      return new Response(
        JSON.stringify({ error: 'Campagne introuvable' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer les abonnés
    const trackingRequested = isNewsletterTrackingRequested(campaign);
    const trackingAllowed = trackingRequested && hasNewsletterTrackingConsent(payload, campaign);

    if (trackingRequested && !trackingAllowed) {
      console.warn('Newsletter tracking requested but disabled: missing explicit tracking consent');
    }

    let recipients = [];
    if (test_mode && test_email) {
      recipients = [{ email: test_email, name: 'Test' }];
    } else {
      const { data: subscribers } = await supabase
        .from('newsletter_subscribers')
        .select('email, name')
        .eq('status', 'active');
      recipients = subscribers || [];
    }

    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Aucun destinataire trouvé' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Marquer la campagne comme en cours
    await supabase
      .from('newsletter_campaigns')
      .update({
        status: 'sending',
        provider_used: 'hmail',
        sent_at: new Date().toISOString()
      })
      .eq('id', campaign_id);

    let sentCount = 0;
    let errorCount = 0;

    // Envoyer les emails; open/click tracking stays disabled unless explicit consent is present
    for (const recipient of recipients) {
      try {
        let emailBody = campaign.content;

        // Créer le tracking pour cet email
        const { data: emailRecord } = await supabase
          .from('email_sends')
          .insert({
            email_to: recipient.email,
            email_from: 'contact@taxiassur.com',
            subject: campaign.subject,
            body_html: emailBody,
            status: 'sent',
            metadata: {
              campaign_id,
              email_tracking_allowed: trackingAllowed,
              tracking_requested: trackingRequested,
              track_opens: trackingAllowed,
              track_clicks: trackingAllowed,
              tracking_purpose: 'newsletter_campaign',
              tracking_disabled_reason: trackingRequested && !trackingAllowed ? 'missing_explicit_tracking_consent' : null
            }
          })
          .select('tracking_id')
          .single();

        const trackingId = trackingAllowed ? emailRecord?.tracking_id : undefined;

        // Ajouter le tracking uniquement apres consentement explicite
        if (trackingId) {
          emailBody = addLinkTracking(emailBody, trackingId, supabaseUrl);
          emailBody = addTrackingPixel(emailBody, trackingId, supabaseUrl);
        }

        await sendEmailSMTP(
          recipient.email,
          recipient.name || '',
          campaign.subject,
          emailBody,
          'contact@taxiassur.com',
          'TaxiAssur'
        );

        sentCount++;
      } catch (emailError) {
        console.error(`❌ Erreur envoi à ${recipient.email}:`, emailError);
        errorCount++;
      }

      // Pause pour éviter le rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Mettre à jour la campagne
    await supabase
      .from('newsletter_campaigns')
      .update({
        status: 'sent',
        sent_count: sentCount,
        error_count: errorCount
      })
      .eq('id', campaign_id);

    console.log(`✅ Newsletter envoyée: ${sentCount} succès, ${errorCount} erreurs`);

    return new Response(
      JSON.stringify({
        success: true,
        sent_count: sentCount,
        error_count: errorCount,
        total: recipients.length,
          tracking_enabled: trackingAllowed,
          provider: 'ionos'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
