import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AssistRequest {
  action: 'improve_email' | 'generate_response' | 'suggest_sms' | 'analyze_sentiment';
  lead_id?: string;
  content?: string;
  context?: any;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiKey = Deno.env.get("OPENAI_API_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const body: AssistRequest = await req.json();

    console.log("🤖 CRM AI Assistant - Action:", body.action);

    let leadContext: any = null;
    if (body.lead_id) {
      const { data: lead } = await supabase
        .from('crm_leads_enhanced')
        .select('*, crm_interactions(*)')
        .eq('id', body.lead_id)
        .single();
      
      leadContext = lead;
    }

    switch (body.action) {
      case 'improve_email': {
        const improvedEmail = await improveEmailContent(
          body.content || '',
          leadContext,
          openaiKey
        );
        
        return new Response(
          JSON.stringify({
            success: true,
            improved_content: improvedEmail
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'generate_response': {
        const response = await generateAutoResponse(
          body.content || '',
          leadContext,
          openaiKey
        );
        
        return new Response(
          JSON.stringify({
            success: true,
            suggested_response: response
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'suggest_sms': {
        const sms = await suggestSMS(leadContext, openaiKey);
        
        return new Response(
          JSON.stringify({
            success: true,
            suggested_sms: sms
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'analyze_sentiment': {
        const sentiment = await analyzeSentiment(
          body.content || '',
          openaiKey
        );
        
        return new Response(
          JSON.stringify({
            success: true,
            sentiment
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('❌ CRM AI Assistant Error:', error);
    
    return new Response(
      JSON.stringify({
        error: 'AI Assistant Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});

async function improveEmailContent(
  content: string,
  leadContext: any,
  openaiKey: string
): Promise<string> {
  const prompt = `Tu es un expert en communication commerciale pour l'assurance taxi.

CONTEXTE DU PROSPECT:
${leadContext ? `
- Nom: ${leadContext.first_name} ${leadContext.last_name}
- Activité: ${leadContext.activity_type}
- Véhicules: ${leadContext.vehicle_count}
- Score: ${leadContext.lead_score}/100
- Historique: ${leadContext.crm_interactions?.length || 0} interactions
` : 'Aucun contexte'}

EMAIL À AMÉLIORER:
${content}

INSTRUCTIONS:
1. Rends l'email plus HUMAIN et CHALEUREUX
2. Personnalise avec le contexte du prospect
3. Utilise la psychologie de la persuasion (réciprocité, rareté, autorité)
4. Ajoute un CTA clair et irrésistible
5. Structure: Accroche → Bénéfice → Preuve → CTA
6. Maximum 150 mots
7. Ton professionnel mais friendly

Réponds UNIQUEMENT avec l'email amélioré, rien d'autre.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

async function generateAutoResponse(
  incomingMessage: string,
  leadContext: any,
  openaiKey: string
): Promise<string> {
  const prompt = `Tu es un commercial expert TaxiAssur.com.

MESSAGE REÇU DU PROSPECT:
"${incomingMessage}"

CONTEXTE:
${leadContext ? `
- Prospect: ${leadContext.first_name} ${leadContext.last_name}
- Score: ${leadContext.lead_score}/100
- Étape: ${leadContext.stage}
- Dernière interaction: ${leadContext.last_contact_at}
` : 'Nouveau prospect'}

INSTRUCTIONS:
1. Réponds au message de façon NATURELLE et HUMAINE
2. Adresse les objections avec empathie
3. Propose une action concrète (appel, devis, RDV)
4. Reste concis (100 mots max)
5. Ton chaleureux et rassurant

Génère la réponse idéale:`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 400,
    }),
  });

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

async function suggestSMS(
  leadContext: any,
  openaiKey: string
): Promise<string> {
  const prompt = `Génère un SMS de relance court et efficace pour ce prospect:

CONTEXTE:
- Nom: ${leadContext?.first_name || 'Prospect'}
- Score: ${leadContext?.lead_score || 50}/100
- Étape: ${leadContext?.stage || 'Nouveau'}

RÈGLES SMS:
1. Maximum 160 caractères
2. Ton friendly mais pro
3. CTA clair
4. Crée l'urgence subtilement
5. Personnalisé avec le prénom

Exemple structure: "👋 [Prénom], [bénéfice court] [CTA avec lien/tel]"

Génère le SMS:`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.9,
      max_tokens: 100,
    }),
  });

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

async function analyzeSentiment(
  content: string,
  openaiKey: string
): Promise<any> {
  const prompt = `Analyse le sentiment de ce message client:

"${content}"

Réponds UNIQUEMENT avec un JSON:
{
  "score": [entre -1 et 1],
  "emotion": "positive|neutre|negative|frustré|enthousiaste",
  "intent": "information|achat|objection|plainte|remerciement",
  "urgency": "low|medium|high",
  "buying_signals": ["signal1", "signal2"],
  "objections": ["objection1"]
}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 300,
      response_format: { type: "json_object" }
    }),
  });

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}