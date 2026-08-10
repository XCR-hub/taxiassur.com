import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { isInternalRequest } from "../_shared/internal-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function stripHtml(html: string): string {
  if (!html) return "";

  const cleaned = html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();

  return cleaned;
}

function createSmartExcerpt(title: string, content: string): string {
  const cleanContent = stripHtml(content);

  if (cleanContent.length < 50) {
    return generateDefaultExcerpt(title);
  }

  const excerpt = cleanContent.substring(0, 160);
  const lastSpaceIndex = excerpt.lastIndexOf(" ");

  if (lastSpaceIndex > 128) {
    return excerpt.substring(0, lastSpaceIndex) + "...";
  }

  return excerpt + "...";
}

function generateDefaultExcerpt(title: string): string {
  const lowerTitle = title.toLowerCase();

  if (lowerTitle.includes("réglementation") || lowerTitle.includes("loi")) {
    return "Découvrez les dernières évolutions réglementaires qui impactent le secteur de l'assurance taxi.";
  }
  if (lowerTitle.includes("prix") || lowerTitle.includes("économie")) {
    return "Analyse détaillée des tendances économiques et tarifaires du secteur des taxis.";
  }
  if (lowerTitle.includes("électrique") || lowerTitle.includes("innovation")) {
    return "Les innovations technologiques qui transforment le métier de chauffeur de taxi.";
  }

  return "Une actualité importante pour tous les professionnels du secteur des taxis.";
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (!(await isInternalRequest(req))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: articles, error: fetchError } = await supabase
      .from("news_articles")
      .select("id, title, excerpt, content")
      .eq("status", "published");

    if (fetchError) {
      throw fetchError;
    }

    let cleanedCount = 0;
    const errors: string[] = [];

    for (const article of articles || []) {
      const currentExcerpt = article.excerpt || "";
      const cleanedExcerpt = stripHtml(currentExcerpt);

      if (
        !article.excerpt ||
        currentExcerpt.includes("<a ") ||
        currentExcerpt.includes("href=") ||
        cleanedExcerpt.length < 20
      ) {
        const newExcerpt = createSmartExcerpt(
          article.title,
          article.content || "",
        );

        const { error: updateError } = await supabase
          .from("news_articles")
          .update({ excerpt: newExcerpt })
          .eq("id", article.id);

        if (updateError) {
          errors.push(`Error updating ${article.id}: ${updateError.message}`);
        } else {
          cleanedCount++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Nettoyage terminé : ${cleanedCount} articles mis à jour`,
        totalArticles: articles?.length || 0,
        cleanedCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error("Error cleaning news excerpts:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});
