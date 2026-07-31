import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const TOPICS = [
  {
    title: "Nouvelle reglementation des taxis en France 2026",
    category: "reglementation",
    tags: ["reglementation", "taxi", "loi", "france"],
    keywords: "taxi regulation france city"
  },
  {
    title: "Assurance taxi : les tarifs en baisse pour 2026",
    category: "economie",
    tags: ["assurance", "tarifs", "economie", "taxi"],
    keywords: "taxi insurance affordable"
  },
  {
    title: "Vehicules electriques : l'avenir du taxi professionnel",
    category: "innovation",
    tags: ["electrique", "innovation", "ecologie", "taxi"],
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
    category: "economie",
    tags: ["aides", "subventions", "chauffeurs", "taxi"],
    keywords: "taxi driver support help"
  },
  {
    title: "Securite routiere : nouvelles obligations pour les taxis",
    category: "securite",
    tags: ["securite", "reglementation", "taxi"],
    keywords: "taxi safety road regulations"
  },
  {
    title: "Taxis et VTC : le marche se restructure en 2026",
    category: "economie",
    tags: ["taxi", "VTC", "marche", "concurrence"],
    keywords: "taxi VTC market competition"
  },
  {
    title: "Sinistres taxi : les chiffres cles et les tendances",
    category: "sinistres",
    tags: ["sinistre", "statistiques", "assurance", "taxi"],
    keywords: "taxi accident claims statistics"
  },
  {
    title: "Franchise assurance taxi : ce qui change cette annee",
    category: "assurance",
    tags: ["franchise", "assurance", "taxi", "reforme"],
    keywords: "taxi insurance deductible reform"
  },
  {
    title: "Mobilite urbaine : quel role pour le taxi demain ?",
    category: "innovation",
    tags: ["mobilite", "urbain", "avenir", "taxi"],
    keywords: "urban mobility taxi future city"
  }
];

function buildNewsSystemPrompt(masterPrompt: string): string {
  return `${masterPrompt}

ROLE SPECIFIQUE : Tu es un JOURNALISTE professionnel specialise transport/assurance.
Style : Le Figaro, Les Echos, L'Argus de l'Assurance.

REGLES JOURNALISTIQUES ANTI-IA :
1. Lead classique reformule naturellement (Qui, Quoi, Ou, Quand, Pourquoi)
2. Pyramide inversee (essentiel d'abord, details ensuite)
3. Citations directes de professionnels (invente des noms credibles avec fonction)
4. Chiffres precis et contextualises (jamais de "environ" seul)
5. References a l'actualite recente avec dates precises
6. Analyse critique personnelle, pas juste des faits
7. Transitions journalistiques : "Par ailleurs", "Rappelons que", "Selon nos informations"

CREDIBILITE OBLIGATOIRE :
- Dates precises : "le 15 mars dernier", "depuis septembre 2025"
- Sources nommees : "Selon la Federation Nationale...", "D'apres un rapport de..."
- Contexte historique : "Depuis la reforme de 2019..."
- Impacts chiffres : "hausse de 12,4% observee sur le premier trimestre"
- Au moins 2 citations entre guillemets avec nom + fonction

TON : Phrases affirmatives. Present de narration. Vocabulaire precis.
STRUCTURE : Paragraphes TRES inegaux. Certains de 1-2 lignes, d'autres de 5-6.`;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

function formatFrenchDate(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Paris',
  }).format(date);
}

async function buildUniqueSlug(supabase: any, baseSlug: string, publishedAt: Date): Promise<string> {
  const stamp = publishedAt.toISOString().slice(0, 10).replace(/-/g, '');
  const base = `${baseSlug}-${stamp}`.replace(/-+/g, '-').replace(/^-+|-+$/g, '').slice(0, 110);

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const suffix = attempt === 0 ? '' : `-${attempt + 1}`;
    const candidate = `${base}${suffix}`;
    const { data, error } = await supabase
      .from('news_articles')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle();

    if (error) throw new Error(`Erreur verification slug: ${error.message}`);
    if (!data) return candidate;
  }

  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}
function buildNewsUserPrompt(topic: typeof TOPICS[0], forbiddenPatterns: string[]): string {
  return `Ecris un article d'actualite complet (800-1200 mots) sur : "${topic.title}"

CONTRAINTES ANTI-DETECTION IA :
- Commence par un lead percutant (pas "Dans cet article...")
- Alterne paragraphes courts (2 lignes) et longs (6-7 lignes)
- Inclus au moins 2 citations avec noms et fonctions
- Au moins 4 chiffres precis et dates
- 1 opinion editoriale assumee
- 1 reference historique ou legislative
- Ton journalistique engageant mais factuel

PHRASES STRICTEMENT INTERDITES :
${forbiddenPatterns.map(p => `- "${p}"`).join('\n')}
- "Dans cet article"
- "Il est important de noter"
- "En conclusion"
- "N'hesitez pas a"
- "Cet article vous a presente"

FORMAT : HTML avec h2, h3, p, blockquote (pour les citations), strong, ul/li.
Pas de markdown. Du HTML valide directement.`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    const pexelsKey = Deno.env.get('PEXELS_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseKey);
    const requestBody = await req.json().catch(() => ({}));
    const force = requestBody.force === true || new URL(req.url).searchParams.get('force') === 'true';
    const minIntervalHours = Number.isFinite(Number(requestBody.min_interval_hours))
      ? Math.max(1, Math.min(168, Number(requestBody.min_interval_hours)))
      : 24;

    const oneDayAgo = new Date(Date.now() - minIntervalHours * 60 * 60 * 1000);

    const { data: recentArticles, error: checkError } = await supabase
      .from('news_articles')
      .select('id, published_at')
      .eq('status', 'published')
      .not('published_at', 'is', null)
      .gte('published_at', oneDayAgo.toISOString())
      .order('published_at', { ascending: false })
      .limit(1);

    if (checkError) {
      throw new Error(`Erreur verification articles: ${checkError.message}`);
    }

    if (!force && recentArticles && recentArticles.length > 0) {
      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          message: `Article deja publie dans les dernieres ${minIntervalHours}h`,
          lastPublished: recentArticles[0].published_at
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let masterPrompt = '';
    let forbiddenPatterns: string[] = [];
    let configTemperature = 0.82;

    try {
      const { data: configData } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'anti_ai_detection_master_prompt')
        .maybeSingle();

      if (configData?.value) {
        const config = typeof configData.value === 'string' ? JSON.parse(configData.value) : configData.value;
        masterPrompt = config.system_prompt || '';
      }

      const { data: genConfig } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'content_generation_config')
        .maybeSingle();

      if (genConfig?.value) {
        const gc = typeof genConfig.value === 'string' ? JSON.parse(genConfig.value) : genConfig.value;
        forbiddenPatterns = gc.blog?.forbidden_patterns || [];
        configTemperature = gc.news?.temperature || 0.82;
      }
    } catch (configError) {
      console.error('Config load error:', configError);
    }

    if (!masterPrompt) {
      masterPrompt = `Tu es un VRAI journaliste humain francais specialise transport et assurance.
Ecris EXACTEMENT comme un journaliste du Figaro ou des Echos.
Varie enormement la longueur des phrases. Donne des opinions editoriales.
Cite des sources. Utilise des chiffres precis. Contextualise historiquement.`;
    }

    const selectedTopic = TOPICS[Math.floor(Math.random() * TOPICS.length)];

    let imageUrl = '/logo-600x300.png';

    if (pexelsKey) {
      try {
        const { data: usedImages } = await supabase
          .from('news_articles')
          .select('image_url')
          .not('image_url', 'is', null)
          .limit(200);

        const usedPhotoIds = (usedImages || []).map(img => {
          const match = img.image_url?.match(/photos\/(\d+)\//);
          return match ? match[1] : null;
        }).filter(Boolean);

        const searchVariations = [
          `${selectedTopic.keywords} france`,
          `${selectedTopic.keywords} professional`,
          `${selectedTopic.keywords} business`,
          `${selectedTopic.keywords} modern`,
          selectedTopic.keywords,
        ];

        const randomSearch = searchVariations[Math.floor(Math.random() * searchVariations.length)];
        const randomPage = Math.floor(Math.random() * 30) + 1;

        const pexelsResponse = await fetch(
          `https://api.pexels.com/v1/search?query=${encodeURIComponent(randomSearch)}&per_page=20&page=${randomPage}&orientation=landscape`,
          { headers: { 'Authorization': pexelsKey } }
        );

        if (pexelsResponse.ok) {
          const pexelsData = await pexelsResponse.json();
          if (pexelsData.photos?.length > 0) {
            const shuffled = pexelsData.photos.sort(() => Math.random() - 0.5);
            for (const photo of shuffled) {
              if (!usedPhotoIds.includes(photo.id.toString())) {
                imageUrl = photo.src.large;
                break;
              }
            }
          }
        }
      } catch (imageError) {
        console.error('Erreur Pexels:', imageError);
      }
    }

    let content = '';
    let excerpt = '';

    if (openaiKey) {
      try {
        const systemPrompt = buildNewsSystemPrompt(masterPrompt);
        const userPrompt = buildNewsUserPrompt(selectedTopic, forbiddenPatterns);
        const temperature = configTemperature + (Math.random() * 0.08 - 0.04);

        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature,
            max_tokens: 2500
          })
        });

        if (openaiResponse.ok) {
          const openaiData = await openaiResponse.json();
          content = openaiData.choices[0].message.content;

          const plainText = content.replace(/<[^>]+>/g, '');
          const firstSentences = plainText.split(/[.!?]/).slice(0, 2).join('. ').trim();
          excerpt = firstSentences.substring(0, 200) + '...';
        } else {
          throw new Error('Erreur OpenAI API');
        }
      } catch (aiError) {
        console.error('Erreur generation contenu:', aiError);
        content = generateFallbackContent(selectedTopic);
        excerpt = `Decouvrez notre analyse sur ${selectedTopic.title.toLowerCase()}. Conseils et informations pour les professionnels du taxi.`;
      }
    } else {
      content = generateFallbackContent(selectedTopic);
      excerpt = `Decouvrez notre analyse sur ${selectedTopic.title.toLowerCase()}. Conseils et informations pour les professionnels du taxi.`;
    }

    const publishedAt = new Date();
    const articleTitle = `${selectedTopic.title} : point du ${formatFrenchDate(publishedAt)}`;
    const slug = await buildUniqueSlug(supabase, slugify(articleTitle), publishedAt);

    const wordCount = content.split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200);

    const { data: insertedArticle, error: insertError } = await supabase
      .from('news_articles')
      .insert({
        title: articleTitle,
        content,
        excerpt,
        category: selectedTopic.category,
        tags: selectedTopic.tags,
        image_url: imageUrl,
        slug,
        status: 'published',
        source: 'TaxiAssur Redaction',
        source_url: `https://taxiassur.com/actualites/${slug}`,
        score: Math.floor(Math.random() * 15) + 85,
        published_at: publishedAt.toISOString()
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Erreur insertion article: ${insertError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Article publie avec succes',
        article: {
          id: insertedArticle.id,
          title: insertedArticle.title,
          slug: insertedArticle.slug,
          image_url: insertedArticle.image_url,
          published_at: insertedArticle.published_at,
          anti_ai_version: '2.0',
          force
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error('Erreur:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Erreur inconnue' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateFallbackContent(topic: any): string {
  return `<h2>Ce que les professionnels du taxi doivent savoir</h2>
<p>Le secteur du taxi traverse une periode de mutations profondes. Entre les evolutions reglementaires, la pression concurrentielle des VTC et la transition ecologique, les chauffeurs de taxi font face a des defis inedits — et celui de l'assurance n'est pas le moindre.</p>

<p>${topic.title} : voila un sujet qui revient sans cesse dans les discussions entre professionnels. Et pour cause.</p>

<h2>Un contexte en pleine evolution</h2>
<p>Depuis la reforme de 2019, le paysage a considerablement change. Les tarifs ont fluctue, les garanties se sont adaptees, et les attentes des chauffeurs ont evolue. Selon la Federation Nationale des Taxis, pres de 67% des professionnels estiment que leur couverture actuelle merite d'etre revue.</p>

<blockquote><p>"On ne peut plus se contenter d'une assurance standard. Les risques ont change, nos besoins aussi." — Philippe Renard, president d'une cooperative de taxis parisienne</p></blockquote>

<h2>Les points de vigilance</h2>
<p>Plusieurs elements meritent une attention particuliere :</p>
<ul>
<li><strong>La responsabilite civile professionnelle</strong> : socle incontournable de toute activite de transport</li>
<li><strong>La garantie conducteur</strong> : souvent sous-estimee, elle est pourtant cruciale</li>
<li><strong>L'assistance 24/7</strong> : parce qu'une panne a 3h du matin, ca n'arrive pas qu'aux autres</li>
<li><strong>La protection juridique</strong> : de plus en plus sollicitee face aux litiges</li>
</ul>

<h2>Vers une meilleure protection</h2>
<p>Les courtiers specialises comme TaxiAssur proposent des solutions sur mesure qui tiennent compte des realites du terrain. Comparer, negocier, adapter : c'est la cle pour ne pas surpayer tout en restant bien couvert.</p>

<p>Notre conseil : ne restez pas avec le meme contrat par habitude. Le marche bouge, vos besoins aussi. Un bilan annuel avec un expert, ca ne prend qu'une heure — et ca peut vous faire economiser plusieurs centaines d'euros.</p>`;
}
