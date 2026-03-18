import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const TARGET_KEYWORDS = [
  "assurance taxi",
  "assurance taxi prix",
  "meilleure assurance taxi",
  "assurance taxi pas cher",
  "devis assurance taxi",
  "assurance taxi vtc",
  "assurance taxi obligatoire",
  "rc pro taxi",
  "assurance taxi paris",
  "assurance taxi lyon",
  "assurance taxi marseille",
  "assurance flotte taxi",
  "assurance taxi jeune conducteur",
  "assurance taxi electrique",
  "comparateur assurance taxi",
  "assurance taxi moto",
  "assurance vtc prix",
  "assurance professionnelle taxi",
  "cotisation assurance taxi",
  "taxiassur",
];

const BATCH_SIZE = 5;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const indexNowKey = Deno.env.get("INDEXNOW_KEY");

    const body = await req.json().catch(() => ({}));
    const mode = body.mode || "auto";
    const forcedTaskId = body.task_id;

    console.log(`[SEO-DOMINATOR] Mode: ${mode}, forced_task: ${forcedTaskId || "none"}`);

    // Log cron execution
    await supabase.from("gsc_seo_cron_log").insert({
      cron_name: "gsc-seo-dominator",
      mode,
      started_at: new Date().toISOString(),
      status: "running",
    }).select("id").maybeSingle().then(async ({ data }) => {
      if (data) (globalThis as any).__cronLogId = data.id;
    });

    const results: any[] = [];
    const urlsToIndex: string[] = [];

    // === PHASE 1: Detect new opportunities from target keywords ===
    console.log("[PHASE 1] Détection des opportunités mots-clés cibles...");
    const newTasksCount = await detectKeywordOpportunities(supabase);
    console.log(`[PHASE 1] ${newTasksCount} nouvelles tâches créées`);

    // === PHASE 2: Process batch of pending tasks ===
    console.log(`[PHASE 2] Traitement batch de ${BATCH_SIZE} tâches...`);
    const { data: pendingTasks } = await supabase
      .from("gsc_autonomous_tasks")
      .select("*")
      .eq("status", "pending")
      .order("priority", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(BATCH_SIZE);

    const tasksToProcess = forcedTaskId
      ? pendingTasks?.filter((t: any) => t.id === forcedTaskId) || []
      : (pendingTasks || []);

    console.log(`[PHASE 2] ${tasksToProcess.length} tâches à traiter`);

    for (const task of tasksToProcess) {
      await supabase
        .from("gsc_autonomous_tasks")
        .update({ status: "processing", started_at: new Date().toISOString() })
        .eq("id", task.id);

      let result: any = {};
      let success = false;

      try {
        switch (task.task_type) {
          case "enrich_content":
            result = await enrichContentTargeted(task, openaiKey);
            success = result.success;
            break;
          case "optimize_metadata":
            result = await optimizeMetadataTargeted(task, openaiKey);
            success = result.success;
            break;
          case "add_internal_links":
            result = await buildInternalLinkGraph(task, supabase);
            success = result.success;
            break;
          case "submit_indexation":
            urlsToIndex.push(task.target_url);
            result = { success: true, queued: true };
            success = true;
            break;
          case "generate_faq_schema":
            result = await generateFaqSchema(task, openaiKey);
            success = result.success;
            break;
          case "improve_ctr":
            result = await improveCtrTitle(task, openaiKey);
            success = result.success;
            break;
          default:
            result = { success: false, error: `Unknown task type: ${task.task_type}` };
        }

        await supabase.from("gsc_autonomous_tasks").update({
          status: success ? "completed" : "failed",
          completed_at: new Date().toISOString(),
          result,
          error_message: result.error || null,
        }).eq("id", task.id);

        if (success) {
          urlsToIndex.push(task.target_url);
          await supabase.from("gsc_optimization_history").insert({
            url: task.target_url,
            optimization_type: task.task_type,
            metrics_before: task.current_metrics || {},
            content_changes: result.changes || {},
            indexation_status_before: "pending",
            ai_confidence_score: result.confidence || 0.8,
            success: null,
          });
        }

        results.push({ task_id: task.id, type: task.task_type, url: task.target_url, success });
      } catch (err) {
        console.error(`[TASK ERROR] ${task.id}:`, err);
        await supabase.from("gsc_autonomous_tasks").update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message: err instanceof Error ? err.message : String(err),
        }).eq("id", task.id);
        results.push({ task_id: task.id, type: task.task_type, url: task.target_url, success: false });
      }
    }

    // === PHASE 3: Batch IndexNow submission ===
    const uniqueUrls = [...new Set(urlsToIndex)].slice(0, 100);
    let indexNowResult = null;
    if (uniqueUrls.length > 0 && indexNowKey) {
      console.log(`[PHASE 3] Soumission IndexNow: ${uniqueUrls.length} URLs`);
      indexNowResult = await batchSubmitIndexNow(uniqueUrls, indexNowKey);
    }

    // === PHASE 4: Track keyword positions ===
    console.log("[PHASE 4] Suivi positions mots-clés cibles...");
    const positionSnapshot = await trackKeywordPositions(supabase);

    // === PHASE 5: Learning from successes ===
    if (mode === "auto" || mode === "deep") {
      console.log("[PHASE 5] Apprentissage des patterns...");
      await supabase.rpc("learn_from_successful_optimizations").catch(() => null);
    }

    // === PHASE 6: Reset stuck tasks ===
    const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    await supabase
      .from("gsc_autonomous_tasks")
      .update({ status: "pending", started_at: null })
      .eq("status", "processing")
      .lt("started_at", cutoff);

    const duration = Date.now() - startTime;

    // Update cron log
    if ((globalThis as any).__cronLogId) {
      await supabase.from("gsc_seo_cron_log").update({
        status: "completed",
        finished_at: new Date().toISOString(),
        duration_ms: duration,
        tasks_processed: results.length,
        tasks_succeeded: results.filter((r) => r.success).length,
        urls_indexed: uniqueUrls.length,
        new_tasks_created: newTasksCount,
      }).eq("id", (globalThis as any).__cronLogId);
    }

    console.log(`[SEO-DOMINATOR] Terminé en ${duration}ms. ${results.filter((r) => r.success).length}/${results.length} tâches réussies.`);

    return new Response(
      JSON.stringify({
        success: true,
        duration_ms: duration,
        phase_results: {
          new_tasks_detected: newTasksCount,
          tasks_processed: results.length,
          tasks_succeeded: results.filter((r) => r.success).length,
          urls_indexed: uniqueUrls.length,
          indexnow_status: indexNowResult,
          keyword_positions_tracked: positionSnapshot,
        },
        tasks: results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[SEO-DOMINATOR] Fatal error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ============================================================
// PHASE 1: Detect opportunities for target keywords
// ============================================================
async function detectKeywordOpportunities(supabase: any): Promise<number> {
  let created = 0;
  try {
    // Get performance data for target keywords
    const { data: kwData } = await supabase
      .from("gsc_queries")
      .select("query, position, impressions, ctr, page_url")
      .in("query", TARGET_KEYWORDS)
      .order("impressions", { ascending: false });

    if (!kwData) return 0;

    for (const kw of kwData) {
      if (!kw.page_url) continue;

      // Pages in positions 2-10 — push them to #1
      if (kw.position > 1.5 && kw.position <= 10 && kw.impressions >= 20) {
        const priority = Math.round(10 - kw.position + (kw.impressions / 100));

        // Check if task already exists for this URL + type
        const { data: existing } = await supabase
          .from("gsc_autonomous_tasks")
          .select("id")
          .eq("target_url", kw.page_url)
          .eq("task_type", "enrich_content")
          .eq("status", "pending")
          .maybeSingle();

        if (!existing) {
          await supabase.from("gsc_autonomous_tasks").insert({
            task_type: "enrich_content",
            target_url: kw.page_url,
            status: "pending",
            priority: Math.min(priority, 10),
            current_metrics: {
              position: kw.position,
              impressions: kw.impressions,
              ctr: kw.ctr,
              keyword: kw.query,
            },
            target_metrics: { position: 1, ctr: 0.15 },
          });
          created++;
        }
      }

      // Pages with high impressions but low CTR — optimize titles
      if (kw.ctr < 0.05 && kw.impressions >= 100 && kw.position <= 10) {
        const { data: existing } = await supabase
          .from("gsc_autonomous_tasks")
          .select("id")
          .eq("target_url", kw.page_url)
          .eq("task_type", "improve_ctr")
          .eq("status", "pending")
          .maybeSingle();

        if (!existing) {
          await supabase.from("gsc_autonomous_tasks").insert({
            task_type: "improve_ctr",
            target_url: kw.page_url,
            status: "pending",
            priority: 8,
            current_metrics: {
              position: kw.position,
              impressions: kw.impressions,
              ctr: kw.ctr,
              keyword: kw.query,
            },
            target_metrics: { ctr: 0.12 },
          });
          created++;
        }
      }
    }

    // Also detect pages NOT ranking at all for target keywords
    // (no data = need new content)
    const rankedUrls = new Set(kwData.map((k: any) => k.query));
    const missingKeywords = TARGET_KEYWORDS.filter((kw) => !rankedUrls.has(kw));

    for (const missingKw of missingKeywords.slice(0, 3)) {
      const { data: existing } = await supabase
        .from("gsc_autonomous_tasks")
        .select("id")
        .eq("task_type", "generate_faq_schema")
        .contains("current_metrics", { keyword: missingKw })
        .eq("status", "pending")
        .maybeSingle();

      if (!existing) {
        await supabase.from("gsc_autonomous_tasks").insert({
          task_type: "generate_faq_schema",
          target_url: "https://taxiassur.com/assurance-taxi",
          status: "pending",
          priority: 6,
          current_metrics: { keyword: missingKw, impressions: 0, position: 100 },
        });
        created++;
      }
    }

    // Run the existing detection function too
    await supabase.rpc("auto_create_optimization_tasks").catch(() => null);
  } catch (err) {
    console.error("[detectKeywordOpportunities]", err);
  }
  return created;
}

// ============================================================
// Task: Enrich content targeted at specific keyword
// ============================================================
async function enrichContentTargeted(task: any, openaiKey?: string): Promise<any> {
  if (!openaiKey) return { success: false, error: "Missing OpenAI key" };

  const keyword = task.current_metrics?.keyword || "assurance taxi";
  const pathname = (() => { try { return new URL(task.target_url).pathname; } catch { return task.target_url; } })();
  const currentPos = task.current_metrics?.position || "?";
  const currentCtr = task.current_metrics?.ctr ? `${(task.current_metrics.ctr * 100).toFixed(1)}%` : "?";

  const prompt = `Tu es l'expert SEO #1 mondial de taxiassur.com, spécialiste de l'assurance taxi en France.

CONTEXTE:
- Page: ${pathname}
- Mot-clé cible: "${keyword}"
- Position actuelle: ${currentPos} sur Google
- CTR actuel: ${currentCtr}
- OBJECTIF: Atteindre la position #1 pour "${keyword}"

MISSION: Génère un enrichissement de contenu SEO ultra-performant (600-900 mots).

RÈGLES STRICTES:
1. Le mot-clé "${keyword}" doit apparaître naturellement 8-12 fois
2. Inclure les variantes sémantiques: ${getSemanticVariants(keyword).join(", ")}
3. Structure E-E-A-T: expertise, autorité, fiabilité
4. Questions/réponses format FAQ (3-5 questions)
5. Données chiffrées (tarifs, garanties, délais)
6. Appels à l'action subtils vers un devis
7. Liens internes vers: /devis-assurance-taxi, /assurance-taxi, /prix-assurance-taxi

Réponds UNIQUEMENT en JSON valide:
{
  "title": "< 60 chars, avec ${keyword}",
  "meta_description": "< 158 chars, forte incitation au clic, inclure ${keyword} et un bénéfice concret",
  "h1": "Titre H1 avec ${keyword}",
  "intro_paragraph": "Paragraphe d'introduction accrocheur (120 mots)",
  "content_sections": [
    {"heading": "H2 avec variante du mot-clé", "content": "Contenu détaillé 150-200 mots"}
  ],
  "faq": [
    {"question": "Question fréquente sur ${keyword}", "answer": "Réponse experte 60-80 mots"}
  ],
  "internal_links": [
    {"anchor": "texte ancre pertinent", "url": "/page-interne"}
  ],
  "schema_data": {
    "type": "FAQPage ou Article",
    "keywords": ["${keyword}", "variante1", "variante2"]
  }
}`;

  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Expert SEO assurance taxi. JSON uniquement, sans markdown." },
          { role: "user", content: prompt },
        ],
        temperature: 0.6,
        max_tokens: 2500,
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) throw new Error(`OpenAI ${resp.status}`);
    const data = await resp.json();
    const content = JSON.parse(data.choices[0].message.content);

    return {
      success: true,
      confidence: 0.88,
      keyword,
      changes: {
        title_optimized: !!content.title,
        meta_description_optimized: !!content.meta_description,
        content_sections: content.content_sections?.length || 0,
        faq_items: content.faq?.length || 0,
        internal_links: content.internal_links?.length || 0,
        schema_added: !!content.schema_data,
      },
      generated_content: content,
    };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// ============================================================
// Task: Optimize metadata for maximum CTR
// ============================================================
async function optimizeMetadataTargeted(task: any, openaiKey?: string): Promise<any> {
  if (!openaiKey) return { success: false, error: "Missing OpenAI key" };

  const keyword = task.current_metrics?.keyword || "assurance taxi";
  const pathname = (() => { try { return new URL(task.target_url).pathname; } catch { return task.target_url; } })();

  const prompt = `Expert SEO taxiassur.com. Optimise les métadonnées pour maximiser le CTR.

Page: ${pathname}
Mot-clé principal: "${keyword}"
Position actuelle: ${task.current_metrics?.position || "?"}
Impressions: ${task.current_metrics?.impressions || "?"}
CTR actuel: ${task.current_metrics?.ctr ? `${(task.current_metrics.ctr * 100).toFixed(1)}%` : "?"}

OBJECTIFS:
- Title tag: < 60 chars, inclure "${keyword}", ajouter un différenciateur (prix, rapidité, expert)
- Meta description: < 158 chars, inclure "${keyword}", bénéfice concret, appel à l'action
- Éviter les formules génériques comme "Découvrez nos offres"
- Utiliser des chiffres (30%, 24h, 5 min) si pertinent
- Créer une urgence subtile ou une preuve sociale

JSON uniquement:
{
  "title": "...",
  "meta_description": "...",
  "og_title": "...",
  "og_description": "...",
  "twitter_title": "...",
  "ctr_improvement_expected": "estimation % amélioration CTR"
}`;

  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Expert SEO. JSON uniquement." },
          { role: "user", content: prompt },
        ],
        temperature: 0.5,
        max_tokens: 400,
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) throw new Error(`OpenAI ${resp.status}`);
    const data = await resp.json();
    const metadata = JSON.parse(data.choices[0].message.content);

    return {
      success: true,
      confidence: 0.82,
      changes: { metadata_optimized: true, keyword },
      optimized_metadata: metadata,
    };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// ============================================================
// Task: Improve CTR with compelling titles
// ============================================================
async function improveCtrTitle(task: any, openaiKey?: string): Promise<any> {
  if (!openaiKey) return { success: false, error: "Missing OpenAI key" };

  const keyword = task.current_metrics?.keyword || "assurance taxi";
  const currentCtr = task.current_metrics?.ctr || 0;
  const impressions = task.current_metrics?.impressions || 0;
  const pathname = (() => { try { return new URL(task.target_url).pathname; } catch { return task.target_url; } })();

  const prompt = `Spécialiste conversion SEO. Page "${pathname}" avec ${impressions} impressions mais CTR de seulement ${(currentCtr * 100).toFixed(1)}%.

Mot-clé: "${keyword}"

Génère 5 variantes de titre (< 60 chars) qui maximisent le clic. Chaque titre doit:
- Inclure le mot-clé "${keyword}" ou une variante proche
- Utiliser une technique de persuasion différente (curiosité, urgence, bénéfice, social proof, comparatif)
- Être naturel et non clickbait

Génère aussi 3 meta descriptions (< 158 chars) haute conversion.

JSON uniquement:
{
  "title_variants": ["variante1", "variante2", "variante3", "variante4", "variante5"],
  "best_title": "Le meilleur parmi les 5",
  "meta_description_variants": ["desc1", "desc2", "desc3"],
  "best_meta_description": "La meilleure",
  "ctr_lift_estimate": "+X%"
}`;

  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Expert conversion et SEO. JSON uniquement." },
          { role: "user", content: prompt },
        ],
        temperature: 0.8,
        max_tokens: 600,
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) throw new Error(`OpenAI ${resp.status}`);
    const data = await resp.json();
    const ctrData = JSON.parse(data.choices[0].message.content);

    return {
      success: true,
      confidence: 0.85,
      changes: { ctr_optimization: true, variants_generated: ctrData.title_variants?.length || 0 },
      ctr_data: ctrData,
    };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// ============================================================
// Task: Generate FAQ schema for missing keywords
// ============================================================
async function generateFaqSchema(task: any, openaiKey?: string): Promise<any> {
  if (!openaiKey) return { success: false, error: "Missing OpenAI key" };

  const keyword = task.current_metrics?.keyword || "assurance taxi";

  const prompt = `Expert assurance taxi et SEO. Génère un FAQ schema.org ultra-complet pour le mot-clé "${keyword}".

Le FAQ doit:
- Répondre aux 8 questions les plus cherchées sur Google pour "${keyword}"
- Utiliser naturellement "${keyword}" et ses variantes
- Contenir des réponses expertes (80-120 mots chacune)
- Inclure des données chiffrées (tarifs, délais, garanties)
- Format schema.org FAQPage

JSON uniquement:
{
  "faq_items": [
    {
      "question": "Question naturelle que les gens posent",
      "answer": "Réponse experte et détaillée",
      "keywords_used": ["keyword1", "keyword2"]
    }
  ],
  "schema_markup": {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": []
  },
  "target_featured_snippet": "Question la plus likely to get featured snippet"
}`;

  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Expert SEO et assurance taxi. JSON uniquement." },
          { role: "user", content: prompt },
        ],
        temperature: 0.5,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) throw new Error(`OpenAI ${resp.status}`);
    const data = await resp.json();
    const faqData = JSON.parse(data.choices[0].message.content);

    return {
      success: true,
      confidence: 0.9,
      changes: { faq_items: faqData.faq_items?.length || 0, schema_added: true },
      faq_data: faqData,
    };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// ============================================================
// Task: Build internal link graph for topical authority
// ============================================================
async function buildInternalLinkGraph(task: any, supabase: any): Promise<any> {
  try {
    const { data: topPages } = await supabase
      .from("gsc_pages")
      .select("url, clicks, impressions")
      .neq("url", task.target_url)
      .order("clicks", { ascending: false })
      .limit(10);

    if (!topPages?.length) return { success: false, error: "No pages found" };

    const targetPath = (() => { try { return new URL(task.target_url).pathname; } catch { return task.target_url; } })();
    const targetKeyword = task.current_metrics?.keyword || "";

    const links = topPages.map((p: any) => {
      const sourcePath = (() => { try { return new URL(p.url).pathname; } catch { return p.url; } })();
      const relevance = calculatePathRelevance(targetPath, sourcePath, targetKeyword);
      return {
        source_url: p.url,
        target_url: task.target_url,
        anchor_text: generateAnchorText(targetPath, targetKeyword),
        relevance_score: relevance,
        clicks: p.clicks,
      };
    }).filter((l: any) => l.relevance_score > 0).slice(0, 5);

    return {
      success: true,
      confidence: 0.75,
      changes: { internal_links_suggested: links.length },
      suggested_links: links,
    };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// ============================================================
// Phase 3: Batch IndexNow submission
// ============================================================
async function batchSubmitIndexNow(urls: string[], indexNowKey: string): Promise<any> {
  try {
    const resp = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: "taxiassur.com",
        key: indexNowKey,
        keyLocation: "https://taxiassur.com/indexnow-key.txt",
        urlList: urls,
      }),
    });
    console.log(`[IndexNow] ${resp.status} — ${urls.length} URLs soumises`);
    return { status: resp.status, urls_submitted: urls.length, success: resp.ok || resp.status === 202 };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// ============================================================
// Phase 4: Track keyword positions snapshot
// ============================================================
async function trackKeywordPositions(supabase: any): Promise<any> {
  try {
    const { data: kwData } = await supabase
      .from("gsc_queries")
      .select("query, position, impressions, clicks, ctr, page_url")
      .in("query", TARGET_KEYWORDS)
      .order("impressions", { ascending: false });

    if (!kwData?.length) return { tracked: 0 };

    const snapshots = kwData.map((k: any) => ({
      keyword: k.query,
      position: k.position,
      impressions: k.impressions,
      clicks: k.clicks,
      ctr: k.ctr,
      page_url: k.page_url,
      snapshot_date: new Date().toISOString().split("T")[0],
    }));

    // Upsert keyword position history
    await supabase
      .from("gsc_keyword_positions")
      .upsert(snapshots, { onConflict: "keyword,snapshot_date", ignoreDuplicates: false });

    const top3 = snapshots.filter((s: any) => s.position <= 3).length;
    const top10 = snapshots.filter((s: any) => s.position <= 10).length;
    console.log(`[Positions] Top3: ${top3}/${snapshots.length}, Top10: ${top10}/${snapshots.length}`);

    return { tracked: snapshots.length, top3, top10 };
  } catch (err) {
    console.error("[trackKeywordPositions]", err);
    return { tracked: 0, error: String(err) };
  }
}

// ============================================================
// Helpers
// ============================================================
function getSemanticVariants(keyword: string): string[] {
  const variants: Record<string, string[]> = {
    "assurance taxi": ["assurance pour taxi", "assurance professionnelle taxi", "garanties taxi", "couverture taxi", "police d'assurance taxi"],
    "rc pro taxi": ["responsabilité civile professionnelle taxi", "RC pro chauffeur taxi", "garantie RC taxi"],
    "devis assurance taxi": ["tarif assurance taxi", "prix assurance taxi", "cotisation assurance taxi", "comparatif assurance taxi"],
  };
  const exact = variants[keyword];
  if (exact) return exact.slice(0, 3);
  return [`${keyword} prix`, `${keyword} pas cher`, `meilleur ${keyword}`];
}

function calculatePathRelevance(target: string, source: string, keyword: string): number {
  const targetParts = target.toLowerCase().split("/").filter(Boolean);
  const sourceParts = source.toLowerCase().split("/").filter(Boolean);
  const kwParts = keyword.toLowerCase().split(" ");

  let score = 0;
  for (const part of targetParts) {
    if (sourceParts.some((s) => s.includes(part) || part.includes(s))) score += 0.3;
  }
  for (const kw of kwParts) {
    if (sourceParts.some((s) => s.includes(kw))) score += 0.2;
    if (targetParts.some((t) => t.includes(kw))) score += 0.1;
  }
  return Math.min(score, 1);
}

function generateAnchorText(pathname: string, keyword: string): string {
  if (keyword) {
    const variants = [`${keyword}`, `l'${keyword}`, `votre ${keyword}`];
    return variants[Math.floor(Math.random() * variants.length)];
  }
  return pathname.split("/").filter(Boolean).join(" ").replace(/-/g, " ") || "assurance taxi";
}
