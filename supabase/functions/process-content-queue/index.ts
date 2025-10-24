import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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
    console.log('🔄 Process Content Queue: démarrage...');

    // 1. Récupérer les éléments en attente
    const { data: pendingItems, error: fetchError } = await supabase
      .from('content_generation_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(5); // Traiter 5 items max par exécution

    if (fetchError) {
      console.error('❌ Erreur récupération queue:', fetchError);
      throw fetchError;
    }

    if (!pendingItems || pendingItems.length === 0) {
      console.log('✅ Aucun élément en attente');
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: 'Aucun élément en attente' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`📋 ${pendingItems.length} élément(s) à traiter`);

    const results = [];

    // 2. Traiter chaque élément
    for (const item of pendingItems) {
      try {
        console.log(`🎯 Traitement: ${item.type} - ${item.keyword} @ ${item.city || 'France'}`);

        // Marquer comme en cours
        await supabase
          .from('content_generation_queue')
          .update({ status: 'processing' })
          .eq('id', item.id);

        // Appeler l'IA via generate-seo-content
        const aiResponse = await fetch(`${SUPABASE_URL}/functions/v1/generate-seo-content`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            keyword: item.keyword,
            city: item.city || 'France',
            mode: 'unified',
          }),
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          throw new Error(`IA Error ${aiResponse.status}: ${errorText}`);
        }

        const aiData = await aiResponse.json();

        if (!aiData.success) {
          throw new Error(aiData.error || 'Erreur génération IA');
        }

        const content = aiData.content;

        // 3. Insérer/Mettre à jour selon le type
        if (item.type === 'blog') {
          const blogPost = content.blogPost;

          const { error: insertError } = await supabase
            .from('blog_posts')
            .upsert({
              title: blogPost.title,
              slug: blogPost.slug,
              excerpt: blogPost.excerpt,
              content: blogPost.content,
              category: 'actualites',
              tags: blogPost.keywords || ['assurance', 'taxi'],
              published: true,
              featured_image: blogPost.featuredImage || 'https://images.pexels.com/photos/1118448/pexels-photo-1118448.jpeg',
              meta_description: blogPost.metaDescription,
            }, {
              onConflict: 'slug',
            });

          if (insertError) throw insertError;

          console.log(`✅ Article créé: ${blogPost.title}`);
        }

        if (item.type === 'city_page' && content.cityPage) {
          const cityPage = content.cityPage;

          const { error: insertError } = await supabase
            .from('city_pages')
            .upsert({
              city: cityPage.city,
              slug: cityPage.slug,
              title: cityPage.title,
              content: cityPage.content,
              meta_description: cityPage.metaDescription,
              keywords: cityPage.keywords,
              dept: cityPage.dept,
              region: cityPage.region,
              population: cityPage.population,
              taxi_count: cityPage.taxi_count,
              published: true,
            }, {
              onConflict: 'slug',
            });

          if (insertError) throw insertError;

          console.log(`✅ Page ville créée: ${cityPage.city}`);
        }

        if (item.type === 'faq' && content.faq && content.faq.length > 0) {
          for (const faq of content.faq) {
            await supabase
              .from('faq')
              .insert({
                question: faq.question,
                answer: faq.answer,
                category: faq.category || 'general',
                city: item.city,
                published: true,
              });
          }

          console.log(`✅ ${content.faq.length} FAQ créées`);
        }

        // 4. Marquer comme complété
        await supabase
          .from('content_generation_queue')
          .update({
            status: 'completed',
            result: content,
            processed_at: new Date().toISOString(),
          })
          .eq('id', item.id);

        results.push({
          id: item.id,
          type: item.type,
          keyword: item.keyword,
          city: item.city,
          status: 'success',
        });

      } catch (error) {
        console.error(`❌ Erreur traitement item ${item.id}:`, error);

        // Marquer comme échoué
        await supabase
          .from('content_generation_queue')
          .update({
            status: 'failed',
            error_message: error.message,
            processed_at: new Date().toISOString(),
          })
          .eq('id', item.id);

        results.push({
          id: item.id,
          type: item.type,
          keyword: item.keyword,
          city: item.city,
          status: 'error',
          error: error.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ Erreur globale:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
