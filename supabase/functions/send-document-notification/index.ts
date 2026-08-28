import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function base64Encode(str: string): string {
  return btoa(str);
}

async function sendEmailSMTP(
  to: string,
  toName: string,
  subject: string,
  htmlBody: string,
  fromEmail: string = "team@taxiassur.com",
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log("[send-document-notification] Received payload:", JSON.stringify(payload));

    // Si action = 'process_pending', traiter les notifications en attente
    if (payload.action === 'process_pending') {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Récupérer les notifications en attente
      const { data: notifications, error: notifError } = await supabase
        .from('crm_document_notifications')
        .select(`
          *,
          crm_leads!inner(first_name, last_name, email, access_token)
        `)
        .eq('status', 'pending')
        .not('sent_to', 'is', null)
        .order('created_at', { ascending: true })
        .limit(10);

      if (notifError) throw notifError;

      let processed = 0;
      let errors = 0;

      for (const notif of notifications || []) {
        try {
          const lead = notif.crm_leads;
          await sendEmailSMTP(
            notif.sent_to,
            `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || notif.sent_to,
            notif.subject,
            notif.body,
            'team@taxiassur.com',
            'TaxiAssur'
          );

          // Marquer comme envoyé
          await supabase
            .from('crm_document_notifications')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('id', notif.id);

          processed++;
        } catch (err) {
          console.error(`Error sending notification ${notif.id}:`, err);
          await supabase
            .from('crm_document_notifications')
            .update({ status: 'error', error_message: err.message })
            .eq('id', notif.id);
          errors++;
        }
      }

      return new Response(
        JSON.stringify({ success: true, processed, errors }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Support both formats: direct payload or nested in "record"
    const notification = payload.record || payload;
    const notificationType = payload.action || payload.type || notification.type || 'upload';
    const leadId = notification.lead_id || payload.lead_id;
    const leadEmail = payload.lead_email || notification.lead_email || payload.recipient_email;
    const leadName = payload.lead_name || notification.lead_name;
    const accessToken = payload.access_token || notification.access_token;
    const contextData = notification.context_data || {};

    if (!leadId && !leadEmail) {
      throw new Error("lead_id or lead_email is required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get lead info from crm_leads (only if leadEmail not provided)
    let lead = null;
    if (leadId) {
      const { data: leadData, error: leadError } = await supabase
        .from('crm_leads')
        .select('first_name, last_name, email, phone, city, access_token')
        .eq('id', leadId)
        .single();

      if (leadError && notificationType === 'upload') {
        console.error("[send-document-notification] Lead not found:", leadError);
        throw new Error("Lead not found: " + leadError?.message);
      }
      lead = leadData;
    }

    const prospectName = leadName || (lead ? `${lead.first_name || ''} ${lead.last_name || ''}`.trim() : '') || leadEmail || 'Client';
    const prospectEmail = leadEmail || lead?.email;

    const documentTypes: Record<string, string> = {
      licence_taxi: "Licence de taxi professionnelle",
      permis_conduire: "Permis de conduire",
      piece_identite: "Pièce d'identité",
      carte_grise: "Carte grise du véhicule",
      releve_information: "Relevé d'information",
      autorisation_stationnement: "Autorisation de stationnement",
      rib: "RIB - Relevé d'Identité Bancaire",
    };

    const documentType = payload.document_type || contextData.document_type || 'piece_identite';
    const fileName = payload.document_name || contextData.file_name || 'Document.pdf';
    const documentTypeName = documentTypes[documentType] || documentType;

    const rejectionReason = payload.rejection_reason || notification.rejection_reason;
    const rejectionDetails = payload.rejection_details || notification.rejection_details;

    let emailBody = '';
    let emailSubject = '';
    let recipientEmail = '';
    let recipientName = '';

    // Email au prospect quand le commercial upload un document
    if (notificationType === 'commercial_uploaded_document' && prospectEmail) {
      recipientEmail = prospectEmail;
      recipientName = prospectName;
      emailSubject = `📄 Nouveau document disponible - TaxiAssur`;

      const prospectSpaceUrl = `https://taxiassur.com/espace-prospect${accessToken || (lead?.access_token) ? '?token=' + (accessToken || lead?.access_token) : ''}`;

      emailBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; background: #f3f4f6; padding: 20px; }
          .container { max-width: 650px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; }
          .success-box { background: #dbeafe; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0; border-radius: 8px; }
          .document-badge { background: #3b82f6; color: white; padding: 12px 24px; border-radius: 25px; display: inline-block; margin: 15px 0; font-size: 16px; font-weight: bold; }
          .info-box { background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #93c5fd; }
          .cta-button { background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; margin-top: 20px; }
          .footer { background: #1f2937; color: white; padding: 20px; text-align: center; font-size: 12px; }
          .icon { font-size: 48px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="icon">📄</div>
            <h1 style="margin: 10px 0 0 0; font-size: 28px;">NOUVEAU DOCUMENT</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">TaxiAssur - Mise à disposition de document</p>
          </div>

          <div class="content">
            <p style="font-size: 16px; color: #1f2937;">Bonjour ${prospectName},</p>

            <div class="success-box">
              <p style="margin: 0; color: #1e40af; font-size: 16px;">
                <strong>📥 Nouveau document disponible !</strong><br>
                Votre conseiller TaxiAssur vient de mettre à votre disposition un nouveau document.
              </p>
            </div>

            <h2 style="color: #1f2937; margin-top: 25px;">Document disponible</h2>

            <div class="document-badge">
              📄 ${documentTypeName}
            </div>

            <div class="info-box">
              <h3 style="color: #2563eb; margin-top: 0;">📋 Ce document contient :</h3>
              <ul style="color: #4b5563; line-height: 1.8; margin: 10px 0;">
                <li>📝 Toutes les informations importantes pour votre dossier</li>
                <li>🔍 Les détails de votre contrat ou devis</li>
                <li>✍️ Les éventuelles actions à effectuer de votre côté</li>
              </ul>
            </div>

            <h3 style="color: #1f2937;">💡 Accédez à votre document</h3>
            <p style="color: #4b5563;">
              Consultez et téléchargez votre document dès maintenant depuis votre espace personnel sécurisé.
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${prospectSpaceUrl}" class="cta-button">
                📊 VOIR LE DOCUMENT
              </a>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              💬 <strong>Une question ?</strong> Répondez simplement à cet email ou appelez-nous au <strong>01 80 85 57 86</strong>
            </p>
          </div>

          <div class="footer">
            <strong>TaxiAssur</strong><br>
            L'assurance taxi en toute simplicité<br>
            <a href="https://taxiassur.com" style="color: #10b981; text-decoration: none;">taxiassur.com</a>
          </div>
        </div>
      </body>
      </html>
      `;
    }
    // Email de validation envoyé au prospect après validation par commercial
    else if (notificationType === 'validated' && prospectEmail) {
      recipientEmail = prospectEmail;
      recipientName = prospectName;
      emailSubject = `✅ Document validé - ${documentTypeName}`;

      const prospectSpaceUrl = `https://taxiassur.com/espace-prospect${accessToken || (lead?.access_token) ? '?token=' + (accessToken || lead?.access_token) : ''}`;

      emailBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; background: #f3f4f6; padding: 20px; }
          .container { max-width: 650px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; }
          .success-box { background: #d1fae5; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 8px; }
          .document-badge { background: #10b981; color: white; padding: 12px 24px; border-radius: 25px; display: inline-block; margin: 15px 0; font-size: 16px; font-weight: bold; }
          .info-box { background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #86efac; }
          .cta-button { background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; margin-top: 20px; }
          .footer { background: #1f2937; color: white; padding: 20px; text-align: center; font-size: 12px; }
          .checkmark { font-size: 48px; color: #10b981; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="checkmark">✅</div>
            <h1 style="margin: 10px 0 0 0; font-size: 28px;">DOCUMENT VALIDÉ</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">TaxiAssur - Confirmation de validation</p>
          </div>

          <div class="content">
            <p style="font-size: 16px; color: #1f2937;">Bonjour ${prospectName},</p>

            <div class="success-box">
              <p style="margin: 0; color: #065f46; font-size: 16px;">
                <strong>🎉 Excellente nouvelle !</strong><br>
                Votre document a été vérifié et validé par notre équipe.
              </p>
            </div>

            <h2 style="color: #1f2937; margin-top: 25px;">Document validé</h2>

            <div class="document-badge">
              ✓ ${documentTypeName}
            </div>

            <div class="info-box">
              <h3 style="color: #059669; margin-top: 0;">📋 Prochaines étapes :</h3>
              <ol style="color: #4b5563; line-height: 1.8; margin: 10px 0;">
                <li>✅ Ce document est maintenant validé dans votre dossier</li>
                <li>📄 Vérifiez les autres documents éventuellement requis</li>
                <li>🎯 Une fois tous les documents validés, nous pourrons finaliser votre contrat</li>
                <li>📧 Vous serez informé par email de chaque avancement</li>
              </ol>
            </div>

            <h3 style="color: #1f2937;">💡 Suivez votre dossier</h3>
            <p style="color: #4b5563;">
              Consultez l'état de votre dossier en temps réel et voyez quels documents restent à fournir.
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${prospectSpaceUrl}" class="cta-button">
                📊 VOIR MON DOSSIER
              </a>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              💬 <strong>Une question ?</strong> Répondez simplement à cet email ou appelez-nous au <strong>01 80 85 57 86</strong>
            </p>
          </div>

          <div class="footer">
            <strong>TaxiAssur</strong><br>
            L'assurance taxi en toute simplicité<br>
            <a href="https://taxiassur.com" style="color: #10b981; text-decoration: none;">taxiassur.com</a>
          </div>
        </div>
      </body>
      </html>
      `;
    }
    // Email de confirmation envoyé au prospect après upload
    else if (notificationType === 'confirmation' && prospectEmail) {
      recipientEmail = prospectEmail;
      recipientName = prospectName;
      emailSubject = `✅ Document bien reçu - ${documentTypeName}`;

      const prospectSpaceUrl = `https://taxiassur.com/espace-prospect${accessToken ? '?token=' + accessToken : ''}`;

      emailBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; background: #f3f4f6; padding: 20px; }
          .container { max-width: 650px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; }
          .alert { background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; }
          .document-badge { background: #10b981; color: white; padding: 10px 20px; border-radius: 20px; display: inline-block; margin: 15px 0; }
          .info-box { background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #86efac; }
          .cta-button { background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; margin-top: 20px; }
          .footer { background: #1f2937; color: white; padding: 20px; text-align: center; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">✅ DOCUMENT BIEN REÇU</h1>
            <p style="margin: 10px 0 0 0;">TaxiAssur - Confirmation de réception</p>
          </div>

          <div class="content">
            <p style="font-size: 16px; color: #1f2937;">Bonjour ${prospectName},</p>

            <div class="alert">
              <strong>✅ DOCUMENT REÇU :</strong> Votre document a bien été enregistré
            </div>

            <h2 style="color: #1f2937; margin-top: 0;">Document reçu</h2>

            <div class="document-badge">
              📄 ${documentTypeName}
            </div>

            <div class="info-box">
              <h3 style="color: #059669; margin-top: 0;">📋 Prochaines étapes :</h3>
              <ol style="color: #4b5563; line-height: 1.8;">
                <li>🔍 Notre équipe va vérifier votre document</li>
                <li>✅ Nous vous confirmerons sa validation sous 24-48h</li>
                <li>📧 Vous recevrez un email si des corrections sont nécessaires</li>
                <li>🎯 Une fois tous les documents validés, nous finaliserons votre dossier</li>
              </ol>
            </div>

            <h3 style="color: #1f2937;">💡 Bon à savoir</h3>
            <p style="color: #4b5563;">
              Vous pouvez suivre l'avancement de votre dossier et uploader d'autres documents à tout moment depuis votre espace personnel.
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${prospectSpaceUrl}" class="cta-button">
                📊 ACCÉDER À MON ESPACE
              </a>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              💬 <strong>Une question ?</strong> Répondez simplement à cet email, notre équipe vous répondra rapidement.
            </p>
          </div>

          <div class="footer">
            <strong>TaxiAssur</strong><br>
            L'assurance taxi en toute simplicité
          </div>
        </div>
      </body>
      </html>
      `;
    }
    // Email de rejet envoyé au prospect
    else if (notificationType === 'rejection' && prospectEmail) {
      recipientEmail = prospectEmail;
      recipientName = prospectName;
      emailSubject = `⚠️ Document à remplacer - ${documentTypeName}`;

      const prospectSpaceUrl = `https://taxiassur.com/espace-prospect${accessToken ? '?token=' + accessToken : ''}`;

      emailBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; background: #f3f4f6; padding: 20px; }
          .container { max-width: 650px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; }
          .alert { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; }
          .document-badge { background: #ef4444; color: white; padding: 10px 20px; border-radius: 20px; display: inline-block; margin: 15px 0; }
          .info-box { background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #fca5a5; }
          .cta-button { background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; margin-top: 20px; }
          .footer { background: #1f2937; color: white; padding: 20px; text-align: center; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">⚠️ DOCUMENT À REMPLACER</h1>
            <p style="margin: 10px 0 0 0;">TaxiAssur - Gestion de votre dossier</p>
          </div>

          <div class="content">
            <p style="font-size: 16px; color: #1f2937;">Bonjour ${prospectName},</p>

            <div class="alert">
              <strong>⚠️ ACTION REQUISE :</strong> Votre document nécessite une correction
            </div>

            <h2 style="color: #1f2937; margin-top: 0;">Document concerné</h2>

            <div class="document-badge">
              📄 ${documentTypeName}
            </div>

            <div class="info-box">
              <h3 style="color: #dc2626; margin-top: 0;">Motif du rejet :</h3>
              <p style="font-size: 16px; font-weight: bold; color: #1f2937;">${rejectionReason}</p>
              ${rejectionDetails ? `<p style="color: #4b5563; margin-top: 10px;">${rejectionDetails}</p>` : ''}
            </div>

            <h3 style="color: #1f2937;">📋 Que faire maintenant ?</h3>
            <ol style="color: #4b5563; line-height: 1.8;">
              <li>📸 Prenez une nouvelle photo ou scannez à nouveau le document</li>
              <li>✅ Assurez-vous que le document est lisible et complet</li>
              <li>📤 Retournez sur votre espace prospect pour uploader le nouveau document</li>
              <li>⏱️ Nous traiterons votre nouveau document dans les plus brefs délais</li>
            </ol>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${prospectSpaceUrl}" class="cta-button">
                📤 UPLOADER UN NOUVEAU DOCUMENT
              </a>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              💡 <strong>Besoin d'aide ?</strong> Répondez simplement à cet email et notre équipe vous assistera.
            </p>
          </div>

          <div class="footer">
            <strong>TaxiAssur</strong><br>
            Votre partenaire assurance taxi de confiance
          </div>
        </div>
      </body>
      </html>
      `;
    } else {
      // Email de notification d'upload envoyé aux admins
      recipientEmail = 'team@taxiassur.com';
      recipientName = 'Équipe TaxiAssur';
      emailSubject = `📄 Nouveau document : ${documentTypeName} - ${prospectName}`;

      emailBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; background: #f3f4f6; padding: 20px; }
          .container { max-width: 650px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; }
          .alert { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
          .document-badge { background: #3b82f6; color: white; padding: 10px 20px; border-radius: 20px; display: inline-block; margin: 15px 0; }
          .info-box { background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .cta-button { background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; margin-top: 20px; }
          .footer { background: #1f2937; color: white; padding: 20px; text-align: center; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">📄 NOUVEAU DOCUMENT REÇU</h1>
            <p style="margin: 10px 0 0 0;">Notification TaxiAssur</p>
          </div>
          
          <div class="content">
            <div class="alert">
              <strong>⚡ DOCUMENT UPLOADÉ :</strong> Un nouveau document vient d'être déposé
            </div>
            
            <h2 style="color: #1f2937; margin-top: 0;">Informations du document</h2>
            
            <div class="document-badge">
              📄 ${documentTypeName}
            </div>
            
            <div class="info-box">
              <p><strong>Prospect :</strong> ${prospectName}</p>
              <p><strong>Email :</strong> ${prospectEmail}</p>
              <p><strong>Téléphone :</strong> ${lead?.phone || 'Non renseigné'}</p>
              <p><strong>Ville :</strong> ${lead?.city || 'Non renseignée'}</p>
              <p><strong>Nom du fichier :</strong> ${fileName}</p>
            </div>
            
            <h3 style="color: #1f2937;">📊 Prochaines actions</h3>
            <ol style="color: #4b5563; line-height: 1.8;">
              <li>🔍 Vérifier la validité du document</li>
              <li>✅ Valider dans le CRM si conforme</li>
              <li>📧 Contacter le prospect si nécessaire</li>
              <li>📝 Mettre à jour le dossier</li>
            </ol>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://taxiassur.com/backoffice/crm-commercial" class="cta-button">
                📊 OUVRIR LE CRM
              </a>
            </div>
          </div>
          
          <div class="footer">
            <strong>TaxiAssur CRM</strong><br>
            Notification automatique via IONOS SMTP
          </div>
        </div>
      </body>
      </html>
      `;
    }

    // Send email via SMTP
    await sendEmailSMTP(
      recipientEmail,
      recipientName,
      emailSubject,
      emailBody,
      'team@taxiassur.com',
      'TaxiAssur'
    );

    if (recipientEmail.toLowerCase() === 'team@taxiassur.com') {
      await sendEmailSMTP(
        'slebon@xcr.fr',
        'S. Lebon',
        emailSubject,
        emailBody,
        'team@taxiassur.com',
        'TaxiAssur'
      );
      console.log('✅ Copie de la notification document envoyée à slebon@xcr.fr');
    }

    console.log(`✅ Email notification ${notificationType} envoyé à ${recipientEmail}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Notification envoyée",
        type: notificationType,
        recipient: recipientEmail
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
