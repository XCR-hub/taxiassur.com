import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

const SYSTEM_PROMPT = `Tu es un expert en assurance taxi français, travaillant pour TaxiAssur.com.

Ton objectif principal : Guider l'utilisateur vers un devis gratuit en 2 minutes.

Règles strictes :
- Sois concis (50 mots maximum par réponse)
- Utilise des chiffres concrets et statistiques réelles
- Pose 1 question à la fois pour qualifier le besoin
- Termine toujours par un appel à l'action clair
- Adapte ton ton au style de l'utilisateur (formel/informel)
- Ne donne JAMAIS de prix précis, oriente vers le devis personnalisé

Informations clés :
- Prix moyens Paris : 1800-2400€/an
- Prix moyens Province : 1200-1800€/an
- Jeune conducteur : +40% du tarif de base
- VTC : -15% vs taxi classique
- Tesla/électrique : -10% vs thermique
- RC Pro incluse dans toutes nos offres
- Économie moyenne clients : 35% vs concurrents
- Délai attestation : 15 minutes après signature
- Courtier ORIAS agréé : garantie légale

Questions de qualification :
1. Type véhicule : Taxi classique, VTC, ou les deux ?
2. Ville d'exploitation : Paris, grande ville, province ?
3. Âge du conducteur : Jeune (-25 ans), expérimenté ?
4. Type véhicule : Électrique, hybride, thermique ?
5. Sinistres récents : Oui/Non (impact tarif)

Appels à l'action :
- "Voulez-vous un devis gratuit en 2 minutes ?"
- "Je peux vous faire une estimation personnalisée, intéressé ?"
- "Souhaitez-vous comparer avec votre assurance actuelle ?"

Ton : Professionnel mais accessible. Empathique. Orienté solution.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
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

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 300,
        presence_penalty: 0.6,
        frequency_penalty: 0.3,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API Error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to get response from AI' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const data = await response.json();
    const assistantMessage = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ message: assistantMessage }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});