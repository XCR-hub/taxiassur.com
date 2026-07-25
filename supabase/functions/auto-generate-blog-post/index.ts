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
function toTitleCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function clampText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1).replace(/\s+\S*$/, '') + '...';
}

function buildFallbackBlogPost(keyword: string, city: any, angle: string): any {
  const cityName = city?.name || 'votre ville';
  const region = city?.region || 'France';
  const title = clampText(`${toTitleCase(keyword)} a ${cityName} : ${angle}`, 95);
  const slug = slugify(`${keyword} ${cityName} ${angle}`);
  const excerpt = `Les points a verifier pour adapter une assurance taxi a ${cityName}, comparer les garanties utiles et obtenir un devis coherent avec votre activite.`;
  const metaDescription = clampText(`Guide assurance taxi a ${cityName} : garanties, documents, franchises et conseils pour obtenir un devis professionnel adapte.`, 158);
  const keywords = [
    keyword,
    'assurance taxi',
    `assurance taxi ${cityName}`,
    `devis assurance taxi ${cityName}`,
    `taxi ${region}`,
  ].filter(Boolean);

  const content = `Pour un chauffeur de taxi a ${cityName}, l'assurance ne se resume pas a une cotisation annuelle. Le contrat doit tenir compte du rythme de circulation, des horaires, de la valeur du vehicule, de l'equipement professionnel et des attentes des clients transportes. Un devis solide part toujours de ces elements concrets.

## Les garanties a verifier en priorite

La responsabilite civile professionnelle reste la base, mais elle ne couvre pas tous les problemes rencontres sur le terrain. Selon votre activite, il faut aussi regarder les dommages au vehicule, le bris de glace, le vol, l'incendie, la protection du conducteur, l'assistance et les conditions de vehicule de remplacement. Pour un taxi utilise tous les jours, une immobilisation trop longue peut couter plus cher que l'ecart de prime entre deux formules.

## Les documents utiles pour obtenir un devis fiable

Avant de comparer les offres, preparez la carte grise, la licence taxi, le permis, le releve d'information, les informations sur le stationnement et le kilometrage annuel estime. Ces pieces permettent d'eviter un tarif approximatif et de verifier rapidement si le contrat correspond bien a un usage professionnel a ${cityName}.

## Comment comparer deux propositions

Le prix seul ne suffit pas. Comparez aussi le montant des franchises, les exclusions, les plafonds d'indemnisation, les delais d'assistance et les conditions en cas de conducteur secondaire. Deux devis proches peuvent donner des resultats tres differents apres un sinistre.

## Quand demander l'avis d'un courtier specialise

Un courtier specialise taxi peut rapprocher votre profil des assureurs les plus adaptes, notamment si vous avez un historique de sinistres, un vehicule recent, une activite de nuit ou une forte part de trajets longue distance. L'objectif est d'obtenir une couverture robuste sans payer des options inutiles.`;

  return {
    title,
    slug,
    excerpt,
    content,
    metaDescription,
    keywords,
    featuredImage: 'https://taxiassur.com/logo-600x300.png',
    imageAlt: `Taxi professionnel a ${cityName}`,
    readingTime: 5,
    naturalness_score: 62,
    writing_style: 'fallback-seo',
  };
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

    let blogPost: any = null;
    let usedFallback = false;
    let fallbackReason: string | null = null;

    const generateUrl = `${supabaseUrl}/functions/v1/generate-seo-content`;
    try {
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

      if (generateResponse.ok) {
        const generated = await generateResponse.json();
        blogPost = generated.content?.blogPost || null;
        if (!blogPost) {
          fallbackReason = 'empty_generated_content';
        }
      } else {
        fallbackReason = `generation_${generateResponse.status}`;
      }
    } catch (_error) {
      fallbackReason = 'generation_unavailable';
    }

    if (!blogPost) {
      const recentFallbackCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: recentFallbackPost, error: recentFallbackError } = await supabase
        .from('blog_posts')
        .select('id, created_at')
        .eq('writing_style', 'fallback-seo')
        .gte('created_at', recentFallbackCutoff)
        .limit(1);

      if (!recentFallbackError && recentFallbackPost && recentFallbackPost.length > 0) {
        return new Response(
          JSON.stringify({
            success: true,
            skipped: true,
            fallback: true,
            reason: fallbackReason || 'fallback_rate_limited',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      blogPost = buildFallbackBlogPost(randomKeyword, randomCity, randomAngle);
      usedFallback = true;
      fallbackReason = fallbackReason || 'fallback_content';
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
          publish_time: insertedPost.created_at || publishTime.toISOString(),
          fallback: usedFallback,
          fallback_reason: usedFallback ? fallbackReason : null,
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
