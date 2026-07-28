import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type LeadSource = Record<string, unknown>;

interface LeadPayload {
  type?: "INSERT";
  table?: string;
  record?: LeadSource;
}

const MISSING_TEXT_VALUES = new Set(["undefined", "null", "nan", "none", "n/a", "na"]);

function cleanText(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  if (!text || MISSING_TEXT_VALUES.has(text.toLowerCase())) return "";
  return text;
}

function firstText(...values: unknown[]): string {
  for (const value of values) {
    const text = cleanText(value);
    if (text) return text;
  }
  return "";
}

function normalizeLead(input: LeadSource) {
  const firstName = firstText(input.first_name, input.firstName);
  const lastName = firstText(input.last_name, input.lastName);
  const combinedName = [firstName, lastName].filter(Boolean).join(" ");

  return {
    id: firstText(input.id, input.lead_id, input.leadId),
    name: firstText(input.name, input.full_name, input.fullName, combinedName) || "Prospect",
    first_name: firstName,
    last_name: lastName,
    phone: firstText(input.phone, input.telephone, input.mobile),
    email: firstText(input.email, input.mail),
    city: firstText(input.city, input.ville) || "Non renseigne",
    status: firstText(input.status) || "nouveau",
    immatriculation: firstText(input.immatriculation),
    access_token: firstText(input.access_token, input.accessToken),
    created_at: firstText(input.created_at, input.createdAt) || new Date().toISOString(),
  };
}

function getLeadSource(payload: unknown): LeadSource {
  if (!payload || typeof payload !== "object") return {};
  const candidate = payload as LeadPayload | LeadSource;
  if ("record" in candidate && candidate.record && typeof candidate.record === "object") {
    return candidate.record;
  }
  return candidate as LeadSource;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const lead = normalizeLead(getLeadSource(await req.json()));

    if (!lead.email && !lead.phone) {
      console.warn("Skipping empty legacy lead email payload", { lead_id: lead.id || null });
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "missing lead phone and email" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase environment is not configured");
    }

    console.log(`Legacy Brevo lead email redirected for lead ${lead.id || "unknown"}`);

    const notificationResponse = await fetch(`${supabaseUrl}/functions/v1/send-lead-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify(lead),
    });

    if (!notificationResponse.ok) {
      const errorText = await notificationResponse.text();
      throw new Error(`Lead notification failed: ${errorText}`);
    }

    const notificationResult = await notificationResponse.json();
    console.log(`Lead notification sent for lead ${lead.id || "unknown"}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Lead notification sent (legacy Brevo compatibility)",
        ...notificationResult,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});