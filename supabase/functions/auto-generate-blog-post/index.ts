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
  'couverture taxi bris de glace',
  'assurance taxi vol incendie',
  'taxi indemnisation accident',
  'assurance taxi panne',
  'protection juridique taxi',
  'assurance taxi après sinistre',
  'bonus malus chauffeur taxi',
  'taxi assurance tiers étendu',
  'assurance taxi hybride',
  'taxi couverture passagers',
  'assurance taxi véhicule neuf',
  'assurance taxi véhicule occasion',
  'taxi courtier assurance',
  'taxi mutuelle santé',
  'taxi prévoyance invalidité',
  'assurance taxi multirisque',
  'responsabilité civile taxi',
  'taxi dommages corporels',
  'assurance taxi catastrophe naturelle',
  'taxi assistance dépannage',
  'assurance taxi perte exploitation',
  'réglementation assurance taxi 2026',
  'loi assurance taxi',
  'obligation légale assurance taxi',
  'carte verte taxi',
  'taxi assurance temporaire',
  'taxi conducteur secondaire',
  'taxi kilomètres illimités',
  'taxi assurance au kilomètre',
  'location taxi assurance',
  'taxi véhicule de remplacement',
  'assurance taxi nuit',
  'taxi zone urbaine assurance',
  'taxi longue distance assurance',
  'assurance taxi aéroport',
  'taxi conventionné CPAM assurance',
  'taxi PMR assurance',
  'assurance taxi luxe',
  'assurance taxi écologique',
  'taxi covoiturage assurance',
  'taxi licence assurance',
  'transmission licence taxi assurance',
  'retraite chauffeur taxi',
  'taxi formation continue assurance',
  'assurance taxi sans franchise',
  'taxi paiement mensuel assurance',
  'taxi assurance immédiate',
  'taxi résiliation loi Hamon',
  'taxi déclaration sinistre en ligne',
  'taxi expertise véhicule',
  'taxi indemnisation rapide',
];

const ANGLES = [
  'guide complet',
  'conseils pratiques',
  'ce qu\'il faut savoir',
  'erreurs à éviter',
  'comparatif détaillé',
  'témoignage chauffeur',
  'avis expert',
  'économiser',
  'tout comprendre',
  'astuces méconnues',
  'nouveautés 2026',
  'analyse complète',
  'retour d\'expérience',
  'points clés',
  'solutions adaptées',
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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
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
      .gt('population', 30000)
      .order('population', { ascending: false })
      .limit(200);

    if (!cities || cities.length === 0) {
      throw new Error('Aucune ville trouvee');
    }

    const randomCity = selectSmartCity(cities);
    const randomKeyword = KEYWORDS[Math.floor(Math.random() * KEYWORDS.length)];
    const randomAngle = ANGLES[Math.floor(Math.random() * ANGLES.length)];
    const randomAuthor = AUTHORS[Math.floor(Math.random() * AUTHORS.length)];

    const candidateSlug = slugify(`${randomKeyword} ${randomCity.name} ${randomAngle}`);

    const { data: existingPost } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', candidateSlug)
      .maybeSingle();

    if (existingPost) {
      const altKeyword = KEYWORDS[Math.floor(Math.random() * KEYWORDS.length)];
      const altAngle = ANGLES[Math.floor(Math.random() * ANGLES.length)];
      const altSlug = slugify(`${altKeyword} ${randomCity.name} ${altAngle} ${Date.now() % 10000}`);

      const { data: existingAlt } = await supabase
        .from('blog_posts')
        .select('id')
        .eq('slug', altSlug)
        .maybeSingle();

      if (existingAlt) {
        return new Response(
          JSON.stringify({ success: false, message: 'Article similaire existe deja', skipped: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
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
        angle: randomAngle,
        secondaryKeywords: ['taxi', 'assurance', randomCity.name, randomCity.region || ''],
        imagePrompt: `taxi ${randomCity.name} professionnel`,
      }),
    });

    if (!generateResponse.ok) {
      const errText = await generateResponse.text();
      throw new Error(`Erreur generation: ${generateResponse.status} - ${errText.slice(0, 200)}`);
    }

    const generated = await generateResponse.json();
    const blogPost = generated.content?.blogPost;

    if (!blogPost) {
      throw new Error('Contenu blog non genere - response: ' + JSON.stringify(generated).slice(0, 300));
    }

    const finalSlug = blogPost.slug || candidateSlug;

    const { data: slugExists } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', finalSlug)
      .maybeSingle();

    const uniqueSlug = slugExists ? `${finalSlug}-${Date.now() % 100000}` : finalSlug;

    const publishTime = generateNaturalPublishTime();

    const { data: insertedPost, error: insertError } = await supabase
      .from('blog_posts')
      .insert({
        title: blogPost.title,
        slug: uniqueSlug,
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
        published: true,
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
