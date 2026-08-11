import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { constantTimeEqual } from "../_shared/secret-auth.ts";

const responseHeaders = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "no-store",
};
const allowedTypes = new Set(["SETUP", "CONNECT", "RELEASE"]);
const phonePattern = /^[+0-9 ().-]{3,32}$/;
const idPattern = /^[A-Za-z0-9_.:-]{1,128}$/;

type CallDirection = "inbound" | "outbound";
type Metadata = Record<string, string | boolean | null>;

function response(body: string, status: number): Response {
  return new Response(body, { status, headers: responseHeaders });
}

function parameter(
  params: URLSearchParams,
  shortName: string,
  keyyoName: string,
): string {
  return (params.get(shortName) || params.get(keyyoName) || "").trim();
}

function authorized(request: Request, url: URL): boolean {
  const expected = Deno.env.get("KEYYO_WEBHOOK_SECRET")?.trim() || "";
  const supplied = request.headers.get("X-Keyyo-Secret")?.trim() ||
    url.searchParams.get("webhook_secret")?.trim() || "";
  return expected.length >= 24 && constantTimeEqual(supplied, expected);
}

async function findLeadId(
  supabase: SupabaseClient,
  direction: CallDirection,
  caller: string,
  callee: string,
): Promise<string | null> {
  const phone = direction === "inbound" ? caller : callee;
  const { data, error } = await supabase
    .from("crm_leads")
    .select("id")
    .or(`phone.eq.${phone},mobile.eq.${phone}`)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`lead lookup failed: ${error.code || "unknown"}`);
  return data?.id || null;
}

async function findUserId(
  supabase: SupabaseClient,
  providerId: string,
  account: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("telephony_users")
    .select("user_id")
    .eq("provider_id", providerId)
    .eq("phone_number", account)
    .limit(1)
    .maybeSingle();
  if (error) {
    throw new Error(`telephony user lookup failed: ${error.code || "unknown"}`);
  }
  return data?.user_id || null;
}

async function handleSetup(
  supabase: SupabaseClient,
  providerId: string,
  externalId: string,
  direction: CallDirection,
  caller: string,
  callee: string,
  account: string,
  timestamp: string,
  metadata: Metadata,
): Promise<void> {
  const [leadId, userId] = await Promise.all([
    findLeadId(supabase, direction, caller, callee),
    findUserId(supabase, providerId, account),
  ]);
  const { error } = await supabase.from("telephony_calls").upsert({
    external_id: externalId,
    provider_id: providerId,
    lead_id: leadId,
    user_id: userId,
    direction,
    from_number: caller,
    to_number: callee,
    status: "ringing",
    initiated_at: timestamp,
    metadata,
  }, { onConflict: "external_id" });
  if (error) {
    throw new Error(
      `call setup persistence failed: ${error.code || "unknown"}`,
    );
  }

  if (leadId) {
    const { data: existingInteraction, error: existingError } = await supabase
      .from("crm_interactions")
      .select("id")
      .eq("lead_id", leadId)
      .eq("metadata->>call_ref", externalId)
      .limit(1)
      .maybeSingle();
    if (existingError) {
      throw new Error(
        `call interaction lookup failed: ${existingError.code || "unknown"}`,
      );
    }
    if (!existingInteraction) {
      const { error: interactionError } = await supabase.from(
        "crm_interactions",
      ).insert({
        lead_id: leadId,
        type: direction === "inbound" ? "call_incoming" : "call_outgoing",
        channel: "phone",
        direction,
        status: "ringing",
        metadata: {
          phone_number: direction === "inbound" ? caller : callee,
          call_ref: externalId,
        },
      });
      if (interactionError) {
        throw new Error(
          `call interaction persistence failed: ${
            interactionError.code || "unknown"
          }`,
        );
      }
    }
  }
}

async function handleConnect(
  supabase: SupabaseClient,
  externalId: string,
  timestamp: string,
): Promise<void> {
  const { data, error } = await supabase.from("telephony_calls").update({
    status: "answered",
    answered_at: timestamp,
  }).eq("external_id", externalId).select("id").maybeSingle();
  if (error) {
    throw new Error(`call connect update failed: ${error.code || "unknown"}`);
  }
  if (!data) throw new Error("call connect target missing");
}

async function handleRelease(
  supabase: SupabaseClient,
  externalId: string,
  timestamp: string,
): Promise<void> {
  const { data: call, error: callError } = await supabase
    .from("telephony_calls")
    .select("id,lead_id,initiated_at,answered_at")
    .eq("external_id", externalId)
    .maybeSingle();
  if (callError) {
    throw new Error(
      `call release lookup failed: ${callError.code || "unknown"}`,
    );
  }
  if (!call) throw new Error("call release target missing");

  const endTime = new Date(timestamp).getTime();
  const durationSeconds = call.initiated_at
    ? Math.max(
      0,
      Math.round((endTime - new Date(call.initiated_at).getTime()) / 1000),
    )
    : 0;
  const talkTimeSeconds = call.answered_at
    ? Math.max(
      0,
      Math.round((endTime - new Date(call.answered_at).getTime()) / 1000),
    )
    : 0;
  const { error: updateError } = await supabase.from("telephony_calls").update({
    status: "completed",
    ended_at: timestamp,
    duration_seconds: durationSeconds,
    talk_time_seconds: talkTimeSeconds,
  }).eq("id", call.id);
  if (updateError) {
    throw new Error(
      `call release update failed: ${updateError.code || "unknown"}`,
    );
  }

  if (call.lead_id) {
    const { data: interaction, error: interactionLookupError } = await supabase
      .from("crm_interactions")
      .select("id,metadata")
      .eq("lead_id", call.lead_id)
      .eq("metadata->>call_ref", externalId)
      .limit(1)
      .maybeSingle();
    if (interactionLookupError) {
      throw new Error(
        `call interaction lookup failed: ${
          interactionLookupError.code || "unknown"
        }`,
      );
    }
    if (interaction) {
      const { error: interactionUpdateError } = await supabase.from(
        "crm_interactions",
      ).update({
        status: "completed",
        metadata: {
          ...(interaction.metadata || {}),
          duration_seconds: talkTimeSeconds,
          status: "completed",
        },
      }).eq("id", interaction.id);
      if (interactionUpdateError) {
        throw new Error(
          `call interaction update failed: ${
            interactionUpdateError.code || "unknown"
          }`,
        );
      }
    }
  }
}

Deno.serve(async (request: Request) => {
  if (request.method !== "GET") return response("Method not allowed", 405);
  const url = new URL(request.url);
  if (!authorized(request, url)) return response("Unauthorized", 401);

  const account = parameter(url.searchParams, "account", "_ACCOUNT_");
  const caller = parameter(url.searchParams, "caller", "_CALLER_");
  const callee = parameter(url.searchParams, "callee", "_CALLEE_");
  const callRef = parameter(url.searchParams, "callref", "_CALLREF_");
  const notificationType = parameter(url.searchParams, "type", "_N_TYPE_")
    .toUpperCase();
  const dref = parameter(url.searchParams, "dref", "_DREF_");
  const tsms = parameter(url.searchParams, "tsms", "_TSMS_");

  if (
    !phonePattern.test(account) || !phonePattern.test(caller) ||
    !phonePattern.test(callee) ||
    !allowedTypes.has(notificationType)
  ) {
    return response("Invalid webhook payload", 400);
  }
  const externalId = callRef || (dref && tsms ? `keyyo_${dref}_${tsms}` : "");
  if (!idPattern.test(externalId)) {
    return response("Invalid call identifier", 400);
  }

  let timestamp = new Date();
  if (tsms) {
    if (!/^\d{10,13}$/.test(tsms)) return response("Invalid timestamp", 400);
    timestamp = new Date(Number(tsms.length === 10 ? `${tsms}000` : tsms));
    if (
      !Number.isFinite(timestamp.getTime()) ||
      Math.abs(Date.now() - timestamp.getTime()) > 7 * 86_400_000
    ) {
      return response("Timestamp outside accepted window", 400);
    }
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceKey) return response("Service unavailable", 503);
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const { data: provider, error: providerError } = await supabase
      .from("telephony_providers").select("id").eq("name", "keyyo")
      .maybeSingle();
    if (providerError || !provider) {
      throw new Error("Keyyo provider unavailable");
    }
    const direction: CallDirection = account === caller
      ? "outbound"
      : "inbound";
    const metadata: Metadata = {
      account,
      caller,
      callee,
      call_ref: callRef || null,
      dref: dref || null,
      notification_type: notificationType,
      timestamp_ms: tsms || null,
    };
    const eventTimestamp = timestamp.toISOString();
    if (notificationType === "SETUP") {
      await handleSetup(
        supabase,
        provider.id,
        externalId,
        direction,
        caller,
        callee,
        account,
        eventTimestamp,
        metadata,
      );
    } else if (notificationType === "CONNECT") {
      await handleConnect(supabase, externalId, eventTimestamp);
    } else {
      await handleRelease(supabase, externalId, eventTimestamp);
    }
    return response("OK", 200);
  } catch (error) {
    console.error(
      "Keyyo webhook processing failed",
      error instanceof Error ? error.message.split(":")[0] : "unknown",
    );
    return response("Temporary processing failure", 503);
  }
});
