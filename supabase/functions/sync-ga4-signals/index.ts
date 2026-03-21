import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { SignJWT, importPKCS8 } from "npm:jose@5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

/* ── Normalize a Google service account private key ── */
function normalizePrivateKey(raw: string): string {
  let key = raw.trim();

  // Handle full service account JSON
  if (key.startsWith("{")) {
    try { key = JSON.parse(key).private_key ?? key; } catch { /* use as-is */ }
    key = key.trim();
  }

  // Convert literal \n sequences to real newlines
  key = key.replace(/\\n/g, "\n").replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // If the key already has proper PEM headers, just ensure newlines around them
  if (key.includes("-----BEGIN PRIVATE KEY-----")) {
    // Re-format: extract base64 body and rebuild cleanly
    const b64 = key
      .replace(/-----BEGIN [A-Z ]+-----/g, "")
      .replace(/-----END [A-Z ]+-----/g, "")
      .replace(/\s/g, "");
    const lines = b64.match(/.{1,64}/g)?.join("\n") ?? b64;
    return `-----BEGIN PRIVATE KEY-----\n${lines}\n-----END PRIVATE KEY-----`;
  }

  // If it looks like raw base64 (no PEM headers), wrap it
  const isBase64 = /^[A-Za-z0-9+/=\s]+$/.test(key) && key.length > 100;
  if (isBase64) {
    const clean = key.replace(/\s/g, "");
    const lines = clean.match(/.{1,64}/g)?.join("\n") ?? clean;
    return `-----BEGIN PRIVATE KEY-----\n${lines}\n-----END PRIVATE KEY-----`;
  }

  return key;
}

/* ── Google Service Account JWT → Access Token ── */
async function getGoogleAccessToken(email: string, privateKeyRaw: string, scope: string): Promise<string> {
  const pem = normalizePrivateKey(privateKeyRaw);
  const privateKey = await importPKCS8(pem, "RS256");

  const now = Math.floor(Date.now() / 1000);
  const jwt = await new SignJWT({ scope })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error(`Token error: ${JSON.stringify(tokenData)}`);
  return tokenData.access_token;
}

/* ── Compute behavioral score 0-100 from GA4 metrics ── */
function computeBehavioralScore(
  engagementRate: number,
  avgSessionDuration: number,
  bounceRate: number,
  sessions: number
): number {
  // engagement rate (0-1) weighted 50%
  const engScore = Math.min(100, engagementRate * 100) * 0.5;
  // avg session duration: >120s = 100, <10s = 0 — weighted 30%
  const durScore = Math.min(100, (avgSessionDuration / 120) * 100) * 0.3;
  // low bounce: 1 - bounceRate, weighted 20%
  const bounceScore = Math.min(100, (1 - bounceRate) * 100) * 0.2;
  // volume bonus: up to +5 for sessions > 100
  const volumeBonus = sessions > 100 ? 5 : sessions > 50 ? 3 : sessions > 10 ? 1 : 0;

  return Math.min(100, Math.round(engScore + durScore + bounceScore + volumeBonus));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  const startTime = Date.now();

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const serviceAccountEmail = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL");
    const serviceAccountKey   = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY");
    const ga4PropertyId       = Deno.env.get("GA4_PROPERTY_ID");

    if (!serviceAccountEmail || !serviceAccountKey) {
      return new Response(JSON.stringify({
        success: false,
        message: "GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_KEY are required.",
        setup_required: true,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!ga4PropertyId) {
      return new Response(JSON.stringify({
        success: false,
        message: "GA4_PROPERTY_ID secret is required.",
        setup_required: true,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const days: number = body.days ?? 30;

    // Diagnostic mode: return key metadata without exposing key value
    if (body.diagnose) {
      const raw = serviceAccountKey.trim();
      const isJson = raw.startsWith("{");
      let extracted = raw;
      if (isJson) { try { extracted = JSON.parse(raw).private_key ?? raw; } catch { /* */ } }
      const normalized = extracted.replace(/\\n/g, "\n");
      const hasPemHeader = normalized.includes("-----BEGIN PRIVATE KEY-----");
      const hasPemFooter = normalized.includes("-----END PRIVATE KEY-----");
      const firstChars = raw.substring(0, 40).replace(/\n/g, "\\n");
      const keyLength = raw.length;
      return new Response(JSON.stringify({
        diagnose: true,
        raw_length: keyLength,
        first_40_chars: firstChars,
        is_json: isJson,
        has_pem_header: hasPemHeader,
        has_pem_footer: hasPemFooter,
        normalized_length: normalized.length,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log(`[GA4-SYNC] Starting sync for property ${ga4PropertyId}, last ${days} days`);

    // Get access token with analytics read scope
    const accessToken = await getGoogleAccessToken(
      serviceAccountEmail,
      serviceAccountKey,
      "https://www.googleapis.com/auth/analytics.readonly"
    );

    // Build date range
    const endDate   = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr   = endDate.toISOString().split("T")[0];

    // Call GA4 Data API
    const ga4Res = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${ga4PropertyId}:runReport`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateRanges: [{ startDate: startDateStr, endDate: endDateStr }],
          dimensions: [{ name: "pagePath" }],
          metrics: [
            { name: "sessions" },
            { name: "engagedSessions" },
            { name: "screenPageViews" },
            { name: "newUsers" },
            { name: "bounceRate" },
            { name: "averageSessionDuration" },
            { name: "engagementRate" },
          ],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: 500,
        }),
      }
    );

    if (!ga4Res.ok) {
      const err = await ga4Res.text();
      throw new Error(`GA4 API error ${ga4Res.status}: ${err}`);
    }

    const ga4Data = await ga4Res.json();
    const rows = ga4Data.rows ?? [];

    console.log(`[GA4-SYNC] Received ${rows.length} pages from GA4`);

    if (rows.length === 0) {
      return new Response(JSON.stringify({
        success: true, pages_synced: 0, message: "No data returned from GA4"
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Transform and upsert
    const records = rows.map((row: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }) => {
      const pagePath            = row.dimensionValues[0]?.value ?? "/";
      const sessions            = parseInt(row.metricValues[0]?.value ?? "0");
      const engagedSessions     = parseInt(row.metricValues[1]?.value ?? "0");
      const pageViews           = parseInt(row.metricValues[2]?.value ?? "0");
      const newUsers            = parseInt(row.metricValues[3]?.value ?? "0");
      const bounceRate          = parseFloat(row.metricValues[4]?.value ?? "0");
      const avgSessionDuration  = parseFloat(row.metricValues[5]?.value ?? "0");
      const engagementRate      = parseFloat(row.metricValues[6]?.value ?? "0");

      const behavioralScore = computeBehavioralScore(engagementRate, avgSessionDuration, bounceRate, sessions);

      return {
        page_path:            pagePath,
        full_url:             `https://taxiassur.com${pagePath}`,
        sessions,
        engaged_sessions:     engagedSessions,
        page_views:           pageViews,
        new_users:            newUsers,
        bounce_rate:          bounceRate,
        avg_session_duration: avgSessionDuration,
        engagement_rate:      engagementRate,
        behavioral_score:     behavioralScore,
        date_range_start:     startDateStr,
        date_range_end:       endDateStr,
        synced_at:            new Date().toISOString(),
      };
    });

    // Upsert in batches of 100
    let upserted = 0;
    const BATCH = 100;
    for (let i = 0; i < records.length; i += BATCH) {
      const batch = records.slice(i, i + BATCH);
      const { error } = await supabase
        .from("ga4_page_signals")
        .insert(batch);
      if (error) {
        console.error(`[GA4-SYNC] Insert error batch ${i}:`, error.message);
      } else {
        upserted += batch.length;
      }
    }

    // Update gsc_pages optimization priority with GA4 behavioral score
    for (const r of records) {
      if (r.behavioral_score < 40 && r.sessions > 10) {
        await supabase
          .from("gsc_pages")
          .update({ needs_optimization: true })
          .eq("url", r.full_url);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[GA4-SYNC] Done: ${upserted} pages in ${duration}ms`);

    return new Response(JSON.stringify({
      success: true,
      pages_synced: upserted,
      date_range: { start: startDateStr, end: endDateStr },
      duration_ms: duration,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("[GA4-SYNC] Fatal error:", err);
    return new Response(JSON.stringify({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
