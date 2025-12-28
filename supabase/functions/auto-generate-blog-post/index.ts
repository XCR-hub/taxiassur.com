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
];

const AUTHORS = [
  { name: 'Marie Dupont', bio: 'Experte assurance taxi avec 15 ans d\'expérience' },
  { name: 'Jean Martin', bio: 'Consultant en RC professionnelle' },
  { name: 'Sophie Bernard', bio: 'Spécialiste flotte de véhicules' },
  { name: 'Luc Rousseau', bio: 'Expert en gestion de sinistres' },
  { name: 'Émilie Petit', bio: 'Conseillère assurance VTC et taxi' },
];

function generateNaturalPublishTime(): Date {
  const now = new Date();
  const hour = 6 + Math.floor(Math.random() * 17);
  const minute = Math.floor(Math.random() * 60);
  now.setHours(hour, minute, 0, 0);
  return now;
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
      .limit(100);

    if (!cities || cities.length === 0) {
      throw new Error('Aucune ville trouvée');
    }

    const randomCity = cities[Math.floor(Math.random() * cities.length)];
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
