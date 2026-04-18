import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const POST_TOPICS = [
  "les avantages de choisir un courtier specialise taxi pour son assurance",
  "comment reduire son budget assurance taxi sans perdre en garanties",
  "sinistre en taxi : les bons reflexes pour accelerer l'indemnisation",
  "assurance flotte taxi : pourquoi mutualiser fait gagner 20 a 30%",
  "jeune chauffeur taxi : comment obtenir une assurance a tarif juste",
  "RC professionnelle taxi : ce qu'elle couvre vraiment",
  "passer de VTC a taxi : les specificites assurance a connaitre",
  "taxi electrique : les garanties specifiques a verifier absolument",
  "resiliation assurance taxi : droits et delais expliques simplement",
  "assistance 0 km : pourquoi c'est indispensable pour un chauffeur taxi",
  "carte grise taxi : les mentions obligatoires pour l'assurance",
  "amendement N-15 : comment valoriser son historique sans sinistre",
  "grand froid et pneus hiver : impact sur votre contrat taxi",
  "double activite taxi-VTC : comment structurer son assurance",
  "taxi moto : specificites et pieges a eviter lors de la souscription"
];

const HASHTAG_POOLS = [
  ["#AssuranceTaxi", "#Taxi", "#TaxiAssur"],
  ["#ChauffeurTaxi", "#AssurancePro", "#Taxi"],
  ["#MobilityPro", "#AssuranceFrance", "#Taxi"],
  ["#TaxiParis", "#AssuranceTaxi", "#Mobilite"],
  ["#Courtage", "#AssuranceTaxi", "#Entrepreneur"]
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function generateWithOpenAI(topic: string, hashtags: string[]): Promise<string> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const prompt = `Tu es community manager pour TaxiAssur, courtier francais specialise en assurance taxi (site taxiassur.fr).
Ecris un post LinkedIn professionnel et engageant sur le sujet suivant : "${topic}".

Regles strictes:
- 3 a 5 paragraphes courts separes par des sauts de ligne
- Ton professionnel mais chaleureux, axe conseil concret
- Aucune promesse exageree, aucune garantie chiffree que tu ne peux pas verifier
- Termine par un appel a l'action simple vers taxiassur.fr
- Ajoute les hashtags suivants a la fin : ${hashtags.join(" ")}
- N'utilise AUCUN emoji
- 150 a 220 mots maximum
- N'ecris rien d'autre que le post lui-meme, pas de preambule ni d'explication`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Tu es un community manager specialise BtoB francais." },
        { role: "user", content: prompt }
      ],
      temperature: 0.8,
      max_tokens: 600,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI error: ${errText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("OpenAI returned empty content");
  return content;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch (_e) { body = {}; }

    const publishNow = body.publish_now !== false;
    const customTopic = typeof body.topic === "string" ? body.topic : null;

    const { data: network, error: netErr } = await supabase
      .from("social_networks")
      .select("id")
      .eq("platform", "linkedin")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (netErr || !network) {
      throw new Error("No active LinkedIn network found");
    }

    const topic = customTopic ?? pickRandom(POST_TOPICS);
    const hashtags = pickRandom(HASHTAG_POOLS);

    const content = await generateWithOpenAI(topic, hashtags);

    const { data: existing } = await supabase
      .from("social_posts")
      .select("id")
      .eq("platform", "linkedin")
      .eq("content", content)
      .limit(1)
      .maybeSingle();

    if (existing) {
      throw new Error("Generated content is a duplicate of an existing post, retry");
    }

    const { data: inserted, error: insertErr } = await supabase
      .from("social_posts")
      .insert({
        network_id: network.id,
        platform: "linkedin",
        network: "linkedin",
        content,
        hashtags,
        status: "scheduled",
        scheduled_at: new Date().toISOString(),
        ai_generated: true,
        ai_model: "gpt-4o-mini",
      })
      .select("id")
      .single();

    if (insertErr || !inserted) {
      throw new Error(`Failed to insert post: ${insertErr?.message}`);
    }

    let publishResult: unknown = null;

    if (publishNow) {
      const publishResp = await fetch(
        `${supabaseUrl}/functions/v1/linkedin-auto-publisher`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ post_id: inserted.id }),
        }
      );
      publishResult = await publishResp.json();
    }

    try {
      await supabase.from("automation_logs").insert({
        automation_name: "linkedin_ai_content_generator",
        status: "success",
        message: `Generated LinkedIn post ${inserted.id} (topic: ${topic.slice(0, 60)})`,
      });
    } catch (_e) { /* ignore */ }

    return new Response(
      JSON.stringify({
        success: true,
        post_id: inserted.id,
        topic,
        published: publishNow,
        publish_result: publishResult,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("linkedin-ai-content-generator error:", message);

    try {
      await supabase.from("automation_logs").insert({
        automation_name: "linkedin_ai_content_generator",
        status: "error",
        message: message.slice(0, 1000),
      });
    } catch (_e) { /* ignore */ }

    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
