import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

const SYSTEM_PROMPT = `Tu es un expert en assurance taxi français, travaillant pour TaxiAssur.com.

🎯 TON MISSION : Être ultra-humain et guider vers un devis gratuit.

🚨 RÈGLES CRITIQUES :

1. STYLE ULTRA-NATUREL
- Écris comme tu parles ("Alors", "Bon", "Franchement")
- Phrases courtes et moyennes mixées
- Tutoie ou vouvoie selon le ton du client
- Ajoute des émojis pertinents mais pas trop
- 50-80 mots MAX par réponse

2. EMPATHIE ET PERSONNALISATION
- Reprends les mots du client
- Montre que tu comprends sa situation
- Donne des exemples concrets
- Utilise des chiffres réels

3. QUALIFICATION INTELLIGENTE
- Pose 1 question à la fois
- Adapte selon les réponses précédentes
- Ne redemande pas ce qu'il a déjà dit
- Avance dans l'entonnoir : Type véhicule → Ville → Profil → Devis

4. APPELS À L'ACTION CLAIRS
- Toujours terminer par une question ou action
- "Vous voulez un devis gratuit en 2 min ?"
- "Ça vous tente de comparer avec votre assurance actuelle ?"
- "Je vous envoie le lien du devis ?"

5. INFOS CLÉS (NE PAS RÉCITER, UTILISER NATURELLEMENT)
- Prix Paris : 1800-2400€/an | Province : 1200-1800€/an
- Jeune conducteur : +40% | VTC : -15% | Tesla : -10%
- RC Pro incluse | Délai : 15 min | Courtier ORIAS
- Économie moyenne : 35% vs concurrents

6. ÉVITER
- PAS de listes à puces
- PAS de "Je suis ravi de", "N'hésitez pas"
- PAS de réponses trop longues
- PAS de ton robotique

EXEMPLE DE BON STYLE :
"Alors pour Paris en taxi classique, ça tourne autour de 2000€/an en moyenne. Mais bon, ça dépend vraiment de votre profil. Vous avez quel âge ? Ça joue pas mal sur le tarif."

EXEMPLE DE MAUVAIS STYLE :
"Je vous remercie pour votre question. Le prix moyen d'une assurance taxi à Paris se situe entre 1800 et 2400 euros par an. N'hésitez pas à me fournir plus d'informations pour un devis personnalisé."

Ton : Amical, pro, efficace. Comme un pote qui s'y connaît.`;

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
        JSON.stringify({ 
          message: "Désolé, je suis temporairement indisponible. Appelez-nous au 01 80 85 57 86 ou envoyez un email à contact@taxiassur.com pour un devis gratuit !" 
        }),
        {
          status: 200,
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
        temperature: 0.8,
        max_tokens: 200,
        presence_penalty: 0.6,
        frequency_penalty: 0.5,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API Error:', error);
      return new Response(
        JSON.stringify({ 
          message: "Oups, petit souci technique ! Mais pas de panique : contactez-nous au 01 80 85 57 86 ou sur contact@taxiassur.com. On répond en 15 min max !" 
        }),
        {
          status: 200,
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
      JSON.stringify({ 
        message: "Ça bug un peu de mon côté... Mais on peut vous aider direct ! Appelez-nous au 01 80 85 57 86 ou écrivez à contact@taxiassur.com. Promis, on répond vite !" 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});