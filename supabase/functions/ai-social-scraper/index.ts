import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Scrape Facebook Groups Taxi (simulation - en réel utiliser API/scraper)
    const facebookPosts = await scrapeFacebookGroups();

    // Scrape LinkedIn Posts (simulation)
    const linkedInPosts = await scrapeLinkedInPosts();

    // Scrape Reddit (simulation)
    const redditPosts = await scrapeRedditPosts();

    const allPosts = [...facebookPosts, ...linkedInPosts, ...redditPosts];

    // Insérer les posts scrapés dans la DB
    for (const post of allPosts) {
      const { error } = await supabase
        .from('social_posts_scraped')
        .insert(post)
        .select()
        .maybeSingle();

      if (error && !error.message.includes('duplicate')) {
        console.error('Error inserting post:', error);
      }
    }

    // Générer réponses pour les posts qui nécessitent une réponse
    const { data: postsToRespond } = await supabase
      .from('social_posts_scraped')
      .select('*')
      .eq('should_respond', true)
      .eq('response_generated', false)
      .limit(10);

    if (postsToRespond && postsToRespond.length > 0) {
      for (const post of postsToRespond) {
        const response = await generateAIResponse(post.content, post.platform);

        if (response) {
          // Insérer la réponse générée
          await supabase
            .from('ai_responses_generated')
            .insert({
              target_type: 'social_post',
              target_id: post.id,
              original_content: post.content,
              generated_response: response.text,
              confidence_score: response.confidence,
              tone: response.tone,
              includes_link: true,
              link_url: 'https://taxiassur.com/devis?utm_source=social&utm_medium=comment',
              status: response.confidence > 0.8 ? 'approved' : 'pending'
            });

          // Marquer le post comme répondu
          await supabase
            .from('social_posts_scraped')
            .update({ response_generated: true })
            .eq('id', post.id);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        stats: {
          posts_scraped: allPosts.length,
          posts_to_respond: postsToRespond?.length || 0,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-social-scraper:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Fonction de scraping Facebook (simulation)
async function scrapeFacebookGroups() {
  // En production: utiliser Facebook Graph API ou scraper
  const mockPosts = [
    {
      platform: 'facebook',
      post_url: `https://facebook.com/groups/taxi/posts/${Date.now()}`,
      author: 'Taxi Driver',
      content: 'Quelqu\'un connaît une bonne assurance taxi pas chère ? La mienne me coûte une fortune...',
      post_date: new Date().toISOString(),
      engagement_count: 5,
    },
    {
      platform: 'facebook',
      post_url: `https://facebook.com/groups/taxi/posts/${Date.now() + 1}`,
      author: 'Driver Pro',
      content: 'RC Pro obligatoire pour taxi VTC ? Qui propose les meilleurs tarifs ?',
      post_date: new Date().toISOString(),
      engagement_count: 12,
    }
  ];

  return mockPosts;
}

// Fonction scraping LinkedIn
async function scrapeLinkedInPosts() {
  const mockPosts = [
    {
      platform: 'linkedin',
      post_url: `https://linkedin.com/posts/${Date.now()}`,
      author: 'Taxi Professional',
      content: 'En tant que chauffeur de taxi, quelle assurance recommandez-vous pour optimiser les coûts tout en gardant une bonne couverture ?',
      post_date: new Date().toISOString(),
      engagement_count: 8,
    }
  ];

  return mockPosts;
}

// Fonction scraping Reddit
async function scrapeRedditPosts() {
  const mockPosts = [
    {
      platform: 'reddit',
      post_url: `https://reddit.com/r/taxi/comments/${Date.now()}`,
      author: 'TaxiDriver2024',
      content: 'Je cherche un courtier spécialisé en assurance taxi. Des recommandations ?',
      post_date: new Date().toISOString(),
      engagement_count: 15,
    }
  ];

  return mockPosts;
}

// Génération de réponse IA contextuelle
async function generateAIResponse(postContent: string, platform: string) {
  const lowerContent = postContent.toLowerCase();

  // Analyse du contenu pour générer une réponse appropriée
  let tone: 'professional' | 'casual' | 'empathetic' = 'professional';
  let confidence = 0.5;
  let response = '';

  // Détection du contexte
  if (lowerContent.includes('pas cher') || lowerContent.includes('économiser') || lowerContent.includes('coût')) {
    tone = 'empathetic';
    confidence = 0.9;
    response = platform === 'linkedin'
      ? `Je comprends vos préoccupations sur les coûts d'assurance. En tant que courtier spécialisé taxi, nous avons négocié des tarifs préférentiels avec plusieurs assureurs. N'hésitez pas à comparer : https://taxiassur.com/devis`
      : `Totalement d'accord ! Les tarifs varient énormément. Nous avons justement négocié des tarifs spéciaux pour chauffeurs : https://taxiassur.com/devis (devis gratuit en 2min)`;
  }
  else if (lowerContent.includes('recommand') || lowerContent.includes('courtier') || lowerContent.includes('meilleur')) {
    tone = 'professional';
    confidence = 0.95;
    response = platform === 'linkedin'
      ? `Bonjour, en tant que courtier ORIAS spécialisé en assurance taxi depuis 2025, nous aidons +100 chauffeurs à optimiser leur couverture. Devis personnalisé : https://taxiassur.com/devis`
      : `Je recommande de faire plusieurs devis. Nous sommes spécialisés taxi/VTC avec tarifs négociés -35%. Gratuit et sans engagement : https://taxiassur.com/devis`;
  }
  else if (lowerContent.includes('rc pro') || lowerContent.includes('obligatoire') || lowerContent.includes('couverture')) {
    tone = 'professional';
    confidence = 0.85;
    response = `Oui, la RC Professionnelle est obligatoire pour tous les taxis et VTC. Elle couvre votre responsabilité vis-à-vis des tiers. Nous proposons des formules complètes : https://taxiassur.com/devis`;
  }
  else {
    // Réponse générique
    tone = 'casual';
    confidence = 0.6;
    response = `Bonjour ! Pour les questions d'assurance taxi, n'hésitez pas à consulter TaxiAssur (courtier spécialisé). Devis gratuit : https://taxiassur.com/devis`;
  }

  return {
    text: response,
    tone,
    confidence
  };
}
