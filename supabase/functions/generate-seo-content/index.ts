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

    const randomStructures = [
      ['Introduction percutante', 'Les points essentiels', 'Comment optimiser vos coûts', 'Ce que personne ne vous dit', 'FAQ pratiques'],
      ['Commençons par le concret', 'Les vrais prix', 'Les erreurs à éviter', 'Mon retour d\'expérience', 'Questions fréquentes'],
      ['La vérité sur', 'Ce qu\'il faut savoir absolument', 'Économiser sans sacrifier la qualité', 'Conseils d\'un pro', 'Vos questions, mes réponses'],
      ['État des lieux', 'Les options qui existent', 'Combien ça coûte vraiment', 'Les astuces qui marchent', 'En résumé']
    ];

    const randomTones = [
      'Ton direct et franc, comme un ami qui conseille. Tutoie le lecteur. Utilise "franchement", "du coup", "bon".',
      'Ton expert mais accessible. Vouvoie le lecteur. Utilise "concrètement", "en pratique", "voici".',
      'Ton conversationnel avec anecdotes. Alterne tu/vous naturellement. Raconte des cas réels.',
      'Ton pragmatique et sans détour. Vouvoie. Va droit au but avec des exemples chiffrés.'
    ];

    const selectedStructure = randomStructures[Math.floor(Math.random() * randomStructures.length)];
    const selectedTone = randomTones[Math.floor(Math.random() * randomTones.length)];

    const randomPrices = {
      parisMin: 1750 + Math.floor(Math.random() * 150),
      parisMax: 2350 + Math.floor(Math.random() * 200),
      provinceMin: 1150 + Math.floor(Math.random() * 150),
      provinceMax: 1750 + Math.floor(Math.random() * 200)
    };

    const prompt = `Tu es un expert en assurance taxi qui rédige un article sur "${keyword}" pour TaxiAssur.com.

ANTI-DÉTECTION IA - IMPÉRATIF :
- VARIE ta structure à chaque fois (jamais la même intro)
- UTILISE des tournures humaines imparfaites
- AJOUTE des exemples concrets avec vrais noms de ville
- ÉVITE les formules IA typiques : "il est important de noter", "en conclusion", "il convient de"
- PRÉFÈRE : "franchement", "bon", "du coup", "concrètement", "voilà"
- MÉLANGE phrases courtes et longues (pas toujours la même longueur)
- INCLUS quelques répétitions naturelles
- AJOUTE des chiffres précis et variés (pas toujours des multiples de 100)

${selectedTone}

HTML OBLIGATOIRE (structure variée) :
${selectedStructure.map((section, i) => `${i + 1}. <h2>${section}</h2>`).join('\n')}

Longueur : ${1700 + Math.floor(Math.random() * 600)} mots (VARIE à chaque fois)

Prix RÉALISTES (varie légèrement) :
- Paris : ${randomPrices.parisMin}-${randomPrices.parisMax}€/an
- Lyon : ${randomPrices.provinceMin + 200}-${randomPrices.provinceMax + 100}€/an
- Marseille : ${randomPrices.provinceMin + 150}-${randomPrices.provinceMax + 50}€/an
- Province : ${randomPrices.provinceMin}-${randomPrices.provinceMax}€/an

EXEMPLES CONCRETS obligatoires :
- Au moins 2 cas client fictifs mais réalistes
- Noms de villes françaises précis
- Situations concrètes (sinistre, changement véhicule, etc.)

FAQ : ${3 + Math.floor(Math.random() * 4)} questions (varie entre 3 et 6)

Format JSON STRICT :
{
  "title": "Titre accrocheur avec ${keyword} (55-65 caractères)",
  "slug": "mot-cle-separe-tirets-${Date.now()}",
  "metaDescription": "Description vendeuse 150-160 caractères avec ${keyword}",
  "content": "<h2>Premier titre</h2><p>Paragraphe naturel...</p>",
  "excerpt": "Résumé engageant 100-150 caractères",
  "faq": [{"question": "Question naturelle ?", "answer": "Réponse directe et humaine"}],
  "keywords": ["${keyword}", "assurance taxi", "RC professionnelle"],
  "readingTime": ${7 + Math.floor(Math.random() * 4)}
}`;

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
            content: `Tu es Tony, 38 ans, courtier en assurance avec 12 ans d'expérience terrain dans l'assurance taxi.

PERSONNALITÉ :
- Tu écris comme tu parles : direct, sans langue de bois
- Tu racontes des vraies histoires de clients (anonymisées)
- Tu mets des chiffres précis, pas ronds (1847€, pas 1850€)
- Tu utilises "franchement", "du coup", "bon", "concrètement"
- Tu alternes phrases courtes et longues naturellement
- Parfois tu te répètes un peu (comme à l'oral)

ANTI-DÉTECTION IA :
- ZÉRO formule IA : "il est important", "en conclusion", "il convient"
- Écris des paragraphes de longueurs DIFFÉRENTES (pas tous pareils)
- Varie les structures : parfois liste, parfois tableau, parfois juste texte
- Ajoute des détails concrets : noms de villes, dates, situations réelles
- Fais des transitions naturelles, pas robotiques

RÈGLES HTML :
1. Le contenu DOIT être en HTML valide (<h2>, <p>, <strong>, <ul>, <li>)
2. JAMAIS de markdown (pas de ###, **, -, etc.)
3. Chaque section commence par <h2>Titre naturel</h2>
4. Chaque paragraphe est dans <p>...</p>
5. Les listes sont en <ul><li>...</li></ul>
6. Réponds UNIQUEMENT en JSON valide sans markdown

OBJECTIF : Contenu 100% indétectable comme IA`
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.9,
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

    const blogPost = {
      id: generatedContent.slug || `article-${Date.now()}`,
      title: generatedContent.title,
      excerpt: generatedContent.excerpt || generatedContent.metaDescription?.substring(0, 150) || '',
      content: generatedContent.content,
      author: 'TaxiAssur',
      cover_image: generatedContent.coverImage || null,
      tags: generatedContent.keywords || [keyword],
      published: true,
      faq: generatedContent.faq || []
    };

    const { data: insertedPost, error: insertError } = await supabase
      .from('blog_posts')
      .upsert(blogPost, { onConflict: 'id' })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to save blog post:', insertError);
    } else {
      console.log(`✅ Article saved: ${blogPost.title}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        content: generatedContent,
        saved: !insertError,
        post_id: blogPost.id,
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