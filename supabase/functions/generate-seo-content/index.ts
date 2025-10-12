import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { keyword, type, city, secondaryKeywords } = await req.json();

    if (!keyword) {
      return new Response(
        JSON.stringify({ error: 'Keyword is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const contentType = type || 'blog';
    const targetCity = city || 'France';
    const secondary = secondaryKeywords || [];

    // Prompt pour génération blog (simplifié pour la limite de tokens)
    const prompt = `Écris un article de blog professionnel et naturel sur "${keyword}" pour TaxiAssur.com

Style : Conversationnel, expert, avec anecdotes
Longueur : 1800-2200 mots
Ton : Naturel, direct, humain

Structure :
- H1 : Titre avec "${keyword}"
- 5-6 sections H2
- FAQ (5 questions)
- Conclusion avec CTA

Données à intégrer :
- Prix Paris : 1800-2400€/an
- RC Pro obligatoire
- Devis TaxiAssur en 2 min

Format JSON :
{
  "title": "Titre naturel avec ${keyword}",
  "slug": "url-seo-friendly",
  "metaDescription": "155 caractères max",
  "content": "HTML complet avec <h2>, <p>, <strong>, <ul>",
  "excerpt": "Résumé 150 caractères",
  "faq": [{"question": "...", "answer": "..."}],
  "keywords": ["${keyword}", ...],
  "readingTime": 8
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Tu es un expert courtier en assurance. Écris du contenu naturel, conversationnel et SEO-optimisé. Réponds UNIQUEMENT en JSON valide.`
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.9,
        max_tokens: 4000,
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API Error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to generate content' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const data = await response.json();
    const generatedContent = JSON.parse(data.choices[0].message.content);

    // Sauvegarder l'article dans blog_posts
    const blogPost = {
      id: generatedContent.slug || `article-${Date.now()}`,
      title: generatedContent.title,
      excerpt: generatedContent.excerpt || generatedContent.metaDescription?.substring(0, 150) || '',
      content: generatedContent.content,
      author: 'TaxiAssur',
      cover_image: generatedContent.coverImage || null,
      tags: generatedContent.keywords || [keyword],
      published: true,
      faq: generatedContent.faq || []
    };

    const { data: insertedPost, error: insertError } = await supabase
      .from('blog_posts')
      .upsert(blogPost, { onConflict: 'id' })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to save blog post:', insertError);
    } else {
      console.log(`✅ Article saved: ${blogPost.title}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        content: generatedContent,
        saved: !insertError,
        post_id: blogPost.id,
        usage: {
          tokens: data.usage.total_tokens,
          cost: (data.usage.total_tokens / 1000000) * 2.5
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});