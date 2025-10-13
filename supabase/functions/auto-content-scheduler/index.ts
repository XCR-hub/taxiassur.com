import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

/**
 * Supabase Edge Function: Auto Content Scheduler
 *
 * S'exécute automatiquement via Supabase Cron (toutes les 2 heures)
 * Génère du contenu SEO de manière naturelle et automatique
 */

interface ScheduledContent {
  id: string;
  keyword: string;
  city: string;
  secondary_keywords: string[] | null;
  variability_config: {
    styleIndex: number;
    addTransitions: boolean;
    addEmojis: boolean;
    targetWordCount: number;
    errorRate: number;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Récupérer le prochain contenu planifié
    const { data: scheduled, error: fetchError } = await supabase
      .rpc('get_next_scheduled_content');

    if (fetchError || !scheduled || scheduled.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No content scheduled at this time',
          error: fetchError?.message
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const content: ScheduledContent = scheduled[0];

    // 2. Marquer comme "generating"
    await supabase
      .from('content_automation_schedule')
      .update({ status: 'generating' })
      .eq('id', content.id);

    // 3. Appeler l'API de génération de contenu unifié
    const siteUrl = Deno.env.get('SITE_URL') || 'https://taxiassur.com';

    const generateResponse = await fetch(`${siteUrl}/api/generate-content.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        keyword: content.keyword,
        city: content.city,
        secondaryKeywords: content.secondary_keywords || [],
        mode: 'unified',
        variabilityConfig: content.variability_config
      }),
    });

    if (!generateResponse.ok) {
      throw new Error(`Generation failed: ${generateResponse.statusText}`);
    }

    const generated = await generateResponse.json();

    if (!generated.success) {
      throw new Error(generated.error || 'Generation failed');
    }

    // 4. Publier dans Supabase
    const { blogPost, cityPage, faq } = generated.content;

    // Publier article de blog
    const blogSlug = `${blogPost.slug}-${Date.now()}`;
    const { data: blogData, error: blogError } = await supabase
      .from('blog_posts')
      .insert({
        slug: blogSlug,
        title: blogPost.title,
        excerpt: blogPost.excerpt,
        content: blogPost.content,
        meta_title: blogPost.title,
        meta_description: blogPost.metaDescription,
        keywords: blogPost.keywords,
        published: true,
        read_time: blogPost.readingTime,
        author: 'TaxiAssur',
        featured_image: blogPost.featuredImage || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (blogError) {
      throw new Error(`Blog post error: ${blogError.message}`);
    }

    // Publier page ville
    let cityPageId = null;
    const { data: cityData, error: cityError } = await supabase
      .from('city_pages')
      .insert({
        city: cityPage.city,
        title: cityPage.title,
        slug: cityPage.slug,
        content: cityPage.content,
        meta_description: cityPage.metaDescription,
        keywords: cityPage.keywords,
        status: 'published',
        published_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (!cityError) {
      cityPageId = cityData.id;
    }

    // Publier FAQ
    let faqCount = 0;
    if (faq && faq.length > 0) {
      const faqEntries = faq.map((f: any, index: number) => ({
        question: f.question,
        answer: f.answer,
        category: f.category,
        order_index: index
      }));

      const { error: faqError } = await supabase
        .from('faq_entries')
        .insert(faqEntries);

      if (!faqError) {
        faqCount = faqEntries.length;
      }
    }

    // 5. Marquer comme publié
    await supabase.rpc('mark_content_published', {
      p_schedule_id: content.id,
      p_blog_post_id: blogData.id,
      p_city_page_id: cityPageId,
      p_faq_count: faqCount,
      p_naturalness_score: generated.content.metadata?.seoScore || null
    });

    // 6. Tracker l'URL pour indexation
    const blogUrl = `${siteUrl}/blog/${blogSlug}`;
    await supabase.rpc('track_url_for_indexation', {
      p_url: blogUrl,
      p_page_type: 'blog'
    });

    if (cityPageId) {
      const cityUrl = `${siteUrl}/ville/${cityPage.slug}`;
      await supabase.rpc('track_url_for_indexation', {
        p_url: cityUrl,
        p_page_type: 'city'
      });
    }

    // 7. Log dans history
    await supabase
      .from('content_generation_history')
      .insert({
        schedule_id: content.id,
        content_type: 'blog',
        content_id: blogData.id,
        word_count: generated.content.metadata?.totalWords || 0,
        naturalness_score: generated.content.metadata?.seoScore || 0,
        seo_score: generated.content.metadata?.seoScore || 0
      });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Content generated and published successfully',
        data: {
          schedule_id: content.id,
          blog_post_id: blogData.id,
          city_page_id: cityPageId,
          faq_count: faqCount,
          blog_url: blogUrl
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('Auto content scheduler error:', err);

    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
