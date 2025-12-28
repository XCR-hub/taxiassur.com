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

    const improvements: string[] = [];
    const recommendations: string[] = [];

    const { data: recentPosts } = await supabase
      .from('blog_posts')
      .select('id, title, slug, naturalness_score, views_count, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!recentPosts || recentPosts.length === 0) {
      throw new Error('Aucun article récent trouvé');
    }

    const avgScore = recentPosts.reduce((sum, post) => sum + (post.naturalness_score || 0), 0) / recentPosts.length;
    const avgViews = recentPosts.reduce((sum, post) => sum + (post.views_count || 0), 0) / recentPosts.length;

    if (avgScore < 75) {
      recommendations.push('Augmenter variabilité des prompts (score moyen < 75)');

      const lowScorePosts = recentPosts.filter(p => (p.naturalness_score || 0) < 65);
      for (const post of lowScorePosts.slice(0, 3)) {
        await supabase
          .from('blog_posts')
          .update({
            status: 'draft',
            updated_at: new Date().toISOString()
          })
          .eq('id', post.id);

        improvements.push(`Article "${post.title}" mis en brouillon (score ${post.naturalness_score})`);
      }
    }

    const dayOfWeek = new Date().getDay();
    const hour = new Date().getHours();

    const shouldGenerateExtra = (dayOfWeek >= 1 && dayOfWeek <= 5 && hour >= 9 && hour <= 18);

    if (shouldGenerateExtra && avgViews > 10) {
      recommendations.push('Performance bonne - Augmenter volume à 6 articles/jour pendant heures ouvrables');
    }

    const postsByHour: { [key: number]: number } = {};
    recentPosts.forEach(post => {
      const postHour = new Date(post.created_at).getHours();
      postsByHour[postHour] = (postsByHour[postHour] || 0) + 1;
    });

    const peakHours = Object.entries(postsByHour)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));

    if (peakHours.length > 0) {
      improvements.push(`Heures de publication optimales identifiées: ${peakHours.join(', ')}h`);
    }

    const { data: bestPerformingPosts } = await supabase
      .from('blog_posts')
      .select('keywords, views_count')
      .order('views_count', { ascending: false })
      .limit(10);

    if (bestPerformingPosts && bestPerformingPosts.length > 0) {
      const keywordFrequency: { [key: string]: number } = {};

      bestPerformingPosts.forEach(post => {
        if (post.keywords) {
          post.keywords.forEach((kw: string) => {
            keywordFrequency[kw] = (keywordFrequency[kw] || 0) + 1;
          });
        }
      });

      const topKeywords = Object.entries(keywordFrequency)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([kw]) => kw);

      if (topKeywords.length > 0) {
        recommendations.push(`Keywords performants à prioriser: ${topKeywords.join(', ')}`);
      }
    }

    const randomPercentage = Math.floor(Math.random() * 10) + 10;
    const { data: randomPosts } = await supabase
      .from('blog_posts')
      .select('id')
      .limit(Math.floor(recentPosts.length * randomPercentage / 100));

    if (randomPosts && randomPosts.length > 0) {
      const updatePromises = randomPosts.map(post =>
        supabase
          .from('blog_posts')
          .update({
            updated_at: new Date().toISOString()
          })
          .eq('id', post.id)
      );

      await Promise.all(updatePromises);
      improvements.push(`${randomPosts.length} articles mis à jour pour signal fraîcheur`);
    }

    const { data: citiesWithoutPages } = await supabase
      .from('french_cities')
      .select('name, population')
      .gt('population', 100000)
      .order('population', { ascending: false })
      .limit(20);

    if (citiesWithoutPages) {
      const { data: existingPages } = await supabase
        .from('city_pages')
        .select('city');

      const existingCityNames = existingPages?.map(p => p.city.toLowerCase()) || [];
      const missingCities = citiesWithoutPages.filter(
        city => !existingCityNames.includes(city.name.toLowerCase())
      );

      if (missingCities.length > 0) {
        recommendations.push(`${missingCities.length} grandes villes sans page (priorité haute)`);
      }
    }

    const report = {
      success: true,
      timestamp: new Date().toISOString(),
      analytics: {
        total_posts_analyzed: recentPosts.length,
        avg_naturalness_score: Math.round(avgScore),
        avg_views: Math.round(avgViews),
        peak_hours: peakHours,
      },
      improvements,
      recommendations,
      next_actions: [
        avgScore < 75 ? 'Améliorer prompts anti-IA' : 'Maintenir qualité actuelle',
        avgViews < 5 ? 'Augmenter promotion social media' : 'Continuer stratégie actuelle',
        'Varier horaires de publication pour éviter patterns',
        'Ajouter plus de long-tail keywords',
      ],
    };

    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error seo-adaptive-improver:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
