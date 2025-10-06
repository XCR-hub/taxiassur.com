import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { keyword, type, city, secondaryKeywords } = await req.json();

    if (!keyword) {
      return new Response(
        JSON.stringify({ error: 'Keyword is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const contentType = type || 'blog';
    const targetCity = city || 'France';
    const secondary = secondaryKeywords || [];

    let prompt = '';

    if (contentType === 'blog') {
      prompt = `Génère un article de blog SEO-optimisé sur "${keyword}" pour un site d'assurance taxi.

Le site s'appelle TaxiAssur.com, courtier ORIAS agréé spécialisé en assurance taxi.

Contraintes SEO strictes :
- Titre H1 accrocheur avec le mot-clé principal au début
- 1800-2200 mots (article long pour SEO)
- Structure : Introduction, 5-6 sections H2, Conclusion
- Chaque section H2 avec 2-3 paragraphes de 100-150 mots
- Inclure des listes à puces et numérotées
- FAQ à la fin (5 questions/réponses)
- Meta description SEO de 155 caractères
- Mots-clés secondaires : ${secondary.join(', ')}
- Densité mot-clé principal : 1-2%
- Ton professionnel mais accessible
- Inclure chiffres et statistiques réelles du marché
- CTA (Call-to-Action) tous les 400 mots : "Découvrez nos tarifs" ou "Devis gratuit en 2 min"

Données contextuelles :
- Prix moyen assurance taxi : 1200-2400€/an selon ville
- Économie moyenne : 35% vs concurrents
- RC Pro obligatoire pour taxis
- Délai attestation : 15 minutes
- Courtier ORIAS : garantie légale

Réponds UNIQUEMENT en JSON valide (pas de markdown) :
{
  "title": "Titre H1 optimisé SEO",
  "slug": "url-friendly-slug",
  "metaDescription": "Description 155 caractères max",
  "content": "Contenu complet en HTML avec balises <h2>, <p>, <ul>, <strong>",
  "excerpt": "Résumé de 2 lignes",
  "faq": [
    {"question": "...", "answer": "..."}
  ],
  "keywords": ["mot-clé 1", "mot-clé 2"],
  "readingTime": 8,
  "category": "guides"
}`;
    } else if (contentType === 'city') {
      prompt = `Génère une page ville complète pour "${keyword} à ${targetCity}" pour un site d'assurance taxi.

Contraintes :
- Titre H1 : "${keyword} à ${targetCity} : Devis Gratuit en 2 Min"
- 1200-1500 mots
- Sections : Introduction, Tarifs locaux, Spécificités ville, Procédure, Avantages, FAQ
- Inclure statistiques locales (nombre de taxis, réglementation)
- Comparatif prix vs autres villes
- Meta description géolocalissée

Réponds UNIQUEMENT en JSON valide :
{
  "title": "...",
  "slug": "...",
  "metaDescription": "...",
  "content": "...",
  "localData": {
    "averagePrice": "1800€/an",
    "taxiCount": "12000",
    "specificRules": ["..."]
  },
  "faq": [...]
}`;
    } else if (contentType === 'comparison') {
      prompt = `Génère un comparatif détaillé "${keyword}".

Format :
- Titre H1 comparatif
- Tableau comparatif HTML
- Analyse point par point
- Recommandation finale
- 1000-1500 mots

Réponds UNIQUEMENT en JSON valide :
{
  "title": "...",
  "slug": "...",
  "metaDescription": "...",
  "content": "...",
  "comparisonTable": "<table>...</table>",
  "conclusion": "..."
}`;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Tu es un expert en rédaction SEO et assurance professionnelle. Tu génères du contenu optimisé pour le référencement naturel. Tu réponds UNIQUEMENT en JSON valide, sans markdown ni balises de code.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API Error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to generate content' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const data = await response.json();
    const generatedContent = JSON.parse(data.choices[0].message.content);

    return new Response(
      JSON.stringify({
        success: true,
        content: generatedContent,
        usage: {
          tokens: data.usage.total_tokens,
          cost: (data.usage.total_tokens / 1000000) * 2.5
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});