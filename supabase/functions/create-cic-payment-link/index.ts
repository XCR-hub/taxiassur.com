import { isInternalRequest } from "../_shared/internal-auth.ts";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function escapeHtml(value: unknown): string {
  const entities: Record<string, string> = {
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  };
  return String(value ?? "").replace(/[&<>"']/g, (character) => entities[character] || character);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (!(await isInternalRequest(req))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { contract_id, amount } = await req.json();
    const numericAmount = Number(amount);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(contract_id || "")) || !Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > 100000) {
      return new Response(JSON.stringify({ success: false, error: "Invalid payment request" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!contract_id || !amount) {
      throw new Error("contract_id and amount are required");
    }

    const { data: contract, error: contractError } = await supabaseClient
      .from("lead_contracts")
      .select("*, crm_leads(email, first_name, last_name, full_name)")
      .eq("id", contract_id)
      .single();

    if (contractError || !contract) {
      throw new Error("Contract not found");
    }

    const existingToken = typeof contract.down_payment_link === "string" ? contract.down_payment_link : "";
    const existingExpiry = Date.parse(String(contract.down_payment_link_expires_at || ""));
    const canReuse = /^[0-9a-f]{64}$/i.test(existingToken) && existingExpiry > Date.now() &&
      Number(contract.down_payment_amount) === numericAmount && contract.down_payment_status === "pending";
    let paymentToken = canReuse ? existingToken : "";
    if (!paymentToken) {
      const { data: createdToken, error: tokenError } = await supabaseClient.rpc("create_down_payment_link", {
        p_contract_id: contract_id,
        p_amount: numericAmount,
        p_expires_in_days: 7,
      });
      if (tokenError || typeof createdToken !== "string" || !/^[0-9a-f]{64}$/i.test(createdToken)) {
        throw new Error("PaymentTokenCreationFailed");
      }
      paymentToken = createdToken;
    }
    const paymentLink = `https://taxiassur.com/paiement/${paymentToken}`;

    await supabaseClient
      .from("crm_interactions")
      .insert({
        lead_id: contract.lead_id,
        type: "system",
        direction: "outbound",
        channel: "system",
        content: `Lien de paiement comptant généré : ${numericAmount.toFixed(2)} EUR`,
        metadata: {
          contract_id,
          amount: numericAmount,
          reused_active_link: canReuse,
        },
      });

    const emailFunctionUrl = `${
      Deno.env.get("SUPABASE_URL")
    }/functions/v1/send-email-ionos`;
    const lead = contract.crm_leads as Record<string, unknown>;
    const recipient = String(lead?.email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient) || recipient.length > 254) {
      throw new Error("InvalidPaymentRecipient");
    }
    const recipientName = String(lead?.first_name || lead?.full_name || "Client")
      .replace(/[\r\n]/g, " ").trim().slice(0, 100) || "Client";
    const safeRecipientName = escapeHtml(recipientName);

    const emailResponse = await fetch(emailFunctionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      signal: AbortSignal.timeout(45_000),
      body: JSON.stringify({
        to: recipient,
        toName: recipientName,
        subject: "Réglez votre comptant pour finaliser votre contrat - TaxiAssur",
        htmlBody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Bonjour ${safeRecipientName},</h2>
            <p>Votre contrat d'assurance taxi est prêt.</p>
            <p>Pour le finaliser, un comptant de <strong>${numericAmount.toFixed(2)} EUR</strong> est requis.</p>
            <p><a href="${paymentLink}" style="color: #2563eb; font-weight: bold;">Payer en ligne de manière sécurisée</a></p>
            <p>Ce lien expire dans 7 jours.</p>
          </div>`,
        fromEmail: "team@taxiassur.com",
        fromName: "TaxiAssur",
      }),
    });
    const emailResult = await emailResponse.json().catch(() => null);
    if (!emailResponse.ok || emailResult?.success !== true) throw new Error("PaymentEmailDeliveryFailed");

    return new Response(
      JSON.stringify({
        success: true,
        payment_token: paymentToken,
        payment_link: paymentLink,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          .toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error creating payment link:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Payment link creation failed" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
