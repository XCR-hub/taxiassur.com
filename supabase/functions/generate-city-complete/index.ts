import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
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
  try {
    const body = await req.json();
    const city = typeof body?.city_name === "string"
      ? body.city_name.trim()
      : "";
    const dept = typeof body?.dept === "string" ? body.dept.trim() : "";
    const region = typeof body?.region === "string" ? body.region.trim() : "";
    const taxiCount = Number(body?.taxi_count ?? 500);
    if (!/^[\p{L}][\p{L}\p{M} .'-]{1,79}$/u.test(city)) {
      return json({ error: "Nom de ville invalide" }, 400);
    }
    if (dept.length > 5 || region.length > 100) {
      return json({ error: "Département ou région invalide" }, 400);
    }
    if (!Number.isInteger(taxiCount) || taxiCount < 1 || taxiCount > 100000) {
      return json({ error: "Nombre de taxis invalide" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });
    const generatedResponse = await fetch(
      `${supabaseUrl}/functions/v1/generate-seo-content`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          keyword: "assurance taxi",
          city,
          secondaryKeywords: [city, region, "devis", "RC professionnelle"]
            .filter(Boolean),
          imagePrompt: body?.generate_image === false
            ? undefined
            : `taxi professionnel ${city}`,
        }),
      },
    );
    if (!generatedResponse.ok) {
      console.error("City content generation failed", {
        status: generatedResponse.status,
      });
      return json({ error: "La génération du contenu a échoué" }, 502);
    }
    const generated = await generatedResponse.json();
    const page = generated?.content?.cityPage;
    if (!page?.slug || !page?.title || !page?.content) {
      return json({ error: "Le contenu généré est incomplet" }, 502);
    }
    const slug = String(page.slug).toLowerCase().replace(/[^a-z0-9-]/g, "")
      .slice(0, 120);
    if (!slug) return json({ error: "Slug généré invalide" }, 502);

    const { data: existing, error: existingError } = await supabase.from(
      "city_pages",
    ).select("id").eq("slug", slug).maybeSingle();
    if (existingError) throw existingError;
    if (existing) {
      return json({ error: "Une page existe déjà pour cette ville" }, 409);
    }
    const { data: inserted, error: insertError } = await supabase.from(
      "city_pages",
    ).insert({
      city,
      title: page.title,
      slug,
      content: page.content,
      meta_description: page.metaDescription || null,
      keywords: page.keywords || [],
      dept: dept || page.dept || null,
      region: region || page.region || null,
      population: page.population || null,
      taxi_count: taxiCount,
      status: "published",
      naturalness_score: page.naturalness_score || 70,
      writing_style: page.writing_style || "professionnel",
      published_at: new Date().toISOString(),
    }).select("id,slug").single();
    if (insertError || !inserted) {
      throw insertError || new Error("City insertion returned no row");
    }
    return json({
      success: true,
      message: `Page de ${city} générée et publiée`,
      city_id: inserted.id,
      slug: inserted.slug,
      url: `https://taxiassur.com/${inserted.slug}`,
      generated: {
        city_page: true,
        article: Boolean(body?.generate_article),
        faqs: body?.generate_faq
          ? Number(generated?.content?.faqs?.length || 0)
          : 0,
        news: false,
        image: Boolean(page.featuredImage),
      },
    });
  } catch (error) {
    console.error(
      "City generation failed",
      error instanceof Error ? error.message : "unknown error",
    );
    return json({ error: "Impossible de générer la page ville" }, 500);
  }
});
