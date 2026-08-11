type DeliveryChannel = "email" | "sms" | "whatsapp";
type DeliveryAdmin = {
  from: (table: string) => any;
};

export type DeliveryClaim =
  | { kind: "claimed"; requestId: string }
  | { kind: "replay"; response: Record<string, unknown> }
  | { kind: "conflict" | "in_progress" | "uncertain" };

const requestIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function claimDelivery(
  admin: DeliveryAdmin,
  input: { requestId?: unknown; channel: DeliveryChannel; fingerprint: string },
): Promise<DeliveryClaim | null> {
  if (input.requestId === undefined || input.requestId === null || input.requestId === "") return null;
  if (typeof input.requestId !== "string" || !requestIdPattern.test(input.requestId)) return { kind: "conflict" };

  const requestId = input.requestId.toLowerCase();
  const requestFingerprint = await sha256(input.fingerprint);
  const { error: insertError } = await admin.from("communication_delivery_requests").insert({
    request_id: requestId,
    channel: input.channel,
    request_fingerprint: requestFingerprint,
    status: "processing",
  });
  if (!insertError) return { kind: "claimed", requestId };
  if (insertError.code !== "23505") throw new Error("DeliveryClaimInsertError");

  const { data, error } = await admin.from("communication_delivery_requests")
    .select("channel, request_fingerprint, status, response_payload")
    .eq("request_id", requestId)
    .single();
  if (error || !data) throw new Error("DeliveryClaimReadError");
  if (data.channel !== input.channel || data.request_fingerprint !== requestFingerprint) return { kind: "conflict" };
  if (data.status === "sent" && data.response_payload) return { kind: "replay", response: data.response_payload };
  if (data.status === "uncertain") return { kind: "uncertain" };
  if (data.status === "processing") return { kind: "in_progress" };

  const { data: reclaimed } = await admin.from("communication_delivery_requests")
    .update({ status: "processing", last_error: null, updated_at: new Date().toISOString() })
    .eq("request_id", requestId)
    .eq("status", "failed")
    .select("request_id")
    .maybeSingle();
  return reclaimed ? { kind: "claimed", requestId } : { kind: "in_progress" };
}

export async function finishDelivery(
  admin: DeliveryAdmin,
  requestId: string | undefined,
  status: "sent" | "failed" | "uncertain",
  options: { providerId?: string; response?: Record<string, unknown>; error?: string } = {},
): Promise<void> {
  if (!requestId) return;
  const update: Record<string, unknown> = {
    status,
    provider_id: options.providerId || null,
    response_payload: options.response || null,
    last_error: options.error?.slice(0, 300) || null,
    updated_at: new Date().toISOString(),
    completed_at: status === "sent" ? new Date().toISOString() : null,
  };
  const { error } = await admin.from("communication_delivery_requests").update(update).eq("request_id", requestId);
  if (error) throw new Error("DeliveryClaimUpdateError");
}
