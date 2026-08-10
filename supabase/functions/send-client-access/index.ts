import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const internalDomains = new Set(['taxiassur.com', 'taxiassur.fr', 'xcr.fr']);

async function isAuthorized(req: Request, supabaseUrl: string, serviceKey: string): Promise<boolean> {
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return false;
  if (token === serviceKey) return true;
  const admin = createClient(supabaseUrl, serviceKey);
  const { data, error } = await admin.auth.getUser(token);
  if (error) return false;
  const domain = (data.user?.email || '').toLowerCase().split('@')[1];
  return internalDomains.has(domain);
}

function escapeHtml(value: unknown): string {
  const entities: Record<string, string> = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  };
  return String(value ?? '').replace(/[&<>"']/g, (character) => entities[character]);
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ success: false, error: "Service indisponible" }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!await isAuthorized(req, supabaseUrl, supabaseKey)) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch {
      return new Response(JSON.stringify({ success: false, error: "Corps JSON invalide" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const requestId = typeof body.requestId === "string" ? body.requestId.trim() : "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) {
      return new Response(JSON.stringify({ success: false, error: "requestId invalide" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const lead_id = typeof body.lead_id === "string" ? body.lead_id.trim() : "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(lead_id)) {
      return new Response(JSON.stringify({ success: false, error: "lead_id invalide" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: lead, error: leadError } = await supabase
      .from("crm_leads")
      .select("id, first_name, last_name, email, phone, access_token")
      .eq("id", lead_id)
      .maybeSingle();

    if (leadError || !lead) {
      throw new Error("Lead introuvable");
    }

    if (!lead.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email) || lead.email.length > 254) {
      throw new Error("Le lead n'a pas d'email");
    }

    if (!lead.access_token || !/^[0-9A-Fa-f]{64}$/.test(lead.access_token)) {
      return new Response(JSON.stringify({ success: false, error: "Jeton client indisponible" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const clientSpaceLink = `https://taxiassur.com/espace-client/${lead.access_token}`;
    const safeFirstName = escapeHtml(lead.first_name);

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; background: #f3f4f6; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center; color: white; }
    .header h1 { margin: 0 0 10px 0; font-size: 28px; }
    .content { padding: 40px 30px; }
    .welcome-box { background: #dbeafe; border-left: 4px solid #3b82f6; padding: 20px; margin: 25px 0; border-radius: 8px; }
    .link-box { background: #fef3c7; border: 2px solid #f59e0b; padding: 25px; border-radius: 12px; margin: 25px 0; text-align: center; }
    .credential-item { background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #10b981; }
    .credential-label { color: #6b7280; font-size: 12px; text-transform: uppercase; margin-bottom: 5px; }
    .credential-value { color: #1f2937; font-weight: bold; font-size: 18px; font-family: 'Courier New', monospace; }
    .cta-button { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 18px 35px; text-decoration: none; border-radius: 50px; display: inline-block; font-weight: bold; font-size: 16px; margin: 20px 0; }
    .features-grid { display: grid; gap: 15px; margin: 25px 0; }
    .feature-item { background: #f9fafb; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981; }
    .info-box { background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 8px; }
    .footer { background: #1f2937; color: white; padding: 30px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Bienvenue chez TaxiAssur !</h1>
      <p style="margin: 0; font-size: 18px;">Votre espace client est prêt</p>
    </div>
    <div class="content">
      <div class="welcome-box">
        <strong style="font-size: 18px;">Félicitations ${safeFirstName} !</strong><br><br>
        Votre assurance taxi est maintenant active. Nous sommes ravis de vous compter parmi nos clients.
      </div>

      <h2 style="color: #1f2937; margin-top: 30px;">🔐 Accès sécurisé à votre espace</h2>

      <div class="link-box">
        <p style="margin-top: 0; color: #92400e; font-weight: bold;">Cliquez sur le bouton ci-dessous pour accéder instantanément :</p>

        <div style="margin: 25px 0;">
          <a href="${clientSpaceLink}" class="cta-button" style="text-decoration: none;">
            🚀 ACCÉDER À MON ESPACE CLIENT
          </a>
        </div>

        <p style="margin: 0; font-size: 14px; color: #92400e;">
          Ce lien est personnel et sécurisé. Vous serez automatiquement connecté.
        </p>
      </div>

      <div class="info-box">
        <strong>✅ Connexion automatique :</strong> Aucun mot de passe nécessaire ! Cliquez simplement sur le bouton et accédez à votre espace en toute sécurité.
      </div>

      <h3 style="color: #1f2937;">✨ Que pouvez-vous faire dans votre espace client ?</h3>

      <div class="features-grid">
        <div class="feature-item">
          <strong>📄 Consulter vos documents</strong><br>
          Attestations, contrats, factures disponibles 24h/24
        </div>
        <div class="feature-item">
          <strong>🚨 Déclarer un sinistre</strong><br>
          Procédure simple et suivi en temps réel
        </div>
        <div class="feature-item">
          <strong>✏️ Modifier vos informations</strong><br>
          Mettez à jour vos coordonnées et véhicules
        </div>
        <div class="feature-item">
          <strong>💬 Contacter votre conseiller</strong><br>
          Messagerie sécurisée et assistance prioritaire
        </div>
        <div class="feature-item">
          <strong>💳 Gérer vos paiements</strong><br>
          Consultez vos échéances et modifiez votre RIB
        </div>
        <div class="feature-item">
          <strong>📊 Suivre vos prestations</strong><br>
          Historique complet de vos interactions
        </div>
      </div>

      <div style="background: #dbeafe; padding: 20px; border-radius: 12px; margin: 30px 0; text-align: center;">
        <h3 style="color: #1e40af; margin-top: 0;">💬 Besoin d'aide ?</h3>
        <p style="margin: 10px 0; color: #1f2937;">
          <strong>📞 01 80 85 57 86</strong><br>
          <a href="mailto:team@taxiassur.com" style="color: #1e40af;">📧 team@taxiassur.com</a>
        </p>
        <p style="margin: 0; font-size: 14px; color: #6b7280;">
          Notre équipe est disponible du lundi au vendredi, 9h-18h
        </p>
      </div>
    </div>
    <div class="footer">
      <div style="font-size: 22px; font-weight: bold; color: #10b981; margin-bottom: 10px;">TaxiAssur</div>
      <p style="margin: 5px 0;">Courtier spécialisé en assurance taxi et VTC</p>
      <p style="margin-top: 15px; font-size: 12px; color: #9ca3af;">
        ORIAS 11 061 425 - Excellence Coverage Risks<br>
        Ce message vous est envoyé car vous êtes client chez TaxiAssur
      </p>
    </div>
  </div>
</body>
</html>`;

    // Créer ou mettre à jour le portail client
    const { error: portalError } = await supabase
      .from('client_portal_users')
      .upsert({
        email: lead.email.toLowerCase().trim(),
        lead_id: lead.id,
        first_name: lead.first_name,
        last_name: lead.last_name,
        phone: lead.phone,
        is_active: true,
        metadata: {
          client_space_link_sent: true,
          sent_at: new Date().toISOString()
        }
      }, {
        onConflict: 'email'
      });

    if (portalError) throw new Error("ClientPortalPersistenceFailed");

    const relayResponse = await fetch(`${supabaseUrl}/functions/v1/send-crm-email`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        apikey: supabaseKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: lead.email,
        to_name: `${lead.first_name || ""} ${lead.last_name || ""}`.trim() || "Client",
        subject: "Bienvenue ! Accédez à votre espace client TaxiAssur",
        content: emailHtml,
        lead_id: lead.id,
        requestId,
      }),
      signal: AbortSignal.timeout(45_000),
    });
    const relayResult = await relayResponse.json().catch(() => null);
    if (!relayResponse.ok || relayResult?.success !== true) {
      throw new Error("ClientAccessDeliveryFailed");
    }



    return new Response(
      JSON.stringify({
        success: true,
        message: "Email d'accès envoyé avec succès",
        lead_id: lead.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Client access email failed", error instanceof Error ? error.name : "unknown");
    return new Response(
      JSON.stringify({
        success: false,
        error: "Erreur serveur",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
