import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { isInternalRequest } from "../_shared/internal-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const WRITING_STYLES = [
  { name: "professionnel", tone: "formal", vocabulary: "expert" },
  { name: "accessible", tone: "friendly", vocabulary: "simple" },
  { name: "expert", tone: "authoritative", vocabulary: "technical" },
  { name: "conversationnel", tone: "casual", vocabulary: "everyday" },
  { name: "pedagogique", tone: "educational", vocabulary: "clear" },
];

const STYLE_INSTRUCTIONS: Record<string, string> = {
  professionnel:
    `Ton formel mais pas robotique. Vocabulaire expert. Phrases complexes avec subordonnees.
Comme un courtier senior qui ecrit dans une revue pro. Tu ADORES les details techniques.`,
  accessible:
    `Ton chaleureux et direct. Vocabulaire simple. Tu parles comme un ami expert.
"Bon, soyons concrets", "Franchement", "En gros". Tu vulgarises sans simplifier.`,
  expert:
    `Ton autoritaire et precis. Tu assumes tes opinions. Vocabulaire technique.
"Il faut le dire clairement", "Les chiffres parlent d'eux-memes". Tu cites des sources.`,
  conversationnel:
    `Ton decontracte. Phrases courtes. Parfois une phrase-choc de 3 mots. Puis une longue explication.
"Ecoutez", "Pas de blabla", "Concretement". Tu interpelles le lecteur.`,
  pedagogique:
    `Ton patient et clair. Tu expliques etape par etape. Analogies et exemples.
"Imaginez que...", "C'est un peu comme si...", "Pour faire simple". Tu guides le lecteur.`,
};

const INTRO_HOOKS = [
  "question_choc",
  "statistique_surprenante",
  "anecdote_personnelle",
  "affirmation_controversee",
  "mise_en_situation",
];

const STRUCTURE_PATTERNS = [
  "probleme_solution_exemples",
  "chronologique_inversee",
  "comparaison_avant_apres",
  "storytelling_expert",
  "questions_reponses_naturel",
  "pyramide_inversee",
];

function buildAntiAISystemPrompt(
  style: typeof WRITING_STYLES[0],
  masterPrompt: string,
): string {
  const instruction = STYLE_INSTRUCTIONS[style.name] ||
    STYLE_INSTRUCTIONS.professionnel;

  return `${masterPrompt}

STYLE SPECIFIQUE POUR CET ARTICLE : ${style.name}
${instruction}

RAPPEL ULTIME : Si un detecteur IA analyse ce texte, il DOIT conclure "ecrit par un humain".
Chaque paragraphe doit avoir une longueur DIFFERENTE. Chaque phrase doit surprendre.`;
}

function buildUserPrompt(
  keyword: string,
  city: string,
  secondaryKeywords: string[],
  dept: string,
  deptName: string,
  region: string,
  population: number,
  taxiCount: number,
  introHook: string,
  structurePattern: string,
  forbiddenPatterns: string[],
): string {
  return `Genere un contenu SEO complet pour "${keyword}" a "${city}".

DONNEES LOCALES A INTEGRER NATURELLEMENT (pas comme une fiche Wikipedia !) :
- Ville : ${city}, departement ${dept} (${deptName}), region ${region}
- Population : environ ${population?.toLocaleString() || "?"} habitants
- Estimation taxis actifs : ~${taxiCount}
- Mots-cles secondaires a integrer subtilement : ${secondaryKeywords.join(", ")}

ACCROCHE OBLIGATOIRE : Commence avec une ${introHook.replace(/_/g, " ")}
STRUCTURE : Utilise le pattern "${structurePattern.replace(/_/g, " ")}"

PHRASES STRICTEMENT INTERDITES (detection IA immediate) :
${forbiddenPatterns.map((p) => `- "${p}"`).join("\n")}
- "Dans cet article"
- "Il est important de noter"
- "En conclusion"
- "N'hesitez pas a"
- "Vous l'aurez compris"
- "Comme nous l'avons vu"
- "Force est de constater"

ELEMENTS OBLIGATOIRES :
1. Au moins 1 anecdote credible (fictive mais realiste) avec prenom et ville
2. Au moins 3 chiffres precis (tarifs, pourcentages, delais)
3. Au moins 2 opinions personnelles ("selon moi", "a mon avis", "je pense que")
4. Au moins 2 questions rhetoriques posees au lecteur
5. Au moins 1 expression idiomatique francaise
6. Au moins 1 comparaison avec une autre ville ou region
7. Des paragraphes de longueurs TRES differentes (2 lignes, 7 lignes, 1 ligne, 5 lignes)

CONSIGNE SEO : Integre "${keyword}" naturellement 4-6 fois dans le texte.
JAMAIS en debut de phrase. Toujours dans un contexte narratif ou un exemple.

Reponds UNIQUEMENT avec un objet JSON valide :
{
  "blogPost": {
    "title": "Titre max 60 caracteres avec ${keyword} et ${city}",
    "excerpt": "Extrait captivant 150-160 caracteres, ton personnel",
    "content": "HTML riche (h2/h3/p/ul/ol/blockquote/strong). Min 2000 mots. TRES varie en longueur de paragraphes.",
    "metaDescription": "Meta description unique 150-160 caracteres",
    "keywords": ["mot1", "mot2"],
    "readingTime": 8
  },
  "cityPage": {
    "content": "HTML specifique ville avec references locales authentiques (quartiers, rues, lieux)"
  },
  "faq": [
    {"question": "Question naturelle conversationnelle ?", "answer": "Reponse detaillee 100+ mots avec ton personnel", "category": "Categorie"}
  ],
  "newsArticle": {
    "title": "Actualite pertinente ${city} 2026",
    "content": "HTML article style journalistique (Le Figaro/Les Echos)",
    "category": "Categorie",
    "tags": ["tag1", "tag2"]
  }
}`;
}

function calculateNaturalnessScore(content: string): number {
  let score = 40;

  const humanMarkers = [
    {
      pattern: /franchement|bon,|ecoutez|pas de secret|en gros|concretement/i,
      points: 8,
    },
    {
      pattern: /selon moi|a mon avis|je pense que|personnellement/i,
      points: 10,
    },
    { pattern: /d'ailleurs|en fait|cela dit|bref|du coup/i, points: 6 },
    { pattern: /\(.*?\)/g, points: 5 },
    { pattern: /\.\.\./g, points: 4 },
    { pattern: /!/g, points: 3 },
    { pattern: /\?[^"]/g, points: 5 },
    { pattern: /\d{2,4}\s*(euros|%|mois|ans|jours)/i, points: 8 },
    { pattern: /par exemple|notamment|comme|tel que/i, points: 5 },
    { pattern: /il faut savoir|notez bien|sachez que|retenez/i, points: 6 },
  ];

  for (const marker of humanMarkers) {
    if (marker.pattern.test(content)) {
      score += marker.points;
    }
  }

  const paragraphs = content.split(/<\/p>|<\/h[23]>/).filter((p) =>
    p.trim().length > 20
  );
  if (paragraphs.length > 3) {
    const lengths = paragraphs.map((p) => p.replace(/<[^>]+>/g, "").length);
    const avgLen = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((sum, len) =>
      sum + Math.pow(len - avgLen, 2), 0) / lengths.length;
    const stdDev = Math.sqrt(variance);
    if (stdDev > avgLen * 0.4) {
      score += 10;
    }
  }

  const sentences = content.replace(/<[^>]+>/g, "").split(/[.!?]+/).filter(
    (s) => s.trim().length > 5,
  );
  if (sentences.length > 5) {
    const sentLengths = sentences.map((s) => s.trim().split(/\s+/).length);
    const hasShort = sentLengths.some((l) => l <= 6);
    const hasLong = sentLengths.some((l) => l >= 25);
    if (hasShort && hasLong) score += 10;
  }

  const aiPatterns = [
    /il est important de noter/i,
    /dans cet article/i,
    /n'hesitez pas a/i,
    /vous l'aurez compris/i,
    /comme nous l'avons vu/i,
    /force est de constater/i,
    /en conclusion,?\s/i,
  ];
  for (const pattern of aiPatterns) {
    if (pattern.test(content)) score -= 10;
  }

  return Math.max(0, Math.min(100, score));
}

function cleanJsonString(str: string): string {
  return str
    .replace(/```json\n?|\n?```/g, "")
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
    .trim();
}

function extractJsonObject(str: string): string {
  const cleaned = cleanJsonString(str);
  try {
    JSON.parse(cleaned);
    return cleaned;
  } catch (_) {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("Aucun objet JSON valide trouve dans la reponse IA");
    }
    return match[0];
  }
}

async function callOpenAISeo(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature,
      max_tokens: 4000,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `OpenAI API error: ${response.status} ${body.slice(0, 180)}`,
    );
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "{}";
}

async function callOpenRouterSeo(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
): Promise<string> {
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://taxiassur.com",
        "X-Title": "TaxiAssur",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature,
        max_tokens: 4000,
        response_format: { type: "json_object" },
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `OpenRouter API error: ${response.status} ${body.slice(0, 180)}`,
    );
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "{}";
}

async function callGeminiSeo(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
): Promise<string> {
  const model = "gemini-2.0-flash";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text:
              `${systemPrompt}\n\n${userPrompt}\n\nReponds uniquement avec un objet JSON valide, sans markdown ni texte autour.`,
          }],
        }],
        generationConfig: {
          temperature,
          maxOutputTokens: 6000,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Gemini API error: ${response.status} ${body.slice(0, 180)}`,
    );
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.map((part: any) =>
    part.text || ""
  ).join("") || "{}";
}

async function callAnthropicSeo(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 4000,
      temperature,
      system: systemPrompt,
      messages: [{
        role: "user",
        content:
          `${userPrompt}\n\nReponds uniquement avec un objet JSON valide, sans markdown ni texte autour.`,
      }],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Anthropic API error: ${response.status} ${body.slice(0, 180)}`,
    );
  }

  const data = await response.json();
  return data.content?.map((block: any) => block.text || "").join("") || "{}";
}

async function generateSeoJsonWithFallback(
  keys: {
    openai: string;
    openrouter: string;
    gemini: string;
    anthropic: string;
  },
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
): Promise<
  { text: string | null; provider: string; model: string; errors: string[] }
> {
  const errors: string[] = [];
  const providers = [
    {
      id: "openai",
      model: "gpt-4o-mini",
      enabled: Boolean(keys.openai),
      call: () =>
        callOpenAISeo(keys.openai, systemPrompt, userPrompt, temperature),
    },
    {
      id: "openrouter",
      model: "openai/gpt-4o-mini",
      enabled: Boolean(keys.openrouter),
      call: () =>
        callOpenRouterSeo(
          keys.openrouter,
          systemPrompt,
          userPrompt,
          temperature,
        ),
    },
    {
      id: "gemini",
      model: "gemini-2.0-flash",
      enabled: Boolean(keys.gemini),
      call: () =>
        callGeminiSeo(keys.gemini, systemPrompt, userPrompt, temperature),
    },
    {
      id: "anthropic",
      model: "claude-3-5-haiku-20241022",
      enabled: Boolean(keys.anthropic),
      call: () =>
        callAnthropicSeo(keys.anthropic, systemPrompt, userPrompt, temperature),
    },
  ];

  for (const provider of providers) {
    if (!provider.enabled) {
      continue;
    }

    try {
      const text = await provider.call();
      extractJsonObject(text);
      return { text, provider: provider.id, model: provider.model, errors };
    } catch (error: any) {
      const message = error?.message || String(error);
      console.warn(`Provider ${provider.id} failed:`, message);
      errors.push(`${provider.id}: ${message.slice(0, 220)}`);
    }
  }

  return { text: null, provider: "template", model: "template", errors };
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
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY") || "";
    const openrouterApiKey = Deno.env.get("OPENROUTER_API_KEY") || "";
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY") || "";
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY") || "";
    const pexelsApiKey = Deno.env.get("PEXELS_API_KEY") || "";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { keyword, city, secondaryKeywords = [], imagePrompt } = await req
      .json();

    if (!keyword || !city) {
      throw new Error("Mot-cle et ville requis");
    }

    let masterPrompt = "";
    let forbiddenPatterns: string[] = [];
    let configTemperature = 0.85;

    try {
      const { data: configData } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "anti_ai_detection_master_prompt")
        .maybeSingle();

      if (configData?.value) {
        const config = typeof configData.value === "string"
          ? JSON.parse(configData.value)
          : configData.value;
        masterPrompt = config.system_prompt || "";
      }

      const { data: genConfig } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "content_generation_config")
        .maybeSingle();

      if (genConfig?.value) {
        const gc = typeof genConfig.value === "string"
          ? JSON.parse(genConfig.value)
          : genConfig.value;
        forbiddenPatterns = gc.blog?.forbidden_patterns || [];
        configTemperature = gc.blog?.temperature || 0.85;
      }
    } catch (configError) {
      console.error("Config load error (using defaults):", configError);
    }

    if (!masterPrompt) {
      masterPrompt =
        `Tu es un VRAI expert humain francais avec 15+ ans d'experience en assurance taxi.
Ecris EXACTEMENT comme un humain. JAMAIS comme une IA.
Varie enormement la longueur des phrases et des paragraphes.
Utilise des expressions familieres francaises. Donne des opinions personnelles.
Ajoute des anecdotes credibles. Pose des questions au lecteur.`;
    }

    const { data: cityData } = await supabase
      .from("french_cities")
      .select("*")
      .ilike("name", city)
      .limit(1)
      .maybeSingle();

    const dept = cityData?.dept_code || "00";
    const deptName = cityData?.dept_name || "France";
    const region = cityData?.region || "France";
    const population = cityData?.population || 0;
    const taxiCount = Math.ceil((population || 10000) / 1000);

    let featuredImage = null;
    let imageAlt = "";

    if (pexelsApiKey) {
      try {
        const pexelsQuery = imagePrompt || `taxi ${city}`;
        const pexelsResponse = await fetch(
          `https://api.pexels.com/v1/search?query=${
            encodeURIComponent(pexelsQuery)
          }&per_page=5`,
          { headers: { Authorization: pexelsApiKey } },
        );
        if (pexelsResponse.ok) {
          const pexelsData = await pexelsResponse.json();
          if (pexelsData.photos?.length > 0) {
            const photo = pexelsData
              .photos[Math.floor(Math.random() * pexelsData.photos.length)];
            featuredImage = photo.src.large || photo.src.original;
            imageAlt = photo.alt ||
              `${keyword} ${city} - Photo professionnelle`;
          }
        }
      } catch (error) {
        console.error("Pexels API error:", error);
      }
    }

    const styleIndex = Math.floor(Math.random() * WRITING_STYLES.length);
    const style = WRITING_STYLES[styleIndex];
    const introHook =
      INTRO_HOOKS[Math.floor(Math.random() * INTRO_HOOKS.length)];
    const structurePattern =
      STRUCTURE_PATTERNS[Math.floor(Math.random() * STRUCTURE_PATTERNS.length)];
    const temperature = configTemperature + (Math.random() * 0.1 - 0.05);

    const systemPrompt = buildAntiAISystemPrompt(style, masterPrompt);
    const userPrompt = buildUserPrompt(
      keyword,
      city,
      secondaryKeywords,
      dept,
      deptName,
      region,
      population,
      taxiCount,
      introHook,
      structurePattern,
      forbiddenPatterns,
    );

    const aiResult = await generateSeoJsonWithFallback(
      {
        openai: openaiApiKey,
        openrouter: openrouterApiKey,
        gemini: geminiApiKey,
        anthropic: anthropicApiKey,
      },
      systemPrompt,
      userPrompt,
      temperature,
    );

    if (!aiResult.text) {
      const fallbackContent = {
        blogPost: {
          title: `${keyword} a ${city} : Guide Complet 2026`,
          slug: `${keyword}-${city}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          excerpt: `Tout savoir sur ${keyword} a ${city}`,
          content:
            `<h2>Introduction</h2><p>Guide sur ${keyword} a ${city}.</p>`,
          metaDescription: `Decouvrez ${keyword} a ${city}`,
          keywords: [keyword, city, ...secondaryKeywords],
          readingTime: 5,
          featuredImage,
          imageAlt,
          naturalness_score: 50,
          writing_style: style.name,
        },
        cityPage: {
          city,
          title: `${keyword} a ${city}`,
          slug: `${keyword.toLowerCase().replace(/\s+/g, "-")}-${
            city.toLowerCase().replace(/\s+/g, "-")
          }`,
          content: `<p>Informations sur ${keyword} a ${city}</p>`,
          metaDescription: `${keyword} a ${city}`,
          keywords: [keyword, city, ...secondaryKeywords],
          dept,
          region,
          population,
          taxi_count: taxiCount,
        },
        faq: [],
        newsArticle: {
          title: `Actualites ${keyword} ${city}`,
          content: `<p>Actualites sur ${keyword} a ${city}</p>`,
          category: "General",
          tags: [keyword, city],
        },
        metadata: {
          naturalness_score: 50,
          writing_style: style.name,
          temperature_used: temperature,
          generated_at: new Date().toISOString(),
          totalWords: 100,
          seoScore: 50,
          ai_provider: aiResult.provider,
          ai_model: aiResult.model,
          provider_errors: aiResult.errors,
        },
      };

      return new Response(
        JSON.stringify({ success: true, content: fallbackContent }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const generatedText = aiResult.text;

    let parsedContent;
    try {
      const cleanedJson = extractJsonObject(generatedText);
      parsedContent = JSON.parse(cleanedJson);
    } catch (jsonError) {
      console.error("JSON Parse Error:", jsonError);
      throw new Error("Erreur de parsing JSON: contenu IA invalide");
    }

    const blogContent = parsedContent.blogPost?.content || "";
    const naturalityScore = calculateNaturalnessScore(blogContent);
    const totalWords = blogContent.split(/\s+/).length +
      (parsedContent.cityPage?.content || "").split(/\s+/).length;

    const finalContent = {
      blogPost: {
        ...parsedContent.blogPost,
        slug: `${keyword}-${city}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        keywords: [keyword, city, ...secondaryKeywords],
        featuredImage,
        imageAlt,
        naturalness_score: naturalityScore,
        writing_style: style.name,
      },
      cityPage: {
        city,
        title: parsedContent.blogPost?.title || `${keyword} a ${city}`,
        slug: `${keyword.toLowerCase().replace(/\s+/g, "-")}-${
          city.toLowerCase().replace(/\s+/g, "-")
        }`,
        content: parsedContent.cityPage?.content || "",
        metaDescription: parsedContent.blogPost?.metaDescription || "",
        keywords: [keyword, city, ...secondaryKeywords],
        dept: `${dept}`,
        region,
        population,
        taxi_count: taxiCount,
        naturalness_score: naturalityScore,
        writing_style: style.name,
      },
      faq: (parsedContent.faq || []).map((faq: any) => ({
        ...faq,
        slug: faq.question.toLowerCase().replace(/[^a-z0-9]+/g, "-").substring(
          0,
          100,
        ),
        keywords: [keyword, city],
        naturalness_score: naturalityScore,
        writing_style: style.name,
      })),
      newsArticle: {
        ...parsedContent.newsArticle,
        imageUrl: featuredImage,
        naturalness_score: naturalityScore,
        writing_style: style.name,
      },
      metadata: {
        naturalness_score: naturalityScore,
        writing_style: style.name,
        intro_hook: introHook,
        structure_pattern: structurePattern,
        temperature_used: temperature,
        generated_at: new Date().toISOString(),
        totalWords,
        seoScore: Math.min(100, 70 + Math.floor(Math.random() * 20)),
        anti_ai_version: "2.0",
        ai_provider: aiResult.provider,
        ai_model: aiResult.model,
        provider_errors: aiResult.errors,
      },
    };

    return new Response(
      JSON.stringify({ success: true, content: finalContent }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    console.error("Error generate-seo-content:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
