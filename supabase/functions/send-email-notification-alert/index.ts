import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function base64Encode(str: string): string {
  return btoa(str);
}

async function sendEmailSMTP(
  to: string,
  subject: string,
  htmlBody: string
): Promise<void> {
  const SMTP_HOST = "smtp.ionos.fr";
  const SMTP_PORT = 587;
  const SMTP_USER = Deno.env.get("IONOS_EMAIL_USER") || "team@taxiassur.com";
  const SMTP_PASS = Deno.env.get("IONOS_EMAIL_PASSWORD");

  if (!SMTP_PASS) throw new Error("IONOS_EMAIL_PASSWORD not configured");

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
    await sendCommandTLS(`MAIL FROM:<${SMTP_USER}>`);
    await sendCommandTLS(`RCPT TO:<${to}>`);
    await sendCommandTLS("DATA");

    const emailContent = [
      `From: TaxiAssur Notifications <${SMTP_USER}>`,
      `To: ${to}`,
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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { email_send_id, event_type, lead_name, lead_email } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Récupérer les admins qui ont activé les notifications
    const { data: configs } = await supabase
      .from('email_notifications_config')
      .select('user_id, admin_users(email, name)')
      .eq('notification_type', event_type)
      .eq('enabled', true);

    if (!configs || configs.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let sent = 0;

    // Envoyer notification à chaque admin
    for (const config of configs) {
      const admin = config.admin_users;
      if (!admin?.email) continue;

      const eventEmoji = {
        'vip_open': '⭐',
        'first_open': '👀',
        'click': '👆',
        'reply': '✉️',
        'engagement_drop': '⚠️'
      }[event_type] || '🔔';

      const eventLabel = {
        'vip_open': 'Un lead VIP a ouvert votre email',
        'first_open': 'Première ouverture',
        'click': 'Clic sur un lien',
        'reply': 'Réponse reçue',
        'engagement_drop': 'Baisse d\'engagement détectée'
      }[event_type] || 'Notification'
;

      const htmlBody = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; background: #f3f4f6; padding: 20px; }
            .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; }
            .alert { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .button { background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0;">${eventEmoji} ${eventLabel}</h2>
            </div>
            <div class="content">
              <div class="alert">
                <strong>Lead :</strong> ${lead_name}<br>
                <strong>Email :</strong> ${lead_email}<br>
                <strong>Événement :</strong> ${eventLabel}
              </div>
              <p>Cet email vient d'être ${event_type === 'click' ? 'cliqué' : 'ouvert'}. Consultez le CRM pour plus de détails.</p>
              <div style="text-align: center;">
                <a href="https://taxiassur.com/backoffice/crm-commercial" class="button">
                  📊 Ouvrir le CRM
                </a>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      try {
        await sendEmailSMTP(
          admin.email,
          `${eventEmoji} ${eventLabel} - ${lead_name}`,
          htmlBody
        );
        sent++;
      } catch (error) {
        console.error(`Erreur envoi notification à ${admin.email}:`, error);
      }
    }

    console.log(`✅ Notifications envoyées: ${sent}`);

    return new Response(
      JSON.stringify({ success: true, sent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erreur:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});