import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};
const internalDomains = new Set(["taxiassur.com", "taxiassur.fr", "xcr.fr"]);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const json = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});
async function isAuthorized(req: Request, url: string, serviceKey: string): Promise<boolean> {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return false;
  if (token === serviceKey) return true;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await admin.auth.getUser(token);
  if (error) return false;
  const domain = (data.user?.email || "").toLowerCase().split("@")[1] || "";
  return internalDomains.has(domain);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json(405, { success: false, error: "Method not allowed" });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const apiKey = Deno.env.get("BREVO_API_KEY") || "";
    if (!supabaseUrl || !serviceKey || !apiKey) return json(503, { success: false, error: "Service indisponible" });
    if (!(await isAuthorized(req, supabaseUrl, serviceKey))) return json(401, { success: false, error: "Non autorise" });
    const payload = await req.json();
    const to = typeof payload.to === "string" ? payload.to.trim().toLowerCase() : "";
    const subject = typeof payload.subject === "string" ? payload.subject.trim() : "";
    const text = typeof payload.text === "string" ? payload.text : (typeof payload.body === "string" ? payload.body : "");
    const html = typeof payload.html === "string" ? payload.html : "";
    if (!emailPattern.test(to) || !subject || (!text && !html) || subject.length > 200 || text.length > 100000 || html.length > 250000 || /[\r\n]/.test(subject)) {
      return json(400, { success: false, error: "Donnees email invalides" });
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let response: Response;
    try {
      response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST", signal: controller.signal,
        headers: { Accept: "application/json", "Content-Type": "application/json", "api-key": apiKey },
        body: JSON.stringify({
          sender: { name: Deno.env.get("BREVO_SENDER_NAME") || "TaxiAssur", email: Deno.env.get("BREVO_SENDER_EMAIL") || "team@taxiassur.com" },
          to: [{ email: to }], subject,
          ...(html ? { htmlContent: html } : { textContent: text }),
        }),
      });
    } finally { clearTimeout(timeout); }
    if (!response.ok) {
      console.error("Brevo email rejected", response.status);
      return json(response.status === 429 ? 429 : 502, { success: false, error: "Envoi impossible" });
    }
    console.log("Brevo email accepted");
    return json(200, { success: true, message: "Email accepte" });
  } catch (error) {
    console.error("Email delivery failed", error instanceof Error ? error.name : "UnknownError");
    return json(502, { success: false, error: "Envoi impossible" });
  }
});