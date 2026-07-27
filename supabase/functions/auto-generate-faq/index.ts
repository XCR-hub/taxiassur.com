import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface FaqTopic {
  category: string;
  themes: string[];
}

interface GeneratedFaq {
  question: string;
  answer: string;
  category: string;
}

const FAQ_TOPICS: FaqTopic[] = [
  { category: 'Prix', themes: ['tarif', 'cout', 'economiser', 'comparaison', 'devis'] },
  { category: 'Garanties', themes: ['couverture', 'protection', 'RC', 'tous risques', 'garanties obligatoires'] },
  { category: 'Sinistres', themes: ['accident', 'declaration', 'indemnisation', 'malus', 'franchise'] },
  { category: 'Documents', themes: ['attestation', 'contrat', 'carte verte', 'certificat', 'pieces justificatives'] },
  { category: 'Delais', themes: ['souscription', 'resiliation', 'prise effet', 'renouvellement', 'modification'] },
];

const FALLBACK_QUESTIONS: Record<string, string> = {
  tarif: "Comment est calcule le tarif d'une assurance taxi professionnelle ?",
  cout: "Quels elements font varier le cout d'une assurance taxi d'une annee a l'autre ?",
  economiser: "Comment reduire sa prime d'assurance taxi sans perdre les garanties utiles ?",
  comparaison: "Que comparer avant de changer d'assurance taxi professionnelle ?",
  devis: "Quelles informations preparer pour obtenir un devis taxi fiable rapidement ?",
  couverture: "Quelles garanties verifier avant de signer une assurance taxi ?",
  protection: "Quelle protection choisir pour un taxi qui roule tous les jours ?",
  rc: "La responsabilite civile professionnelle suffit-elle pour un taxi ?",
  'tous risques': "Quand une formule tous risques devient-elle pertinente pour un taxi ?",
  'garanties obligatoires': "Quelles garanties sont obligatoires pour exercer comme taxi ?",
  accident: "Que faire juste apres un accident avec un taxi assure ?",
  declaration: "Comment declarer un sinistre taxi sans ralentir l'indemnisation ?",
  indemnisation: "Quels delais prevoir pour l'indemnisation d'un taxi apres sinistre ?",
  malus: "Comment un malus impacte-t-il le prix d'une assurance taxi ?",
  franchise: "Comment choisir une franchise adaptee a son activite taxi ?",
  attestation: "Quand faut-il demander une attestation d'assurance taxi a jour ?",
  contrat: "Quels points relire dans son contrat d'assurance taxi avant signature ?",
  'carte verte': "La carte verte reste-t-elle utile pour un chauffeur de taxi ?",
  certificat: "Quel certificat d'assurance presenter lors d'un controle taxi ?",
  'pieces justificatives': "Quelles pieces justificatives fournir pour assurer un taxi ?",
  souscription: "Combien de temps faut-il pour souscrire une assurance taxi ?",
  resiliation: "Comment resilier une assurance taxi sans interruption de garantie ?",
  'prise effet': "A quel moment une assurance taxi prend-elle effet apres signature ?",
  renouvellement: "Que verifier au renouvellement annuel de son assurance taxi ?",
  modification: "Quand signaler une modification de vehicule ou d'activite a l'assureur ?",
};

function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function buildFallbackFaq(topic: FaqTopic, theme: string): GeneratedFaq {
  const themeKey = normalizeKey(theme);
  const question = FALLBACK_QUESTIONS[themeKey] || `Que faut-il savoir sur ${theme} en assurance taxi ?`;
  const answer = `Pour un chauffeur de taxi, le sujet "${theme}" doit toujours etre regarde avec votre usage reel du vehicule : nombre de kilometres, zone de circulation, valeur du taxi, presence d'un equipement professionnel et historique de sinistres. Une garantie peut sembler secondaire sur le papier, puis devenir essentielle si le vehicule est immobilise plusieurs jours. Le bon reflexe consiste a comparer le prix, la franchise, les exclusions et les delais d'assistance, pas seulement la cotisation annuelle. Avant de signer ou de renouveler, preparez votre carte grise, votre licence taxi, votre releve d'information, votre permis et les informations sur l'exploitation. Un courtier specialise peut ensuite verifier si la responsabilite civile professionnelle, l'assistance, la protection du conducteur et les garanties dommages correspondent vraiment a votre activite.`;

  return {
    question,
    answer,
    category: topic.category,
  };
}

function parseFaqJson(rawText: string): GeneratedFaq | null {
  try {
    const parsed = JSON.parse(rawText.replace(/```json\n?|\n?```/g, '').trim());
    if (!parsed?.question || !parsed?.answer || !parsed?.category) {
      return null;
    }

    return {
      question: String(parsed.question).trim(),
      answer: String(parsed.answer).trim(),
      category: String(parsed.category).trim(),
    };
  } catch (_error) {
    return null;
  }
}

async function generateFaqData(
  openaiApiKey: string,
  topic: FaqTopic,
  theme: string
): Promise<{ faq: GeneratedFaq; fallbackReason: string | null }> {
  if (!openaiApiKey) {
    return { faq: buildFallbackFaq(topic, theme), fallbackReason: 'missing_openai_key' };
  }

  const systemPrompt = `Tu es un expert en assurance taxi qui redige des FAQs naturelles et humaines.

IMPERATIF : Ecris comme un HUMAIN, pas comme une IA !

REGLES :
1. Question : Naturelle, comme posee par un vrai chauffeur de taxi
2. Reponse : Detaillee (150-300 mots), avec exemples concrets
3. Ton : Professionnel mais accessible
4. Evite les formulations robotiques
5. Utilise "vous" naturellement
6. Inclus des chiffres precis et des exemples reels`;

  const userPrompt = `Genere 1 FAQ sur le theme "${theme}" dans la categorie "${topic.category}" pour l'assurance taxi.

Reponds UNIQUEMENT en JSON valide :
{
  "question": "Question naturelle (60-100 caracteres)",
  "answer": "Reponse detaillee (150-300 mots) avec exemples concrets, chiffres precis, conseils pratiques",
  "category": "${topic.category}"
}`;

  try {
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 1000,
      }),
    });

    if (!openaiResponse.ok) {
      return { faq: buildFallbackFaq(topic, theme), fallbackReason: `openai_${openaiResponse.status}` };
    }

    const openaiData = await openaiResponse.json();
    const generatedText = openaiData.choices?.[0]?.message?.content || '{}';
    const parsedFaq = parseFaqJson(generatedText);

    if (!parsedFaq) {
      return { faq: buildFallbackFaq(topic, theme), fallbackReason: 'invalid_openai_json' };
    }

    return { faq: parsedFaq, fallbackReason: null };
  } catch (_error) {
    return { faq: buildFallbackFaq(topic, theme), fallbackReason: 'openai_unavailable' };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const randomTopic = FAQ_TOPICS[Math.floor(Math.random() * FAQ_TOPICS.length)];
    const randomTheme = randomTopic.themes[Math.floor(Math.random() * randomTopic.themes.length)];
    const { faq: faqData, fallbackReason } = await generateFaqData(openaiApiKey, randomTopic, randomTheme);

    if (fallbackReason) {
      const { data: existingFallbackFaq } = await supabase
        .from('faq_entries')
        .select('id')
        .eq('question', faqData.question)
        .maybeSingle();

      if (existingFallbackFaq) {
        return new Response(
          JSON.stringify({
            success: true,
            skipped: true,
            fallback: true,
            reason: `fallback_duplicate_${fallbackReason}`,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const naturalityScore = fallbackReason ? 62 : 70 + Math.floor(Math.random() * 20);

    const { data: insertedFaq, error: insertError } = await supabase
      .from('faq_entries')
      .insert({
        question: faqData.question,
        answer: faqData.answer,
        category: faqData.category,
        status: 'published',
        order_index: Math.floor(Math.random() * 1000),
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Erreur insertion: ${insertError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        fallback: Boolean(fallbackReason),
        fallback_reason: fallbackReason,
        faq: {
          id: insertedFaq.id,
          question: insertedFaq.question,
          category: insertedFaq.category,
          naturalness_score: naturalityScore,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error auto-generate-faq:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});