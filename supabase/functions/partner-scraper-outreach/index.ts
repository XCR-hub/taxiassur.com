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

const PARTNER_SEARCH_QUERIES = [
  'blog automobile France',
  'site transport routier',
  'blog taxi VTC',
  'magazine professionnel transport',
  'site mutuelle assurance',
  'blog entrepreneur transport',
  'site comparateur assurance',
  'blog mobilité urbaine',
  'site juridique transport',
  'blog gestion entreprise taxi'
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { action, prospectData } = await req.json();

    if (action === 'generate_outreach') {
      // Générer un email d'outreach ultra-personnalisé
      const { prospect } = prospectData;

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
              content: `Tu es Thomas, Responsable Partenariats chez TaxiAssur.com.

🎯 MISSION : Écrire un email d'outreach ULTRA-PERSONNALISÉ et HUMAIN pour obtenir un backlink ou partenariat.

🚨 RÈGLES CRITIQUES :

1. RECHERCHE ET PERSONNALISATION
- Mentionne UN article ou contenu SPÉCIFIQUE du site partenaire
- Montre que tu as VRAIMENT visité le site
- Complimente authentiquement (pas de flatterie excessive)
- Trouve un point commun ou intérêt partagé

2. PROPOSITION DE VALEUR
- Offre quelque chose de CONCRET
- Pas de demande directe immédiate
- Approche gagnant-gagnant
- Soit spécifique sur ce que tu proposes

3. STYLE ULTRA-HUMAIN
- Ton amical et professionnel (pas corporate)
- Court (150-200 mots MAX)
- Pas de template visible
- Une seule question claire en fin d'email
- Signature simple

4. TYPES DE PROPOSITIONS

**Article Invité** :
"Bonjour [Prénom],\n\nJ'ai beaucoup aimé votre article \"[titre spécifique]\" sur [site]. Le point sur [détail] était particulièrement intéressant.\n\nJe suis chez TaxiAssur, courtier spécialisé assurance taxi. On a pas mal de données exclusives sur le marché (tarifs par ville, stats 2024, tendances électrique).\n\nSi ça vous dit, je pourrais vous écrire un article avec ces infos ? Genre \"Coûts réels assurance taxi en 2024\" ou un truc dans le style.\n\nVous acceptez les articles invités ?\n\nThomas"

**Échange de Backlinks** :
"Bonjour [Prénom],\n\nJe suis tombé sur votre guide \"[titre]\" - vraiment bien fait ! Par contre j'ai remarqué que la section sur l'assurance pourrait être enrichie.\n\nOn a justement un guide complet sur le sujet. On pourrait s'échanger des liens ? Vous mentionnez notre guide, on cite le vôtre dans notre section \"[thématique pertinente]\".\n\nÇa vous tente ?\n\nThomas"

**Partenariat Commercial** :
"Bonjour [Prénom],\n\nVotre outil [nom outil] est top. Je pense qu'on pourrait faire un truc cool ensemble.\n\nChez TaxiAssur, on a 500+ clients chauffeurs taxi. Si on intégrait [votre outil] en offre groupée, ça pourrait intéresser du monde.\n\nVous feriez une offre spéciale pour nos clients ? En échange on vous met en avant.\n\nOn en discute 15 min par téléphone ?\n\nThomas"

**Sponsoring/Publicité** :
"Bonjour [Prénom],\n\nSuper newsletter que vous envoyez ! Je suis abonné depuis quelques mois.\n\nOn cherche à toucher votre audience (entrepreneurs transport). Vous proposez des placements sponsors dans la newsletter ?\n\nBudget envisagé : [montant] pour [durée]. Dites-moi si ça peut coller.\n\nThomas"

5. ÉVITER
- PAS de "J'espère que vous allez bien"
- PAS de "Je vous contacte car..."
- PAS de pitch trop long
- PAS de demande multiple
- PAS de ton trop formel

6. SIGNATURE
--\nThomas Durand\nResp. Partenariats\nTaxiAssur.com | Courtier ORIAS\n06 XX XX XX XX`
            },
            {
              role: 'user',
              content: `Prospect:\n- Site: ${prospect.website}\n- Entreprise: ${prospect.company_name}\n- Secteur: ${prospect.industry || 'non spécifié'}\n- Contact: ${prospect.contact_name || 'non spécifié'}\n- Email: ${prospect.contact_email}\n- Pertinence: ${prospect.relevance_score || 'moyenne'}\n\nGénère un email d'outreach ULTRA-PERSONNALISÉ et HUMAIN. Si tu n'as pas assez d'infos sur le site, invente un détail crédible (article, fonctionnalité, etc.) qui pourrait exister.`
            }
          ],
          temperature: 0.9,
          max_tokens: 400,
          presence_penalty: 0.8,
          frequency_penalty: 0.7
        }),
      });

      const data = await response.json();
      const emailContent = data.choices[0].message.content;

      // Enregistrer l'email
      await supabase
        .from('email_responses')
        .insert({
          to_email: prospect.contact_email,
          subject: `Partenariat ${prospect.company_name} × TaxiAssur`,
          body: emailContent,
          template_used: 'partner_outreach',
          delivery_status: 'draft'
        });

      // Mettre à jour le prospect
      await supabase
        .from('partner_prospects')
        .update({
          outreach_status: 'contacted',
          outreach_attempts: (prospect.outreach_attempts || 0) + 1,
          last_contact_date: new Date().toISOString(),
          next_contact_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('id', prospect.id);

      // Log
      await supabase
        .from('automation_logs')
        .insert({
          action_type: 'partner_outreach',
          action_details: {
            prospect_id: prospect.id,
            company: prospect.company_name,
            email: prospect.contact_email
          },
          status: 'success'
        });

      return new Response(
        JSON.stringify({
          success: true,
          email: emailContent,
          prospect_updated: true
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    else if (action === 'batch_outreach') {
      // Envoi en masse aux prospects non contactés
      const { data: prospects, error } = await supabase
        .from('partner_prospects')
        .select('*')
        .eq('outreach_status', 'not_contacted')
        .gte('relevance_score', 0.7)
        .order('relevance_score', { ascending: false })
        .limit(20);

      if (error) throw error;

      const results = [];

      for (const prospect of prospects || []) {
        try {
          // Générer et envoyer l'email
          const emailResponse = await fetch(`${SUPABASE_URL}/functions/v1/partner-scraper-outreach`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': req.headers.get('Authorization')!
            },
            body: JSON.stringify({
              action: 'generate_outreach',
              prospectData: { prospect }
            })
          });

          const result = await emailResponse.json();
          results.push({
            prospect_id: prospect.id,
            company: prospect.company_name,
            success: result.success
          });

          // Attendre 2-5 secondes entre chaque email (plus humain)
          await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));

        } catch (error) {
          results.push({
            prospect_id: prospect.id,
            company: prospect.company_name,
            error: error.message
          });
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          total_processed: results.length,
          results
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    throw new Error('Action not supported');

  } catch (error) {
    console.error('Error:', error);

    await supabase
      .from('automation_logs')
      .insert({
        action_type: 'partner_outreach',
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