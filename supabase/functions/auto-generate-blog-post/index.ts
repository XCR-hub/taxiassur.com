import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const KEYWORDS = [
  'assurance taxi',
  'RC professionnelle taxi',
  'assurance flotte taxi',
  'sinistre taxi',
  'assurance moto taxi',
  'assurance VTC',
  'prix assurance taxi',
  'garanties assurance taxi',
  'assurance taxi jeune conducteur',
  'assurance taxi électrique',
  'changement assurance taxi',
  'comparateur assurance taxi',
  'devis assurance taxi',
  'assurance taxi en ligne',
  'résiliation assurance taxi',
  'assurance tous risques taxi',
  'assurance taxi professionnel',
  'malus assurance taxi',
  'assurance taxi pas cher',
  'meilleure assurance taxi',
  'assurance taxi urgence',
  'franchise assurance taxi',
  'attestation assurance taxi',
  'contrat assurance taxi',
  'tarif assurance taxi',
];

const AUTHORS = [
  { name: 'Marie Dupont', bio: 'Experte assurance taxi avec 15 ans d\'expérience' },
  { name: 'Jean Martin', bio: 'Consultant en RC professionnelle' },
  { name: 'Sophie Bernard', bio: 'Spécialiste flotte de véhicules' },
  { name: 'Luc Rousseau', bio: 'Expert en gestion de sinistres' },
  { name: 'Émilie Petit', bio: 'Conseillère assurance VTC et taxi' },
  { name: 'Pierre Moreau', bio: 'Spécialiste tarification et devis' },
  { name: 'Claire Dubois', bio: 'Experte réglementation taxi' },
  { name: 'Thomas Leroy', bio: 'Conseiller assurance professionnelle' },
  { name: 'Isabelle Blanc', bio: 'Spécialiste véhicules électriques' },
  { name: 'Michel Laurent', bio: 'Expert conformité et certifications' },
];

function generateNaturalPublishTime(): Date {
  const now = new Date();
  const currentHour = now.getHours();
  let targetHour = currentHour;
  if (currentHour < 6) {
    targetHour = 6 + Math.floor(Math.random() * 3);
  } else if (currentHour > 22) {
    targetHour = 22 + Math.floor(Math.random() * 2);
  } else {
    const delay = Math.floor(Math.random() * 4);
    targetHour = currentHour + delay;
    if (targetHour > 23) targetHour = 23;
  }
  const minute = Math.floor(Math.random() * 60);
  const second = Math.floor(Math.random() * 60);
  now.setHours(targetHour, minute, second, 0);
  return now;
}

function selectSmartCity(cities: any[]): any {
  const weights: number[] = [];
  let totalWeight = 0;
  for (let i = 0; i < cities.length; i++) {
    const weight = Math.pow(cities.length - i, 1.5);
    weights.push(weight);
    totalWeight += weight;
  }
  const random = Math.random() * totalWeight;
  let cumulative = 0;
  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i];
    if (random <= cumulative) {
      return cities[i];
    }
  }
  return cities[0];
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: cities } = await supabase
      .from('french_cities')
      .select('*')
      .gt('population', 50000)
      .order('population', { ascending: false })
      .limit(150);

    if (!cities || cities.length === 0) {
      throw new Error('Aucune ville trouvée');
    }

    const randomCity = selectSmartCity(cities);
    const randomKeyword = KEYWORDS[Math.floor(Math.random() * KEYWORDS.length)];
    const randomAuthor = AUTHORS[Math.floor(Math.random() * AUTHORS.length)];

    const { data: existingPost } = await supabase
      .from('blog_posts')
      .select('id')
      .ilike('title', `%${randomKeyword}%${randomCity.name}%`)
      .maybeSingle();

    if (existingPost) {
      return new Response(
        JSON.stringify({ success: false, message: 'Article similaire existe déjà', skipped: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const generateUrl = `${supabaseUrl}/functions/v1/generate-seo-content`;
    const generateResponse = await fetch(generateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        keyword: randomKeyword,
        city: randomCity.name,
        secondaryKeywords: ['taxi', 'assurance', randomCity.name, randomCity.region],
        imagePrompt: `taxi ${randomCity.name} professionnel`,
      }),
    });

    if (!generateResponse.ok) {
      throw new Error(`Erreur génération: ${generateResponse.status}`);
    }

    const generated = await generateResponse.json();
    const blogPost = generated.content?.blogPost;

    if (!blogPost) {
      throw new Error('Contenu blog non généré');
    }

    const publishTime = generateNaturalPublishTime();

    const { data: insertedPost, error: insertError } = await supabase
      .from('blog_posts')
      .insert({
        title: blogPost.title,
        slug: blogPost.slug,
        excerpt: blogPost.excerpt,
        content: blogPost.content,
        meta_description: blogPost.metaDescription,
        keywords: blogPost.keywords,
        featured_image: blogPost.featuredImage,
        image_alt: blogPost.imageAlt,
        reading_time: blogPost.readingTime || 8,
        author_name: randomAuthor.name,
        author_bio: randomAuthor.bio,
        naturalness_score: blogPost.naturalness_score || 70,
        writing_style: blogPost.writing_style || 'professionnel',
        published_at: publishTime.toISOString(),
        status: 'published',
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Erreur insertion: ${insertError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        post: {
          id: insertedPost.id,
          title: insertedPost.title,
          slug: insertedPost.slug,
          author: randomAuthor.name,
          naturalness_score: insertedPost.naturalness_score,
          publish_time: publishTime.toISOString(),
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error auto-generate-blog-post:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
