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
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            line-height: 1.6;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
          }
          .email-wrapper {
            max-width: 680px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          }
          .header {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            padding: 40px 30px;
            text-align: center;
            position: relative;
          }
          .logo-container {
            background: white;
            width: 120px;
            height: 120px;
            margin: 0 auto 20px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          }
          .logo {
            width: 90px;
            height: 90px;
          }
          .header h1 {
            color: white;
            font-size: 36px;
            font-weight: 800;
            margin: 0 0 10px 0;
            text-shadow: 0 2px 10px rgba(0,0,0,0.2);
          }
          .header p {
            color: #d1fae5;
            font-size: 18px;
            font-weight: 500;
          }
          .content {
            padding: 40px 30px;
          }
          .alert-banner {
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            color: white;
            padding: 20px;
            border-radius: 15px;
            margin-bottom: 30px;
            box-shadow: 0 8px 20px rgba(245, 158, 11, 0.3);
            text-align: center;
          }
          .alert-banner strong {
            font-size: 20px;
            display: block;
            margin-bottom: 5px;
          }
          .section-title {
            color: #10b981;
            font-size: 24px;
            font-weight: 700;
            margin: 30px 0 20px 0;
            padding-bottom: 10px;
            border-bottom: 3px solid #10b981;
          }
          .document-badge {
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: white;
            padding: 15px 30px;
            border-radius: 50px;
            font-size: 18px;
            font-weight: 700;
            display: inline-block;
            box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
            margin: 20px 0;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 25px 0;
          }
          .info-card {
            background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
            padding: 20px;
            border-radius: 15px;
            box-shadow: 0 8px 20px rgba(251, 191, 36, 0.3);
            transition: transform 0.3s;
          }
          .info-card.blue {
            background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
            box-shadow: 0 8px 20px rgba(59, 130, 246, 0.3);
          }
          .info-card.green {
            background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
            box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3);
          }
          .info-card.purple {
            background: linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%);
            box-shadow: 0 8px 20px rgba(139, 92, 246, 0.3);
          }
          .info-label {
            color: white;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 8px;
            font-weight: 600;
            opacity: 0.9;
          }
          .info-value {
            color: white;
            font-weight: 700;
            font-size: 16px;
            word-break: break-word;
          }
          .info-value a {
            color: white;
            text-decoration: none;
            border-bottom: 2px solid rgba(255,255,255,0.5);
          }
          .actions-section {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            padding: 25px;
            border-radius: 15px;
            margin: 30px 0;
            box-shadow: 0 8px 20px rgba(254, 243, 199, 0.5);
          }
          .actions-title {
            color: #92400e;
            font-size: 20px;
            font-weight: 700;
            margin-bottom: 15px;
          }
          .actions-section li {
            color: #78350f;
            font-weight: 600;
            margin: 10px 0;
            padding-left: 10px;
          }
          .cta-container {
            text-align: center;
            margin: 40px 0;
          }
          .cta-button {
            background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);
            color: white;
            padding: 18px 40px;
            text-decoration: none;
            border-radius: 50px;
            display: inline-block;
            font-weight: 700;
            font-size: 18px;
            box-shadow: 0 10px 30px rgba(236, 72, 153, 0.4);
            transition: transform 0.3s;
          }
          .cta-button:hover {
            transform: translateY(-2px);
          }
          .secondary-link {
            color: #3b82f6;
            text-decoration: none;
            font-weight: 600;
            font-size: 15px;
            margin-top: 15px;
            display: inline-block;
          }
          .info-banner {
            background: linear-gradient(135deg, #a5f3fc 0%, #67e8f9 100%);
            border-left: 5px solid #06b6d4;
            padding: 20px;
            border-radius: 10px;
            color: #164e63;
            font-weight: 600;
            box-shadow: 0 8px 20px rgba(103, 232, 249, 0.3);
          }
          .footer {
            background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
            color: white;
            padding: 30px;
            text-align: center;
          }
          .footer-logo {
            font-size: 24px;
            font-weight: 800;
            color: #10b981;
            margin-bottom: 10px;
          }
          .footer p {
            color: #94a3b8;
            font-size: 13px;
            margin: 5px 0;
          }
          @media (max-width: 600px) {
            .info-grid {
              grid-template-columns: 1fr;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <!-- Header avec logo -->
          <div class="header">
            <div class="logo-container">
              <svg class="logo" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="45" fill="#10b981"/>
                <path d="M30 40 L70 40 L70 60 L30 60 Z" fill="white"/>
                <circle cx="35" cy="70" r="8" fill="white"/>
                <circle cx="65" cy="70" r="8" fill="white"/>
                <rect x="45" y="25" width="10" height="15" fill="white"/>
              </svg>
            </div>
            <h1>📤 NOUVEAU DOCUMENT</h1>
            <p>Un document vient d'être uploadé sur TaxiAssur</p>
          </div>

          <div class="content">
            <!-- Bannière d'alerte -->
            <div class="alert-banner">
              <strong>🎉 Document reçu avec succès !</strong>
              <p style="margin: 5px 0 0 0; font-size: 16px;">${lead.name} a déposé un nouveau document</p>
            </div>

            <!-- Section document -->
            <h2 class="section-title">📄 Informations du document</h2>
            <div style="text-align: center;">
              <span class="document-badge">${documentTypeName}</span>
            </div>

            <div class="info-grid">
              <div class="info-card blue">
                <div class="info-label">📝 Nom du fichier</div>
                <div class="info-value">${document.file_name}</div>
              </div>
              <div class="info-card green">
                <div class="info-label">💾 Taille du fichier</div>
                <div class="info-value">${formatFileSize(document.file_size)}</div>
              </div>
              <div class="info-card purple">
                <div class="info-label">📋 Type de fichier</div>
                <div class="info-value">${document.mime_type}</div>
              </div>
              <div class="info-card">
                <div class="info-label">⏰ Date d'upload</div>
                <div class="info-value">${new Date(document.uploaded_at).toLocaleString("fr-FR", {
                  dateStyle: "short",
                  timeStyle: "short"
                })}</div>
              </div>
            </div>

            <!-- Section prospect -->
            <h2 class="section-title">👤 Informations du prospect</h2>
            <div class="info-grid">
              <div class="info-card green">
                <div class="info-label">👤 Nom complet</div>
                <div class="info-value">${lead.name}</div>
              </div>
              <div class="info-card blue">
                <div class="info-label">📞 Téléphone</div>
                <div class="info-value"><a href="tel:${lead.phone}">${lead.phone}</a></div>
              </div>
              <div class="info-card purple">
                <div class="info-label">📧 Email</div>
                <div class="info-value"><a href="mailto:${lead.email}">${lead.email}</a></div>
              </div>
              <div class="info-card">
                <div class="info-label">📍 Ville</div>
                <div class="info-value">${lead.city}</div>
              </div>
            </div>

            <!-- Actions à effectuer -->
            <div class="actions-section">
              <div class="actions-title">📋 Actions à effectuer</div>
              <ol>
                <li>✅ Vérifier la validité du document</li>
                <li>📝 Mettre à jour le statut dans le CRM</li>
                <li>📞 Contacter le prospect si nécessaire</li>
                <li>💰 Continuer le processus de devis</li>
              </ol>
            </div>

            <!-- CTA -->
            <div class="cta-container">
              <a href="https://taxiassur.com/backoffice/crm-commercial?lead=${document.lead_id}" class="cta-button">
                🚀 OUVRIR LE DOSSIER
              </a>
              <br>
              <a href="https://taxiassur.com/backoffice/leads" class="secondary-link">
                Voir tous les leads →
              </a>
            </div>

            <!-- Info banner -->
            <div class="info-banner">
              <strong>💡 Accès rapide :</strong> Le document est directement accessible dans l'espace documents du lead dans votre CRM.
            </div>
          </div>

          <!-- Footer -->
          <div class="footer">
            <div class="footer-logo">🚕 TaxiAssur</div>
            <p><strong>Système de Notification Automatique</strong></p>
            <p>Ne pas répondre à cet email</p>
            <p style="margin-top: 15px;">© 2026 TaxiAssur - Tous droits réservés</p>
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