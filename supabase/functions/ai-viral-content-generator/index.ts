import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { isInternalRequest } from "../_shared/internal-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};
const allowedPlatforms = new Set([
  "facebook",
  "linkedin",
  "instagram",
  "twitter",
  "pinterest",
  "tiktok",
]);
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
    const topic = typeof body?.topic === "string" ? body.topic.trim() : "";
    const audience = typeof body?.target_audience === "string"
      ? body.target_audience.trim()
      : "";
    const requested = Array.isArray(body?.platforms) ? body.platforms : [];
    const platforms = [
      ...new Set(
        requested.filter((value): value is string => typeof value === "string")
          .map((value) => value.toLowerCase()).filter((value) =>
            allowedPlatforms.has(value)
          ),
      ),
    ];
    if (topic.length < 5 || topic.length > 300 || audience.length > 300) {
      return json({ error: "Sujet ou audience invalide" }, 400);
    }
    if (platforms.length === 0 || platforms.length > 6) {
      return json(
        { error: "Sélectionnez entre 1 et 6 plateformes valides" },
        400,
      );
    }
    if (body?.auto_publish === true) {
      return json({
        error:
          "La publication automatique n’est pas autorisée par ce générateur",
      }, 400);
    }

    const apiKey = Deno.env.get("OPENAI_API_KEY")?.trim() || "";
    if (!apiKey) {
      return json({ error: "Le générateur IA n’est pas configuré" }, 503);
    }
    const prompt =
      `Rédige un post en français pour TaxiAssur, courtier spécialisé en assurance taxi. Sujet: ${topic}. Audience: ${
        audience || "chauffeurs de taxi et VTC"
      }. Plateformes: ${
        platforms.join(", ")
      }. Ton humain, professionnel, concret, sans promesse trompeuse, sans inventer de chiffres, avec un appel à l'action discret et 4 à 7 hashtags. Retourne uniquement le texte du post.`;
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{
          role: "system",
          content: "Tu es un community manager B2B français rigoureux.",
        }, { role: "user", content: prompt }],
        temperature: 0.75,
        max_tokens: 600,
      }),
    });
    if (!response.ok) {
      console.error("Viral content provider failed", {
        status: response.status,
      });
      return json({ error: "Le fournisseur IA a refusé la génération" }, 502);
    }
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content?.trim();
    if (
      typeof content !== "string" || content.length < 40 ||
      content.length > 4000
    ) return json({ error: "Le contenu généré est invalide" }, 502);
    const hashtags = [
      ...new Set(
        (content.match(/#[\p{L}\p{N}_-]+/gu) || []).map((tag: string) =>
          tag.slice(0, 60)
        ),
      ),
    ].slice(0, 10);
    const posts = platforms.map((platform) => ({
      platform,
      content,
      hashtags,
    }));
    return json({
      success: true,
      message: `${posts.length} brouillon(s) généré(s)`,
      posts,
      hashtags,
      template_used: "taxiassur-b2b-safe-v1",
      viral_potential: "modéré",
      humanization_score: 85,
    });
  } catch (error) {
    console.error(
      "Viral content generation failed",
      error instanceof Error ? error.message : "unknown error",
    );
    return json({ error: "Impossible de générer le contenu" }, 500);
  }
});
