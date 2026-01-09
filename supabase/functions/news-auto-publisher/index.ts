import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface NewsArticle {
  title: string;
  content: string;
  excerpt: string;
  category: string;
  tags: string[];
  image_url: string;
  slug: string;
  status: 'published';
  published_at: string;
  score: number;
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
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    const pexelsKey = Deno.env.get('PEXELS_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Vérifier si un article a été publié récemment (moins de 2 jours)
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const { data: recentArticles, error: checkError } = await supabase
      .from('news_articles')
      .select('id, published_at')
      .eq('status', 'published')
      .gte('published_at', twoDaysAgo.toISOString())
      .order('published_at', { ascending: false })
      .limit(1);

    if (checkError) {
      throw new Error(`Erreur vérification articles: ${checkError.message}`);
    }

    if (recentArticles && recentArticles.length > 0) {
      console.log('Un article a déjà été publié dans les 2 derniers jours, skip');
      return new Response(
        JSON.stringify({
          message: 'Article déjà publié récemment',
          lastPublished: recentArticles[0].published_at
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Générer un sujet d'actualité pertinent
    const topics = [
      {
        title: "Nouvelle réglementation des taxis en France 2026",
        category: "réglementation",
        tags: ["réglementation", "taxi", "loi", "france"],
        keywords: "taxi regulation france city"
      },
      {
        title: "Assurance taxi : les tarifs en baisse pour 2026",
        category: "économie",
        tags: ["assurance", "tarifs", "économie", "taxi"],
        keywords: "taxi insurance affordable"
      },
      {
        title: "Véhicules électriques : l'avenir du taxi professionnel",
        category: "innovation",
        tags: ["électrique", "innovation", "écologie", "taxi"],
        keywords: "electric taxi green vehicle"
      },
      {
        title: "Comment optimiser sa couverture d'assurance taxi",
        category: "conseil",
        tags: ["assurance", "conseil", "optimisation", "taxi"],
        keywords: "taxi insurance coverage professional"
      },
      {
        title: "Les nouvelles aides pour les chauffeurs de taxi",
        category: "économie",
        tags: ["aides", "subventions", "chauffeurs", "taxi"],
        keywords: "taxi driver support help"
      },
      {
        title: "Sécurité routière : nouvelles obligations pour les taxis",
        category: "sécurité",
        tags: ["sécurité", "réglementation", "taxi"],
        keywords: "taxi safety road regulations"
      }
    ];

    // Choisir un sujet aléatoire
    const selectedTopic = topics[Math.floor(Math.random() * topics.length)];

    // Générer l'image UNIQUE via Pexels
    let imageUrl = '/logo-600x300.png'; // Fallback

    if (pexelsKey) {
      try {
        // Récupérer les images déjà utilisées pour éviter les doublons
        const { data: usedImages } = await supabase
          .from('news_articles')
          .select('image_url')
          .not('image_url', 'is', null)
          .limit(100);

        const usedUrls = usedImages?.map(a => a.image_url) || [];

        // Rechercher sur Pexels avec variation de page pour garantir l'unicité
        const randomPage = Math.floor(Math.random() * 20) + 1; // Page entre 1 et 20
        const pexelsResponse = await fetch(
          `https://api.pexels.com/v1/search?query=${encodeURIComponent(selectedTopic.keywords)}&per_page=15&page=${randomPage}&orientation=landscape`,
          {
            headers: {
              'Authorization': pexelsKey
            }
          }
        );

        if (pexelsResponse.ok) {
          const pexelsData = await pexelsResponse.json();

          if (pexelsData.photos && pexelsData.photos.length > 0) {
            // Trouver la première image NON utilisée
            for (const photo of pexelsData.photos) {
              if (!usedUrls.includes(photo.src.large)) {
                imageUrl = photo.src.large;
                console.log('✅ Image unique trouvée:', imageUrl);
                break;
              }
            }

            // Si toutes sont utilisées, prendre une au hasard avec timestamp pour unicité
            if (imageUrl === '/logo-600x300.png') {
              const randomPhoto = pexelsData.photos[Math.floor(Math.random() * pexelsData.photos.length)];
              imageUrl = randomPhoto.src.large + `?t=${Date.now()}`;
              console.log('⚠️ Image avec timestamp pour unicité:', imageUrl);
            }
          }
        }
      } catch (imageError) {
        console.error('Erreur génération image Pexels:', imageError);
      }
    }

    // Générer le contenu avec OpenAI
    let content = '';
    let excerpt = '';

    if (openaiKey) {
      try {
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'Tu es un expert en assurance taxi et rédacteur web professionnel. Écris des articles informatifs, utiles et optimisés SEO pour les chauffeurs de taxi français.'
              },
              {
                role: 'user',
                content: `Écris un article de blog complet (800-1000 mots) sur le sujet suivant : "${selectedTopic.title}".\n\nL'article doit :\n- Être rédigé en français professionnel\n- Contenir des informations pratiques et utiles\n- Inclure des sous-titres (## en markdown)\n- Être optimisé pour le SEO\n- Apporter de la valeur aux chauffeurs de taxi\n- Mentionner l'importance d'une bonne assurance\n\nFormat attendu :\n## Introduction\n[Paragraphe d'introduction engageant]\n\n## [Titre section 1]\n[Contenu détaillé]\n\n## [Titre section 2]\n[Contenu détaillé]\n\n## [Titre section 3]\n[Contenu détaillé]\n\n## Conclusion\n[Paragraphe de conclusion avec appel à l'action]`
              }
            ],
            temperature: 0.8,
            max_tokens: 2000
          })
        });

        if (openaiResponse.ok) {
          const openaiData = await openaiResponse.json();
          content = openaiData.choices[0].message.content;

          // Générer un excerpt à partir du contenu
          const firstParagraph = content.split('\n\n')[1] || content.split('\n\n')[0];
          excerpt = firstParagraph.replace(/^#+\s+/, '').substring(0, 200) + '...';

          console.log('✅ Contenu généré avec OpenAI');
        } else {
          throw new Error('Erreur OpenAI API');
        }
      } catch (aiError) {
        console.error('Erreur génération contenu:', aiError);
        // Fallback: contenu générique
        content = generateFallbackContent(selectedTopic);
        excerpt = `Découvrez notre guide complet sur ${selectedTopic.title.toLowerCase()}. Conseils pratiques et informations essentielles pour les professionnels du taxi.`;
      }
    } else {
      // Pas d'API OpenAI: contenu générique
      content = generateFallbackContent(selectedTopic);
      excerpt = `Découvrez notre guide complet sur ${selectedTopic.title.toLowerCase()}. Conseils pratiques et informations essentielles pour les professionnels du taxi.`;
    }

    // Créer le slug
    const slug = selectedTopic.title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      + '-' + Date.now();

    // Créer l'article
    const newArticle: NewsArticle = {
      title: selectedTopic.title,
      content,
      excerpt,
      category: selectedTopic.category,
      tags: selectedTopic.tags,
      image_url: imageUrl,
      slug,
      status: 'published',
      published_at: new Date().toISOString(),
      score: Math.floor(Math.random() * 20) + 80 // Score entre 80 et 100
    };

    // Insérer dans la base de données
    const { data: insertedArticle, error: insertError } = await supabase
      .from('news_articles')
      .insert(newArticle)
      .select()
      .single();

    if (insertError) {
      throw new Error(`Erreur insertion article: ${insertError.message}`);
    }

    console.log('✅ Article publié avec succès:', insertedArticle.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Article publié avec succès',
        article: {
          id: insertedArticle.id,
          title: insertedArticle.title,
          slug: insertedArticle.slug,
          image_url: insertedArticle.image_url,
          published_at: insertedArticle.published_at
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error('❌ Erreur:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erreur inconnue'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Fonction pour générer un contenu fallback
function generateFallbackContent(topic: any): string {
  return `## Introduction\n\n${topic.title} est un sujet essentiel pour tous les professionnels du taxi en France. Dans cet article, nous allons explorer les différents aspects de cette thématique et vous fournir des informations pratiques.\n\n## Points clés à retenir\n\n### 1. Comprendre les enjeux\n\nLes chauffeurs de taxi font face à de nombreux défis dans leur activité quotidienne. Une bonne compréhension de ${topic.title.toLowerCase()} est cruciale pour optimiser votre activité.\n\n### 2. Les bonnes pratiques\n\nVoici quelques recommandations essentielles :\n- Rester informé des évolutions réglementaires\n- Comparer régulièrement les offres d'assurance\n- Maintenir son véhicule en excellent état\n- Respecter les obligations légales\n\n### 3. L'importance de l'assurance\n\nUne assurance taxi adaptée est indispensable pour exercer sereinement votre activité. Elle vous protège contre les risques professionnels et vous permet de travailler en toute tranquillité.\n\n## Nos conseils d'experts\n\nTaxiAssur vous accompagne dans toutes vos démarches d'assurance. Nos experts analysent votre situation et vous proposent les meilleures solutions adaptées à vos besoins.\n\n### Pourquoi choisir TaxiAssur ?\n\n- **Expertise** : Plus de 10 ans d'expérience dans l'assurance taxi\n- **Tarifs compétitifs** : Les meilleures offres du marché\n- **Service personnalisé** : Un conseiller dédié à votre écoute\n- **Réactivité** : Devis en moins de 24h\n\n## Conclusion\n\n${topic.title} nécessite une attention particulière et une bonne préparation. N'hésitez pas à faire appel à nos experts pour obtenir des conseils personnalisés et un devis gratuit.\n\n**Contactez-nous dès maintenant** pour discuter de vos besoins et trouver l'assurance taxi qui vous correspond !`;
}