import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CityGenerationRequest {
  city_name: string;
  dept: string;
  region: string;
  taxi_count?: number;
  generate_article?: boolean;
  generate_faq?: boolean;
  generate_news?: boolean;
  generate_image?: boolean;
}

interface GenerationResult {
  success: boolean;
  city_id?: string;
  city_slug?: string;
  article_id?: string;
  faq_ids?: string[];
  news_id?: string;
  image_url?: string;
  errors?: string[];
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    const pexelsKey = Deno.env.get('PEXELS_API_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials missing');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      city_name,
      dept,
      region,
      taxi_count = 500,
      generate_article = true,
      generate_faq = true,
      generate_news = false,
      generate_image = true,
    } = await req.json() as CityGenerationRequest;

    if (!city_name || !dept || !region) {
      return new Response(
        JSON.stringify({ error: 'city_name, dept et region sont requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result: GenerationResult = { success: true, errors: [] };

    // Générer slug
    const slug = city_name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // ============================================================================
    // 1. GÉNÉRATION IMAGE PEXELS
    // ============================================================================
    if (generate_image && pexelsKey) {
      try {
        const imageUrl = await generatePexelsImage(city_name, pexelsKey);
        if (imageUrl) {
          result.image_url = imageUrl;
        }
      } catch (error) {
        result.errors?.push(`Image: ${error.message}`);
      }
    }

    // ============================================================================
    // 2. GÉNÉRATION PAGE VILLE
    // ============================================================================
    try {
      const { data: existing } = await supabase
        .from('city_pages')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      if (existing) {
        return new Response(
          JSON.stringify({
            success: false,
            message: `La ville ${city_name} existe déjà`,
            city_id: existing.id,
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const cityContent = openaiKey
        ? await generateCityContentAI(city_name, dept, region, taxi_count, openaiKey)
        : generateCityContentTemplate(city_name, dept, region, taxi_count);

      const { data: cityData, error: cityError } = await supabase
        .from('city_pages')
        .insert({
          city: city_name,
          slug,
          dept,
          region,
          taxi_count,
          title: `Assurance Taxi ${city_name} (${dept}) - Devis Gratuit & Rapide`,
          meta_description: `Trouvez la meilleure assurance taxi à ${city_name} (${dept}). Devis gratuit en 2 min, tarifs négociés, service professionnel. Expert taxi ${region}.`,
          keywords: [
            `assurance taxi ${city_name}`,
            `assurance taxi ${dept}`,
            `devis assurance taxi ${city_name}`,
            `tarif assurance taxi ${city_name}`,
            `courtier assurance taxi ${city_name}`,
          ],
          content: cityContent,
          status: 'published',
        })
        .select()
        .single();

      if (cityError) throw cityError;
      result.city_id = cityData.id;
      result.city_slug = slug;
    } catch (error) {
      result.errors?.push(`City Page: ${error.message}`);
      result.success = false;
    }

    // ============================================================================
    // 3. GÉNÉRATION ARTICLE BLOG
    // ============================================================================
    if (generate_article && openaiKey) {
      try {
        const articleContent = await generateArticleAI(city_name, dept, region, openaiKey);

        const { data: articleData, error: articleError } = await supabase
          .from('blog_posts')
          .insert({
            title: `Assurance Taxi ${city_name} : Guide Complet 2025`,
            slug: `assurance-taxi-${slug}-guide-2025`,
            excerpt: `Guide complet de l'assurance taxi à ${city_name}. Tarifs, garanties, démarches et conseils d'experts.`,
            content: articleContent,
            image_url: result.image_url || 'https://images.pexels.com/photos/1545743/pexels-photo-1545743.jpeg',
            category: 'Guides',
            author: 'Équipe TaxiAssur',
            tags: ['assurance-taxi', city_name.toLowerCase(), dept, 'guide'],
            published: true,
            published_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (articleError) throw articleError;
        result.article_id = articleData.id;
      } catch (error) {
        result.errors?.push(`Article: ${error.message}`);
      }
    }

    // ============================================================================
    // 4. GÉNÉRATION FAQ (3 QUESTIONS)
    // ============================================================================
    if (generate_faq && openaiKey) {
      try {
        const faqs = await generateFAQsAI(city_name, dept, region, openaiKey);

        const faqIds: string[] = [];

        for (const faq of faqs) {
          const { data: faqData, error: faqError } = await supabase
            .from('faq_entries')
            .insert({
              question: faq.question,
              answer: faq.answer,
              category: `Assurance Taxi ${city_name}`,
              tags: ['assurance-taxi', city_name.toLowerCase(), dept],
              status: 'published',
            })
            .select()
            .single();

          if (!faqError && faqData) {
            faqIds.push(faqData.id);
          }
        }

        result.faq_ids = faqIds;
      } catch (error) {
        result.errors?.push(`FAQ: ${error.message}`);
      }
    }

    // ============================================================================
    // 5. GÉNÉRATION ACTUALITÉ (OPTIONNEL)
    // ============================================================================
    if (generate_news && openaiKey) {
      try {
        const newsContent = await generateNewsAI(city_name, region, openaiKey);

        const { data: newsData, error: newsError } = await supabase
          .from('news_articles')
          .insert({
            title: `Nouveaux tarifs assurance taxi ${city_name} 2025`,
            slug: `nouveaux-tarifs-taxi-${slug}-2025`,
            summary: `Les tarifs d'assurance taxi évoluent à ${city_name} en 2025. Découvrez les nouvelles offres.`,
            content: newsContent,
            image_url: result.image_url || 'https://images.pexels.com/photos/1545743/pexels-photo-1545743.jpeg',
            category: 'Actualités',
            author: 'Rédaction TaxiAssur',
            tags: [city_name.toLowerCase(), 'tarifs', '2025'],
            status: 'published',
            published_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (newsError) throw newsError;
        result.news_id = newsData.id;
      } catch (error) {
        result.errors?.push(`News: ${error.message}`);
      }
    }

    // ============================================================================
    // RÉPONSE FINALE
    // ============================================================================
    return new Response(
      JSON.stringify({
        ...result,
        message: `Génération complète pour ${city_name}`,
        generated: {
          city_page: !!result.city_id,
          article: !!result.article_id,
          faqs: result.faq_ids?.length || 0,
          news: !!result.news_id,
          image: !!result.image_url,
        },
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ============================================================================
// FONCTIONS HELPERS
// ============================================================================

async function generatePexelsImage(cityName: string, apiKey: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=taxi+professional+${encodeURIComponent(cityName)}&per_page=5&orientation=landscape`,
      { headers: { Authorization: apiKey } }
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (!data.photos || data.photos.length === 0) return null;

    const randomPhoto = data.photos[Math.floor(Math.random() * data.photos.length)];
    return randomPhoto.src.large2x;
  } catch (error) {
    console.error('Pexels error:', error);
    return null;
  }
}

async function generateCityContentAI(
  cityName: string,
  dept: string,
  region: string,
  taxiCount: number,
  apiKey: string
): Promise<string> {
  const prompt = `Rédige un article HTML complet et professionnel pour "Assurance Taxi à ${cityName} (${dept})".

Structure obligatoire :
- <h1>Assurance Taxi à ${cityName} (${dept})</h1>
- Introduction engageante (200 mots)
- <h2>Pourquoi choisir TaxiAssur à ${cityName} ?</h2>
- 4 avantages en liste <ul>
- <h2>Nos garanties</h2>
- Liste des garanties
- <h2>Le marché taxi à ${cityName}</h2>
- Statistiques locales (~${taxiCount} taxis)
- <h2>Demandez votre devis</h2>
- CTA final

Ton professionnel, local, rassurant. Minimum 600 mots. HTML propre.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      return generateCityContentTemplate(cityName, dept, region, taxiCount);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    return generateCityContentTemplate(cityName, dept, region, taxiCount);
  }
}

function generateCityContentTemplate(
  cityName: string,
  dept: string,
  region: string,
  taxiCount: number
): string {
  return `
    <h1>Assurance Taxi à ${cityName} (${dept})</h1>
    <p>Chauffeur de taxi à <strong>${cityName}</strong> ? TaxiAssur, courtier spécialisé ORIAS, vous propose des solutions d'assurance professionnelle adaptées aux taxis de ${cityName} et du département ${dept}.</p>

    <h2>Pourquoi choisir TaxiAssur à ${cityName} ?</h2>
    <ul>
      <li><strong>Expertise locale</strong> : Connaissance du marché taxi de ${cityName}</li>
      <li><strong>Tarifs négociés</strong> : Conditions préférentielles ${region}</li>
      <li><strong>Service rapide</strong> : Devis en 2 min, réponse sous 15 min</li>
      <li><strong>Accompagnement</strong> : Conseiller dédié expert taxi ${cityName}</li>
    </ul>

    <h2>Nos garanties pour les taxis de ${cityName}</h2>
    <ul>
      <li>RC Professionnelle obligatoire</li>
      <li>Dommages tous accidents</li>
      <li>Vol et incendie</li>
      <li>Bris de glace</li>
      <li>Protection juridique</li>
      <li>Assistance 24h/7j</li>
    </ul>

    <h2>Les taxis de ${cityName} nous font confiance</h2>
    <p>Avec plus de ${taxiCount} taxis en activité à ${cityName}, nous accompagnons de nombreux professionnels du transport dans la région ${region}.</p>

    <h2>Demandez votre devis gratuit</h2>
    <p>Obtenez votre devis d'assurance taxi pour ${cityName} en 2 minutes. Sans engagement, réponse rapide garantie.</p>
  `;
}

async function generateArticleAI(
  cityName: string,
  dept: string,
  region: string,
  apiKey: string
): Promise<string> {
  const prompt = `Rédige un article de blog complet (800 mots) sur "Assurance Taxi ${cityName} : Guide Complet 2025".

Sections :
1. Introduction : Contexte taxi à ${cityName}
2. Les obligations légales (RC Pro, carte pro...)
3. Les tarifs moyens à ${cityName} (${dept})
4. Comment économiser sur son assurance
5. Les garanties indispensables
6. Comparaison des assureurs (AXA, Generali...)
7. Démarches pratiques
8. Conseils d'expert local ${region}
9. Conclusion + CTA

Format HTML. Ton expert, pédagogique, local.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2500,
      }),
    });

    if (!response.ok) throw new Error('OpenAI API error');

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    return `<h1>Guide Assurance Taxi ${cityName}</h1><p>Article en cours de génération...</p>`;
  }
}

async function generateFAQsAI(
  cityName: string,
  dept: string,
  region: string,
  apiKey: string
): Promise<Array<{ question: string; answer: string }>> {
  const prompt = `Génère 3 FAQ pertinentes sur l'assurance taxi à ${cityName} (${dept}, ${region}).

Format JSON strict :
[
  {"question": "...", "answer": "..."},
  {"question": "...", "answer": "..."},
  {"question": "...", "answer": "..."}
]

Questions : tarifs locaux, garanties spécifiques, démarches ${cityName}.
Réponses : 150 mots, professionnelles, localisées.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) throw new Error('OpenAI API error');

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Parser le JSON
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    throw new Error('Invalid JSON');
  } catch (error) {
    // Fallback FAQ
    return [
      {
        question: `Quel est le tarif moyen d'une assurance taxi à ${cityName} ?`,
        answer: `À ${cityName} (${dept}), le tarif moyen varie entre 1500€ et 3500€ par an selon votre profil et vos garanties. TaxiAssur négocie des tarifs préférentiels pour les taxis de ${region}.`,
      },
      {
        question: `Quelles garanties sont obligatoires pour un taxi à ${cityName} ?`,
        answer: `La RC Professionnelle est obligatoire pour tous les taxis de ${cityName}. Elle couvre les dommages causés aux passagers. Nous recommandons également dommages tous accidents et protection juridique.`,
      },
      {
        question: `Comment obtenir un devis rapidement à ${cityName} ?`,
        answer: `Avec TaxiAssur, obtenez votre devis pour ${cityName} en 2 minutes. Réponse sous 15 minutes. Service dédié aux professionnels du taxi ${region}.`,
      },
    ];
  }
}

async function generateNewsAI(cityName: string, region: string, apiKey: string): Promise<string> {
  const prompt = `Rédige une actualité (400 mots) sur "Nouveaux tarifs assurance taxi ${cityName} 2025".

Contenu :
- Évolution des tarifs 2024→2025
- Raisons de l'augmentation
- Nouveaux avantages TaxiAssur
- Conseils pour économiser
- CTA devis gratuit

Format HTML. Ton journalistique, factuel, local ${region}.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1200,
      }),
    });

    if (!response.ok) throw new Error('OpenAI API error');

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    return `<p>Actualité assurance taxi ${cityName} en cours de rédaction...</p>`;
  }
}
