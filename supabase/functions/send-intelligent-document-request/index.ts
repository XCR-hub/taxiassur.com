import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const DOCUMENT_TYPES: Record<string, { label: string; required: boolean }> = {
  licence_taxi: { label: "Licence de taxi professionnelle", required: true },
  permis_conduire: { label: "Permis de conduire", required: true },
  piece_identite: { label: "Pièce d'identité", required: true },
  carte_grise: { label: "Carte grise du véhicule", required: true },
  releve_information: { label: "Relevé d'information", required: false },
  autorisation_stationnement: { label: "Autorisation de stationnement", required: true },
  rib: { label: "RIB - Relevé d'Identité Bancaire", required: true },
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
    const { lead_id, specific_documents } = await req.json();

    if (!lead_id) {
      throw new Error("lead_id is required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get lead info with document checklist
    const { data: lead, error: leadError } = await supabase
      .from('crm_leads')
      .select('id, first_name, last_name, email, phone, access_token, document_checklist')
      .eq('id', lead_id)
      .maybeSingle();

    if (leadError || !lead) {
      throw new Error(`Lead not found: ${leadError?.message || 'No data'}`);
    }

    if (!lead.email) {
      throw new Error("Lead has no email address");
    }

    // Determine which documents to request
    let documentsToRequest: string[] = [];

    if (specific_documents && Array.isArray(specific_documents) && specific_documents.length > 0) {
      // Use specific documents provided
      documentsToRequest = specific_documents;
    } else {
      // Get missing documents from checklist using DB function
      const { data: missingDocs } = await supabase.rpc('get_missing_documents', {
        p_lead_id: lead_id
      });

      if (missingDocs && missingDocs.length > 0) {
        documentsToRequest = missingDocs.map((d: { document_type: string }) => d.document_type);
      }
    }

    // If no documents to request, return early
    if (documentsToRequest.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Aucun document manquant - email non envoyé",
          documents_requested: []
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate access token if not exists
    let accessToken = lead.access_token;
    if (!accessToken) {
      accessToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
      await supabase
        .from('crm_leads')
        .update({ access_token: accessToken })
        .eq('id', lead_id);
    }

    // Build portal URL
    const portalUrl = `https://taxiassur.com/espace-prospect/${accessToken}`;

    // Build document list HTML
    const documentListHtml = documentsToRequest.map(docType => {
      const docInfo = DOCUMENT_TYPES[docType] || { label: docType, required: false };
      const icon = docInfo.required ? '⚠️' : '📄';
      return `<li style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${icon} <strong>${docInfo.label}</strong>${docInfo.required ? ' (obligatoire)' : ''}</li>`;
    }).join('');

    // Build email HTML
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; background: #f3f4f6; padding: 20px; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
    
    <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">Completez votre dossier</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">TaxiAssur - Votre assurance taxi</p>
    </div>
    
    <div style="padding: 30px;">
      <p style="font-size: 16px; color: #374151;">Bonjour <strong>${lead.first_name || 'Prospect'}</strong>,</p>
      
      <p style="color: #4b5563; line-height: 1.6;">
        Pour finaliser votre demande d'assurance taxi, nous avons besoin des documents suivants :
      </p>
      
      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
        <strong style="color: #92400e;">Documents a fournir (${documentsToRequest.length})</strong>
        <ul style="margin: 10px 0 0 0; padding-left: 0; list-style: none;">
          ${documentListHtml}
        </ul>
      </div>
      
      <p style="color: #4b5563; line-height: 1.6;">
        Cliquez sur le bouton ci-dessous pour acceder a votre espace securise et deposer vos documents en toute simplicite.
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${portalUrl}" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
          DEPOSER MES DOCUMENTS
        </a>
      </div>
      
      <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; color: #0369a1; font-size: 14px;">
          <strong>Astuce :</strong> Vous pouvez photographier vos documents avec votre telephone et les telecharger directement depuis votre espace.
        </p>
      </div>
      
      <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
        Une question ? Appelez-nous au <a href="tel:0180855786" style="color: #f59e0b; font-weight: bold;">01 80 85 57 86</a>
      </p>
    </div>
    
    <div style="background: #1f2937; padding: 20px; text-align: center;">
      <p style="color: #9ca3af; margin: 0; font-size: 12px;">
        TaxiAssur - Votre specialiste assurance taxi<br>
        <a href="https://taxiassur.com" style="color: #f59e0b;">taxiassur.com</a>
      </p>
    </div>
  </div>
</body>
</html>`;

    // Send email
    await sendEmailSMTP(
      lead.email,
      `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Prospect',
      `TaxiAssur - ${documentsToRequest.length} document(s) manquant(s) pour votre dossier`,
      emailHtml,
      "team@taxiassur.com",
      "TaxiAssur"
    );

    // Log the email send
    await supabase
      .from('email_sends')
      .insert({
        lead_id: lead_id,
        email_to: lead.email,
        email_from: 'team@taxiassur.com',
        subject: `TaxiAssur - ${documentsToRequest.length} document(s) manquant(s) pour votre dossier`,
        body_html: emailHtml,
        status: 'sent',
        template_name: 'intelligent_document_request'
      });

    // Update lead last contact
    await supabase
      .from('crm_leads')
      .update({
        last_contact_at: new Date().toISOString(),
        last_email_at: new Date().toISOString()
      })
      .eq('id', lead_id);

    console.log(`Email intelligent document request sent to ${lead.email} for ${documentsToRequest.length} documents`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Email envoyé pour ${documentsToRequest.length} document(s)`,
        documents_requested: documentsToRequest,
        portal_url: portalUrl
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});