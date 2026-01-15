import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");

interface RelanceResult {
  type: string;
  sent: number;
  skipped: number;
  errors: number;
}

async function sendEmail(
  to: { email: string; name: string },
  subject: string,
  htmlContent: string
): Promise<boolean> {
  if (!BREVO_API_KEY) return false;

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: "TaxiAssur", email: "contact@taxiassur.com" },
        to: [to],
        subject,
        htmlContent,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function logInteraction(leadId: string, subject: string, content: string): Promise<void> {
  await supabase.from("crm_interactions").insert({
    lead_id: leadId,
    interaction_type: "email",
    direction: "outgoing",
    subject,
    content,
    channel: "email",
    is_automated: true,
  });
}

async function processQuoteReminders(): Promise<RelanceResult> {
  const result: RelanceResult = { type: "quote", sent: 0, skipped: 0, errors: 0 };

  const { data: pendingQuotes } = await supabase
    .from("crm_quotes_sent")
    .select(`
      id,
      lead_id,
      sent_at,
      reminder_count,
      last_reminder_at,
      status,
      monthly_premium,
      annual_premium,
      crm_leads!inner(
        id,
        email,
        first_name,
        last_name,
        access_token,
        status
      )
    `)
    .eq("status", "sent")
    .lt("reminder_count", 4)
    .not("crm_leads.email", "is", null);

  if (!pendingQuotes?.length) return result;

  const now = new Date();
  const reminderIntervals = [24, 48, 72, 120];

  for (const quote of pendingQuotes) {
    const lastSent = quote.last_reminder_at || quote.sent_at;
    const hoursSinceLast = lastSent
      ? (now.getTime() - new Date(lastSent).getTime()) / (1000 * 60 * 60)
      : 999;

    const minInterval = reminderIntervals[quote.reminder_count || 0] || 48;

    if (hoursSinceLast < minInterval) {
      result.skipped++;
      continue;
    }

    const lead = quote.crm_leads;
    const name = `${lead.first_name || ""} ${lead.last_name || ""}`.trim();

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e40af;">Votre devis assurance taxi vous attend</h2>
        <p>Bonjour ${name || "cher prospect"},</p>
        <p>Nous vous avons envoye un devis personnalise pour votre assurance taxi.</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          ${quote.monthly_premium ? `<p><strong>Tarif mensuel :</strong> ${Number(quote.monthly_premium).toFixed(2)} EUR</p>` : ""}
          ${quote.annual_premium ? `<p><strong>Tarif annuel :</strong> ${Number(quote.annual_premium).toFixed(2)} EUR</p>` : ""}
        </div>
        <p>N'hesitez pas a consulter votre espace prospect pour accepter le devis ou nous poser vos questions.</p>
        <p style="margin-top: 20px;">
          <a href="https://taxiassur.com/espace-prospect/${lead.access_token || lead.id}"
             style="background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            CONSULTER MON DEVIS
          </a>
        </p>
        <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
          Des questions ? Appelez-nous au 01 76 39 00 60 ou repondez a cet email.
        </p>
      </div>
    `;

    const sent = await sendEmail(
      { email: lead.email, name },
      `Rappel: Votre devis assurance taxi vous attend`,
      htmlContent
    );

    if (sent) {
      await supabase.from("crm_quotes_sent").update({
        reminder_count: (quote.reminder_count || 0) + 1,
        last_reminder_at: now.toISOString(),
      }).eq("id", quote.id);

      await logInteraction(
        lead.id,
        "Rappel devis automatique",
        `Rappel #${(quote.reminder_count || 0) + 1} envoye pour le devis`
      );
      result.sent++;
    } else {
      result.errors++;
    }
  }

  return result;
}

async function processPaymentReminders(): Promise<RelanceResult> {
  const result: RelanceResult = { type: "payment", sent: 0, skipped: 0, errors: 0 };

  const { data: pendingPayments } = await supabase
    .from("lead_contracts")
    .select(`
      id,
      lead_id,
      down_payment_amount,
      down_payment_link,
      down_payment_status,
      created_at,
      crm_leads!inner(
        id,
        email,
        first_name,
        last_name,
        access_token
      )
    `)
    .eq("requires_down_payment", true)
    .eq("down_payment_status", "pending")
    .not("down_payment_link", "is", null);

  if (!pendingPayments?.length) return result;

  const now = new Date();

  for (const contract of pendingPayments) {
    const createdAt = new Date(contract.created_at);
    const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

    if (hoursSinceCreation < 24) {
      result.skipped++;
      continue;
    }

    const lead = contract.crm_leads;
    const name = `${lead.first_name || ""} ${lead.last_name || ""}`.trim();

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e40af;">Rappel : Comptant en attente</h2>
        <p>Bonjour ${name || "cher client"},</p>
        <p>Nous vous rappelons que le paiement du comptant est necessaire pour finaliser votre contrat d'assurance taxi.</p>
        <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #f59e0b;">
          <p><strong>Montant a regler :</strong> ${Number(contract.down_payment_amount || 0).toFixed(2)} EUR</p>
        </div>
        <p>Une fois le paiement valide, vous pourrez signer electroniquement votre contrat.</p>
        <p style="margin-top: 20px;">
          <a href="https://taxiassur.com/paiement/${contract.down_payment_link}"
             style="background: #059669; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            PAYER MAINTENANT
          </a>
        </p>
        <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
          Besoin d'aide ? Appelez-nous au 01 76 39 00 60
        </p>
      </div>
    `;

    const sent = await sendEmail(
      { email: lead.email, name },
      `Rappel: Comptant en attente - ${Number(contract.down_payment_amount || 0).toFixed(2)} EUR`,
      htmlContent
    );

    if (sent) {
      await logInteraction(
        lead.id,
        "Rappel paiement comptant",
        `Rappel envoye pour le paiement de ${Number(contract.down_payment_amount || 0).toFixed(2)} EUR`
      );
      result.sent++;
    } else {
      result.errors++;
    }
  }

  return result;
}

async function processSignatureReminders(): Promise<RelanceResult> {
  const result: RelanceResult = { type: "signature", sent: 0, skipped: 0, errors: 0 };

  const { data: pendingSignatures } = await supabase
    .from("lead_contracts")
    .select(`
      id,
      lead_id,
      signature_status,
      signature_requested_at,
      signature_link,
      created_at,
      crm_leads!inner(
        id,
        email,
        first_name,
        last_name,
        access_token
      )
    `)
    .eq("signature_status", "pending")
    .or("requires_down_payment.eq.false,down_payment_status.eq.paid");

  if (!pendingSignatures?.length) return result;

  const now = new Date();

  for (const contract of pendingSignatures) {
    const requestedAt = contract.signature_requested_at
      ? new Date(contract.signature_requested_at)
      : new Date(contract.created_at);
    const hoursSinceRequest = (now.getTime() - requestedAt.getTime()) / (1000 * 60 * 60);

    if (hoursSinceRequest < 24) {
      result.skipped++;
      continue;
    }

    const lead = contract.crm_leads;
    const name = `${lead.first_name || ""} ${lead.last_name || ""}`.trim();

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e40af;">Rappel : Signez votre contrat</h2>
        <p>Bonjour ${name || "cher client"},</p>
        <p>Votre contrat d'assurance taxi est pret a etre signe. La signature electronique ne prend que quelques minutes.</p>
        <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p>Une fois signe, vous recevrez immediatement votre attestation d'assurance.</p>
        </div>
        <p style="margin-top: 20px;">
          <a href="https://taxiassur.com/prospect/signature?token=${lead.access_token || lead.id}"
             style="background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            SIGNER MON CONTRAT
          </a>
        </p>
        <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
          Besoin d'aide ? Appelez-nous au 01 76 39 00 60
        </p>
      </div>
    `;

    const sent = await sendEmail(
      { email: lead.email, name },
      "Rappel: Votre contrat attend votre signature",
      htmlContent
    );

    if (sent) {
      await logInteraction(
        lead.id,
        "Rappel signature contrat",
        "Rappel automatique envoye pour la signature du contrat"
      );
      result.sent++;
    } else {
      result.errors++;
    }
  }

  return result;
}

async function processInactiveLeadReminders(): Promise<RelanceResult> {
  const result: RelanceResult = { type: "inactive", sent: 0, skipped: 0, errors: 0 };

  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const { data: inactiveLeads } = await supabase
    .from("crm_leads")
    .select(`
      id,
      email,
      first_name,
      last_name,
      access_token,
      status,
      last_activity_at,
      created_at
    `)
    .in("status", ["new", "contacted", "in_progress"])
    .lt("last_activity_at", threeDaysAgo.toISOString())
    .not("email", "is", null)
    .limit(50);

  if (!inactiveLeads?.length) return result;

  for (const lead of inactiveLeads) {
    const name = `${lead.first_name || ""} ${lead.last_name || ""}`.trim();

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e40af;">Votre projet d'assurance taxi</h2>
        <p>Bonjour ${name || "cher prospect"},</p>
        <p>Nous avons remarque que vous n'avez pas donne suite a votre demande de devis d'assurance taxi.</p>
        <p>Avez-vous des questions ? Notre equipe est la pour vous accompagner dans votre projet.</p>
        <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #22c55e;">
          <p style="margin: 0;"><strong>Rappel de nos avantages :</strong></p>
          <ul style="margin: 10px 0;">
            <li>Devis gratuit en moins de 24h</li>
            <li>Tarifs negocies avec 5 compagnies</li>
            <li>Accompagnement personnalise</li>
            <li>Attestation immediate apres signature</li>
          </ul>
        </div>
        <p style="margin-top: 20px;">
          <a href="https://taxiassur.com/prospect/espace?token=${lead.access_token || lead.id}"
             style="background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            REPRENDRE MA DEMANDE
          </a>
        </p>
        <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
          Ou appelez-nous directement au 01 76 39 00 60
        </p>
      </div>
    `;

    const sent = await sendEmail(
      { email: lead.email, name },
      "N'oubliez pas votre devis assurance taxi",
      htmlContent
    );

    if (sent) {
      await supabase.from("crm_leads").update({
        last_activity_at: new Date().toISOString(),
      }).eq("id", lead.id);

      await logInteraction(
        lead.id,
        "Relance lead inactif",
        "Email de relance automatique pour lead inactif depuis 3 jours"
      );
      result.sent++;
    } else {
      result.errors++;
    }
  }

  return result;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "all";

    const results: RelanceResult[] = [];

    if (action === "all" || action === "quotes") {
      results.push(await processQuoteReminders());
    }

    if (action === "all" || action === "payments") {
      results.push(await processPaymentReminders());
    }

    if (action === "all" || action === "signatures") {
      results.push(await processSignatureReminders());
    }

    if (action === "all" || action === "inactive") {
      results.push(await processInactiveLeadReminders());
    }

    const summary = {
      timestamp: new Date().toISOString(),
      action,
      results,
      totals: {
        sent: results.reduce((acc, r) => acc + r.sent, 0),
        skipped: results.reduce((acc, r) => acc + r.skipped, 0),
        errors: results.reduce((acc, r) => acc + r.errors, 0),
      },
    };

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});