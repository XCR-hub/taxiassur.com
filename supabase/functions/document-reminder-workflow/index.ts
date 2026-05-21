import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
const SITE_URL = "https://taxiassur.com";

interface LeadToRemind {
  lead_id: string;
  email: string | null;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  access_token: string | null;
  vehicle_type: string | null;
  next_reminder_number: number;
  days_since_creation: number;
}

interface MissingDoc {
  type: string;
  label: string;
}

// --- Email Templates progressifs ---

function getEmailSubject(reminderNum: number, firstName: string): string {
  const subjects: Record<number, string> = {
    1: `${firstName}, il ne manque que quelques documents pour votre devis`,
    2: `Documents manquants - Votre assurance taxi en attente`,
    3: `Dernier rappel avant pause - Documents requis pour votre devis`,
    4: `${firstName}, votre dossier est incomplet - Reprenons ensemble`,
    5: `Vos documents manquants bloquent votre devis taxi`,
    6: `${firstName}, nous attendons toujours vos pieces`,
    7: `Derniere relance - Votre demande d'assurance taxi expire bientot`,
  };
  return subjects[reminderNum] || subjects[1];
}

function getEmailHtml(
  reminderNum: number,
  name: string,
  missingDocs: MissingDoc[],
  accessToken: string
): string {
  const docsList = missingDocs
    .map((d) => `<li style="padding: 6px 0; color: #374151;">${d.label}</li>`)
    .join("");

  const docsCount = missingDocs.length;
  const portalUrl = `${SITE_URL}/espace-prospect?token=${accessToken}`;

  const intros: Record<number, string> = {
    1: `Nous avons bien recu votre demande de devis d'assurance taxi et nous travaillons dessus. Pour vous etablir la meilleure offre, nous avons besoin de <strong>${docsCount} document${docsCount > 1 ? "s" : ""}</strong> supplementaire${docsCount > 1 ? "s" : ""}.`,
    2: `Nous revenons vers vous car votre dossier est toujours en attente de ${docsCount} piece${docsCount > 1 ? "s" : ""}. Sans ces documents, nous ne pouvons pas vous transmettre de devis.`,
    3: `C'est notre 3eme message et votre dossier reste incomplet. Nous comprenons que vous etes occupe, mais sans ces documents nous ne pourrons pas avancer sur votre demande.`,
    4: `Votre demande d'assurance taxi date de quelques jours et nous n'avons toujours pas recu les documents necessaires. Si vous rencontrez une difficulte, n'hesitez pas a nous appeler.`,
    5: `Nous souhaitons vraiment vous aider a obtenir la meilleure assurance pour votre activite. Il ne manque que ${docsCount} document${docsCount > 1 ? "s" : ""} pour finaliser votre devis.`,
    6: `Nous vous relanceons une derniere fois cette semaine. Votre dossier est presque complet, il ne manque que les elements ci-dessous.`,
    7: `<strong>Derniere relance :</strong> Votre demande de devis sera automatiquement archivee si nous ne recevons pas les documents manquants. Agissez maintenant pour ne pas perdre le benefice de votre demande.`,
  };

  const urgencyBanner =
    reminderNum >= 5
      ? `<div style="background: #fef2f2; border: 1px solid #ef4444; padding: 12px 16px; border-radius: 6px; margin: 16px 0;">
      <p style="margin: 0; color: #b91c1c; font-weight: 600;">Attention : Sans ces documents, nous ne pouvons pas etablir votre devis et votre demande sera archivee.</p>
    </div>`
      : "";

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <div style="background: #1e3a5f; padding: 24px 32px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">TaxiAssur</h1>
        <p style="color: #93c5fd; margin: 4px 0 0; font-size: 13px;">Votre courtier en assurance taxi</p>
      </div>

      <div style="padding: 32px;">
        <p style="font-size: 16px; color: #1f2937;">Bonjour ${name},</p>

        <p style="font-size: 15px; color: #374151; line-height: 1.6;">
          ${intros[reminderNum] || intros[1]}
        </p>

        ${urgencyBanner}

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <h3 style="margin: 0 0 12px; color: #1e3a5f; font-size: 15px;">
            Document${docsCount > 1 ? "s" : ""} manquant${docsCount > 1 ? "s" : ""} (${docsCount}) :
          </h3>
          <ul style="margin: 0; padding-left: 20px; list-style: none;">
            ${missingDocs
              .map(
                (d) =>
                  `<li style="padding: 5px 0; color: #374151; font-size: 14px;">&#10060; ${d.label}</li>`
              )
              .join("")}
          </ul>
        </div>

        <p style="font-size: 14px; color: #6b7280; line-height: 1.5;">
          Vous pouvez telecharger vos documents directement depuis votre espace securise. C'est simple, rapide et 100% confidentiel.
        </p>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${portalUrl}"
             style="background: #2563eb; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 15px;">
            DEPOSER MES DOCUMENTS
          </a>
        </div>

        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 24px;">
          <p style="font-size: 13px; color: #6b7280; margin: 0;">
            Besoin d'aide ? Appelez-nous au <strong>01 76 39 00 60</strong> ou repondez directement a cet email.
          </p>
        </div>
      </div>

      <div style="background: #f9fafb; padding: 16px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 12px; color: #9ca3af; margin: 0;">
          TaxiAssur - Courtier specialise en assurance taxi depuis 2018
        </p>
      </div>
    </div>
  `;
}

// --- SMS Templates progressifs ---

function getSmsContent(
  reminderNum: number,
  firstName: string,
  missingDocs: MissingDoc[],
  accessToken: string
): string {
  const docsCount = missingDocs.length;
  const docNames = missingDocs
    .slice(0, 3)
    .map((d) => d.label)
    .join(", ");
  const moreText = docsCount > 3 ? ` + ${docsCount - 3} autre(s)` : "";
  const portalUrl = `${SITE_URL}/espace-prospect?token=${accessToken}`;

  const templates: Record<number, string> = {
    1: `Bonjour ${firstName}, il manque ${docsCount} doc(s) pour votre devis taxi: ${docNames}${moreText}. Deposez-les ici: ${portalUrl} - TaxiAssur`,
    2: `${firstName}, votre devis taxi est bloque: ${docsCount} document(s) manquant(s). Envoyez-les vite: ${portalUrl} - TaxiAssur 01 76 39 00 60`,
    3: `Dernier rappel cette semaine ${firstName}! Sans vos documents (${docNames}${moreText}), impossible de vous faire un devis. ${portalUrl} - TaxiAssur`,
    4: `${firstName}, on reprend contact. Votre dossier attend ${docsCount} piece(s). Besoin d'aide? Appelez le 01 76 39 00 60 ou deposez-les: ${portalUrl}`,
    5: `${firstName}, votre assurance taxi ne tient qu'a ${docsCount} document(s). On les attend ici: ${portalUrl} - TaxiAssur`,
    6: `Rappel ${firstName}: ${docNames}${moreText} manquant(s). Votre demande sera bientot archivee sans reponse. ${portalUrl} - TaxiAssur`,
    7: `DERNIERE RELANCE ${firstName}: votre demande de devis taxi expire. Deposez vos ${docsCount} doc(s) maintenant: ${portalUrl} ou appelez 01 76 39 00 60`,
  };

  return templates[reminderNum] || templates[1];
}

// --- Envoi Email via Brevo ---

async function sendEmail(
  to: string,
  toName: string,
  subject: string,
  htmlContent: string
): Promise<boolean> {
  if (!BREVO_API_KEY || !to) return false;

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: "TaxiAssur", email: "contact@taxiassur.com" },
        to: [{ email: to, name: toName }],
        subject,
        htmlContent,
        replyTo: { email: "team@taxiassur.com", name: "TaxiAssur" },
      }),
    });
    return response.ok;
  } catch (err) {
    console.error("[sendEmail] Error:", err);
    return false;
  }
}

// --- Envoi SMS via Brevo ---

async function sendSms(phone: string, content: string): Promise<boolean> {
  if (!BREVO_API_KEY || !phone) return false;

  let normalized = phone.replace(/[\s\.\-\(\)]/g, "");
  if (normalized.startsWith("0")) {
    normalized = "33" + normalized.slice(1);
  }
  if (!normalized.startsWith("+")) {
    normalized = "+" + normalized;
  }

  try {
    const response = await fetch(
      "https://api.brevo.com/v3/transactionalSMS/sms",
      {
        method: "POST",
        headers: {
          "api-key": BREVO_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "transactional",
          unicodeEnabled: true,
          sender: "TaxiAssur",
          recipient: normalized,
          content,
        }),
      }
    );
    return response.ok;
  } catch (err) {
    console.error("[sendSms] Error:", err);
    return false;
  }
}

// --- Processeur principal ---

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const results = {
      emails_sent: 0,
      sms_sent: 0,
      skipped: 0,
      errors: 0,
      leads_processed: 0,
      details: [] as Array<{
        lead_id: string;
        name: string;
        reminder: number;
        email: boolean;
        sms: boolean;
        missing_count: number;
      }>,
    };

    // Recuperer les leads qui doivent etre relances
    const { data: leads, error: leadsError } = await supabase.rpc(
      "get_leads_needing_document_reminder"
    );

    if (leadsError) {
      console.error("[document-reminder] RPC error:", leadsError.message);
      return new Response(
        JSON.stringify({ success: false, error: leadsError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!leads?.length) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Aucun lead a relancer",
          ...results,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    for (const lead of leads as LeadToRemind[]) {
      // Recuperer les documents manquants
      const { data: missingDocs } = await supabase.rpc(
        "get_lead_missing_documents",
        { p_lead_id: lead.lead_id }
      );

      const missing: MissingDoc[] = missingDocs || [];

      if (missing.length === 0) {
        results.skipped++;
        continue;
      }

      const name =
        `${lead.first_name || ""} ${lead.last_name || ""}`.trim() ||
        "cher prospect";
      const firstName = lead.first_name || "Cher prospect";
      const token = lead.access_token || lead.lead_id;
      const reminderNum = lead.next_reminder_number;

      let emailSent = false;
      let smsSent = false;

      // --- Envoi Email ---
      if (lead.email) {
        const subject = getEmailSubject(reminderNum, firstName);
        const html = getEmailHtml(reminderNum, name, missing, token);

        emailSent = await sendEmail(lead.email, name, subject, html);

        // Tracking
        await supabase.from("document_reminder_tracking").insert({
          lead_id: lead.lead_id,
          reminder_number: reminderNum,
          channel: "email",
          missing_documents: missing,
          status: emailSent ? "sent" : "failed",
          message_preview: subject,
        });

        if (emailSent) {
          results.emails_sent++;
          await supabase.from("crm_interactions").insert({
            lead_id: lead.lead_id,
            type: "email",
            direction: "outbound",
            subject: subject,
            content: `Relance documents #${reminderNum} - ${missing.length} documents manquants: ${missing.map((d) => d.label).join(", ")}`,
          });
        } else {
          results.errors++;
        }
      }

      // --- Envoi SMS ---
      if (lead.phone) {
        const smsContent = getSmsContent(
          reminderNum,
          firstName,
          missing,
          token
        );

        smsSent = await sendSms(lead.phone, smsContent);

        // Tracking
        await supabase.from("document_reminder_tracking").insert({
          lead_id: lead.lead_id,
          reminder_number: reminderNum,
          channel: "sms",
          missing_documents: missing,
          status: smsSent ? "sent" : "failed",
          message_preview: smsContent.slice(0, 100),
        });

        if (smsSent) {
          results.sms_sent++;
          await supabase.from("crm_interactions").insert({
            lead_id: lead.lead_id,
            type: "sms",
            direction: "outbound",
            subject: `Relance documents SMS #${reminderNum}`,
            content: smsContent,
          });
        } else {
          results.errors++;
        }
      }

      results.leads_processed++;
      results.details.push({
        lead_id: lead.lead_id,
        name,
        reminder: reminderNum,
        email: emailSent,
        sms: smsSent,
        missing_count: missing.length,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        ...results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[document-reminder] Fatal error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
