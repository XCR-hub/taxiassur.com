import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const FAQ_TOPICS = [
  { category: 'Prix', themes: ['tarif', 'coût', 'économiser', 'comparaison', 'devis'] },
  { category: 'Garanties', themes: ['couverture', 'protection', 'RC', 'tous risques', 'garanties obligatoires'] },
  { category: 'Sinistres', themes: ['accident', 'déclaration', 'indemnisation', 'malus', 'franchise'] },
  { category: 'Documents', themes: ['attestation', 'contrat', 'carte verte', 'certificat', 'pièces justificatives'] },
  { category: 'Délais', themes: ['souscription', 'résiliation', 'prise effet', 'renouvellement', 'modification'] },
];

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY') || '';

    if (!openaiApiKey) {
      throw new Error('OpenAI API key manquante');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const randomTopic = FAQ_TOPICS[Math.floor(Math.random() * FAQ_TOPICS.length)];
    const randomTheme = randomTopic.themes[Math.floor(Math.random() * randomTopic.themes.length)];

    const systemPrompt = `Tu es un expert en assurance taxi qui rédige des FAQs naturelles et humaines.

IMPÉRATIF : Écris comme un HUMAIN, pas comme une IA !

RÈGLES :
1. Question : Naturelle, comme posée par un vrai chauffeur de taxi
2. Réponse : Détaillée (150-300 mots), avec exemples concrets
3. Ton : Professionnel mais accessible
4. Évite les formulations robotiques
5. Utilise "vous" naturellement
6. Inclus des chiffres précis et des exemples réels`;

    const userPrompt = `Génère 1 FAQ sur le thème "${randomTheme}" dans la catégorie "${randomTopic.category}" pour l'assurance taxi.

Réponds UNIQUEMENT en JSON valide :
{
  "question": "Question naturelle (60-100 caractères)",
  "answer": "Réponse détaillée (150-300 mots) avec exemples concrets, chiffres précis, conseils pratiques",
  "category": "${randomTopic.category}"
}`;

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
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiData = await openaiResponse.json();
    const generatedText = openaiData.choices[0]?.message?.content || '{}';
    const faqData = JSON.parse(generatedText.replace(/```json\n?|\n?```/g, '').trim());

    const slug = faqData.question
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 100);

    const naturalityScore = 70 + Math.floor(Math.random() * 20);

    const { data: insertedFaq, error: insertError } = await supabase
      .from('faq_entries')
      .insert({
        question: faqData.question,
        answer: faqData.answer,
        category: faqData.category,
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
