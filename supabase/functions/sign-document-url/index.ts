import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, Apikey, X-Client-Info",
};
const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
const tokenPattern = /^[0-9a-f]{64}$/i;
const allowedBuckets = new Set([
  "prospect-documents",
  "crm-documents",
  "email-attachments",
  "lead-rib",
  "contract-documents",
]);
const internalDomains = new Set(["taxiassur.com", "taxiassur.fr", "xcr.fr"]);

function cleanPath(value: unknown, bucket: string) {
  let path = String(value || "").trim().replace(/^\/+/, "");
  try {
    const parsed = new URL(path);
    const markers = ["public", "sign", "authenticated"].map((visibility) =>
      `/storage/v1/object/${visibility}/${bucket}/`
    );
    const marker = markers.find((candidate) => parsed.pathname.includes(candidate));
    if (marker) {
      path = decodeURIComponent(parsed.pathname.slice(parsed.pathname.indexOf(marker) + marker.length));
    }
  } catch { /* already a storage path */ }
  path = path.replace(new RegExp(`^${bucket}/`), "");
  if (
    !path || path.length > 1000 || path.includes("..") || path.includes("\\")
  ) return "";
  return path;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }
  if (req.method !== "POST") {
    return json(405, { success: false, error: "Method not allowed" });
  }
  const url = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !serviceKey) {
    return json(503, { success: false, error: "Service indisponible" });
  }
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { success: false, error: "JSON invalide" });
  }
  const bucket = typeof body.bucket === "string" ? body.bucket : "";
  if (!allowedBuckets.has(bucket)) {
    return json(400, { success: false, error: "Bucket invalide" });
  }
  const path = cleanPath(body.path, bucket);
  if (!path) return json(400, { success: false, error: "Chemin invalide" });

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
  const bearer = (req.headers.get("Authorization") || "").replace(
    /^Bearer\s+/i,
    "",
  );
  let staff = bearer === serviceKey;
  if (!staff && bearer) {
    const { data } = await admin.auth.getUser(bearer);
    const domain = data.user?.email?.toLowerCase().split("@")[1] || "";
    staff = internalDomains.has(domain);
  }

  if (!staff) {
    const accessToken = typeof body.accessToken === "string"
      ? body.accessToken.trim()
      : "";
    if (!tokenPattern.test(accessToken)) {
      return json(401, { success: false, error: "Authentification requise" });
    }
    const { data: lead } = await admin.from("crm_leads").select("id").eq(
      "access_token",
      accessToken,
    ).is("deleted_at", null).maybeSingle();
    if (!lead) return json(403, { success: false, error: "Acces invalide" });
    // lead-rib is intentionally staff-only: it has no prospect ownership table here.
    const tables = bucket === "prospect-documents"
      ? ["prospect_documents", "crm_lead_documents"]
      : bucket === "crm-documents"
      ? ["crm_lead_documents"]
      : bucket === "contract-documents"
      ? ["lead_contract_documents"]
      : [];
    let owned = false;
    for (const table of tables) {
      const candidates = [path, `${bucket}/${path}`];
      const { data: byPath } = await admin.from(table).select("id").eq(
        "lead_id",
        lead.id,
      ).in("file_path", candidates).limit(1).maybeSingle();
      if (byPath) {
        owned = true;
        break;
      }
      const originalValue = typeof body.path === "string"
        ? body.path.trim()
        : "";
      if (originalValue) {
        const { data: byUrl } = await admin.from(table).select("id").eq(
          "lead_id",
          lead.id,
        ).eq("file_url", originalValue).limit(1).maybeSingle();
        if (byUrl) {
          owned = true;
          break;
        }
      }
    }
    if (!owned && bucket === "contract-documents") {
      const candidates = [path, `${bucket}/${path}`];
      const originalValue = typeof body.path === "string"
        ? body.path.trim()
        : "";
      const { data: quotes } = await admin
        .from("lead_company_quotes")
        .select("quote_file_url, quote_pdf_url, rc_pro_addon_file_url")
        .eq("lead_id", lead.id);
      owned = (quotes || []).some((quote) =>
        [quote.quote_file_url, quote.quote_pdf_url, quote.rc_pro_addon_file_url]
          .filter((value): value is string =>
            typeof value === "string" && value.length > 0
          )
          .some((value) =>
            value === originalValue ||
            candidates.includes(cleanPath(value, bucket))
          )
      );
    }
    if (!owned) {
      return json(403, { success: false, error: "Document non autorise" });
    }
  }

  const download = body.download === true
    ? String(body.fileName || "document").replace(/[\r\n"\\]/g, "_").slice(
      0,
      180,
    )
    : false;
  const { data, error } = await admin.storage.from(bucket).createSignedUrl(
    path,
    300,
    { download },
  );
  if (error || !data?.signedUrl) {
    return json(404, { success: false, error: "Document introuvable" });
  }
  return json(200, {
    success: true,
    signedUrl: data.signedUrl,
    expiresIn: 300,
  });
});
