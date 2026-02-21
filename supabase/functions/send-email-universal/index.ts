import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailRequest {
  to: string | string[];
  toName?: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  fromName?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: Array<{
    name: string;
    content: string;
    contentType: string;
  }>;
  trackOpens?: boolean;
  trackClicks?: boolean;
  lead_id?: string;
  campaign_id?: string;
  metadata?: Record<string, any>;
}

function base64Encode(str: string): string {
  return btoa(str);
}

async function sendEmailSMTP(
  to: string,
  toName: string,
  subject: string,
  htmlBody: string,
  fromEmail: string = "team@taxiassur.com",
  fromName: string = "TaxiAssur",
  replyTo?: string,
  cc?: string[],
  bcc?: string[]
): Promise<void> {
  const SMTP_HOST = Deno.env.get("IONOS_SMTP_HOST") || "smtp.ionos.fr";
  const SMTP_PORT = parseInt(Deno.env.get("IONOS_SMTP_PORT") || "465");
  const SMTP_USER = Deno.env.get("IONOS_EMAIL_USER") || "team@taxiassur.com";

  // Try both secret names for backward compatibility
  let SMTP_PASS = Deno.env.get("IONOS_EMAIL_PASSWORD");
  if (!SMTP_PASS) {
    SMTP_PASS = Deno.env.get("IONOS_SMTP_PASSWORD");
  }

  console.log("📧 SMTP Configuration (SSL/TLS Direct):");
  console.log("  Host:", SMTP_HOST);
  console.log("  Port:", SMTP_PORT);
  console.log("  User:", SMTP_USER);
  console.log("  Password configured:", !!SMTP_PASS);

  if (!SMTP_PASS) {
    console.error("❌ IONOS_EMAIL_PASSWORD ou IONOS_SMTP_PASSWORD non configuré");
    throw new Error("Configuration SMTP manquante. Veuillez configurer IONOS_EMAIL_PASSWORD ou IONOS_SMTP_PASSWORD dans les secrets Supabase.");
  }

  // IONOS uses SSL/TLS on port 465 - connect with TLS directly
  const conn = await Deno.connectTls({
    hostname: SMTP_HOST,
    port: SMTP_PORT,
  });

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  async function readResponse(): Promise<string> {
    const buffer = new Uint8Array(4096); // Increased buffer size
    const n = await conn.read(buffer);
    if (n === null) return "";
    const response = decoder.decode(buffer.subarray(0, n));
    console.log("<<", response.trim());
    return response;
  }

  async function sendCommand(command: string): Promise<string> {
    console.log(">>", command.replace(base64Encode(SMTP_PASS), "***PASSWORD***"));
    await conn.write(encoder.encode(command + "\r\n"));
    return await readResponse();
  }

  try {
    // Read greeting
    await readResponse();

    // Send EHLO
    await sendCommand(`EHLO taxiassur.com`);

    // Authenticate
    await sendCommand("AUTH LOGIN");
    await sendCommand(base64Encode(SMTP_USER));
    await sendCommand(base64Encode(SMTP_PASS));

    // Set sender
    await sendCommand(`MAIL FROM:<${fromEmail}>`);

    // Set recipient
    await sendCommand(`RCPT TO:<${to}>`);

    // CC recipients
    if (cc && cc.length > 0) {
      for (const ccEmail of cc) {
        await sendCommand(`RCPT TO:<${ccEmail}>`);
      }
    }

    // BCC recipients
    if (bcc && bcc.length > 0) {
      for (const bccEmail of bcc) {
        await sendCommand(`RCPT TO:<${bccEmail}>`);
      }
    }

    // Start DATA
    await sendCommand("DATA");

    // Prepare email headers
    const emailHeaders = [
      `From: ${fromName} <${fromEmail}>`,
      `To: ${toName} <${to}>`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: 8bit`,
    ];

    if (replyTo) {
      emailHeaders.push(`Reply-To: ${replyTo}`);
    }

    if (cc && cc.length > 0) {
      emailHeaders.push(`Cc: ${cc.join(", ")}`);
    }

    // Send email content
    const emailContent = [
      ...emailHeaders,
      ``,
      htmlBody,
      `.`,
    ].join("\r\n");

    await sendCommand(emailContent);

    // Quit
    await sendCommand("QUIT");

    conn.close();
    console.log("✅ Email sent successfully via SSL/TLS");
  } catch (error) {
    console.error("❌ SMTP error:", error);
    try {
      conn.close();
    } catch (closeError) {
      console.error("Error closing connection:", closeError);
    }
    throw error;
  }
}

function addTrackingPixel(html: string, trackingId: string, supabaseUrl: string): string {
  const pixelUrl = `${supabaseUrl}/functions/v1/track-email-open?id=${trackingId}`;
  const pixel = `<img src="${pixelUrl}" width="1" height="1" style="display:none;" alt="" />`;
  if (html.includes('</body>')) {
    return html.replace('</body>', `${pixel}</body>`);
  }
  return html + pixel;
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const emailData: EmailRequest = await req.json();

    console.log("📧 Sending email via IONOS SMTP Universal");
    console.log("To:", emailData.to);
    console.log("Subject:", emailData.subject);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const recipients = Array.isArray(emailData.to) ? emailData.to : [emailData.to];
    const sentEmails: string[] = [];
    const failedEmails: { email: string; error: string }[] = [];

    for (const recipient of recipients) {
      try {
        let emailHtml = emailData.html;
        let trackingId: string | undefined;

        // Create tracking record if tracking enabled
        if (emailData.trackOpens || emailData.trackClicks) {
          try {
            const trackingData: any = {
              email_to: recipient,
              email_from: emailData.from || "team@taxiassur.com",
              subject: emailData.subject,
              status: 'sent',
              provider: 'ionos'
            };

            if (emailData.lead_id) trackingData.lead_id = emailData.lead_id;
            if (emailData.campaign_id) trackingData.campaign_id = emailData.campaign_id;
            if (emailData.metadata) trackingData.metadata = emailData.metadata;

            const { data: emailRecord, error: trackingError } = await supabase
              .from('email_sends')
              .insert(trackingData)
              .select('tracking_id')
              .single();

            if (trackingError) {
              console.warn('⚠️ Tracking insert failed (continuing without tracking):', trackingError.message);
            } else {
              trackingId = emailRecord?.tracking_id;

              if (trackingId) {
                if (emailData.trackClicks) {
                  emailHtml = addLinkTracking(emailHtml, trackingId, supabaseUrl);
                }
                if (emailData.trackOpens) {
                  emailHtml = addTrackingPixel(emailHtml, trackingId, supabaseUrl);
                }
              }
            }
          } catch (trackingErr) {
            console.warn('⚠️ Tracking setup failed (continuing without tracking):', trackingErr);
          }
        }

        await sendEmailSMTP(
          recipient,
          emailData.toName || recipient,
          emailData.subject,
          emailHtml,
          emailData.from || "team@taxiassur.com",
          emailData.fromName || "TaxiAssur",
          emailData.replyTo,
          emailData.cc,
          emailData.bcc
        );

        sentEmails.push(recipient);
        console.log(`✅ Email sent to: ${recipient}${trackingId ? ` (tracking: ${trackingId})` : ''}`);

        // Log interaction in CRM if lead_id provided
        if (emailData.lead_id) {
          await supabase.from('crm_interactions').insert({
            lead_id: emailData.lead_id,
            type: 'email',
            direction: 'outbound',
            subject: emailData.subject,
            content: emailData.text || 'Email sent via IONOS SMTP',
            to_email: recipient,
            from_email: emailData.from || 'team@taxiassur.com',
            metadata: emailData.metadata
          });
        }

      } catch (error) {
        console.error(`❌ Failed to send to ${recipient}:`, error);
        failedEmails.push({
          email: recipient,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    const totalRecipients = recipients.length;
    const successCount = sentEmails.length;
    const failCount = failedEmails.length;

    return new Response(
      JSON.stringify({
        success: successCount > 0,
        message: `${successCount}/${totalRecipients} emails sent successfully via IONOS SMTP`,
        sent: sentEmails,
        failed: failedEmails.length > 0 ? failedEmails : undefined,
        provider: 'ionos',
        stats: {
          total: totalRecipients,
          success: successCount,
          failed: failCount
        }
      }),
      {
        status: successCount > 0 ? 200 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error("❌ Email send error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        provider: 'ionos'
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
