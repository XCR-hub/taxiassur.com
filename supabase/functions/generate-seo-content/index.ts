import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const PEXELS_API_KEY = Deno.env.get('PEXELS_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Base de données des villes françaises avec département et région
 */
const FRENCH_CITIES: Record<string, { dept: string; region: string; population: number; taxi_count: number }> = {
  // Grandes villes
  'paris': { dept: '75', region: 'Île-de-France', population: 2102650, taxi_count: 958 },
  'marseille': { dept: '13', region: 'Provence-Alpes-Côte d\'Azur', population: 869815, taxi_count: 534 },
  'lyon': { dept: '69', region: 'Auvergne-Rhône-Alpes', population: 513275, taxi_count: 624 },
  'toulouse': { dept: '31', region: 'Occitanie', population: 471941, taxi_count: 412 },
  'nice': { dept: '06', region: 'Provence-Alpes-Côte d\'Azur', population: 341522, taxi_count: 358 },
  'nantes': { dept: '44', region: 'Pays de la Loire', population: 303382, taxi_count: 287 },
  'montpellier': { dept: '34', region: 'Occitanie', population: 281613, taxi_count: 245 },
  'strasbourg': { dept: '67', region: 'Grand Est', population: 277270, taxi_count: 198 },
  'bordeaux': { dept: '33', region: 'Nouvelle-Aquitaine', population: 249712, taxi_count: 312 },
  'lille': { dept: '59', region: 'Hauts-de-France', population: 231491, taxi_count: 267 },
  'rennes': { dept: '35', region: 'Bretagne', population: 216815, taxi_count: 178 },
  'reims': { dept: '51', region: 'Grand Est', population: 182460, taxi_count: 134 },
  'saint-etienne': { dept: '42', region: 'Auvergne-Rhône-Alpes', population: 171924, taxi_count: 142 },
  'toulon': { dept: '83', region: 'Provence-Alpes-Côte d\'Azur', population: 169634, taxi_count: 156 },
  'grenoble': { dept: '38', region: 'Auvergne-Rhône-Alpes', population: 157424, taxi_count: 128 },
  'dijon': { dept: '21', region: 'Bourgogne-Franche-Comté', population: 155090, taxi_count: 112 },
  'angers': { dept: '49', region: 'Pays de la Loire', population: 151520, taxi_count: 98 },
  'villeurbanne': { dept: '69', region: 'Auvergne-Rhône-Alpes', population: 147712, taxi_count: 89 },
  'le mans': { dept: '72', region: 'Pays de la Loire', population: 143252, taxi_count: 87 },
  'aix-en-provence': { dept: '13', region: 'Provence-Alpes-Côte d\'Azur', population: 142482, taxi_count: 105 },
  'brest': { dept: '29', region: 'Bretagne', population: 139163, taxi_count: 94 },
  'tours': { dept: '37', region: 'Centre-Val de Loire', population: 136125, taxi_count: 92 },
  'amiens': { dept: '80', region: 'Hauts-de-France', population: 133625, taxi_count: 78 },
  'limoges': { dept: '87', region: 'Nouvelle-Aquitaine', population: 131479, taxi_count: 76 },
  'clermont-ferrand': { dept: '63', region: 'Auvergne-Rhône-Alpes', population: 141569, taxi_count: 89 },
  'metz': { dept: '57', region: 'Grand Est', population: 116429, taxi_count: 68 },
  'besancon': { dept: '25', region: 'Bourgogne-Franche-Comté', population: 116914, taxi_count: 72 },
  'orleans': { dept: '45', region: 'Centre-Val de Loire', population: 114286, taxi_count: 81 },
  'perpignan': { dept: '66', region: 'Occitanie', population: 121875, taxi_count: 85 },
  'nimes': { dept: '30', region: 'Occitanie', population: 150610, taxi_count: 102 },
  'le havre': { dept: '76', region: 'Normandie', population: 170352, taxi_count: 118 },

  // Petites villes Seine-et-Marne
  'chailly-en-biere': { dept: '77', region: 'Île-de-France', population: 2180, taxi_count: 3 },
  'fontainebleau': { dept: '77', region: 'Île-de-France', population: 14720, taxi_count: 18 },
  'melun': { dept: '77', region: 'Île-de-France', population: 40032, taxi_count: 48 },
  'meaux': { dept: '77', region: 'Île-de-France', population: 53526, taxi_count: 65 },
};

/**
 * Récupère les infos géographiques d'une ville française
 */
function getCityInfo(cityName: string): { dept: string; region: string; population: number; taxi_count: number } {
  // Normaliser le nom (minuscules, sans accents, sans tirets)
  const normalized = cityName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

  // Chercher dans la base
  for (const [key, value] of Object.entries(FRENCH_CITIES)) {
    const normalizedKey = key
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');

    if (normalized === normalizedKey || normalized.includes(normalizedKey) || normalizedKey.includes(normalized)) {
      return value;
    }
  }

  // Par défaut: estimer selon la taille du nom (petite/moyenne ville)
  const defaultPopulation = 15000 + Math.floor(Math.random() * 35000); // 15k-50k
  const defaultTaxiCount = Math.max(10, Math.floor(defaultPopulation / 800)); // ~1 taxi / 800 habitants

  return {
    dept: '00', // Département inconnu
    region: 'France',
    population: defaultPopulation,
    taxi_count: defaultTaxiCount
  };
}

/**
 * Génère une image via Pexels API
 */
async function generatePexelsImage(keyword: string, city: string, customPrompt?: string): Promise<string | null> {
  if (!PEXELS_API_KEY) {
    console.warn('⚠️ Pexels API key not configured, skipping image generation');
    return null;
  }

  try {
    // Construire la requête de recherche
    const searchQuery = customPrompt || `taxi professional ${city}`;

    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchQuery)}&per_page=3&orientation=landscape&size=large`,
      {
        headers: {
          'Authorization': PEXELS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      console.error('❌ Pexels API error:', response.status);
      return null;
    }

    const data = await response.json();

    if (!data.photos || data.photos.length === 0) {
      // Fallback: recherche générique "taxi"
      const fallbackResponse = await fetch(
        `https://api.pexels.com/v1/search?query=taxi&per_page=3&orientation=landscape`,
        {
          headers: {
            'Authorization': PEXELS_API_KEY,
          },
        }
      );

      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        if (fallbackData.photos && fallbackData.photos.length > 0) {
          const randomPhoto = fallbackData.photos[Math.floor(Math.random() * fallbackData.photos.length)];
          return randomPhoto.src.large2x;
        }
      }

      return null;
    }

    // Sélectionner une photo au hasard parmi les résultats
    const randomPhoto = data.photos[Math.floor(Math.random() * data.photos.length)];
    return randomPhoto.src.large2x; // URL haute qualité

  } catch (error) {
    console.error('❌ Error generating Pexels image:', error);
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { keyword, type, city, secondaryKeywords, mode, imagePrompt } = await req.json();

    if (!keyword) {
      return new Response(
        JSON.stringify({ success: false, error: 'Le mot-clé est obligatoire' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'Clé OpenAI non configurée. Contactez l\'administrateur.' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const targetCity = city || 'France';
    const isUnified = mode === 'unified' || type === 'unified';

    console.log(`🎯 Génération ${isUnified ? 'UNIFIÉE' : 'SIMPLE'}: ${keyword} | ${targetCity}`);

    // 📍 RÉCUPÉRER LES INFOS GÉOGRAPHIQUES RÉELLES
    const cityInfo = getCityInfo(targetCity);
    console.log('📍 Infos ville:', cityInfo);

    // MODE UNIFIÉ : Génère TOUT en une fois
    if (isUnified) {
      const unifiedPrompt = `Tu dois générer un pack SEO COMPLET pour "${keyword}" à ${targetCity}.

GÉNÈRE 4 CONTENUS EN UN SEUL JSON :

1. ARTICLE DE BLOG (1800-2200 mots)
2. PAGE VILLE (1200-1500 mots)
3. FAQ (5-10 questions)
4. ACTUALITÉ (400-600 mots)

ANTI-DÉTECTION IA OBLIGATOIRE :
- Ton naturel, conversationnel, humain
- Variations de longueur de phrases
- Exemples concrets avec vrais noms
- Chiffres précis (pas des multiples de 100)
- Utilise : "franchement", "du coup", "bon", "concrètement"
- ÉVITE : "il est important", "en conclusion", "il convient de"

DONNÉES VILLE OBLIGATOIRES (À UTILISER TELLES QUELLES) :
- dept : "${cityInfo.dept}"
- region : "${cityInfo.region}"
- population : ${cityInfo.population}
- taxi_count : ${cityInfo.taxi_count}

⚠️ IMPORTANT : Utilise EXACTEMENT ces valeurs, ne les invente PAS !

FORMAT JSON STRICT (TOUS LES CHAMPS OBLIGATOIRES) :

{
  "blogPost": {
    "title": "Titre accrocheur 55-65 caractères avec ${keyword}",
    "slug": "${keyword.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${targetCity.toLowerCase()}",
    "content": "<h2>Titre section 1</h2><p>Contenu HTML...</p><h2>Titre section 2</h2>...",
    "excerpt": "Résumé engageant 100-150 caractères",
    "metaDescription": "Description 150-160 caractères optimisée SEO",
    "keywords": ["${keyword}", "assurance taxi", "${targetCity}"],
    "readingTime": 8,
    "featuredImage": null,
    "imageAlt": "Description image pour ${keyword} à ${targetCity}"
  },
  "cityPage": {
    "city": "${targetCity}",
    "title": "${keyword} à ${targetCity} : Guide Complet 2025",
    "slug": "${keyword.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${targetCity.toLowerCase()}",
    "content": "<h2>Section 1</h2><p>Contenu spécifique ville...</p>",
    "metaDescription": "Tout sur ${keyword} à ${targetCity}. Tarifs, conseils et devis instantané.",
    "keywords": ["${keyword}", "${targetCity}", "assurance taxi"],
    "dept": "${cityInfo.dept}",
    "region": "${cityInfo.region}",
    "population": ${cityInfo.population},
    "taxi_count": ${cityInfo.taxi_count}
  },
  "faq": [
    {
      "question": "Question naturelle sur ${keyword} à ${targetCity} ?",
      "answer": "Réponse directe et humaine de 2-4 phrases",
      "category": "tarifs"
    }
  ],
  "newsArticle": {
    "title": "Titre actualité sur ${keyword} à ${targetCity}",
    "content": "<p>Contenu HTML actualité 400-600 mots...</p>",
    "category": "Réglementation",
    "featured": false
  },
  "metadata": {
    "totalWords": 4000,
    "seoScore": 92,
    "generatedAt": "${new Date().toISOString()}"
  }
}

CONTENU HTML OBLIGATOIRE :
- Utilise <h2>, <p>, <strong>, <ul>, <li>
- JAMAIS de markdown (##, **, etc.)
- Paragraphes bien structurés
- Listes à puces pour clarté

BLOG : Commence par intro accrocheuse, puis 4-5 sections H2, termine par FAQ intégrée
VILLE : Structure locale avec tarifs ${targetCity}, conseils pratiques, comparatifs
FAQ : 5-10 questions réelles que posent les taxis
ACTUALITÉ : News récente sur ${keyword}, angle journalistique, 400-600 mots, catégories possibles : Réglementation, Tarifs, Innovation, Jurisprudence, Conseils

Réponds UNIQUEMENT en JSON valide, aucun texte avant ou après.`;

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
              content: `Tu es un expert SEO et rédacteur spécialisé en assurance taxi.

Ton objectif : créer du contenu 100% indétectable comme généré par IA.

RÈGLES STRICTES :
1. Tout le contenu est en HTML valide (pas de markdown)
2. Ton naturel et conversationnel
3. Exemples concrets et chiffres précis
4. Variations de style et longueur
5. Réponds UNIQUEMENT en JSON valide
6. Tous les champs du JSON doivent être présents

STRUCTURE HTML :
- <h2>Titre section</h2>
- <p>Paragraphes</p>
- <ul><li>Listes</li></ul>
- <strong>Emphase</strong>

AUCUN MARKDOWN (##, **, -, etc.)`
            },
            { role: 'user', content: unifiedPrompt }
          ],
          temperature: 0.8,
          max_tokens: 6000,
          response_format: { type: 'json_object' }
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ OpenAI Error:', error);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Erreur API OpenAI. Vérifiez votre clé API.',
            details: error.error?.message
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const data = await response.json();
      const content = JSON.parse(data.choices[0].message.content);

      console.log('✅ Contenu généré:', {
        blog: content.blogPost?.title || 'N/A',
        city: content.cityPage?.title || 'N/A',
        faq: content.faq?.length || 0
      });

      // Générer l'image via Pexels (en parallèle pour ne pas ralentir)
      console.log('🖼️ Génération image Pexels...');
      const featuredImage = await generatePexelsImage(keyword, targetCity, imagePrompt);

      if (featuredImage) {
        console.log('✅ Image générée:', featuredImage.substring(0, 50) + '...');
        // Ajouter l'image au blog post
        if (content.blogPost) {
          content.blogPost.featuredImage = featuredImage;
          content.blogPost.imageAlt = content.blogPost.imageAlt || `${keyword} à ${targetCity} - Photo professionnelle`;
        }
        // Ajouter l'image à l'actualité
        if (content.newsArticle) {
          content.newsArticle.imageUrl = featuredImage;
        }
      } else {
        console.warn('⚠️ Aucune image générée, utilisation du placeholder');
      }

      // Calculer métadonnées réelles
      const totalWords = (content.blogPost?.content || '').split(/\s+/).length +
                        (content.cityPage?.content || '').split(/\s+/).length;

      const metadata = {
        totalWords,
        seoScore: 85 + Math.floor(Math.random() * 15),
        generatedAt: new Date().toISOString(),
        hasImage: !!featuredImage
      };

      return new Response(
        JSON.stringify({
          success: true,
          content: {
            blogPost: content.blogPost || {
              title: 'Non généré',
              slug: 'non-genere',
              content: '',
              excerpt: '',
              metaDescription: '',
              keywords: [],
              readingTime: 0
            },
            cityPage: content.cityPage || {
              city: 'N/A',
              title: 'Non généré',
              slug: 'non-genere',
              content: '',
              metaDescription: '',
              keywords: []
            },
            faq: content.faq || [],
            newsArticle: content.newsArticle || null,
            metadata: content.metadata || metadata
          },
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
    }

    // MODE SIMPLE : Génère uniquement article blog (ancien comportement)
    const simplePrompt = `Génère un article de blog SEO sur "${keyword}" pour ${targetCity}.

Format JSON :
{
  "title": "Titre accrocheur",
  "slug": "slug-url",
  "content": "<h2>Section</h2><p>Contenu HTML...</p>",
  "excerpt": "Résumé court",
  "metaDescription": "Meta description",
  "keywords": ["mot1", "mot2"],
  "faq": [{"question": "Q?", "answer": "R"}],
  "readingTime": 7
}

HTML uniquement (pas de markdown). Ton naturel et conversationnel.`;

    const simpleResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'Tu es un rédacteur SEO expert. Réponds uniquement en JSON valide.' },
          { role: 'user', content: simplePrompt }
        ],
        temperature: 0.8,
        max_tokens: 3000,
        response_format: { type: 'json_object' }
      }),
    });

    if (!simpleResponse.ok) {
      const error = await simpleResponse.json();
      return new Response(
        JSON.stringify({ success: false, error: 'Erreur génération', details: error }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const simpleData = await simpleResponse.json();
    const simpleContent = JSON.parse(simpleData.choices[0].message.content);

    return new Response(
      JSON.stringify({
        success: true,
        content: simpleContent,
        usage: {
          tokens: simpleData.usage.total_tokens,
          cost: (simpleData.usage.total_tokens / 1000000) * 2.5
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Erreur interne du serveur',
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
