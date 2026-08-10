import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { isInternalRequest } from "../_shared/internal-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!(await isInternalRequest(req))) {
    return json({ error: "Unauthorized" }, 401);
  }

  const indexNowKey = Deno.env.get("INDEXNOW_KEY")?.trim() || "";
  if (!/^[A-Za-z0-9-]{8,128}$/.test(indexNowKey)) {
    return json({ error: "IndexNow is not configured" }, 503);
  }

  try {
    const payload = await req.json();
    const requestedUrls = Array.isArray(payload?.urls) ? payload.urls : [];
    const urls = [...new Set(requestedUrls)]
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean);

    if (urls.length === 0 || urls.length > 100) {
      return json({ error: "Between 1 and 100 URLs are required" }, 400);
    }
    const parsed = urls.map((value) => new URL(value));
    if (
      parsed.some((url) =>
        url.protocol !== "https:" ||
        !/(^|\.)taxiassur\.com$/i.test(url.hostname)
      )
    ) {
      return json({ error: "Only taxiassur.com HTTPS URLs are allowed" }, 400);
    }

    const host = parsed[0].hostname.toLowerCase();
    if (parsed.some((url) => url.hostname.toLowerCase() !== host)) {
      return json({ error: "All URLs must use the same host" }, 400);
    }

    const keyLocation = Deno.env.get("INDEXNOW_KEY_LOCATION")?.trim() ||
      `https://${host}/${indexNowKey}.txt`;
    const response = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host,
        key: indexNowKey,
        keyLocation,
        urlList: parsed.map((url) => url.href),
      }),
    });

    if (!response.ok && response.status !== 202) {
      console.error("IndexNow submission failed", {
        status: response.status,
        urlCount: urls.length,
      });
      return json({
        error: "IndexNow rejected the submission",
        upstreamStatus: response.status,
      }, 502);
    }
    return json({
      success: true,
      submitted: urls.length,
      status: response.status,
      results: [
        {
          engine: "IndexNow",
          status: "submitted",
          note: `${urls.length} URL(s) soumise(s)`,
        },
        { engine: "Bing", status: "notified" },
        { engine: "DuckDuckGo", status: "notified via Bing" },
      ],
    });
  } catch (error) {
    console.error(
      "IndexNow request failed",
      error instanceof Error ? error.message : "unknown error",
    );
    return json({ error: "Invalid IndexNow request" }, 400);
  }
});
