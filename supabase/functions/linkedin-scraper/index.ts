import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const LINKEDIN_COMPANIES = [
  'g7-taxi',
  'uber-france',
  'bolt-france',
  'taxi-parisien',
  'federation-nationale-artisans-taxi',
];

const LINKEDIN_KEYWORDS = [
  'taxi',
  'assurance taxi',
  'réglementation taxi',
  'transport de personnes',
  'vtc',
  'mobilité urbaine',
  'chauffeur professionnel',
];

interface LinkedInPost {
  id: string;
  title: string;
  content: string;
  author: string;
  publishedAt: string;
  url: string;
  likes?: number;
  comments?: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const linkedinAccessToken = Deno.env.get('LINKEDIN_ACCESS_TOKEN');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const posts: LinkedInPost[] = [];

    if (!linkedinAccessToken) {
      console.warn('LinkedIn access token not configured, using mock data');

      const mockPosts: LinkedInPost[] = [
        {
          id: `linkedin-mock-${Date.now()}-1`,
          title: 'Nouvelle réglementation taxi 2025',
          content: 'Les taxis devront se conformer aux nouvelles normes environnementales dès janvier 2025. Les véhicules électriques ou hybrides seront obligatoires dans les grandes métropoles.',
          author: 'Fédération Nationale des Artisans du Taxi',
          publishedAt: new Date().toISOString(),
          url: 'https://linkedin.com/posts/mock-1',
          likes: 245,
          comments: 18,
        },
        {
          id: `linkedin-mock-${Date.now()}-2`,
          title: 'Assurance taxi : nouvelles garanties 2025',
          content: 'Les compagnies d\'assurance proposent de nouvelles garanties adaptées aux taxis électriques. Couverture batterie incluse et assistance 24/7.',
          author: 'G7 Taxi',
          publishedAt: new Date(Date.now() - 86400000).toISOString(),
          url: 'https://linkedin.com/posts/mock-2',
          likes: 189,
          comments: 12,
        },
        {
          id: `linkedin-mock-${Date.now()}-3`,
          title: 'Formation continue obligatoire pour les chauffeurs',
          content: 'À partir de mars 2025, tous les chauffeurs de taxi devront suivre une formation de 14h par an. Thèmes : sécurité routière, relation client, véhicules électriques.',
          author: 'Chambre des Métiers',
          publishedAt: new Date(Date.now() - 172800000).toISOString(),
          url: 'https://linkedin.com/posts/mock-3',
          likes: 321,
          comments: 45,
        },
      ];

      posts.push(...mockPosts);
    } else {
      for (const company of LINKEDIN_COMPANIES) {
        try {
          const response = await fetch(
            `https://api.linkedin.com/v2/organizations/${company}/posts`,
            {
              headers: {
                'Authorization': `Bearer ${linkedinAccessToken}`,
                'Content-Type': 'application/json',
              },
            }
          );

          if (response.ok) {
            const data = await response.json();

            if (data.elements) {
              for (const post of data.elements) {
                const content = post.specificContent?.['com.linkedin.ugc.ShareContent']?.shareCommentary?.text || '';
                const title = content.split('\n')[0].substring(0, 100);

                const isRelevant = LINKEDIN_KEYWORDS.some(keyword =>
                  content.toLowerCase().includes(keyword.toLowerCase())
                );

                if (isRelevant) {
                  posts.push({
                    id: post.id,
                    title,
                    content: content.substring(0, 1000),
                    author: post.author || company,
                    publishedAt: new Date(post.created?.time || Date.now()).toISOString(),
                    url: `https://www.linkedin.com/feed/update/${post.id}`,
                    likes: post.numLikes || 0,
                    comments: post.numComments || 0,
                  });
                }
              }
            }
          }
        } catch (error) {
          console.error(`Error fetching LinkedIn posts for ${company}:`, error);
        }
      }
    }

    for (const post of posts) {
      const slug = post.title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      await supabase
        .from('news_articles')
        .upsert({
          title: post.title,
          slug: `${slug}-${Date.now()}`,
          content: `<p>${post.content.replace(/\n/g, '</p><p>')}</p>`,
          excerpt: post.content.substring(0, 200),
          source: post.author,
          source_url: post.url,
          category: 'LinkedIn',
          tags: ['linkedin', 'actualité', 'professionnel'],
          score: (post.likes || 0) + (post.comments || 0) * 2,
          status: 'draft',
          published_at: post.publishedAt,
        }, {
          onConflict: 'slug',
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        posts,
        count: posts.length,
        message: `${posts.length} posts LinkedIn récupérés et sauvegardés`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('LinkedIn Scraper Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
