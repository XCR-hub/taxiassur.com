import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
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

function twimlResponse(twiml: string): Response {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response>${twiml}</Response>`,
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/xml" },
    }
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

async function handleOutgoingCall(data: Record<string, string>): Promise<Response> {
  const to = data.To || data.Called;
  const callerNumber = Deno.env.get("TWILIO_CALLER_ID") || "+33744410598";

  if (!to) {
    return twimlResponse("<Say language=\"fr-FR\">Numero invalide</Say>");
  }

  console.log(`Outgoing call to ${to} from ${callerNumber}`);

  return twimlResponse(
    `<Dial callerId="${callerNumber}" answerOnBridge="true" timeout="30">` +
    `<Number statusCallbackEvent="initiated ringing answered completed" ` +
    `statusCallback="${Deno.env.get("SUPABASE_URL")}/functions/v1/twilio-webhook" ` +
    `statusCallbackMethod="POST">${to}</Number></Dial>`
  );
}

async function handleIncomingCall(data: Record<string, string>): Promise<Response> {
  const from = data.From || data.Caller || "";
  const callSid = data.CallSid || "";

  console.log(`Incoming call from ${from}, CallSid: ${callSid}`);

  // Look up the lead by phone number
  let leadName = "";
  let leadId = "";
  try {
    const phoneClean = from.replace(/^\+33/, "0").replace(/\s/g, "");
    const response = await supabaseFetch(
      `/crm_leads?or=(phone.eq.${encodeURIComponent(from)},phone.eq.${encodeURIComponent(phoneClean)})&select=id,first_name,last_name&limit=1`,
      { method: "GET", headers: { Prefer: "return=representation" } }
    );
    if (response.ok) {
      const leads = await response.json();
      if (leads.length > 0) {
        leadId = leads[0].id;
        leadName = `${leads[0].first_name || ""} ${leads[0].last_name || ""}`.trim();
      }
    }
  } catch (err) {
    console.error("Lead lookup error:", err);
  }

  // Insert notification for the CRM to pick up via Realtime
  try {
    await supabaseFetch("/crm_event_notifications", {
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
  } catch (err) {
    console.error("Notification insert error:", err);
  }

  // Route the call to the browser client
  return twimlResponse(
    `<Dial timeout="25"><Client>` +
    `<Identity>agent</Identity>` +
    `<Parameter name="from" value="${from}" />` +
    `<Parameter name="leadId" value="${leadId}" />` +
    `</Client></Dial>` +
    `<Say language="fr-FR">Aucun agent disponible. Veuillez rappeler plus tard.</Say>`
  );
}

async function handleCallStatus(data: Record<string, string>): Promise<Response> {
  const callSid = data.CallSid;
  const status = data.CallStatus;
  const duration = data.Duration;

  if (!callSid || !status) {
    return twimlResponse("");
  }

  console.log(`Call status update: ${callSid} -> ${status}, duration: ${duration || "N/A"}`);

  if (status === "completed" && duration) {
    // Log to crm_interactions if call completed
    try {
      const from = data.From || data.Caller || "";
      const to = data.To || data.Called || "";

      await supabaseFetch("/crm_interactions", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          type: "call_outgoing",
          channel: "phone",
          direction: data.Direction === "inbound" ? "inbound" : "outbound",
          subject: data.Direction === "inbound" ? "Appel entrant" : "Appel sortant",
          content: `Duree: ${Math.floor(Number(duration) / 60)} min ${Number(duration) % 60} sec`,
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
    } catch (err) {
      console.error("Error logging call interaction:", err);
    }
  }

  return twimlResponse("");
}

async function handleSmsIncoming(data: Record<string, string>): Promise<Response> {
  const from = data.From;
  const to = data.To;
  const body = data.Body;
  const messageSid = data.MessageSid || data.SmsSid;

  console.log(`Incoming SMS from ${from}`);

  await supabaseFetch("/sms_received", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      from_number: from,
      to_number: to,
      message_body: body,
      message_sid: messageSid,
      raw_data: data,
      received_at: new Date().toISOString(),
    }),
  });

  return twimlResponse("");
}

async function handleSmsStatus(data: Record<string, string>): Promise<Response> {
  const messageSid = data.MessageSid || data.SmsSid;
  const status = data.MessageStatus || data.SmsStatus;

  if (!messageSid || !status) return twimlResponse("");

  console.log(`SMS status update: ${messageSid} -> ${status}`);

  await supabaseFetch(`/sms_logs?message_sid=eq.${messageSid}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      status,
      error_code: data.ErrorCode || null,
      error_message: data.ErrorMessage || null,
      updated_at: new Date().toISOString(),
    }),
  });

  return twimlResponse("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    let data: Record<string, string> = {};

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      data = parseFormData(formData);
    } else if (contentType.includes("application/json")) {
      data = await req.json();
    }

    console.log("Webhook received:", JSON.stringify(data));

    // Voice call: outgoing (from browser client via TwiML App)
    if (data.CallSid && !data.CallStatus && data.Direction !== "inbound" && data.To) {
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
    if ((data.MessageStatus || data.SmsStatus) && (data.MessageSid || data.SmsSid)) {
      return await handleSmsStatus(data);
    }

    return twimlResponse("");
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
