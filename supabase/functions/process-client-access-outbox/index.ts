import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type JsonObject = Record<string, unknown>;

interface AccessOutboxItem {
  id: string;
  lead_id: string;
  email: string;
  attempts: number;
  max_attempts?: number | null;
  metadata?: JsonObject | null;
}

interface ProcessResult {
  id: string;
  lead_id: string;
  email: string;
  status: "sent" | "retry" | "failed" | "skipped";
  attempts?: number;
  error?: string;
}

function jsonResponse(body: JsonObject, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function clampLimit(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value || 20);
  if (!Number.isFinite(parsed)) return 20;
  return Math.max(1, Math.min(50, Math.floor(parsed)));
}

function safeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error || "Unknown error");
  return message.slice(0, 1000);
}

function extractBearerToken(req: Request): string {
  const authHeader = req.headers.get("Authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

function isAuthorizedWorkerRequest(req: Request, serviceRoleKey: string): boolean {
  const bearerToken = extractBearerToken(req);
  const apiKey = req.headers.get("apikey") || req.headers.get("Apikey") || "";
  return bearerToken === serviceRoleKey || apiKey === serviceRoleKey;
}

async function callSendClientAccess(
  supabaseUrl: string,
  supabaseKey: string,
  item: AccessOutboxItem,
): Promise<{ success: boolean; error?: string; response?: unknown }> {
  const response = await fetch(`${supabaseUrl}/functions/v1/send-client-access`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({ lead_id: item.lead_id, email: item.email }),
  });

  const text = await response.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch (_) {
    parsed = text;
  }

  const explicitFailure = typeof parsed === "object" && parsed !== null && (parsed as JsonObject).success === false;
  if (!response.ok || explicitFailure) {
    const parsedError = typeof parsed === "object" && parsed !== null ? (parsed as JsonObject).error : null;
    return {
      success: false,
      error: String(parsedError || `send-client-access returned HTTP ${response.status}`),
      response: parsed,
    };
  }

  return { success: true, response: parsed };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
    }

    if (!isAuthorizedWorkerRequest(req, supabaseKey)) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    const payload = req.method === "GET" ? {} : await req.json().catch(() => ({}));
    const limit = clampLimit((payload as JsonObject).limit);
    const dryRun = (payload as JsonObject).dry_run === true;
    const now = new Date().toISOString();

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: pending, error: fetchError } = await supabase
      .from("client_portal_access_outbox")
      .select("id, lead_id, email, attempts, max_attempts, metadata, scheduled_at, created_at")
      .eq("status", "pending")
      .lte("scheduled_at", now)
      .order("scheduled_at", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(limit);

    if (fetchError) throw fetchError;

    const items = (pending || []) as AccessOutboxItem[];
    if (dryRun) {
      return jsonResponse({ success: true, dry_run: true, candidates: items.length, items });
    }

    const results: ProcessResult[] = [];

    for (const item of items) {
      const nextAttempt = (item.attempts || 0) + 1;
      const maxAttempts = Math.max(1, item.max_attempts || 3);
      const metadata = item.metadata || {};

      const { data: claimed, error: claimError } = await supabase
        .from("client_portal_access_outbox")
        .update({
          status: "processing",
          attempts: nextAttempt,
          updated_at: new Date().toISOString(),
          last_error: null,
          metadata: {
            ...metadata,
            worker: "process-client-access-outbox",
            processing_started_at: new Date().toISOString(),
          },
        })
        .eq("id", item.id)
        .eq("status", "pending")
        .select("id, lead_id, email, attempts, max_attempts, metadata")
        .maybeSingle();

      if (claimError || !claimed) {
        results.push({
          id: item.id,
          lead_id: item.lead_id,
          email: item.email,
          status: "skipped",
          error: claimError ? safeError(claimError) : "Already claimed",
        });
        continue;
      }

      const claimedItem = claimed as AccessOutboxItem;
      try {
        const sendResult = await callSendClientAccess(supabaseUrl, supabaseKey, claimedItem);
        if (!sendResult.success) throw new Error(sendResult.error || "send-client-access failed");

        await supabase
          .from("client_portal_access_outbox")
          .update({
            status: "sent",
            processed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_error: null,
            metadata: {
              ...(claimedItem.metadata || {}),
              sent_at: new Date().toISOString(),
              send_result: sendResult.response || null,
            },
          })
          .eq("id", claimedItem.id);

        results.push({
          id: claimedItem.id,
          lead_id: claimedItem.lead_id,
          email: claimedItem.email,
          status: "sent",
          attempts: claimedItem.attempts,
        });
      } catch (error) {
        const errorMessage = safeError(error);
        const exhausted = (claimedItem.attempts || nextAttempt) >= maxAttempts;
        const retryAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

        await supabase
          .from("client_portal_access_outbox")
          .update({
            status: exhausted ? "failed" : "pending",
            scheduled_at: exhausted ? now : retryAt,
            updated_at: new Date().toISOString(),
            last_error: errorMessage,
            metadata: {
              ...(claimedItem.metadata || {}),
              last_failed_at: new Date().toISOString(),
              retry_after: exhausted ? null : retryAt,
            },
          })
          .eq("id", claimedItem.id);

        results.push({
          id: claimedItem.id,
          lead_id: claimedItem.lead_id,
          email: claimedItem.email,
          status: exhausted ? "failed" : "retry",
          attempts: claimedItem.attempts,
          error: errorMessage,
        });
      }
    }

    return jsonResponse({
      success: true,
      processed: results.length,
      sent: results.filter((result) => result.status === "sent").length,
      retry: results.filter((result) => result.status === "retry").length,
      failed: results.filter((result) => result.status === "failed").length,
      skipped: results.filter((result) => result.status === "skipped").length,
      results,
    });
  } catch (error) {
    console.error("process-client-access-outbox error", error);
    return jsonResponse({ success: false, error: safeError(error) }, 500);
  }
});