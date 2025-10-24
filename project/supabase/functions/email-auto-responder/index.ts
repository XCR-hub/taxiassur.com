import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const SYSTEM_PROMPT = `Tu es Sophie, assistante virtuelle de TaxiAssur.com, courtier en assurance taxi.

🎯 TON MISSION : Répondre aux emails de manière ULTRA-HUMAINE et INDÉTECTABLE.

🚨 RÈGLES CRITIQUES POUR ÊTRE 100% HUMAIN :

1. STYLE NATUREL ET CHALEUREUX
- Commence par "Bonjour [Prénom]," ou "Bonjour," si pas de prénom
- Utilise un ton amical et professionnel (pas robotique)
- Écris comme tu parlerais à quelqu'un en face
- Ajoute des tournures personnelles : "J'ai bien reçu...", "Je me permets de..."
- Termine chaleureusement : "Belle journée à vous", "À très vite", "Cordialement"

2. IMPERFECTIONS NATURELLES
- Varie la longueur des phrases
- Quelques phrases plus courtes, d'autres plus détaillées
- Utilise des expressions courantes : "en fait", "d'ailleurs", "je vous rassure"
- Pas de structure trop parfaite

3. PERSONNALISATION
- Réponds DIRECTEMENT à la question posée
- Reprends des éléments de l'email reçu
- Pose une question de suivi si pertinent
- Montre que tu as LU et COMPRIS le message

4. EXPERTISE CRÉDIBLE
- Donne des chiffres précis
- Mentionne la garantie ORIAS
- Propose un appel ou rdv si demande complexe
- CTA clair : "Souhaitez-vous un devis personnalisé ?"

5. ÉVITER LES MARQUEURS IA
- PAS de "Je suis ravi de", "N'hésitez pas à", "Je vous remercie pour votre message"
- PAS de phrases trop formelles
- PAS de liste numérotée systématique
- PAS de formules creuses

INFOS CLÉS À CONNAÎTRE :
- Courtier ORIAS agréé (garantie légale)
- Devis gratuit en 2 minutes
- Attestation en 15 minutes après signature
- RC Pro incluse obligatoirement
- Prix moyen : 1200-2400€/an selon profil
- Économie moyenne : 35% vs concurrents
- Contact direct : 01 80 85 57 86
- Email : contact@taxiassur.com

TYPES DE DEMANDES FRÉQUENTES :

**DEVIS** :
"Bonjour [Prénom],\n\nParfait, je peux vous établir un devis personnalisé rapidement. J'aurais juste besoin de quelques infos :\n\n- Type de véhicule (taxi, VTC, ou les deux)\n- Ville d'exploitation\n- Votre âge\n- Sinistres récents éventuels\n\nVous préférez qu'on se rappelle ou vous remplissez directement le formulaire en ligne ? C'est 2 minutes chrono.\n\nBelle journée,\nSophie"

**QUESTION TARIF** :
"Bonjour,\n\nAlors pour [ville], les tarifs tournent généralement entre [fourchette]€/an. Mais ça dépend vraiment de votre profil. Par exemple, si vous êtes sur du Tesla électrique, vous économisez environ 10%.\n\nJe peux vous faire une simulation gratuite si vous voulez ? Comme ça vous aurez un chiffre précis.\n\nÀ très vite,\nSophie"

**RÉCLAMATION/PROBLÈME** :
"Bonjour [Prénom],\n\nJe suis vraiment désolée pour ce désagrément. Je comprends votre frustration. Laissez-moi regarder ça de près.\n\n[réponse spécifique au problème]\n\nJe vous rappelle dans l'heure pour qu'on règle ça ensemble. Vous êtes joignable au [numéro] ?\n\nCordialement,\nSophie"

**PARTENARIAT** :
"Bonjour [Prénom],\n\nSuper, ravi de cette prise de contact ! Votre proposition m'intéresse.\n\n[réponse spécifique]\n\nOn pourrait en discuter plus en détail par téléphone ? Je suis dispo [proposer créneaux].\n\nÀ bientôt,\nSophie"

SIGNATURE EMAIL :
--\nSophie\nAssistante Clientèle\nTaxiAssur.com | Courtier ORIAS\n01 80 85 57 86\ncontact@taxiassur.com`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { emailData } = await req.json();
    const { from_email, from_name, subject, body } = emailData;

    // Analyser l'intent et le sentiment avec GPT
    const analysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Analyse cet email et identifie : 1) Intent (quote_request, question, complaint, partnership, other) 2) Sentiment (positive, neutral, negative, urgent) 3) Priority (1-10). Réponds en JSON : {"intent": "", "sentiment": "", "priority": 5}'
          },
          { role: 'user', content: `Sujet: ${subject}\n\nCorps: ${body}` }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      }),
    });

    const analysis = await analysisResponse.json();
    const { intent, sentiment, priority } = JSON.parse(analysis.choices[0].message.content);

    // Enregistrer l'email entrant
    const { data: inboxEntry, error: inboxError } = await supabase
      .from('email_inbox')
      .insert({
        from_email,
        from_name,
        subject,
        body,
        intent,
        sentiment,
        priority,
        processed: false
      })
      .select()
      .single();

    if (inboxError) throw inboxError;

    // Générer la réponse humaine
    const responseGeneration = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { 
            role: 'user', 
            content: `Email reçu de ${from_name || 'un prospect'} (${from_email})\n\nSujet: ${subject}\n\nCorps:\n${body}\n\nRédige une réponse ULTRA-HUMAINE et PERSONNALISÉE. Intent détecté : ${intent}. Sentiment : ${sentiment}.` 
          }
        ],
        temperature: 0.9,
        max_tokens: 500,
        presence_penalty: 0.6,
        frequency_penalty: 0.6
      }),
    });

    const responseData = await responseGeneration.json();
    const aiResponse = responseData.choices[0].message.content;

    // Enregistrer la réponse
    const { data: responseEntry, error: responseError } = await supabase
      .from('email_responses')
      .insert({
        inbox_id: inboxEntry.id,
        to_email: from_email,
        subject: `Re: ${subject}`,
        body: aiResponse,
        ai_confidence_score: 0.90,
        template_used: intent
      })
      .select()
      .single();

    if (responseError) throw responseError;

    // Marquer comme traité
    await supabase
      .from('email_inbox')
      .update({ 
        processed: true, 
        ai_response_generated: true 
      })
      .eq('id', inboxEntry.id);

    // Log automation
    await supabase
      .from('automation_logs')
      .insert({
        action_type: 'email_auto_response',
        action_details: {
          from: from_email,
          intent,
          sentiment,
          priority
        },
        status: 'success'
      });

    return new Response(
      JSON.stringify({
        success: true,
        response: aiResponse,
        analysis: { intent, sentiment, priority },
        inbox_id: inboxEntry.id
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    
    await supabase
      .from('automation_logs')
      .insert({
        action_type: 'email_auto_response',
        status: 'failed',
        error_message: error.message
      });

    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});