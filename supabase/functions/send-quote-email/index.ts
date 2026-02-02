import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SendQuoteEmailRequest {
  lead_id: string;
  company_id: string;
  company_name: string;
  quote_file_url: string;
  quote_amount?: number;
  personal_message?: string;
}

function base64Encode(str: string): string {
  return btoa(str);
}

async function downloadFile(url: string): Promise<Uint8Array> {
  // Timeout de 45 secondes pour le téléchargement (augmenté pour les gros fichiers)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  try {
    console.log("📥 Téléchargement du fichier:", url);
    const startTime = Date.now();

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Cache-Control': 'no-cache',
      }
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Erreur téléchargement fichier: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const downloadTime = Date.now() - startTime;
    const sizeMB = (arrayBuffer.byteLength / 1024 / 1024).toFixed(2);
    console.log(`✅ Fichier téléchargé: ${sizeMB} MB en ${downloadTime}ms`);

    return new Uint8Array(arrayBuffer);
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Timeout lors du téléchargement du fichier (> 45s)');
    }
    throw error;
  }
}

function generateBoundary(): string {
  return `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2)}`;
}

async function sendEmailWithAttachment(
  to: string,
  toName: string,
  subject: string,
  htmlBody: string,
  attachmentData: Uint8Array,
  attachmentName: string,
  fromEmail: string = "team@taxiassur.com",
  fromName: string = "TaxiAssur"
): Promise<void> {
  const SMTP_HOST = Deno.env.get("IONOS_SMTP_HOST") || "smtp.ionos.fr";
  const SMTP_PORT = parseInt(Deno.env.get("IONOS_SMTP_PORT") || "465");
  const SMTP_USER = Deno.env.get("IONOS_EMAIL_USER") || "team@taxiassur.com";
  const SMTP_PASS = Deno.env.get("IONOS_EMAIL_PASSWORD");

  if (!SMTP_PASS) {
    throw new Error("IONOS_EMAIL_PASSWORD not configured");
  }

  const conn = await Deno.connectTls({
    hostname: SMTP_HOST,
    port: SMTP_PORT,
  });

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  async function readResponse(): Promise<string> {
    const buffer = new Uint8Array(1024);
    const n = await conn.read(buffer);
    if (n === null) return "";
    return decoder.decode(buffer.subarray(0, n));
  }

  async function sendCommand(command: string): Promise<string> {
    await conn.write(encoder.encode(command + "\r\n"));
    return await readResponse();
  }

  try {
    await readResponse();
    await sendCommand(`EHLO taxiassur.com`);
    await sendCommand("AUTH LOGIN");
    await sendCommand(base64Encode(SMTP_USER));
    await sendCommand(base64Encode(SMTP_PASS));
    await sendCommand(`MAIL FROM:<${fromEmail}>`);
    await sendCommand(`RCPT TO:<${to}>`);
    await sendCommand("DATA");

    const boundary = generateBoundary();

    // Encode attachment to base64 (handle large files by chunking)
    let binaryString = '';
    const chunkSize = 8192; // Process 8KB at a time to avoid stack overflow
    for (let i = 0; i < attachmentData.length; i += chunkSize) {
      const chunk = attachmentData.subarray(i, Math.min(i + chunkSize, attachmentData.length));
      binaryString += String.fromCharCode(...chunk);
    }
    const attachmentBase64 = btoa(binaryString);

    // Split base64 into 76 character lines
    const attachmentLines = attachmentBase64.match(/.{1,76}/g)?.join('\r\n') || attachmentBase64;

    const emailContent = [
      `From: ${fromName} <${fromEmail}>`,
      `To: ${toName} <${to}>`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: quoted-printable`,
      ``,
      htmlBody,
      ``,
      `--${boundary}`,
      `Content-Type: application/pdf; name="${attachmentName}"`,
      `Content-Transfer-Encoding: base64`,
      `Content-Disposition: attachment; filename="${attachmentName}"`,
      ``,
      attachmentLines,
      ``,
      `--${boundary}--`,
      `.`,
    ].join("\r\n");

    await sendCommand(emailContent);
    await sendCommand("QUIT");
    conn.close();
  } catch (error) {
    conn.close();
    throw error;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body: SendQuoteEmailRequest = await req.json();
    const { lead_id, company_id, company_name, quote_file_url, quote_amount, personal_message } = body;

    if (!lead_id || !company_id || !company_name || !quote_file_url) {
      throw new Error("Paramètres manquants");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get lead info
    const { data: lead, error: leadError } = await supabase
      .from('crm_leads')
      .select('first_name, last_name, email, phone, company_name')
      .eq('id', lead_id)
      .single();

    if (leadError || !lead) {
      console.error("Lead not found error:", leadError);
      throw new Error("Lead introuvable");
    }

    if (!lead.email) {
      throw new Error("Le prospect n'a pas d'email");
    }

    // Construire le nom complet
    const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || lead.company_name || 'Client';

    // Download PDF file
    console.log("📥 Téléchargement du devis depuis:", quote_file_url);
    const pdfData = await downloadFile(quote_file_url);
    console.log("✅ Devis téléchargé, taille:", pdfData.length, "bytes");

    const fileName = `Devis_${company_name.replace(/\s+/g, '_')}_TaxiAssur.pdf`;

    const subject = `Votre devis d'assurance ${company_name} - TaxiAssur`;

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      line-height: 1.6;
      background: #f3f4f6;
      padding: 20px;
      color: #1f2937;
    }
    .email-wrapper {
      max-width: 680px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff !important;
      font-size: 28px;
      font-weight: 800;
      margin: 0;
    }
    .content {
      padding: 40px 30px;
      background: #ffffff;
      color: #1f2937;
    }
    .content h2 {
      color: #111827 !important;
      font-size: 24px;
      margin-bottom: 20px;
      font-weight: 700;
    }
    .highlight-box {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 25px;
      border-radius: 8px;
      margin: 25px 0;
    }
    .highlight-box h3 {
      color: #78350f !important;
      font-size: 20px;
      margin-bottom: 12px;
      font-weight: 700;
    }
    .highlight-box p {
      color: #92400e !important;
      font-size: 16px;
      line-height: 1.8;
    }
    .price-box {
      background: #e0f2fe;
      border-radius: 12px;
      padding: 25px;
      text-align: center;
      margin: 25px 0;
    }
    .price-box p {
      color: #0c4a6e !important;
      font-size: 16px;
      margin-bottom: 10px;
    }
    .price {
      color: #0c4a6e !important;
      font-size: 42px;
      font-weight: 800;
      margin: 10px 0;
    }
    .message-box {
      background: #f9fafb;
      border-left: 4px solid #10b981;
      padding: 25px;
      border-radius: 8px;
      margin: 25px 0;
      color: #111827 !important;
      font-size: 16px;
      line-height: 1.8;
    }
    .cta-button {
      background: #10b981;
      color: #ffffff !important;
      padding: 16px 36px;
      text-decoration: none;
      border-radius: 8px;
      display: inline-block;
      font-weight: 700;
      font-size: 16px;
      margin: 20px 0;
    }
    .contact-banner {
      background: #e0f2fe;
      border-radius: 12px;
      padding: 25px;
      text-align: center;
      margin: 25px 0;
    }
    .contact-banner h3 {
      color: #0c4a6e !important;
      font-size: 20px;
      margin-bottom: 12px;
      font-weight: 700;
    }
    .contact-banner p {
      color: #0c4a6e !important;
      font-weight: 600;
      font-size: 16px;
    }
    .signature {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
    }
    .signature p {
      color: #4b5563 !important;
      font-weight: 600;
      margin: 5px 0;
    }
    .footer {
      background: #1f2937;
      color: #ffffff !important;
      padding: 30px;
      text-align: center;
    }
    .footer div {
      font-size: 24px;
      font-weight: 800;
      color: #10b981 !important;
      margin-bottom: 10px;
    }
    .footer p {
      color: #d1d5db !important;
      margin: 5px 0;
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="header">
      <h1>🚕 TaxiAssur</h1>
    </div>

    <div class="content">
      <h2>Bonjour ${fullName},</h2>

      <p style="color: #4b5563 !important; font-size: 16px; margin-bottom: 20px;">
        Nous avons le plaisir de vous faire parvenir votre devis d'assurance taxi personnalisé.
      </p>

      <div class="highlight-box">
        <h3>📋 Devis ${company_name}</h3>
        <p>Vous trouverez en pièce jointe votre devis détaillé au format PDF.</p>
        ${quote_amount ? `
        <div style="margin-top: 15px; padding-top: 15px; border-top: 2px solid #fbbf24;">
          <p style="font-size: 14px; margin-bottom: 5px;">Tarif annuel indicatif :</p>
          <p style="font-size: 32px; font-weight: 800; color: #92400e !important;">${quote_amount.toFixed(2)} €</p>
        </div>
        ` : ''}
      </div>

      ${personal_message ? `
      <div class="message-box">
        <strong style="color: #111827 !important;">Message de votre conseiller :</strong><br><br>
        ${personal_message.replace(/\n/g, '<br>')}
      </div>
      ` : ''}

      <div style="text-align: center; margin: 30px 0;">
        <p style="color: #4b5563 !important; font-size: 16px; margin-bottom: 15px;">
          <strong>Des questions sur ce devis ?</strong><br>
          Nous sommes à votre disposition pour vous conseiller.
        </p>
        <a href="mailto:team@taxiassur.com" class="cta-button">
          💬 Contactez-nous
        </a>
      </div>

      <div class="contact-banner">
        <h3>📞 Vos conseillers TaxiAssur</h3>
        <p>📧 team@taxiassur.com | 📞 01 80 85 57 86</p>
        <p style="margin-top: 10px; font-size: 14px;">Disponibles du lundi au vendredi, 9h-18h</p>
      </div>

      <div class="signature">
        <p>Cordialement,</p>
        <p style="color: #10b981 !important; font-weight: 700; font-size: 18px;">L'équipe TaxiAssur</p>
      </div>
    </div>

    <div class="footer">
      <div>🚕 TaxiAssur</div>
      <p>© 2026 TaxiAssur - Tous droits réservés</p>
      <p style="font-size: 12px; margin-top: 10px;">
        Spécialiste de l'assurance taxi et VTC depuis 2020
      </p>
    </div>
  </div>
</body>
</html>
    `;

    console.log("📤 Envoi email avec pièce jointe à:", lead.email);

    await sendEmailWithAttachment(
      lead.email,
      fullName,
      subject,
      htmlBody,
      pdfData,
      fileName,
      "team@taxiassur.com",
      "TaxiAssur"
    );

    console.log("✅ Email avec devis envoyé avec succès");

    // Log interaction
    await supabase.from('crm_interactions').insert({
      lead_id: lead_id,
      channel: 'email',
      direction: 'outbound',
      content: `Devis ${company_name} envoyé par email${quote_amount ? ` - Montant: ${quote_amount}€` : ''}`
    });

    // Update quote record
    await supabase
      .from('lead_company_quotes')
      .update({
        last_sent_at: new Date().toISOString()
      })
      .eq('lead_id', lead_id)
      .eq('company_id', company_id);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Devis envoyé par email avec succès",
        to: lead.email
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );
  } catch (error) {
    console.error("❌ Erreur envoi devis:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
