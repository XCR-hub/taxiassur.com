import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

function applyVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value);
  }
  return result;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { lead_id } = await req.json();

    if (!lead_id) {
      return new Response(
        JSON.stringify({ error: 'lead_id requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Récupérer le lead
    const { data: lead } = await supabase
      .from('leads')
      .select('id, name, email')
      .eq('id', lead_id)
      .single();

    if (!lead) {
      return new Response(
        JSON.stringify({ error: 'Lead introuvable' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer le score d'engagement
    const { data: score } = await supabase
      .from('lead_engagement_scores')
      .select('engagement_score, open_rate, click_rate')
      .eq('lead_id', lead_id)
      .single();

    // Déterminer le niveau d'engagement
    let engagementLevel = 'low';
    if (score) {
      const scoreValue = score.engagement_score || 0;
      if (scoreValue >= 70) engagementLevel = 'high';
      else if (scoreValue >= 40) engagementLevel = 'medium';
    }

    console.log(`🎯 Niveau d'engagement pour ${lead.name}: ${engagementLevel} (score: ${score?.engagement_score || 0})`);

    // Récupérer le template adapté
    const { data: template } = await supabase
      .from('email_templates_smart')
      .select('*')
      .eq('engagement_level', engagementLevel)
      .eq('is_active', true)
      .order('success_rate', { ascending: false })
      .limit(1)
      .single();

    if (!template) {
      return new Response(
        JSON.stringify({ error: 'Aucun template disponible' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Appliquer les variables
    const variables = {
      name: lead.name,
      email: lead.email
    };

    const subject = applyVariables(template.subject_template, variables);
    const content = applyVariables(template.content_template, variables);

    // Envoyer l'email
    const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-crm-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        to_email: lead.email,
        to_name: lead.name,
        subject,
        content,
        lead_id: lead.id
      })
    });

    if (!emailResponse.ok) {
      throw new Error('Erreur envoi email');
    }

    const emailResult = await emailResponse.json();

    // Mettre à jour les stats du template
    await supabase
      .from('email_templates_smart')
      .update({
        usage_count: template.usage_count + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', template.id);

    console.log(`✅ Email intelligent envoyé: template "${template.name}" pour niveau ${engagementLevel}`);

    return new Response(
      JSON.stringify({
        success: true,
        template_used: template.name,
        engagement_level: engagementLevel,
        engagement_score: score?.engagement_score || 0,
        tracking_id: emailResult.tracking_id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erreur:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});