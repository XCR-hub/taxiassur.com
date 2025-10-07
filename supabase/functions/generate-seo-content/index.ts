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
      prompt = `Tu es un rédacteur expert en assurance avec 15 ans d'expérience. Écris comme un HUMAIN, pas comme une IA.

Sujet : "${keyword}"
Site : TaxiAssur.com (courtier ORIAS)

🚨 INSTRUCTIONS CRITIQUES POUR ÊTRE HUMAIN ET INDÉTECTABLE :

1. STYLE CONVERSATIONNEL NATUREL
- Utilise "je", "nous", "vous" fréquemment
- Commence par une anecdote ou question personnelle
- Inclus des expressions françaises courantes ("en fait", "d'ailleurs", "franchement")
- Varie BEAUCOUP la longueur des phrases (courtes + longues)
- Ajoute des phrases informelles : "Bon, sérieusement...", "Voilà le truc..."

2. IMPERFECTIONS VOLONTAIRES (RENDRE HUMAIN)
- Quelques répétitions naturelles de mots
- Transitions légèrement imparfaites
- Pas de structure trop parfaite
- Quelques parenthèses avec remarques personnelles
- Anecdotes et exemples CONCRETS de vrais chauffeurs

3. ÉVITER LES MARQUEURS IA
- PAS de liste numérotée partout
- PAS de "en conclusion", "en résumé" en fin d'article
- PAS de structure trop logique/académique
- PAS de "il est important de noter", "il convient de"
- PAS de phrases trop longues et complexes

4. TOUCHE HUMAINE
- Ajoute des émotions : frustration, soulagement, surprise
- Utilise des comparaisons du quotidien
- Raconte de mini-histoires vécues
- Pose des questions rhétoriques
- Interpelle directement le lecteur

5. EXPERTISE CRÉDIBLE
- Chiffres précis et récents (2024-2025)
- Exemples de cas réels avec prénoms
- Mention de pièges à éviter
- Conseils d'insider

STRUCTURE DE L'ARTICLE (1800-2200 mots) :

Introduction (150 mots)
- Commence par une question ou situation concrète
- Accroche émotionnelle
- Annonce du plan (informel)

5-6 Sections avec titres H2 engageants
- Titres sous forme de questions ou affirmations
- 200-300 mots par section
- Varie le format : paragraphes, listes courtes, citations
- Ajoute des exemples concrets avec prénoms

FAQ (5 questions)
- Questions comme les gens les tapent sur Google
- Réponses courtes et directes (50-80 mots)

Conclusion (100 mots)
- Ton motivant et actionnable
- CTA clair : "Découvrez nos tarifs" ou "Devis en 2 min"

Mots-clés secondaires à intégrer naturellement : ${secondary.join(', ')}

DONNÉES CONTEXTUELLES :
- Prix moyen assurance taxi : 1200-2400€/an selon ville
- Économie moyenne clients TaxiAssur : 35%
- Délai attestation : 15 minutes
- RC Pro obligatoire incluse
- ORIAS : garantie légale courtier
- Tesla/électrique : -10% vs thermique
- Jeune conducteur : +40%
- Paris : 1800-2400€/an
- Province : 1200-1800€/an

Réponds UNIQUEMENT en JSON valide :
{
  "title": "Titre H1 accrocheur et naturel",
  "slug": "url-amicale",
  "metaDescription": "Description 155 caractères avec émotion",
  "content": "Contenu HTML avec <h2>, <p>, <strong>, <em>, <ul>",
  "excerpt": "Résumé 2 phrases",
  "faq": [
    {"question": "...", "answer": "..."}
  ],
  "keywords": ["mot-clé 1", "mot-clé 2"],
  "readingTime": 8,
  "category": "guides",
  "authorTone": "conversational"
}`;
    } else if (contentType === 'city') {
      prompt = `Tu es un expert local en assurance taxi. Écris comme un HUMAIN qui connaît bien ${targetCity}.

Sujet : "${keyword} à ${targetCity}"

🚨 RENDRE ULTRA-LOCAL ET HUMAIN :

1. CONNAISSANCE LOCALE
- Mentionne des quartiers/zones spécifiques de ${targetCity}
- Référence à la vie locale (trafic, aéroport, gare, événements)
- Compare avec d'autres villes de la région
- Parle des spécificités du marché taxi local

2. STYLE CONVERSATIONNEL
- Tutoie ou vouvoie selon le contexte
- Utilise des expressions locales si pertinent
- Raconte l'expérience d'un chauffeur local (prénom + initiale)
- Ton chaleureux et proche

3. INFORMATIONS PRATIQUES
- Tarifs moyens à ${targetCity}
- Nombre approximatif de taxis
- Réglementation spécifique ville/département
- Meilleurs quartiers pour travailler
- Pièges à éviter localement

STRUCTURE (1200-1500 mots) :

Intro : Pourquoi l'assurance taxi à ${targetCity} est unique
Section 1 : Tarifs et spécificités locales
Section 2 : Ce que vous devez savoir sur ${targetCity}
Section 3 : Comment économiser localement
Section 4 : Témoignages de chauffeurs de ${targetCity}
FAQ locale (5 questions)

Mots-clés : ${secondary.join(', ')}

Réponds en JSON :
{
  "title": "...",
  "slug": "...",
  "metaDescription": "...",
  "content": "...",
  "localData": {
    "averagePrice": "1800€/an",
    "taxiCount": "estimatif",
    "specificRules": ["règle locale 1", "règle 2"]
  },
  "faq": [...]
}`;
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
            content: 'Tu es un rédacteur expert humain avec 15 ans d\'expérience en assurance. Tu écris comme un VRAI humain, pas comme une IA. Ton contenu doit être indétectable par les détecteurs d\'IA. Utilise un ton conversationnel, des imperfections naturelles, des anecdotes, des émotions. Varie la structure et évite les patterns d\'IA. Réponds UNIQUEMENT en JSON valide.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.85,
        max_tokens: 4000,
        presence_penalty: 0.7,
        frequency_penalty: 0.7,
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