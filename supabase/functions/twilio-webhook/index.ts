import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { verifyTwilioWebhook } from "../_shared/twilio-webhook.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface TwilioWebhook {
  MessageSid?: string;
  SmsSid?: string;
  AccountSid?: string;
  MessagingServiceSid?: string;
  From?: string;
  To?: string;
  Body?: string;
  MessageStatus?: string;
  SmsStatus?: string;
  ErrorCode?: string;
  ErrorMessage?: string;
  CallSid?: string;
  CallStatus?: string;
  Direction?: string;
  Caller?: string;
  Called?: string;
  Duration?: string;
}

function parseFormData(formData: FormData): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    result[key] = value as string;
  }
  return result;
}

function escapeXml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[character]!,
  );
}

async function requireSupabaseSuccess(
  response: Response,
  operation: string,
): Promise<void> {
  if (response.ok) return;
  await response.body?.cancel().catch(() => undefined);
  throw new Error(`${operation} failed with status ${response.status}`);
}

function twimlResponse(twiml: string): Response {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response>${twiml}</Response>`,
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/xml" },
    },
  );
}

async function supabaseFetch(path: string, options: RequestInit) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return fetch(`${supabaseUrl}/rest/v1${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      ...(options.headers || {}),
    },
  });
}

async function handleOutgoingCall(
  data: Record<string, string>,
): Promise<Response> {
  const to = data.To || data.Called;
  const callerNumber = Deno.env.get("TWILIO_CALLER_ID") || "+33744410598";

  if (!to) {
    return twimlResponse('<Say language="fr-FR">Numero invalide</Say>');
  }

  return twimlResponse(
    `<Dial callerId="${
      escapeXml(callerNumber)
    }" answerOnBridge="true" timeout="30">` +
      `<Number statusCallbackEvent="initiated ringing answered completed" ` +
      `statusCallback="${
        Deno.env.get("SUPABASE_URL")
      }/functions/v1/twilio-webhook" ` +
      `statusCallbackMethod="POST">${escapeXml(to)}</Number></Dial>`,
  );
}

async function handleIncomingCall(
  data: Record<string, string>,
): Promise<Response> {
  const from = data.From || data.Caller || "";
  const callSid = data.CallSid || "";

  // Look up the lead by phone number
  let leadName = "";
  let leadId = "";
  try {
    const phoneClean = from.replace(/^\+33/, "0").replace(/\s/g, "");
    const response = await supabaseFetch(
      `/crm_leads?or=(phone.eq.${encodeURIComponent(from)},phone.eq.${
        encodeURIComponent(phoneClean)
      })&select=id,first_name,last_name&limit=1`,
      { method: "GET", headers: { Prefer: "return=representation" } },
    );
    if (response.ok) {
      const leads = await response.json();
      if (leads.length > 0) {
        leadId = leads[0].id;
        leadName = `${leads[0].first_name || ""} ${leads[0].last_name || ""}`
          .trim();
      }
    }
  } catch (err) {
    console.error("Lead lookup error:", err);
  }

  // Insert notification for the CRM to pick up via Realtime
  try {
    const response = await supabaseFetch("/crm_event_notifications", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        type: "incoming_call",
        payload: {
          call_sid: callSid,
          from,
          lead_id: leadId || null,
          lead_name: leadName || null,
        },
      }),
    });
    await requireSupabaseSuccess(response, "CRM call notification insert");
  } catch (err) {
    console.error("Notification insert error");
  }

  // Route the call to the browser client
  return twimlResponse(
    `<Dial timeout="25"><Client>` +
      `<Identity>agent</Identity>` +
      `<Parameter name="from" value="${escapeXml(from)}" />` +
      `<Parameter name="leadId" value="${escapeXml(leadId)}" />` +
      `</Client></Dial>` +
      `<Say language="fr-FR">Aucun agent disponible. Veuillez rappeler plus tard.</Say>`,
  );
}

async function handleCallStatus(
  data: Record<string, string>,
): Promise<Response> {
  const callSid = data.CallSid;
  const status = data.CallStatus;
  const duration = data.Duration;

  if (!callSid || !status) {
    return twimlResponse("");
  }

  if (status === "completed" && duration) {
    // Log to crm_interactions if call completed
    try {
      const from = data.From || data.Caller || "";
      const to = data.To || data.Called || "";

      const response = await supabaseFetch("/crm_interactions", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          type: "call_outgoing",
          channel: "phone",
          direction: data.Direction === "inbound" ? "inbound" : "outbound",
          subject: data.Direction === "inbound"
            ? "Appel entrant"
            : "Appel sortant",
          content: `Duree: ${Math.floor(Number(duration) / 60)} min ${
            Number(duration) % 60
          } sec`,
          status: "completed",
          metadata: {
            call_sid: callSid,
            from,
            to,
            duration: Number(duration),
            twilio_status: status,
          },
        }),
      });
      await requireSupabaseSuccess(response, "CRM call interaction insert");
    } catch (err) {
      console.error("Error logging call interaction");
    }
  }

  return twimlResponse("");
}

async function handleSmsIncoming(
  data: Record<string, string>,
): Promise<Response> {
  const from = data.From;
  const to = data.To;
  const body = data.Body;
  const messageSid = data.MessageSid || data.SmsSid;

  const response = await supabaseFetch("/sms_received", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      from_number: from,
      to_number: to,
      message_body: body,
      message_sid: messageSid,
      received_at: new Date().toISOString(),
    }),
  });
  await requireSupabaseSuccess(response, "Inbound SMS insert");

  return twimlResponse("");
}

async function handleSmsStatus(
  data: Record<string, string>,
): Promise<Response> {
  const messageSid = data.MessageSid || data.SmsSid;
  const status = data.MessageStatus || data.SmsStatus;

  if (!messageSid || !status) return twimlResponse("");

  const response = await supabaseFetch(
    `/sms_logs?message_sid=eq.${encodeURIComponent(messageSid)}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        status,
        error_code: data.ErrorCode || null,
        error_message: data.ErrorMessage?.slice(0, 500) || null,
        updated_at: new Date().toISOString(),
      }),
    },
  );
  await requireSupabaseSuccess(response, "SMS status update");

  return twimlResponse("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("application/x-www-form-urlencoded")) {
      return new Response("Unsupported media type", {
        status: 415,
        headers: corsHeaders,
      });
    }
    const formData = await req.formData();
    if (!(await verifyTwilioWebhook(req, formData, "TWILIO_WEBHOOK_URL"))) {
      return new Response("Unauthorized", {
        status: 401,
        headers: corsHeaders,
      });
    }
    const data = parseFormData(formData);

    // Voice call: outgoing (from browser client via TwiML App)
    if (
      data.CallSid && !data.CallStatus && data.Direction !== "inbound" &&
      data.To
    ) {
      return await handleOutgoingCall(data);
    }

    // Voice call: incoming to our number
    if (data.CallSid && !data.CallStatus && data.Direction === "inbound") {
      return await handleIncomingCall(data);
    }

    // Voice call: status callback
    if (data.CallSid && data.CallStatus) {
      return await handleCallStatus(data);
    }

    // SMS: incoming message
    if (data.Body && data.From && (data.MessageSid || data.SmsSid)) {
      return await handleSmsIncoming(data);
    }

    // SMS: status update
    if (
      (data.MessageStatus || data.SmsStatus) && (data.MessageSid || data.SmsSid)
    ) {
      return await handleSmsStatus(data);
    }

    return twimlResponse("");
  } catch (error) {
    console.error("Twilio webhook processing failed");
    return new Response(
      JSON.stringify({ error: "Webhook processing failed" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
