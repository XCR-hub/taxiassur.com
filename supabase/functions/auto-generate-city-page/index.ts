import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: existingCities } = await supabase
      .from('city_pages')
      .select('city');

    const existingCityNames = existingCities?.map(c => c.city.toLowerCase()) || [];

    const { data: cities } = await supabase
      .from('french_cities')
      .select('*')
      .gt('population', 30000)
      .order('population', { ascending: false })
      .limit(200);

    if (!cities || cities.length === 0) {
      throw new Error('Aucune ville trouvée');
    }

    const availableCities = cities.filter(
      city => !existingCityNames.includes(city.name.toLowerCase())
    );

    if (availableCities.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'Toutes les grandes villes ont déjà une page', skipped: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const selectedCity = availableCities[Math.floor(Math.random() * Math.min(50, availableCities.length))];
    const keyword = 'assurance taxi';

    const generateUrl = `${supabaseUrl}/functions/v1/generate-seo-content`;
    const generateResponse = await fetch(generateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        keyword,
        city: selectedCity.name,
        secondaryKeywords: ['taxi', selectedCity.name, selectedCity.region, 'devis', 'RC professionnelle'],
        imagePrompt: `taxi ${selectedCity.name} ville`,
      }),
    });

    if (!generateResponse.ok) {
      throw new Error(`Erreur génération: ${generateResponse.status}`);
    }

    const generated = await generateResponse.json();
    const cityPage = generated.content?.cityPage;

    if (!cityPage) {
      throw new Error('Contenu ville non généré');
    }

    const { data: insertedPage, error: insertError } = await supabase
      .from('city_pages')
      .insert({
        city: cityPage.city,
        title: cityPage.title,
        slug: cityPage.slug,
        content: cityPage.content,
        meta_description: cityPage.metaDescription,
        keywords: cityPage.keywords,
        dept: cityPage.dept,
        region: cityPage.region,
        population: cityPage.population,
        taxi_count: cityPage.taxi_count,
        naturalness_score: cityPage.naturalness_score || 70,
        writing_style: cityPage.writing_style || 'professionnel',
        published_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Erreur insertion: ${insertError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        page: {
          id: insertedPage.id,
          city: insertedPage.city,
          slug: insertedPage.slug,
          population: insertedPage.population,
          naturalness_score: insertedPage.naturalness_score,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error auto-generate-city-page:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
