import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // GET - Liste articles
    if (req.method === 'GET' && !action) {
      const { data, error } = await supabase.rpc('get_blog_posts');
      
      if (error) {
        console.error('Error fetching posts:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      return new Response(
        JSON.stringify(data),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // GET - Article individuel
    if (req.method === 'GET' && action === 'get_one') {
      const slug = url.searchParams.get('slug');
      
      if (!slug) {
        return new Response(
          JSON.stringify({ error: 'Slug required' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const { data, error } = await supabase.rpc('get_blog_post_by_slug', { p_slug: slug });
      
      if (error) {
        console.error('Error fetching post:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      return new Response(
        JSON.stringify(data),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // POST - Créer/Update article
    if (req.method === 'POST') {
      const article = await req.json();

      // Validation
      if (!article.slug || !article.title || !article.excerpt || !article.content) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: slug, title, excerpt, content' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Utilise la fonction SQL upsert_blog_post
      const { data, error } = await supabase.rpc('upsert_blog_post', {
        p_slug: article.slug,
        p_title: article.title,
        p_excerpt: article.excerpt,
        p_content: article.content,
        p_tags: article.tags || [],
        p_faq: article.faq || []
      });

      if (error) {
        console.error('Error upserting post:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Compter les FAQ extraites
      const faqCount = article.faq ? article.faq.length : 0;

      return new Response(
        JSON.stringify({
          success: true,
          data,
          faq_extracted: faqCount
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});