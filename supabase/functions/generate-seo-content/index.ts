import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY') || '';
    const pexelsApiKey = Deno.env.get('PEXELS_API_KEY') || '';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { keyword, city, secondaryKeywords = [], imagePrompt } = await req.json();

    if (!keyword || !city) {
      throw new Error('Mot-clé et ville requis');
    }

    const cityInfo = await supabase.rpc('get_city_info', { city_name: city });

    const dept = cityInfo.data?.[0]?.dept_code || '00';
    const deptName = cityInfo.data?.[0]?.dept_name || 'France';
    const region = cityInfo.data?.[0]?.region || 'France';
    const population = cityInfo.data?.[0]?.population || 0;
    const taxiCount = Math.ceil((population || 10000) / 1000);

    let featuredImage = null;
    let imageAlt = '';

    if (pexelsApiKey) {
      try {
        const pexelsQuery = imagePrompt || `taxi ${city}`;
        const pexelsResponse = await fetch(
          `https://api.pexels.com/v1/search?query=${encodeURIComponent(pexelsQuery)}&per_page=5`,
          {
            headers: {
              'Authorization': pexelsApiKey,
            },
          }
        );

        if (pexelsResponse.ok) {
          const pexelsData = await pexelsResponse.json();
          if (pexelsData.photos && pexelsData.photos.length > 0) {
            const photo = pexelsData.photos[0];
            featuredImage = photo.src.large || photo.src.original;
            imageAlt = photo.alt || `Photo ${keyword} ${city}`;
          }
        }
      } catch (error) {
        console.error('Pexels API error:', error);
      }
    }

    if (!openaiApiKey) {
      const mockContent = {
        blogPost: {
          title: `${keyword} à ${city} : Guide Complet 2025`,
          slug: `${keyword}-${city}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          excerpt: `Découvrez tout ce qu'il faut savoir sur ${keyword} à ${city}.`,
          content: `<h2>Introduction</h2><p>Découvrez ${keyword} à ${city}.</p>`,
          metaDescription: `Guide complet ${keyword} à ${city}`,
          keywords: [keyword, city, ...secondaryKeywords],
          readingTime: 5,
          featuredImage,
          imageAlt,
        },
        cityPage: {
          city,
          title: `${keyword} à ${city} : Guide Complet 2025`,
          slug: `${keyword}-${city}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          content: `<h2>À propos de ${city}</h2><p>${city} est une ville ${region ? 'de ' + region : 'française'}.</p>`,
          metaDescription: `${keyword} à ${city}`,
          keywords: [keyword, city],
          dept: `${dept}`,
          region: region || 'France',
          population: population || 0,
          taxi_count: taxiCount,
        },
        faq: Array.from({ length: 5 }, (_, i) => ({
          question: `Question ${i + 1} sur ${keyword} à ${city} ?`,
          answer: `Réponse ${i + 1} concernant ${keyword} à ${city}.`,
          category: 'Général',
        })),
        newsArticle: {
          title: `Actualité ${keyword} à ${city}`,
          content: `<p>Dernières actualités sur ${keyword} à ${city}.</p>`,
          imageUrl: featuredImage,
          category: 'Réglementation',
          tags: [keyword, city],
          featured: false,
        },
      };

      return new Response(JSON.stringify({ success: true, content: mockContent }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `Tu es un expert en assurance taxi et en SEO. Génère du contenu optimisé, naturel et humain pour ${keyword} à ${city} (${dept} - ${deptName}, ${region}).`;

    const userPrompt = `Génère un contenu SEO complet pour "${keyword}" à "${city}".

Informations ville :
- Département : ${dept} - ${deptName}
- Région : ${region}
- Population : ${population?.toLocaleString() || 'Non disponible'}
- Nombre estimé de taxis : ${taxiCount}

Mots-clés secondaires : ${secondaryKeywords.join(', ')}

Réponds UNIQUEMENT en JSON valide avec :
{
  "blogPost": {
    "title": "titre optimisé",
    "excerpt": "extrait 150 caractères",
    "content": "HTML avec h2/h3/p/ul",
    "metaDescription": "150 caractères",
    "keywords": ["mot1", "mot2"],
    "readingTime": 5
  },
  "cityPage": {
    "content": "HTML spécifique ville"
  },
  "faq": [
    {"question": "...", "answer": "...", "category": "..."}
  ],
  "newsArticle": {
    "title": "actualité récente",
    "content": "HTML article",
    "category": "Réglementation",
    "tags": ["tag1", "tag2"]
  }
}`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiData = await openaiResponse.json();
    const generatedText = openaiData.choices[0]?.message?.content || '{}';

    let parsedContent;
    try {
      parsedContent = JSON.parse(generatedText.replace(/```json\n?|\n?```/g, '').trim());
    } catch {
      parsedContent = { blogPost: {}, cityPage: {}, faq: [], newsArticle: {} };
    }

    const finalContent = {
      blogPost: {
        ...parsedContent.blogPost,
        slug: `${keyword}-${city}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        keywords: [keyword, city, ...secondaryKeywords],
        featuredImage,
        imageAlt,
      },
      cityPage: {
        city,
        title: parsedContent.blogPost?.title || `${keyword} à ${city}`,
        slug: `${keyword.toLowerCase().replace(/\s+/g, '-')}-${city.toLowerCase().replace(/\s+/g, '-')}`,
        content: parsedContent.cityPage?.content || '',
        metaDescription: parsedContent.blogPost?.metaDescription || '',
        keywords: [keyword, city, ...secondaryKeywords],
        dept: `${dept}`,
        region,
        population,
        taxi_count: taxiCount,
      },
      faq: parsedContent.faq || [],
      newsArticle: {
        ...parsedContent.newsArticle,
        imageUrl: featuredImage,
      },
    };

    return new Response(
      JSON.stringify({ success: true, content: finalContent }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});