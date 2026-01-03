import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DocumentPayload {
  type: "INSERT";
  table: string;
  record: {
    id: string;
    lead_id: string;
    document_type: string;
    file_name: string;
    file_path: string;
    file_size: number;
    mime_type: string;
    uploaded_at: string;
    status: string;
  };
}

interface Lead {
  name: string;
  email: string;
  phone: string;
  city: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const payload: DocumentPayload = await req.json();
    const document = payload.record;

    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
    if (!BREVO_API_KEY) {
      throw new Error("BREVO_API_KEY not configured");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const leadResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/leads?id=eq.${document.lead_id}&select=name,email,phone,city`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );

    if (!leadResponse.ok) {
      throw new Error("Failed to fetch lead info");
    }

    const leads: Lead[] = await leadResponse.json();
    if (leads.length === 0) {
      throw new Error("Lead not found");
    }

    const lead = leads[0];

    const documentTypes: Record<string, string> = {
      licence_taxi: "Licence de taxi professionnelle",
      permis_conduire: "Permis de conduire",
      piece_identite: "Pièce d'identité",
      carte_grise: "Carte grise du véhicule",
      releve_information: "Relevé d'information",
      autorisation_stationnement: "Autorisation de stationnement",
      rib: "RIB - Relevé d'Identité Bancaire",
      autre: "Autre document",
    };

    const documentTypeName = documentTypes[document.document_type] || document.document_type;

    const formatFileSize = (bytes: number): string => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    const emailBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f3f4f6; }
          .container { max-width: 650px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 25px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
          .alert-box { background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
          .info-item { background: #f9fafb; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb; }
          .info-label { color: #6b7280; font-size: 12px; text-transform: uppercase; margin-bottom: 5px; }
          .info-value { color: #1f2937; font-weight: bold; font-size: 16px; word-break: break-all; }
          .cta-button { background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; margin: 20px 0; text-align: center; }
          .footer { background: #1f2937; color: white; padding: 20px; text-align: center; font-size: 12px; border-radius: 0 0 10px 10px; }
          .document-badge { background: #10b981; color: white; padding: 8px 15px; border-radius: 20px; font-size: 14px; font-weight: bold; display: inline-block; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 32px;">📤 NOUVEAU DOCUMENT</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Un document vient d'être uploadé</p>
          </div>

          <div class="content">
            <div class="alert-box">
              <strong>✅ Document reçu :</strong> Un nouveau document a été déposé par <strong>${lead.name}</strong>
            </div>

            <h2 style="color: #1f2937; margin-top: 0;">Informations du document</h2>

            <div style="text-align: center; margin: 20px 0;">
              <span class="document-badge">📄 ${documentTypeName}</span>
            </div>

            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Nom du fichier</div>
                <div class="info-value" style="font-size: 14px;">${document.file_name}</div>
              </div>

              <div class="info-item">
                <div class="info-label">Taille</div>
                <div class="info-value">${formatFileSize(document.file_size)}</div>
              </div>

              <div class="info-item">
                <div class="info-label">Type de fichier</div>
                <div class="info-value">${document.mime_type}</div>
              </div>

              <div class="info-item">
                <div class="info-label">Date d'upload</div>
                <div class="info-value">${new Date(document.uploaded_at).toLocaleString("fr-FR", {
                  dateStyle: "short",
                  timeStyle: "short"
                })}</div>
              </div>
            </div>

            <h2 style="color: #1f2937;">Informations du prospect</h2>

            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Nom complet</div>
                <div class="info-value">${lead.name}</div>
              </div>

              <div class="info-item">
                <div class="info-label">📞 Téléphone</div>
                <div class="info-value"><a href="tel:${lead.phone}" style="color: #10b981; text-decoration: none;">${lead.phone}</a></div>
              </div>

              <div class="info-item">
                <div class="info-label">📧 Email</div>
                <div class="info-value"><a href="mailto:${lead.email}" style="color: #3b82f6; text-decoration: none; font-size: 14px;">${lead.email}</a></div>
              </div>

              <div class="info-item">
                <div class="info-label">📍 Ville</div>
                <div class="info-value">${lead.city}</div>
              </div>
            </div>

            <h3 style="color: #1f2937;">📋 Actions à effectuer</h3>
            <ol style="color: #4b5563; line-height: 1.8;">
              <li>✅ Vérifier la validité du document</li>
              <li>📝 Mettre à jour le statut dans le CRM</li>
              <li>📞 Contacter le prospect si le document est incomplet ou illisible</li>
              <li>💰 Continuer le processus de devis si tous les documents sont reçus</li>
            </ol>

            <div style="text-align: center; margin: 30px 0;">
              <a href="https://taxiassur.com/backoffice/crm-commercial?lead=${document.lead_id}" class="cta-button">
                📊 OUVRIR LE DOSSIER
              </a>
              <br>
              <a href="https://taxiassur.com/backoffice/leads" style="color: #3b82f6; text-decoration: none; font-size: 14px;">
                Voir tous les leads →
              </a>
            </div>

            <div style="background: #eff6ff; border: 1px solid #3b82f6; padding: 15px; border-radius: 8px;">
              <strong>💡 Rappel :</strong> Le document est accessible dans l'espace documents du lead.
            </div>
          </div>

          <div class="footer">
            <strong>TaxiAssur CRM</strong><br>
            Notification automatique | Ne pas répondre à cet email
          </div>
        </div>
      </body>
      </html>
    `;

    const emailResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: "TaxiAssur Notifications",
          email: "team@taxiassur.com",
        },
        to: [
          { email: "team@taxiassur.com", name: "Équipe TaxiAssur" },
        ],
        subject: `📤 Nouveau document : ${documentTypeName} - ${lead.name}`,
        htmlContent: emailBody,
      }),
    });

    if (!emailResponse.ok) {
      const error = await emailResponse.text();
      console.error("Brevo email error:", error);
      throw new Error(`Failed to send email: ${error}`);
    }

    console.log(`✅ Document notification email sent for lead ${document.lead_id}, document ${document.id}`);

    return new Response(
      JSON.stringify({ success: true, message: "Email notification sent" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});