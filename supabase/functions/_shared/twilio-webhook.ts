function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function constantTimeEqual(left: string, right: string): boolean {
  const maxLength = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < maxLength; index++) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

export async function verifyTwilioWebhook(
  req: Request,
  formData: FormData,
  publicUrlEnvName: string,
): Promise<boolean> {
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN")?.trim();
  const signature = req.headers.get("X-Twilio-Signature")?.trim();
  if (!authToken || !signature) return false;

  const publicUrl = Deno.env.get(publicUrlEnvName)?.trim() || req.url;
  const entries = Array.from(formData.entries())
    .map(([key, value]) => [key, typeof value === "string" ? value : value.name] as const)
    .sort(([leftKey, leftValue], [rightKey, rightValue]) =>
      leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue)
    );
  const signedPayload = publicUrl + entries.map(([key, value]) => `${key}${value}`).join("");

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  return constantTimeEqual(bytesToBase64(new Uint8Array(digest)), signature);
}