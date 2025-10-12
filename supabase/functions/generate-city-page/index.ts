import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const FRENCH_CITIES = [
  'Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg',
  'Montpellier', 'Bordeaux', 'Lille', 'Rennes', 'Reims', 'Saint-Étienne',
  'Toulon', 'Le Havre', 'Grenoble', 'Dijon', 'Angers', 'Nîmes', 'Villeurbanne',
  'Clermont-Ferrand', 'Le Mans', 'Aix-en-Provence', 'Brest', 'Tours',
  'Amiens', 'Limoges', 'Annecy', 'Perpignan', 'Boulogne-Billancourt',
  'Metz', 'Besançon', 'Orléans', 'Mulhouse', 'Rouen', 'Caen', 'Nancy',
  'Argenteuil', 'Montreuil', 'Saint-Denis', 'Roubaix', 'Tourcoing',
  'Avignon', 'Poitiers', 'Nanterre', 'Créteil', 'Versailles', 'Pau',
  'Courbevoie', 'Vitry-sur-Seine'
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { city } = await req.json();
    const targetCity = city || FRENCH_CITIES[Math.floor(Math.random() * FRENCH_CITIES.length)];

    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: existing } = await supabase
      .from('city_pages')
      .select('slug')
      .eq('city', targetCity)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ success: false, message: `La page pour ${targetCity} existe déjà`, slug: existing.slug }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cityPrices: Record<string, { min: number; max: number }> = {
      'Paris': { min: 2100, max: 2800 },
      'Lyon': { min: 1600, max: 2200 },
      'Marseille': { min: 1550, max: 2100 },
      'Toulouse': { min: 1450, max: 1950 },
      'Nice': { min: 1700, max: 2300 },
      'default': { min: 1200, max: 1800 }
    };

    const prices = cityPrices[targetCity] || cityPrices['default'];
    const randomMin = prices.min + Math.floor(Math.random() * 100);
    const randomMax = prices.max + Math.floor(Math.random() * 150);

    const tones = [
      'Ton local et proche. Tu connais bien la ville. Utilise "chez nous", "dans le coin".',
      'Ton expert local. Tu compares avec d\'autres villes. Utilise des chiffres précis.',
      'Ton conversationnel. Tu racontes des anecdotes de clients de cette ville.',
      'Ton pragmatique. Tu donnes des conseils spécifiques à la ville.'
    ];

    const selectedTone = tones[Math.floor(Math.random() * tones.length)];

    const prompt = `Tu es un courtier local spécialisé en assurance taxi à ${targetCity}.

ANTI-DÉTECTION IA :
- Écris comme un expert LOCAL qui connaît ${targetCity}
- Mentionne des QUARTIERS précis de ${targetCity}
- Compare avec les villes voisines
- Donne des chiffres PRÉCIS et VARIÉS (pas des multiples de 100)
- Utilise "franchement", "ici à ${targetCity}", "dans le coin", "chez nous"
- VARIE les longueurs de paragraphes
- ÉVITE : "il est important", "en conclusion", "il convient"

${selectedTone}

SPÉCIFICITÉS ${targetCity.toUpperCase()} :
- Prix moyen : ${randomMin}-${randomMax}€/an (varie selon quartier)
- Mentionne 3-4 quartiers/zones spécifiques de ${targetCity}
- Compare avec 2 villes proches
- Parle du trafic, des particularités locales

Structure (HTML VALIDE) :
1. <h2>Assurance taxi à ${targetCity} : ce qu'il faut savoir</h2>
2. <h2>Les vrais prix à ${targetCity}</h2>
3. <h2>Où trouver les meilleurs tarifs</h2>
4. <h2>Conseils pour les chauffeurs de ${targetCity}</h2>

Longueur : ${1400 + Math.floor(Math.random() * 500)} mots

FAQ LOCALE : ${4 + Math.floor(Math.random() * 3)} questions spécifiques à ${targetCity}

Format JSON STRICT :
{
  "title": "Assurance Taxi ${targetCity} - Prix et Devis (55-65 caractères)",
  "slug": "assurance-taxi-${targetCity.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}",
  "metaDescription": "Assurance taxi à ${targetCity} : prix ${randomMin}-${randomMax}€/an, devis gratuit",
  "content": "<h2>Premier titre</h2><p>Paragraphe...</p>",
  "keywords": ["assurance taxi ${targetCity}", "taxi ${targetCity}", "RC pro ${targetCity}"],
  "faq": [{"question": "Question sur ${targetCity} ?", "answer": "Réponse locale précise"}]
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Tu es Tissya, 42 ans, experte en assurance taxi basée à ${targetCity} depuis 15 ans.

PERSONNALITÉ :
- Tu connais ${targetCity} comme ta poche
- Tu cites des quartiers, des rues, des zones
- Tu compares avec d'autres villes que tu connais
- Tu racontes des histoires de clients locaux
- Tu écris naturellement, pas comme un robot

ANTI-DÉTECTION IA :
- Écris des paragraphes de longueurs VARIÉES
- Utilise des chiffres PRÉCIS (1847€, pas 1850€)
- Mentionne des LIEUX réels de ${targetCity}
- ZÉRO formule IA standard
- Ton LOCAL et authentique

HTML OBLIGATOIRE :
- Format <h2>, <p>, <strong>, <ul>, <li>
- JAMAIS de markdown
- JSON valide uniquement`
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.95,
        max_tokens: 3500,
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    const generatedContent = JSON.parse(data.choices[0].message.content);

    const baseSlug = `assurance-taxi-${targetCity.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    const { data: existingSlug } = await supabase
      .from('city_pages')
      .select('slug')
      .eq('slug', baseSlug)
      .maybeSingle();

    const finalSlug = existingSlug ? `${baseSlug}-${Date.now()}` : baseSlug;

    const cityPage = {
      city: targetCity,
      slug: finalSlug,
      title: generatedContent.title,
      content: generatedContent.content,
      meta_description: generatedContent.metaDescription,
      keywords: generatedContent.keywords || [`assurance taxi ${targetCity}`],
      status: 'published',
      published_at: new Date().toISOString(),
      faq: generatedContent.faq || []
    };

    const { data: insertedPage, error: insertError } = await supabase
      .from('city_pages')
      .upsert(cityPage, { onConflict: 'slug' })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to save city page:', insertError);
    } else {
      console.log(`✅ Page ville sauvegardée : ${targetCity}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        city: targetCity,
        content: generatedContent,
        saved: !insertError,
        slug: finalSlug,
        usage: { tokens: data.usage.total_tokens, cost: (data.usage.total_tokens / 1000000) * 2.5 }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});