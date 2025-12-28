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

    const optimizations: string[] = [];
    const stats = {
      total_blog_posts: 0,
      total_city_pages: 0,
      total_faqs: 0,
      avg_naturalness_blog: 0,
      avg_naturalness_cities: 0,
      avg_naturalness_faqs: 0,
      low_score_content: 0,
      featured_content: 0,
    };

    const { count: blogCount } = await supabase
      .from('blog_posts')
      .select('*', { count: 'exact', head: true });

    const { count: cityCount } = await supabase
      .from('city_pages')
      .select('*', { count: 'exact', head: true });

    const { count: faqCount } = await supabase
      .from('faq_items')
      .select('*', { count: 'exact', head: true });

    stats.total_blog_posts = blogCount || 0;
    stats.total_city_pages = cityCount || 0;
    stats.total_faqs = faqCount || 0;

    const { data: blogNaturalness } = await supabase
      .from('blog_posts')
      .select('naturalness_score')
      .not('naturalness_score', 'is', null);

    if (blogNaturalness && blogNaturalness.length > 0) {
      const sum = blogNaturalness.reduce((acc, item) => acc + (item.naturalness_score || 0), 0);
      stats.avg_naturalness_blog = Math.round(sum / blogNaturalness.length);
    }

    const { data: cityNaturalness } = await supabase
      .from('city_pages')
      .select('naturalness_score')
      .not('naturalness_score', 'is', null);

    if (cityNaturalness && cityNaturalness.length > 0) {
      const sum = cityNaturalness.reduce((acc, item) => acc + (item.naturalness_score || 0), 0);
      stats.avg_naturalness_cities = Math.round(sum / cityNaturalness.length);
    }

    const { data: faqNaturalness } = await supabase
      .from('faq_items')
      .select('naturalness_score')
      .not('naturalness_score', 'is', null);

    if (faqNaturalness && faqNaturalness.length > 0) {
      const sum = faqNaturalness.reduce((acc, item) => acc + (item.naturalness_score || 0), 0);
      stats.avg_naturalness_faqs = Math.round(sum / faqNaturalness.length);
    }

    const { data: lowScorePosts } = await supabase
      .from('blog_posts')
      .select('id, title, naturalness_score')
      .lt('naturalness_score', 60)
      .order('naturalness_score', { ascending: true })
      .limit(5);

    if (lowScorePosts && lowScorePosts.length > 0) {
      stats.low_score_content = lowScorePosts.length;
      optimizations.push(`${lowScorePosts.length} articles avec score naturalité < 60 à améliorer`);
    }

    const { data: randomPosts } = await supabase
      .from('blog_posts')
      .select('id')
      .limit(10);

    if (randomPosts && randomPosts.length > 0) {
      const randomIndex = Math.floor(Math.random() * randomPosts.length);
      const selectedPost = randomPosts[randomIndex];

      await supabase
        .from('blog_posts')
        .update({ featured: true })
        .eq('id', selectedPost.id);

      await supabase
        .from('blog_posts')
        .update({ featured: false })
        .neq('id', selectedPost.id);

      optimizations.push('Article featured mis à jour aléatoirement');
      stats.featured_content = 1;
    }

    const { data: randomCities } = await supabase
      .from('city_pages')
      .select('id')
      .limit(5);

    if (randomCities && randomCities.length > 0) {
      const randomIndex = Math.floor(Math.random() * randomCities.length);
      const selectedCity = randomCities[randomIndex];

      await supabase
        .from('city_pages')
        .update({ featured: true })
        .eq('id', selectedCity.id);

      await supabase
        .from('city_pages')
        .update({ featured: false })
        .neq('id', selectedCity.id);

      optimizations.push('Page ville featured mise à jour');
    }

    const { data: randomFaqs } = await supabase
      .from('faq_items')
      .select('id')
      .limit(10);

    if (randomFaqs && randomFaqs.length > 0) {
      const featuredCount = Math.min(3, randomFaqs.length);
      const selectedFaqs = randomFaqs
        .sort(() => Math.random() - 0.5)
        .slice(0, featuredCount);

      await supabase
        .from('faq_items')
        .update({ featured: false });

      for (const faq of selectedFaqs) {
        await supabase
          .from('faq_items')
          .update({ featured: true })
          .eq('id', faq.id);
      }

      optimizations.push(`${featuredCount} FAQs mises en avant`);
    }

    const recommendations = [];

    if (stats.total_blog_posts < 50) {
      recommendations.push('Augmenter fréquence génération blog (actuellement 4/jour)');
    }

    if (stats.total_city_pages < 100) {
      recommendations.push('Accélérer génération pages villes (cible: 100+ villes)');
    }

    if (stats.total_faqs < 20) {
      recommendations.push('Augmenter fréquence génération FAQs (actuellement 1/semaine)');
    }

    if (stats.avg_naturalness_blog < 70) {
      recommendations.push('Améliorer prompts blog (score naturalité moyen < 70)');
    }

    if (stats.avg_naturalness_cities < 70) {
      recommendations.push('Améliorer prompts villes (score naturalité moyen < 70)');
    }

    optimizations.push('Audit SEO complet effectué');

    return new Response(
      JSON.stringify({
        success: true,
        stats,
        optimizations,
        recommendations,
        generated_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error seo-booster:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
