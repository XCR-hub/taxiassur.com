import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SITE_URL = "https://taxiassur.com";

/* ── Key taxi insurance pages to analyze ── */
const PRIORITY_PAGES = [
  "/",
  "/assurance-taxi",
  "/assurance-taxi-prix",
  "/devis-assurance-taxi",
  "/assurance-taxi-paris",
  "/assurance-taxi-lyon",
  "/assurance-taxi-marseille",
  "/assurance-flotte-taxi",
  "/assurance-taxi-vtc",
  "/assurance-taxi-electrique",
  "/rc-professionnelle-taxi",
  "/assurance-taxi-jeune-conducteur",
  "/comparateur-assurance-taxi",
  "/courtier-assurance-taxi",
  "/gestion-sinistres",
  "/assurance-moto-taxi",
];

interface NLPEntity {
  name: string;
  type: string;
  salience: number;
  mentions?: { text: { content: string }; type: string }[];
}

interface NLPCategory {
  name: string;
  confidence: number;
}

/* ── Compute semantic score 0-100 ── */
function computeSemanticScore(
  entityCount: number,
  entitySalienceAvg: number,
  sentimentMagnitude: number,
  categoryConfidence: number,
  contentLength: number,
  isInsuranceCategory: boolean
): number {
  // Entity richness (0-30): more high-salience entities = better
  const entityScore = Math.min(30, entityCount * 2 * entitySalienceAvg * 30);
  // Sentiment magnitude (0-20): informative content has higher magnitude
  const sentimentScore = Math.min(20, sentimentMagnitude * 4);
  // Category match (0-25): is Google classifying this as insurance/finance?
  const categoryScore = isInsuranceCategory ? Math.min(25, categoryConfidence * 30) : 0;
  // Content length (0-15): longer = richer
  const lengthScore = Math.min(15, (contentLength / 2000) * 15);
  // Base score 10
  const base = 10;

  return Math.min(100, Math.round(base + entityScore + sentimentScore + categoryScore + lengthScore));
}

/* ── Generate improvement hints based on scores ── */
function generateHints(
  entityCount: number,
  sentimentMagnitude: number,
  isInsuranceCategory: boolean,
  contentLength: number,
  topEntities: NLPEntity[]
): string[] {
  const hints: string[] = [];

  if (entityCount < 5)
    hints.push("Ajouter plus d'entités nommées (marques, lieux, personnes)");
  if (sentimentMagnitude < 1.0)
    hints.push("Enrichir le contenu avec des affirmations plus précises et des données chiffrées");
  if (!isInsuranceCategory)
    hints.push("Renforcer le champ sémantique assurance/finance pour meilleure classification Google");
  if (contentLength < 800)
    hints.push("Page trop courte — viser 1000+ mots pour une meilleure couverture sémantique");
  if (topEntities.length > 0 && topEntities.every(e => e.salience < 0.1))
    hints.push("Les entités détectées ont une faible saillance — restructurer le contenu autour de termes clés");

  return hints;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  const startTime = Date.now();

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const googleApiKey = Deno.env.get("GOOGLE_NLP_API_KEY") || Deno.env.get("GOOGLE_SEARCH_CONSOLE_API_KEY");

    if (!googleApiKey) {
      return new Response(JSON.stringify({
        success: false,
        message: "GOOGLE_NLP_API_KEY secret is required. Enable Natural Language API in Google Cloud Console and create an API key.",
        setup_required: true,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const maxPages: number = body.max_pages ?? 20;
    const forcedUrls: string[] = body.urls ?? [];

    // Get pages to analyze: forced list OR top GSC pages + priority pages
    let pagesToAnalyze: string[];

    if (forcedUrls.length > 0) {
      pagesToAnalyze = forcedUrls;
    } else {
      // Pull top pages from gsc_pages that haven't been scored recently
      const { data: gscPages } = await supabase
        .from("gsc_pages")
        .select("url, impressions")
        .order("impressions", { ascending: false })
        .limit(maxPages);

      const gscUrls = (gscPages ?? []).map((p: { url: string }) => p.url);

      // Combine with priority pages
      const allUrls = new Set<string>([
        ...PRIORITY_PAGES.map(p => `${SITE_URL}${p}`),
        ...gscUrls,
      ]);

      // Exclude recently analyzed (within 7 days)
      const { data: recentScores } = await supabase
        .from("nlp_content_scores")
        .select("page_url")
        .gte("analyzed_at", new Date(Date.now() - 7 * 86400000).toISOString());

      const recentSet = new Set((recentScores ?? []).map((s: { page_url: string }) => s.page_url));
      pagesToAnalyze = [...allUrls].filter(u => !recentSet.has(u)).slice(0, maxPages);
    }

    console.log(`[NLP-SCORE] Analyzing ${pagesToAnalyze.length} pages`);

    const results: { url: string; score: number; status: string }[] = [];

    for (const pageUrl of pagesToAnalyze) {
      try {
        // Fetch page content
        const pageRes = await fetch(pageUrl, {
          headers: { "User-Agent": "TaxiAssur-SEO-Bot/1.0" },
          signal: AbortSignal.timeout(8000),
        });

        if (!pageRes.ok) {
          console.warn(`[NLP-SCORE] Page ${pageUrl} returned ${pageRes.status}`);
          results.push({ url: pageUrl, score: 0, status: "fetch_error" });
          continue;
        }

        const html = await pageRes.text();
        // Strip HTML tags and get text content
        const text = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 5000); // NLP API limit

        if (text.length < 100) {
          results.push({ url: pageUrl, score: 0, status: "content_too_short" });
          continue;
        }

        // ── 1. Analyze Entities ──
        const entityRes = await fetch(
          `https://language.googleapis.com/v1/documents:analyzeEntities?key=${googleApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              document: { type: "PLAIN_TEXT", language: "fr", content: text },
              encodingType: "UTF8",
            }),
          }
        );

        const entityData = await entityRes.json();
        const entities: NLPEntity[] = entityData.entities ?? [];
        const topEntities = entities
          .sort((a, b) => b.salience - a.salience)
          .slice(0, 10)
          .map(e => ({ name: e.name, type: e.type, salience: e.salience }));
        const entitySalienceAvg = topEntities.length > 0
          ? topEntities.reduce((s, e) => s + e.salience, 0) / topEntities.length
          : 0;

        // ── 2. Classify Content ──
        let mainCategory = "";
        let categoryConfidence = 0;
        let isInsuranceCategory = false;

        if (text.length >= 20) {
          const classifyRes = await fetch(
            `https://language.googleapis.com/v1/documents:classifyText?key=${googleApiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                document: { type: "PLAIN_TEXT", language: "fr", content: text },
              }),
            }
          );

          const classifyData = await classifyRes.json();
          const categories: NLPCategory[] = classifyData.categories ?? [];

          if (categories.length > 0) {
            const top = categories.sort((a, b) => b.confidence - a.confidence)[0];
            mainCategory = top.name;
            categoryConfidence = top.confidence;
            isInsuranceCategory = top.name.toLowerCase().includes("insurance") ||
              top.name.toLowerCase().includes("finance") ||
              top.name.toLowerCase().includes("assurance");
          }
        }

        // ── 3. Sentiment ──
        const sentimentRes = await fetch(
          `https://language.googleapis.com/v1/documents:analyzeSentiment?key=${googleApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              document: { type: "PLAIN_TEXT", language: "fr", content: text },
              encodingType: "UTF8",
            }),
          }
        );

        const sentimentData = await sentimentRes.json();
        const sentimentScore     = sentimentData.documentSentiment?.score ?? 0;
        const sentimentMagnitude = sentimentData.documentSentiment?.magnitude ?? 0;

        // ── Compute final score ──
        const semanticScore = computeSemanticScore(
          entities.length,
          entitySalienceAvg,
          sentimentMagnitude,
          categoryConfidence,
          text.length,
          isInsuranceCategory
        );

        const improvementHints = generateHints(
          entities.length, sentimentMagnitude, isInsuranceCategory, text.length, topEntities as NLPEntity[]
        );

        const pagePath = pageUrl.replace(SITE_URL, "") || "/";

        // Upsert score
        await supabase.from("nlp_content_scores").insert({
          page_url:            pageUrl,
          page_path:           pagePath,
          entity_count:        entities.length,
          entity_salience_avg: entitySalienceAvg,
          top_entities:        topEntities,
          sentiment_score:     Math.max(-1, Math.min(1, sentimentScore)),
          sentiment_magnitude: sentimentMagnitude,
          main_category:       mainCategory,
          category_confidence: categoryConfidence,
          content_length:      text.length,
          semantic_score:      semanticScore,
          improvement_hints:   improvementHints,
          analyzed_at:         new Date().toISOString(),
        });

        // If low semantic score + high GSC impressions → flag for optimization
        if (semanticScore < 50) {
          await supabase.from("gsc_pages")
            .update({ needs_optimization: true })
            .eq("url", pageUrl);
        }

        results.push({ url: pageUrl, score: semanticScore, status: "ok" });
        console.log(`[NLP-SCORE] ${pagePath} → score ${semanticScore} (${entities.length} entities, cat: ${mainCategory})`);

        // Throttle to avoid rate limits
        await new Promise(r => setTimeout(r, 300));

      } catch (pageErr) {
        console.error(`[NLP-SCORE] Error for ${pageUrl}:`, pageErr);
        results.push({ url: pageUrl, score: 0, status: "error" });
      }
    }

    const duration = Date.now() - startTime;
    const avgScore = results.filter(r => r.score > 0).reduce((s, r) => s + r.score, 0) /
      Math.max(1, results.filter(r => r.score > 0).length);

    console.log(`[NLP-SCORE] Done: ${results.length} pages, avg score ${avgScore.toFixed(1)}, ${duration}ms`);

    return new Response(JSON.stringify({
      success: true,
      pages_analyzed: results.length,
      avg_semantic_score: Math.round(avgScore),
      results,
      duration_ms: duration,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("[NLP-SCORE] Fatal:", err);
    return new Response(JSON.stringify({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
