import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

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

    let prompt = '';

    if (contentType === 'blog') {
      prompt = `Écris un article de blog NATUREL sur "${keyword}" pour TaxiAssur.com

🎯 OBJECTIF : Contenu 100% humain + SEO maximal + Indétectable par IA detectors

━━━ ÉCRITURE HUMAINE OBLIGATOIRE ━━━

DÉBUTE L'ARTICLE avec une de ces accroches :
- "Bon, je vais être franc avec vous..."
- "L'autre jour, un chauffeur m'a appelé en panique..."
- "Si vous cherchez [mot-clé], vous êtes au bon endroit."
- "Franchement, j'en ai marre de voir des chauffeurs se faire avoir..."

STYLE CONVERSATIONNEL :
✅ Tutoiement ou vouvoiement cohérent
✅ "Je" (15x), "nous" (10x), "vous" (20x minimum)
✅ Phrases courtes. Parfois très courtes. Genre 5 mots.
✅ Puis une phrase normale avec plusieurs éléments qui s'enchaînent naturellement.
✅ Questions directes : "Vous vous demandez combien ça coûte ?"
✅ Réponds : "Écoutez, voilà la vérité..."

ANECDOTES OBLIGATOIRES (2 minimum) :
- "J'avais un client, Ahmed, taxi à Lyon..."
- "Marie, qui bosse à Marseille, m'a raconté..."
- "Un chauffeur VTC m'a appelé la semaine dernière..."

ÉMOTIONS & OPINIONS :
😤 "Ça m'énerve de voir que..."
😅 "Bon, je vous l'avoue, au début j'y comprenais rien non plus"
💡 "Le truc que personne ne vous dit, c'est que..."
⚠️ "Attention, c'est là que ça devient chaud"

IMPERFECTIONS NATURELLES :
- Répète certains mots (naturel en parlant)
- Parenthèses avec remarques : "(oui oui, véridique !)"
- Incises : "- et croyez-moi j'en ai vu -"
- Hésitations écrites : "enfin, je veux dire..."

━━━ SEO ULTRA-PUISSANT ━━━

MOT-CLÉ EXACT "${keyword}" :
✅ Dans le H1 (titre principal)
✅ Dans les 100 premiers mots
✅ Dans 2-3 sous-titres H2
✅ Dans la meta description
✅ 5-7 fois dans l'article (densité 1-2%)

LSI KEYWORDS (synonymes naturels) :
${secondary.length > 0 ? secondary.join(', ') + ' +' : ''}
Protection professionnelle, garantie obligatoire, courtier agréé, devis rapide, attestation immédiate, sans engagement

MOTS-CLÉS LONGUE TRAÎNE (pour ranking rapide) :
- "combien coûte [mot-clé]"
- "[mot-clé] pas cher"
- "meilleure [mot-clé]"
- "[mot-clé] en ligne"

OPTIMISATION FEATURED SNIPPET :
Inclus une réponse directe 40-60 mots qui commence par : "Pour [mot-clé], il faut..."

━━━ STRUCTURE ARTICLE (1800-2200 mots) ━━━

📌 INTRO (150 mots) - ACCROCHE FORTE
- Démarre avec anecdote/question/stat choc
- Inclus "${keyword}" dans les 30 premiers mots
- Promesse claire : "Dans cet article, je vais vous montrer..."

📌 CORPS (5-6 sections H2)

Section 1 : "Pourquoi [mot-clé] est crucial" (250 mots)
→ Problème concret + conséquences
→ Anecdote client avec prénom

Section 2 : "Ce que vous devez absolument savoir" (300 mots)
→ 3-4 points essentiels
→ Chiffres précis : "1847€ en moyenne", "délai de 72h"
→ Inclus LSI keywords naturellement

Section 3 : "Les pièges à éviter" (250 mots)
→ Erreurs courantes
→ "Ne faites JAMAIS ça..."
→ Ton direct et cash

Section 4 : "Comment économiser (vraiment)" (300 mots)
→ Astuces concrètes numérotées 1-2-3
→ Comparaison de prix réels
→ "Chez nous, nos clients économisent 35% en moyenne"

Section 5 : "Témoignages et retours d'expérience" (200 mots)
→ 2-3 mini-témoignages avec prénoms
→ Avant/après concret

📌 FAQ (5 questions SEO-optimisées)
Questions exactes de Google Suggest :
"Combien coûte [mot-clé] ?"
"Est-ce que [mot-clé] est obligatoire ?"
"[Mot-clé] : quelle différence avec [alternative] ?"
"Puis-je obtenir [mot-clé] immédiatement ?"
"[Mot-clé] pas cher : comment faire ?"

Réponses : 50-80 mots, directes, avec chiffres

📌 CONCLUSION (100 mots) - CALL TO ACTION
- Récap 2 phrases max
- CTA motivant : "Obtenez votre devis en 2 minutes"
- Lien vers devis : "Découvrez nos tarifs"

━━━ DONNÉES À INTÉGRER ━━━

💰 PRIX (citez précisément) :
- Paris : 1800-2400€/an
- Lyon/Marseille : 1500-2000€/an
- Province : 1200-1800€/an
- Véhicules électriques : -10% vs thermique
- Jeunes conducteurs : +40% majoration
- Économie TaxiAssur : 35% en moyenne

📋 LÉGAL :
- RC Pro obligatoire (minimum 1 500 000€)
- Agrément ORIAS obligatoire pour courtiers
- Attestation délivrée en 15 minutes
- Carte pro taxi nécessaire

🚀 AVANTAGES TAXIASSUR :
- Devis en 2 minutes
- Attestation immédiate
- Sans engagement
- Comparaison automatique
- Support 7j/7

━━━ FORMAT JSON ATTENDU ━━━

{
  "title": "Titre H1 naturel avec mot-clé (max 60 caractères)",
  "slug": "url-seo-friendly-avec-tirets",
  "metaDescription": "Description 155 caractères max, avec ${keyword}, émotion, CTA",
  "content": "HTML complet avec <h2>, <p>, <strong>, <em>, <ul>, <li>. Minimum 1800 mots.",
  "excerpt": "Résumé engageant 2 phrases (150 caractères)",
  "faq": [
    {"question": "Question naturelle ?", "answer": "Réponse directe 50-80 mots"}
  ],
  "keywords": ["${keyword}", ...autres mots-clés identifiés],
  "readingTime": 8,
  "category": "guides"
}

⚠️ RAPPEL : Écris comme si tu racontais ça à un pote autour d'un café. Naturel, direct, utile.`;
    } else if (contentType === 'city') {
      prompt = `Page ville HYPER-LOCALE pour "${keyword} à ${targetCity}"

🎯 OBJECTIF : Contenu local expert + SEO local maximal + Ton natif de ${targetCity}

━━━ EXPERTISE LOCALE CRÉDIBLE ━━━

DÉMARRE avec :
"À ${targetCity}, [situation locale spécifique]..."
"Les chauffeurs de taxi de ${targetCity} le savent bien : [problème local]..."
"Si vous roulez sur ${targetCity}, vous avez remarqué que [observation locale]..."

CONNAISSANCE ULTRA-LOCALE (OBLIGATOIRE) :
✅ Quartiers/zones : "à Bellecour", "côté Gerland", "dans le 8ème"
✅ Points de référence : gare, aéroport, centre-ville, zones sensibles
✅ Trafic local : "les heures de pointe sur le périph", "la circulation vers Part-Dieu"
✅ Événements : "pendant les Lumières", "les jours de match", "en période Fête des Lumières"
✅ Comparez avec villes proches : "contrairement à Villeurbanne...", "comme à Saint-Priest..."

ANECDOTES LOCALES (2 minimum) :
"Ahmed, taxi à ${targetCity} depuis 8 ans, m'a raconté..."
"Une chauffeure de [quartier], Sophie, m'expliquait que..."
"Un collègue qui bosse principalement [zone locale]..."

━━━ SEO LOCAL PUISSANT ━━━

MOT-CLÉ LOCAL "${keyword} ${targetCity}" :
✅ Dans H1 : "[Keyword] à ${targetCity} : Guide Complet 2024"
✅ Dans premiers 50 mots
✅ Dans 3 H2 différents
✅ Dans meta description
✅ Variantes : "à ${targetCity}", "sur ${targetCity}", "${targetCity} [keyword]"

LSI KEYWORDS LOCAUX :
- "[keyword] [département]"
- "chauffeur taxi ${targetCity}"
- "assurance professionnelle ${targetCity}"
- "[keyword] pas cher ${targetCity}"
- "devis ${targetCity}"

LONG TAIL LOCAL :
- "combien coûte [keyword] à ${targetCity}"
- "[keyword] ${targetCity} prix"
- "meilleure [keyword] ${targetCity}"
- "[keyword] ${targetCity} comparatif"

━━━ STRUCTURE (1200-1500 mots) ━━━

📌 INTRO (120 mots)
- Problème/situation spécifique à ${targetCity}
- Chiffre local si dispo : "À ${targetCity}, environ [X] taxis..."
- Promesse : "Ce guide vous montre exactement..."

📌 Section 1 : "${keyword} à ${targetCity} : Spécificités et tarifs" (300 mots)
- Prix moyen local précis
- Comparaison avec villes voisines
- Facteurs qui influencent prix localement
- "À ${targetCity}, comptez entre X et Y euros..."

📌 Section 2 : "Ce qu'il faut savoir pour rouler à ${targetCity}" (250 mots)
- Zones à fort trafic
- Quartiers lucratifs
- Réglementations locales
- Points d'attention spécifiques

📌 Section 3 : "Comment économiser sur votre ${keyword} à ${targetCity}" (300 mots)
- 3-4 astuces locales concrètes
- Exemples de tarifs réels
- Économies possibles avec TaxiAssur
- "Nos clients de ${targetCity} économisent en moyenne..."

📌 Section 4 : "Témoignages de chauffeurs de ${targetCity}" (200 mots)
- 2-3 vrais retours avec prénoms
- Situations concrètes locales
- Avant/après

📌 FAQ LOCALE (5 questions)
"Combien coûte [keyword] à ${targetCity} ?"
"[Keyword] ${targetCity} : quelles garanties obligatoires ?"
"Puis-je avoir mon [keyword] immédiatement à ${targetCity} ?"
"${targetCity} : quelle différence avec [ville proche] ?"
"[Keyword] à ${targetCity} pour jeune conducteur : c'est possible ?"

━━━ DONNÉES LOCALES À INTÉGRER ━━━

💰 PRIX ESTIMATIFS ${targetCity} :
- Grande ville (Paris, Lyon, Marseille) : 1800-2400€/an
- Ville moyenne (Toulouse, Nice, Nantes) : 1500-2000€/an
- Petite ville : 1200-1600€/an

🚕 CONTEXTE LOCAL :
- Nombre de taxis approximatif
- Zones à fort trafic
- Aéroport/Gare principale
- Réglementation départementale

JSON ATTENDU :
{
  "title": "[Keyword] à ${targetCity} : Guide & Tarifs 2024",
  "slug": "keyword-ville-departement",
  "metaDescription": "[Keyword] à ${targetCity} ✓ Prix, garanties, devis. Guide local complet par expert.",
  "content": "HTML complet 1200+ mots avec références locales précises",
  "excerpt": "Tout savoir sur [keyword] à ${targetCity} : tarifs, spécificités, conseils.",
  "faq": [...],
  "keywords": ["${keyword} ${targetCity}", "${keyword} [département]", ...],
  "readingTime": 6,
  "category": "local"
}

⚠️ CRITIQUE : Prouve que tu connais VRAIMENT ${targetCity}. Cite quartiers, rues, lieux précis.`;
    } else if (contentType === 'comparison') {
      prompt = `Tu es un expert impartial. Crée un comparatif HONNET et HUMAIN sur "${keyword}".

🚨 RENDRE LE COMPARATIF HUMAIN ET CRÉDIBLE :

1. OBJECTIVITÉ APPARENTE
- Montre VRAIMENT les avantages ET inconvénients de chaque option
- N'oriende PAS trop vers TaxiAssur (rester crédible)
- Admets quand une solution concurrente est meilleure dans certains cas
- Utilise "ça dépend de votre situation"

2. COMPARAISONS CONCRÈTES
- Tableaux avec chiffres réels
- Exemples de profils types (Marc, 28 ans, taxi Paris...)
- Scénarios concrets : "Si vous roulez plus de 50 000 km/an..."

3. TON ÉQUILIBRÉ
- Pas de superlatifs exagérés
- Reconnaissance des limites
- Conseil personnalisé selon profil

STRUCTURE (1000-1500 mots) :

Intro : Pourquoi comparer
Tableau comparatif HTML
Analyse détaillée point par point
Quand choisir option A vs option B
Recommandation finale nuancée
FAQ

Réponds en JSON :
{
  "title": "...",
  "slug": "...",
  "metaDescription": "...",
  "content": "...",
  "comparisonTable": "<table>...</table>",
  "conclusion": "Conclusion nuancée et honnête"
}`;
    }

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
            content: `Tu es Jean-Marc, courtier en assurance avec 15 ans d'expérience terrain. Tu écris sur ton blog perso.

🎯 MISSION : Écrire du contenu 100% INDÉTECTABLE comme contenu IA.

❌ INTERDICTIONS STRICTES (détection IA) :
- Mots/expressions IA : "en conclusion", "en résumé", "il est important de", "il convient de", "optimiser", "maximiser"
- Structure trop logique (intro/corps/conclusion parfaite)
- Phrases trop longues et complexes
- Listes numérotées partout
- Ton corporate/académique
- Transitions parfaites

✅ OBLIGATIONS (écriture humaine) :
- Commence par "Bon alors...", "Franchement...", "L'autre jour..."
- Utilise JE/NOUS/VOUS constamment
- Anecdotes perso : "J'avais un client, Karim, qui..."
- Phrases courtes. Très courtes parfois. Puis une plus longue avec plusieurs idées.
- Répète naturellement certains mots (humain)
- Ajoute parenthèses avec remarques perso (et oui, c'est du vécu !)
- Questions rhétoriques : "Vous vous demandez pourquoi ?"
- Émotions : frustration, soulagement, surprise
- Familiarités : "le truc", "pas mal", "carrément"

🔥 SEO ULTRA-PERFORMANT :
- Mot-clé exact dans H1, premier paragraphe, 1-2 H2, meta
- LSI keywords (synonymes) partout naturellement
- Mots-clés longue traîne dans FAQ
- Internal linking : "comme je l'explique dans..."
- Chiffres précis : 1847€, 23%, 48h
- Featured snippet ready : réponses directes 40-60 mots
- Schema.org ready (FAQ, Article)

Réponds UNIQUEMENT en JSON valide sans markdown.`
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.9,
        max_tokens: 4000,
        presence_penalty: 0.8,
        frequency_penalty: 0.6,
        top_p: 0.95,
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

    return new Response(
      JSON.stringify({
        success: true,
        content: generatedContent,
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