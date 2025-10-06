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

const FOLLOW_UP_PROMPTS = {
  first_follow_up: `Tu es Sophie de TaxiAssur. Le lead a demandé un devis il y a 2 jours mais n'a pas donné suite.

🎯 Écris un email de relance ULTRA-NATUREL et NON-INTRUSIF.

Ton style :
- Très court (3-4 lignes MAX)
- Amical et décontracté
- Pas insistant
- Donne de la valeur (astuce, info)

Exemple :
"Bonjour [Prénom],\n\nJe me permets de revenir vers vous suite à votre demande de devis.\n\nPetite info au passage : ce mois-ci on a une offre spéciale Tesla (-12%). Ça peut valoir le coup si vous êtes en électrique.\n\nSans pression bien sûr ! Si vous voulez en discuter, je suis là.\n\nBelle journée,\nSophie"

Varie les approches. Sois créatif mais toujours humain.`,

  second_follow_up: `2ème relance (J+5). Le lead n'a toujours pas répondu.

Ton style :
- Encore plus court (2-3 lignes)
- Offre d'aide concrète
- Proposition d'appel rapide
- Donne une porte de sortie

Exemple :
"Bonjour [Prénom],\n\nJ'imagine que vous êtes débordé ! Je peux vous rappeler 5 minutes si c'est plus simple ?\n\nSinon aucun souci, je vous laisse tranquille :)\n\nSophie"

Sois encore plus humain. Montres que tu comprends qu'il est occupé.`,

  final_follow_up: `Dernière relance (J+14). Approche différente.

Ton style :
- Proposition de valeur unique
- Créer la rareté/urgence (mais subtil)
- Ultimatum soft

Exemple :
"Bonjour [Prénom],\n\nJe ferme votre dossier cette semaine si vous n'avez plus besoin. Pas de souci !\n\nJuste pour info : avec la hausse des tarifs en janvier, c'est le bon moment pour signer maintenant. On a bloqué nos prix jusqu'au 31 décembre.\n\nDerniere chance si ça vous intéresse.\n\nSophie"

Crée un sentiment de perte potentielle mais reste amical.`,

  reengagement: `Le lead est "cold" depuis 30 jours. Tente une réactivation.

Ton style :
- Nouvelle approche complète
- Contenu à valeur (guide, astuce, promo)
- Oublie le passé, recommence à zéro

Exemple :
"Bonjour [Prénom],\n\nOn vient de sortir notre guide 2025 \"10 erreurs à éviter en assurance taxi\". Je vous l'envoie ? C'est gratuit.\n\nD'ailleurs on a de nouveaux tarifs vraiment compétitifs depuis octobre. Si ça vous dit, on peut refaire un point.\n\nSophie"

Nouveau départ. Sois frais et intéressant.`
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const now = new Date();

    // Récupérer les leads à relancer
    const { data: leadsToFollowUp, error } = await supabase
      .from('lead_follow_ups')
      .select('*')
      .eq('auto_follow_up_enabled', true)
      .lte('next_follow_up_date', now.toISOString())
      .in('status', ['new', 'contacted', 'interested'])
      .order('conversion_probability', { ascending: false })
      .limit(50);

    if (error) throw error;

    const results = [];

    for (const lead of leadsToFollowUp || []) {
      try {
        // Déterminer le type de relance
        let followUpType = 'first_follow_up';
        if (lead.follow_up_count === 1) followUpType = 'second_follow_up';
        else if (lead.follow_up_count === 2) followUpType = 'final_follow_up';
        else if (lead.follow_up_count >= 3 && lead.status === 'cold') followUpType = 'reengagement';

        const prompt = FOLLOW_UP_PROMPTS[followUpType];

        // Générer l'email de relance
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
                content: `Tu es Sophie, une assistante commerciale ultra-humaine. ${prompt}`
              },
              {
                role: 'user',
                content: `Lead:\n- Nom: ${lead.lead_name || 'prospect'}\n- Email: ${lead.lead_email}\n- Tentative de contact: ${lead.follow_up_count + 1}\n- Source: ${lead.lead_source || 'site web'}\n- Notes: ${lead.notes || 'Aucune'}\n\nGénère un email de relance PARFAITEMENT HUMAIN et PERSONNALISÉ.`
              }
            ],
            temperature: 0.9,
            max_tokens: 300,
            presence_penalty: 0.7,
            frequency_penalty: 0.7
          }),
        });

        const data = await response.json();
        const emailContent = data.choices[0].message.content;

        // Calculer la prochaine date de relance
        let nextFollowUpDate;
        if (lead.follow_up_count === 0) {
          nextFollowUpDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // J+3
        } else if (lead.follow_up_count === 1) {
          nextFollowUpDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // J+7
        } else if (lead.follow_up_count === 2) {
          nextFollowUpDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // J+14
        } else {
          nextFollowUpDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // J+30
        }

        // Mettre à jour le lead
        await supabase
          .from('lead_follow_ups')
          .update({
            follow_up_count: lead.follow_up_count + 1,
            last_contact_date: now.toISOString(),
            next_follow_up_date: nextFollowUpDate.toISOString(),
            status: lead.follow_up_count >= 2 ? 'cold' : 'contacted'
          })
          .eq('id', lead.id);

        // Enregistrer l'email à envoyer
        await supabase
          .from('email_responses')
          .insert({
            to_email: lead.lead_email,
            subject: `Assurance Taxi - ${lead.lead_name || 'Bonjour'}`,
            body: emailContent,
            template_used: followUpType,
            delivery_status: 'pending'
          });

        results.push({
          lead_id: lead.id,
          lead_email: lead.lead_email,
          follow_up_type: followUpType,
          email_generated: true
        });

        // Log
        await supabase
          .from('automation_logs')
          .insert({
            action_type: 'lead_auto_followup',
            action_details: {
              lead_id: lead.id,
              email: lead.lead_email,
              follow_up_count: lead.follow_up_count + 1,
              type: followUpType
            },
            status: 'success'
          });

      } catch (leadError) {
        console.error(`Error processing lead ${lead.id}:`, leadError);
        results.push({
          lead_id: lead.id,
          lead_email: lead.lead_email,
          error: leadError.message
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results
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
        action_type: 'lead_auto_followup',
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