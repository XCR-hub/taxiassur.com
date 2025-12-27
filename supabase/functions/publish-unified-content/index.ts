import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { content } = await req.json();

    if (!content) {
      throw new Error('Contenu manquant');
    }

    const results = {
      blogPost: null as any,
      cityPage: null as any,
      faq: [] as any[],
      newsArticle: null as any,
      errors: [] as string[]
    };

    // 1. PUBLIER L'ARTICLE DE BLOG
    if (content.blogPost) {
      try {
        const blogSlug = `${content.blogPost?.slug ?? 'article'}-${Date.now()}`;
        const featuredImage = content.blogPost?.featuredImage || null;

        const { data: blogData, error: blogError } = await supabaseAdmin
          .from('blog_posts')
          .insert({
            slug: blogSlug,
            title: content.blogPost?.title ?? 'Titre',
            excerpt: content.blogPost?.excerpt ?? '',
            content: content.blogPost?.content ?? '',
            meta_title: content.blogPost?.title ?? 'Titre',
            meta_description: content.blogPost?.metaDescription ?? '',
            keywords: content.blogPost?.keywords ?? [],
            published: true,
            read_time: content.blogPost?.readingTime ?? 5,
            author: 'TaxiAssur',
            featured_image: featuredImage,
            image_alt: content.blogPost?.imageAlt || null
          })
          .select()
          .single();

        if (blogError) {
          console.error('Blog post error:', blogError);
          results.errors.push(`Article: ${blogError.message}`);
        } else {
          results.blogPost = blogData;
          console.log('✅ Article publié:', blogData?.slug);
        }
      } catch (err: any) {
        console.error('Blog post exception:', err);
        results.errors.push(`Article: ${err.message}`);
      }
    }

    // 2. PUBLIER LA PAGE VILLE
    if (content.cityPage) {
      try {
        const { data: cityData, error: cityError } = await supabaseAdmin
          .from('city_pages')
          .insert({
            city: content.cityPage?.city ?? 'Paris',
            title: content.cityPage?.title ?? 'Titre',
            slug: content.cityPage?.slug ?? 'slug',
            content: content.cityPage?.content ?? '',
            meta_description: content.cityPage?.metaDescription ?? '',
            keywords: content.cityPage?.keywords ?? [],
            dept: content.cityPage?.dept ?? null,
            region: content.cityPage?.region ?? null,
            population: content.cityPage?.population ?? null,
            taxi_count: content.cityPage?.taxi_count ?? null,
            status: 'published'
          })
          .select()
          .single();

        if (cityError) {
          console.error('City page error:', cityError);
          if (!cityError.message.includes('duplicate key')) {
            results.errors.push(`Page ville: ${cityError.message}`);
          } else {
            console.log('⚠️ Page ville existe déjà, ignorée');
          }
        } else {
          results.cityPage = cityData;
          console.log('✅ Page ville publiée:', cityData?.city);
        }
      } catch (err: any) {
        console.error('City page exception:', err);
        if (!err.message.includes('duplicate key')) {
          results.errors.push(`Page ville: ${err.message}`);
        }
      }
    }

    // 3. PUBLIER TOUTES LES FAQ
    if (content.faq && content.faq.length > 0) {
      try {
        const faqEntries = content.faq.map((faq: any, index: number) => ({
          question: faq?.question ?? 'Question',
          answer: faq?.answer ?? 'Réponse',
          category: faq?.category ?? 'Général',
          order_index: index
        }));

        const { data: faqData, error: faqError } = await supabaseAdmin
          .from('faq_entries')
          .insert(faqEntries)
          .select();

        if (faqError) {
          console.error('FAQ insert error:', faqError);
          results.errors.push(`FAQ: ${faqError.message}`);
        } else {
          results.faq = faqData || [];
          console.log(`✅ ${faqData?.length || 0} FAQ publiées`);
        }
      } catch (err: any) {
        console.error('FAQ exception:', err);
        results.errors.push(`FAQ: ${err.message}`);
      }
    }

    // 4. PUBLIER L'ACTUALITÉ
    if (content.newsArticle) {
      try {
        const newsSlug = content.newsArticle.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-');

        const { data: newsData, error: newsError } = await supabaseAdmin
          .from('news_articles')
          .insert({
            title: content.newsArticle.title,
            slug: newsSlug,
            content: content.newsArticle.content,
            excerpt: content.newsArticle.content.replace(/<[^>]*>/g, '').substring(0, 150),
            image_url: content.newsArticle.imageUrl || null,
            category: content.newsArticle.category || 'Réglementation',
            tags: content.newsArticle.tags || [],
            featured: content.newsArticle.featured || false,
            status: 'published'
          })
          .select()
          .single();

        if (newsError) {
          console.error('News article error:', newsError);
          results.errors.push(`Actualité: ${newsError.message}`);
        } else {
          results.newsArticle = newsData;
          console.log('✅ Actualité publiée:', newsData?.slug);
        }
      } catch (err: any) {
        console.error('News article exception:', err);
        results.errors.push(`Actualité: ${err.message}`);
      }
    }

    // Calculer le succès
    const successCount = [
      results.blogPost,
      results.cityPage,
      results.faq.length > 0,
      results.newsArticle
    ].filter(Boolean).length;

    return new Response(
      JSON.stringify({
        success: successCount > 0,
        results,
        message: results.errors.length > 0
          ? `Publié avec ${results.errors.length} erreur(s)`
          : 'Contenu publié avec succès'
      }),
      {
        status: results.errors.length === 4 ? 500 : 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Global error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erreur inconnue'
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});