import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const html = (message: string, status = 200) =>
  new Response(
    `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="robots" content="noindex,nofollow"><title>Préférences TaxiAssur</title><body style="font-family:Arial,sans-serif;max-width:680px;margin:60px auto;padding:24px;color:#172033"><h1>Préférences de communication</h1><p>${message}</p><p><a href="https://taxiassur.com">Retour à TaxiAssur</a></p></body></html>`,
    {
      status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy":
          "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
      },
    },
  );

Deno.serve(async (req: Request) => {
  if (req.method !== "GET" && req.method !== "POST") {
    return html("Méthode non autorisée.", 405);
  }
  try {
    const token = new URL(req.url).searchParams.get("token")?.trim() || "";
    if (!/^[0-9a-f]{64}$/.test(token)) {
      return html("Ce lien de désinscription est invalide.", 400);
    }
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(token),
    );
    const tokenHash = [...new Uint8Array(digest)].map((value) =>
      value.toString(16).padStart(2, "0")
    ).join("");
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const { data: delivery, error: lookupError } = await admin.from(
      "outreach_delivery_queue",
    ).select("id,recipient_email").eq("unsubscribe_token_hash", tokenHash)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (!delivery) {
      return html("Ce lien de désinscription est invalide ou a expiré.", 404);
    }
    const { error: suppressionError } = await admin.from(
      "outreach_suppressions",
    ).upsert({
      email: delivery.recipient_email,
      source: "email_link",
      reason: "recipient_request",
    }, { onConflict: "email" });
    if (suppressionError) throw suppressionError;
    const { error: queueError } = await admin.from("outreach_delivery_queue")
      .update({ status: "suppressed", updated_at: new Date().toISOString() })
      .eq("recipient_email", delivery.recipient_email).in("status", [
        "pending",
        "failed",
        "sending",
      ]);
    if (queueError) throw queueError;
    return html(
      "Votre adresse a été retirée de nos communications de partenariat. Aucun autre message de cette campagne ne sera envoyé.",
    );
  } catch (error) {
    console.error(
      "Outreach unsubscribe failed",
      error instanceof Error ? error.name : "unknown error",
    );
    return html(
      "La désinscription n’a pas pu être enregistrée. Contactez contact@taxiassur.com.",
      500,
    );
  }
});
