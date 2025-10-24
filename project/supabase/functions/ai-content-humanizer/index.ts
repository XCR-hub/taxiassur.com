import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

/**
 * Stratégies d'humanisation du contenu pour éviter la détection IA
 */
const HUMANIZATION_STRATEGIES = {
  // Variations de ton et style
  tones: [
    'conversationnel', 'professionnel', 'amical', 'expert',
    'éducatif', 'persuasif', 'informatif', 'engageant'
  ],

  // Patterns d'écriture humaine
  humanPatterns: {
    // Ajouter des imperfections naturelles
    addMinorImperfections: (text: string) => {
      // Variation de longueur de phrases
      // Utilisation occasionnelle de contractions
      // Ponctuation variée
      return text;
    },

    // Varier la structure des phrases
    varyStructure: (sentences: string[]) => {
      const varied = [];
      let lastLength = 0;

      for (const sentence of sentences) {
        const currentLength = sentence.split(' ').length;
        // Éviter les phrases de même longueur consécutives
        if (Math.abs(currentLength - lastLength) < 3 && varied.length > 0) {
          // Reformuler pour varier
          varied.push(sentence);
        } else {
          varied.push(sentence);
        }
        lastLength = currentLength;
      }
      return varied;
    },

    // Ajouter des transitions naturelles
    addTransitions: (text: string) => {
      const transitions = [
        'D\'ailleurs', 'En effet', 'Par ailleurs', 'Cependant',
        'Ainsi', 'De plus', 'En outre', 'Néanmoins'
      ];

      const paragraphs = text.split('\n\n');
      return paragraphs.map((p, i) => {
        if (i > 0 && Math.random() > 0.6) {
          const transition = transitions[Math.floor(Math.random() * transitions.length)];
          return `${transition}, ${p.charAt(0).toLowerCase()}${p.slice(1)}`;
        }
        return p;
      }).join('\n\n');
    },

    // Ajouter des éléments personnels
    addPersonalTouch: (text: string) => {
      const personalElements = [
        'selon mon expérience',
        'personnellement',
        'je dirais que',
        'il me semble que',
        'de mon point de vue'
      ];

      // Ajouter occasionnellement
      if (Math.random() > 0.7) {
        const element = personalElements[Math.floor(Math.random() * personalElements.length)];
        return text.replace(/\. ([A-Z])/, `. ${element}, $1`);
      }
      return text;
    }
  },

  // Scores de détection IA (à inverser)
  antiDetectionTechniques: {
    // Perplexité: Mesure de prévisibilité
    // IA = faible perplexité (trop prévisible)
    // Humain = perplexité moyenne-élevée
    increasePerplexity: (text: string) => {
      // Remplacer mots trop communs par synonymes moins évidents
      const commonWords = {
        'très': ['particulièrement', 'extrêmement', 'vraiment'],
        'bon': ['excellent', 'remarquable', 'appréciable'],
        'important': ['essentiel', 'crucial', 'significatif'],
        'faire': ['réaliser', 'effectuer', 'accomplir']
      };

      let result = text;
      for (const [common, synonyms] of Object.entries(commonWords)) {
        if (Math.random() > 0.5) {
          const synonym = synonyms[Math.floor(Math.random() * synonyms.length)];
          result = result.replace(new RegExp(`\\b${common}\\b`, 'gi'), synonym);
        }
      }
      return result;
    },

    // Burstiness: Variation de la longueur des phrases
    // IA = uniformité
    // Humain = alternance phrases courtes/longues
    increaseBurstiness: (sentences: string[]) => {
      const burstPattern = [
        'short', 'long', 'medium', 'short', 'long', 'long', 'short'
      ];

      return sentences.map((sentence, i) => {
        const targetLength = burstPattern[i % burstPattern.length];
        const words = sentence.split(' ');

        if (targetLength === 'short' && words.length > 10) {
          // Diviser en 2 phrases
          const mid = Math.floor(words.length / 2);
          return `${words.slice(0, mid).join(' ')}. ${words.slice(mid).join(' ')}`;
        } else if (targetLength === 'long' && words.length < 15) {
          // Ajouter détails
          return sentence;
        }
        return sentence;
      });
    },

    // Ajouter des éléments contextuels et temporels
    addContextualElements: (text: string) => {
      const currentYear = new Date().getFullYear();
      const season = ['hiver', 'printemps', 'été', 'automne'][Math.floor(Math.random() * 4)];

      // Ajouter contexte temporel occasionnellement
      if (Math.random() > 0.8) {
        text = text.replace('actuellement', `en cet ${season} ${currentYear}`);
      }

      return text;
    }
  }
};

/**
 * Génère du contenu humanisé non-détectable
 */
async function generateHumanizedContent(
  prompt: string,
  contentType: string,
  tone: string = 'professionnel',
  options: any = {}
): Promise<any> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");

  if (!openaiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  // Prompt engineering pour contenu humain
  const systemPrompt = `Tu es un expert rédacteur humain avec 15 ans d'expérience.
Ton style d'écriture est naturel, varié et authentique.

RÈGLES STRICTES pour écrire comme un humain:
1. Varie la longueur des phrases (courtes, moyennes, longues)
2. Utilise des transitions naturelles et parfois imparfaites
3. Ajoute des expressions personnelles occasionnellement
4. Ne sois pas trop formel ou robotique
5. Utilise des synonymes variés
6. Inclus des anecdotes ou exemples concrets
7. Ton vocabulaire doit être riche mais naturel
8. Évite les listes à puces trop parfaites
9. Quelques légères imperfections sont naturelles
10. Ton ${tone}, mais avec une touche personnelle

IMPORTANT: Écris comme si tu parlais à un ami expert, pas comme une IA.`;

  const userPrompt = `${prompt}

Type de contenu: ${contentType}
Longueur souhaitée: ${options.length || 'moyenne'}
Mots-clés à inclure naturellement: ${options.keywords?.join(', ') || 'aucun'}

Écris ce contenu de manière authentique et humaine.`;

  // Appel API OpenAI avec paramètres pour plus de créativité
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.9, // Plus de créativité = moins prévisible
      top_p: 0.95, // Nucleus sampling pour variété
      frequency_penalty: 0.5, // Éviter répétitions
      presence_penalty: 0.6, // Encourager nouveaux sujets
      max_tokens: options.maxTokens || 2000
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  let content = data.choices[0].message.content;

  // Appliquer les stratégies d'humanisation
  content = HUMANIZATION_STRATEGIES.humanPatterns.addTransitions(content);
  content = HUMANIZATION_STRATEGIES.humanPatterns.addPersonalTouch(content);
  content = HUMANIZATION_STRATEGIES.antiDetectionTechniques.increasePerplexity(content);
  content = HUMANIZATION_STRATEGIES.antiDetectionTechniques.addContextualElements(content);

  const sentences = content.split(/[.!?]+/).filter(s => s.trim());
  const humanizedSentences = HUMANIZATION_STRATEGIES.antiDetectionTechniques.increaseBurstiness(sentences);
  content = humanizedSentences.join('. ') + '.';

  return {
    content,
    metadata: {
      tone,
      contentType,
      wordCount: content.split(' ').length,
      sentenceCount: sentences.length,
      avgWordsPerSentence: Math.round(content.split(' ').length / sentences.length),
      humanizationApplied: true,
      generatedAt: new Date().toISOString()
    }
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, prompt, contentType, tone, options } = await req.json();

    if (action === "generate") {
      // Générer du contenu humanisé
      const result = await generateHumanizedContent(
        prompt,
        contentType,
        tone || 'professionnel',
        options || {}
      );

      // Analyser la qualité du contenu généré
      const { data: qualityScore } = await supabase.rpc('analyze_content_quality', {
        p_content_type: contentType,
        p_content_id: null,
        p_content_text: result.content,
        p_content_url: null
      });

      // Enregistrer pour apprentissage
      await supabase.from('ai_learning_data').insert({
        data_type: 'user_interaction',
        context: {
          action: 'content_generation',
          contentType,
          tone
        },
        features: result.metadata,
        outcome: {
          qualityScoreId: qualityScore,
          success: true
        }
      });

      return new Response(
        JSON.stringify({
          success: true,
          content: result.content,
          metadata: result.metadata,
          qualityScoreId: qualityScore
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "analyze") {
      // Analyser un contenu existant
      const { content, contentId } = await req.json();

      const { data: qualityScore } = await supabase.rpc('analyze_content_quality', {
        p_content_type: contentType,
        p_content_id: contentId,
        p_content_text: content,
        p_content_url: options?.url || null
      });

      return new Response(
        JSON.stringify({
          success: true,
          qualityScoreId: qualityScore,
          message: 'Content analyzed successfully'
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Unknown action");

  } catch (error) {
    console.error("Error in ai-content-humanizer:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
