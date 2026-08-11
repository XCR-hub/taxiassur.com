import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};
const guides = {
  "guide-complet": {
    title: "Guide Complet Assurance Taxi 2026",
    path: "/guides/guide-assurance-taxi-2026.html",
  },
  "checklist-documents": {
    title: "Checklist Documents Obligatoires",
    path: "/guides/checklist-documents-taxi.html",
  },
} as const;
type GuideType = keyof typeof guides;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const json = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});
const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
} satisfies Record<string, string>)[character]);
async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json(405, { success: false, error: "Method not allowed" });
  let eventId: string | null = null;
  try {
    const url = Deno.env.get("SUPABASE_URL") || "";
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!url || !key) return json(503, { success: false, error: "Service indisponible" });
    const input = await req.json();
    const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
    const firstName = typeof input.first_name === "string" ? input.first_name.trim() : "";
    const guideType = input.guide_type as GuideType;
    if (!emailPattern.test(email) || email.length > 254 || firstName.length > 80 || !(guideType in guides)) {
      return json(400, { success: false, error: "Demande invalide" });
    }
    const admin = createClient(url, key, { auth: { persistSession: false } });
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: download } = await admin.from("lead_magnet_downloads").select("id")
      .eq("email", email).eq("guide_type", guideType).gte("created_at", tenMinutesAgo)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!download) return json(404, { success: false, error: "Demande introuvable" });
    const emailHash = await sha256(`${email}|${key.slice(-24)}`);
    const { data: event, error: eventError } = await admin.from("lead_magnet_delivery_events")
      .insert({ email_hash: emailHash, guide_type: guideType, status: "processing" }).select("id").single();
    if (eventError) {
      if (eventError.code !== "23505") throw new Error("DeliveryAuditError");
      const { data: existing } = await admin.from("lead_magnet_delivery_events")
        .select("id, status").eq("email_hash", emailHash).eq("guide_type", guideType)
        .eq("delivery_day", new Date().toISOString().slice(0, 10)).maybeSingle();
      if (!existing || existing.status !== "failed") return json(200, { success: true, duplicate: true });
      const { data: retry } = await admin.from("lead_magnet_delivery_events")
        .update({ status: "processing", failed_at: null }).eq("id", existing.id).eq("status", "failed")
        .select("id").maybeSingle();
      if (!retry) return json(200, { success: true, duplicate: true });
      eventId = retry.id;
    } else {
      eventId = event.id;
    }
    const guide = guides[guideType];
    const siteUrl = (Deno.env.get("SITE_URL") || "https://www.taxiassur.com").replace(/\/$/, "");
    const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f4f6fa;padding:24px"><div style="max-width:600px;margin:auto;background:#fff;padding:32px;border-radius:16px"><h1 style="color:#0f3460">Votre guide TaxiAssur est prêt</h1><p>Bonjour ${escapeHtml(firstName || "Chauffeur")},</p><p>Merci pour votre intérêt. Votre ressource gratuite est disponible :</p><p style="margin:32px 0"><a href="${siteUrl}${guide.path}" style="background:#f5b400;color:#1a1a2e;padding:14px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Télécharger ${escapeHtml(guide.title)}</a></p><p>Vous pouvez également <a href="${siteUrl}/#devis">obtenir votre devis personnalisé</a>.</p><hr><p style="font-size:12px;color:#6b7280">TaxiAssur — Courtier ORIAS 11 061 425</p></div></body></html>`;
    const response = await fetch(`${url}/functions/v1/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ to: email, subject: `Votre ${guide.title} - TaxiAssur`, text: `Votre guide: ${siteUrl}${guide.path}`, html }),
    });
    if (!response.ok) throw new Error(`EmailDeliveryError:${response.status}`);
    await admin.from("lead_magnet_delivery_events").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", eventId);
    console.log("Lead magnet confirmation sent", guideType);
    return json(200, { success: true });
  } catch (error) {
    console.error("Lead magnet confirmation failed", error instanceof Error ? error.name : "UnknownError");
    if (eventId) {
      const url = Deno.env.get("SUPABASE_URL") || ""; const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
      if (url && key) await createClient(url, key).from("lead_magnet_delivery_events").update({ status: "failed", failed_at: new Date().toISOString() }).eq("id", eventId);
    }
    return json(502, { success: false, error: "Envoi impossible" });
  }
});
