import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CityData {
  name: string;
  dept: string;
  region: string;
  taxi_count?: number;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
    const openaiKey = Deno.env.get('OPENAI_API_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials missing');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const {city_name, dept, region, taxi_count} = await req.json() as CityData;

    if (!city_name || !dept || !region) {
      return new Response(
        JSON.stringify({error: 'city_name, dept et region sont requis'}),
        {status: 400, headers: {...corsHeaders, 'Content-Type': 'application/json'}}
      );
    }

    // Générer slug
    const slug = city_name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // Vérifier si la ville existe déjà
    const {data: existing} = await supabase
      .from('city_pages')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `La ville ${city_name} existe déjà`,
          city_id: existing.id
        }),
        {status: 409, headers: {...corsHeaders, 'Content-Type': 'application/json'}}
      );
    }

    // Générer contenu via OpenAI si disponible
    let content = '';

    if (openaiKey) {
      try {
        const prompt = `Rédige un article SEO complet pour une page "Assurance Taxi à ${city_name} (${dept})".

Structure HTML attendue :
<h1>Assurance Taxi à ${city_name} (${dept})</h1>

<p>Introduction accrocheuse sur les taxis de ${city_name} (200 mots)</p>

<h2>Pourquoi choisir TaxiAssur à ${city_name} ?</h2>
<ul>
  <li><strong>Expertise locale</strong> : [Avantage spécifique ${city_name}]</li>
  <li><strong>Tarifs négociés</strong> : [Conditions régionales ${region}]</li>
  <li><strong>Service rapide</strong> : [Engagement temporel]</li>
  <li><strong>Accompagnement personnalisé</strong> : [Conseiller dédié]</li>
</ul>

<h2>Nos garanties pour les taxis de ${city_name}</h2>
<ul>
  <li>Responsabilité Civile Professionnelle obligatoire</li>
  <li>Dommages tous accidents</li>
  <li>Vol et incendie</li>
  <li>Bris de glace</li>
  <li>Protection juridique</li>
  <li>Assistance 24h/7j</li>
</ul>

<h2>Le marché des taxis à ${city_name}</h2>
<p>[Statistiques, spécificités locales, réglementation] (150 mots)</p>

<h2>Demandez votre devis gratuit</h2>
<p>[CTA avec promesse de rapidité]</p>

Ton: professionnel, rassurant, local. HTML propre. Minimum 600 mots.`;

        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4-turbo-preview',
            messages: [{role: 'user', content: prompt}],
            temperature: 0.7,
            max_tokens: 2000,
          }),
        });

        if (!openaiResponse.ok) {
          console.warn('OpenAI API failed, using template');
          content = generateTemplateContent(city_name, dept, region, taxi_count || 500);
        } else {
          const openaiData = await openaiResponse.json();
          content = openaiData.choices[0].message.content;
        }
      } catch (error) {
        console.warn('OpenAI error, using template:', error);
        content = generateTemplateContent(city_name, dept, region, taxi_count || 500);
      }
    } else {
      content = generateTemplateContent(city_name, dept, region, taxi_count || 500);
    }

    // Insérer dans Supabase
    const {data, error} = await supabase
      .from('city_pages')
      .insert({
        city: city_name,
        slug,
        dept,
        region,
        taxi_count: taxi_count || 500,
        title: `Assurance Taxi ${city_name} (${dept}) - Devis Gratuit & Rapide`,
        meta_description: `Trouvez la meilleure assurance taxi à ${city_name} (${dept}). Devis gratuit en 2 min, tarifs négociés, service professionnel. Expert taxi ${region}.`,
        keywords: [
          `assurance taxi ${city_name}`,
          `assurance taxi ${dept}`,
          `devis assurance taxi ${city_name}`,
          `tarif assurance taxi ${city_name}`,
          `courtier assurance taxi ${city_name}`,
        ],
        content,
        status: 'published',
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Page créée pour ${city_name}`,
        city_id: data.id,
        slug,
        url: `/ville/${slug}`,
      }),
      {status: 201, headers: {...corsHeaders, 'Content-Type': 'application/json'}}
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {status: 500, headers: {...corsHeaders, 'Content-Type': 'application/json'}}
    );
  }
});

function generateTemplateContent(
  cityName: string,
  dept: string,
  region: string,
  taxiCount: number
): string {
  return `
    <h1>Assurance Taxi à ${cityName} (${dept})</h1>

    <p>Vous êtes chauffeur de taxi à <strong>${cityName}</strong> et recherchez une assurance adaptée ?
    TaxiAssur, courtier spécialisé ORIAS, vous propose des solutions d'assurance professionnelle
    spécialement conçues pour les taxis de ${cityName} et du département ${dept}.</p>

    <h2>Pourquoi choisir TaxiAssur à ${cityName} ?</h2>

    <ul>
      <li><strong>Expertise locale</strong> : Connaissance approfondie du marché taxi de ${cityName}</li>
      <li><strong>Tarifs négociés</strong> : Conditions préférentielles pour la région ${region}</li>
      <li><strong>Service rapide</strong> : Devis gratuit en 2 minutes, réponse sous 15 minutes</li>
      <li><strong>Accompagnement personnalisé</strong> : Conseiller dédié expert du marché ${cityName}</li>
    </ul>

    <h2>Nos garanties pour les taxis de ${cityName}</h2>

    <ul>
      <li>Responsabilité Civile Professionnelle obligatoire</li>
      <li>Dommages tous accidents</li>
      <li>Vol et incendie</li>
      <li>Bris de glace</li>
      <li>Protection juridique</li>
      <li>Assistance 24h/7j</li>
    </ul>

    <h2>Les taxis de ${cityName} nous font confiance</h2>

    <p>Avec plus de ${taxiCount} taxis en activité à ${cityName}, nous sommes fiers d'accompagner
    de nombreux professionnels du transport de personnes dans la région ${region}.</p>

    <h2>Demandez votre devis gratuit</h2>

    <p>Obtenez votre devis d'assurance taxi pour ${cityName} en 2 minutes. Sans engagement,
    réponse rapide garantie sous 15 minutes.</p>
  `;
}
