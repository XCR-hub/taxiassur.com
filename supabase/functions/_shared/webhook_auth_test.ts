import { verifyBearerSecret, verifyServiceBearer } from "./secret-auth.ts";
import { verifyTwilioWebhook } from "./twilio-webhook.ts";
import { isInternalRequest } from "./internal-auth.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function twilioSignature(
  url: string,
  formData: FormData,
  token: string,
): Promise<string> {
  const values = Array.from(formData.entries())
    .map(([key, value]) => [key, String(value)] as const)
    .sort(([leftKey, leftValue], [rightKey, rightValue]) =>
      leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue)
    );
  const payload = url + values.map(([key, value]) => `${key}${value}`).join("");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(token),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const digest = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)),
  );
  return btoa(String.fromCharCode(...digest));
}

Deno.test("verifyBearerSecret accepts only the configured bearer token", () => {
  assert(
    verifyBearerSecret(
      new Request("https://example.test", {
        headers: { Authorization: "Bearer correct-secret" },
      }),
      "correct-secret",
    ),
    "valid bearer was rejected",
  );
  assert(
    !verifyBearerSecret(
      new Request("https://example.test", {
        headers: { Authorization: "Bearer wrong-secret" },
      }),
      "correct-secret",
    ),
    "invalid bearer was accepted",
  );
  assert(
    !verifyBearerSecret(new Request("https://example.test"), "correct-secret"),
    "missing bearer was accepted",
  );
});

Deno.test("verifyTwilioWebhook accepts a valid signature and rejects tampering", async () => {
  const envName = "TEST_TWILIO_PUBLIC_URL";
  const token = "test-auth-token-with-enough-entropy";
  const url = "https://example.test/functions/v1/whatsapp-webhook";
  const previousToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const previousUrl = Deno.env.get(envName);
  Deno.env.set("TWILIO_AUTH_TOKEN", token);
  Deno.env.set(envName, url);
  try {
    const formData = new FormData();
    formData.set("MessageSid", "SM0123456789abcdef0123456789abcdef");
    formData.set("Body", "Bonjour");
    const signature = await twilioSignature(url, formData, token);
    const request = new Request(url, {
      headers: { "X-Twilio-Signature": signature },
    });
    assert(
      await verifyTwilioWebhook(request, formData, envName),
      "valid Twilio signature was rejected",
    );

    const tampered = new FormData();
    tampered.set("MessageSid", "SM0123456789abcdef0123456789abcdef");
    tampered.set("Body", "Contenu modifié");
    assert(
      !(await verifyTwilioWebhook(request, tampered, envName)),
      "tampered Twilio payload was accepted",
    );
  } finally {
    if (previousToken === undefined) Deno.env.delete("TWILIO_AUTH_TOKEN");
    else Deno.env.set("TWILIO_AUTH_TOKEN", previousToken);
    if (previousUrl === undefined) Deno.env.delete(envName);
    else Deno.env.set(envName, previousUrl);
  }
});
Deno.test("verifyServiceBearer accepts only a strong matching service token", () => {
  const serviceKey = "service-role-test-key-with-at-least-32-characters";
  assert(
    verifyServiceBearer(
      new Request("https://example.test", {
        headers: { Authorization: `Bearer ${serviceKey}` },
      }),
      serviceKey,
    ),
    "service bearer was rejected",
  );
  assert(
    !verifyServiceBearer(new Request("https://example.test"), serviceKey),
    "missing bearer was accepted",
  );
  assert(
    !verifyServiceBearer(
      new Request("https://example.test", {
        headers: { Authorization: "Bearer wrong" },
      }),
      serviceKey,
    ),
    "wrong bearer was accepted",
  );
});
