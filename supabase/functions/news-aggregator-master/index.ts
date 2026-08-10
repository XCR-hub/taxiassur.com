import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { isInternalRequest } from "../_shared/internal-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface NewsSource {
  id: string;
  name: string;
  url: string;
  type: string;
  enabled: boolean;
  keywords: string[];
  priority: number;
  check_interval: number;
  last_check?: string;
}

interface NewsArticle {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  source: string;
  source_url: string;
  category: string;
  tags: string[];
  score: number;
  status: string;
  published_at: string;
}

function calculateRelevanceScore(
  title: string,
  content: string,
  keywords: string[],
): number {
  const text = `${title} ${content}`.toLowerCase();
  let score = 0;

  keywords.forEach((keyword) => {
    const keywordLower = keyword.toLowerCase();
    const matches = (text.match(new RegExp(keywordLower, "g")) || []).length;
    score += matches * 10;
  });

  const highPriorityKeywords = [
    "assurance taxi",
    "réglementation",
    "décret",
    "tarif taxi",
  ];
  highPriorityKeywords.forEach((keyword) => {
    if (text.includes(keyword)) score += 25;
  });

  return Math.min(100, score);
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 100);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (!(await isInternalRequest(req))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: sources, error: sourcesError } = await supabase
      .from("news_sources")
      .select("*")
      .eq("enabled", true)
      .order("priority", { ascending: false });

    if (sourcesError) throw sourcesError;

    const newArticles: NewsArticle[] = [];
    const errors: string[] = [];
    let totalProcessed = 0;

    for (const source of (sources as NewsSource[])) {
      try {
        const now = new Date();
        const lastCheck = source.last_check
          ? new Date(source.last_check)
          : new Date(0);
        const timeSinceLastCheck = (now.getTime() - lastCheck.getTime()) / 1000;

        if (timeSinceLastCheck < source.check_interval) {
          console.log(
            `Skipping ${source.name} - checked ${
              Math.floor(timeSinceLastCheck)
            }s ago`,
          );
          continue;
        }

        console.log(`Processing ${source.name} (${source.type})`);

        if (source.type === "rss") {
          const rssResponse = await fetch(
            `${supabaseUrl}/functions/v1/rss-parser`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                url: source.url,
                sourceName: source.name,
              }),
            },
          );

          if (rssResponse.ok) {
            const rssData = await rssResponse.json();

            if (rssData.success && rssData.items) {
              for (const item of rssData.items) {
                const score = calculateRelevanceScore(
                  item.title,
                  item.description,
                  source.keywords,
                );

                if (score >= 30) {
                  const slug = `${generateSlug(item.title)}-${Date.now()}`;

                  const article: NewsArticle = {
                    title: item.title,
                    slug,
                    content: `<p>${item.description}</p>`,
                    excerpt: item.description.substring(0, 200),
                    source: source.name,
                    source_url: item.link,
                    category: item.category || "Actualité",
                    tags: source.keywords.slice(0, 5),
                    score,
                    status: score >= 70 ? "ready" : "draft",
                    published_at: item.pubDate,
                  };

                  newArticles.push(article);
                }
              }

              totalProcessed += rssData.items.length;
            }
          }
        } else if (source.type === "linkedin") {
          const linkedinResponse = await fetch(
            `${supabaseUrl}/functions/v1/linkedin-scraper`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({}),
            },
          );

          if (linkedinResponse.ok) {
            const linkedinData = await linkedinResponse.json();
            totalProcessed += linkedinData.count || 0;
          }
        }

        await supabase
          .from("news_sources")
          .update({
            last_check: now.toISOString(),
            last_success: now.toISOString(),
            error_count: 0,
          })
          .eq("id", source.id);
      } catch (error: any) {
        console.error(`Error processing ${source.name}:`, error);
        errors.push(`${source.name}: ${error.message}`);

        await supabase
          .from("news_sources")
          .update({
            error_count: (source.error_count || 0) + 1,
          })
          .eq("id", source.id);
      }
    }

    if (newArticles.length > 0) {
      const { error: insertError } = await supabase
        .from("news_articles")
        .insert(newArticles);

      if (insertError) {
        console.error("Error inserting articles:", insertError);
        errors.push(`Insertion: ${insertError.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message:
          `Agrégation terminée : ${newArticles.length} nouveaux articles sur ${totalProcessed} traités`,
        stats: {
          newArticles: newArticles.length,
          totalProcessed,
          sourcesChecked: sources?.length || 0,
          errors: errors.length,
        },
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("Master Aggregator Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
