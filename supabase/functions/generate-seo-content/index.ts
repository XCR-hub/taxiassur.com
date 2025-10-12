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

    const prompt = `Écris un article de blog professionnel sur "${keyword}" pour TaxiAssur.com

OBLIGATOIRE : Le contenu DOIT être en HTML complet et valide.

Structure HTML requise :
<h2>Titre de section</h2>
<p>Paragraphe avec du texte. Utilise <strong>gras</strong> pour les mots importants.</p>
<ul>
  <li>Liste à puces</li>
  <li>Autre élément</li>
</ul>

Ton : Conversationnel, expert, naturel
Longueur : 1800-2200 mots

Sections à inclure :
1. <h2>Pourquoi ${keyword} est crucial</h2>
2. <h2>Ce que vous devez savoir</h2>
3. <h2>Comment économiser</h2>
4. <h2>Nos conseils d'expert</h2>

Prix à mentionner :
- Paris : 1800-2400€/an
- Province : 1200-1800€/an

FAQ : 5 questions avec réponses courtes

Format JSON EXACT :
{
  "title": "Titre avec ${keyword} (60 caractères max)",
  "slug": "mot-cle-separe-par-tirets",
  "metaDescription": "Description 155 caractères avec ${keyword}",
  "content": "<h2>Premier titre</h2><p>Premier paragraphe...</p>",
  "excerpt": "Résumé court",
  "faq": [{"question": "Question ?", "answer": "Réponse claire"}],
  "keywords": ["${keyword}", "assurance taxi", "RC professionnelle"],
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
            content: `Tu es un expert rédacteur web spécialisé en assurance.

RÈGLES ABSOLUES :
1. Le contenu DOIT être en HTML valide (balises <h2>, <p>, <strong>, <ul>, <li>)
2. JAMAIS de markdown (pas de ###, **, -, etc.)
3. Chaque section commence par <h2>Titre</h2>
4. Chaque paragraphe est dans <p>...</p>
5. Les listes sont en <ul><li>...</li></ul>
6. Réponds UNIQUEMENT en JSON valide sans markdown`
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