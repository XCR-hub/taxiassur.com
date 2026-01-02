import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AutomationRequest {
  action: 'detect_opportunities' | 'auto_score_leads' | 'process_activities' | 'generate_suggestions' | 'execute_workflows';
  lead_id?: string;
  params?: any;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiKey = Deno.env.get("OPENAI_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseKey);
    const body: AutomationRequest = await req.json();

    console.log("🤖 CRM Automation Engine - Action:", body.action);

    switch (body.action) {
      case 'detect_opportunities': {
        await detectOpportunities(supabase, openaiKey);

        return new Response(
          JSON.stringify({ success: true, message: 'Opportunities detected' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'auto_score_leads': {
        const scored = await autoScoreAllLeads(supabase);

        return new Response(
          JSON.stringify({ success: true, leads_scored: scored }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'process_activities': {
        const processed = await processActivities(supabase);

        return new Response(
          JSON.stringify({ success: true, activities_processed: processed }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'generate_suggestions': {
        const suggestions = await generateAISuggestions(supabase, openaiKey, body.lead_id);

        return new Response(
          JSON.stringify({ success: true, suggestions }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'execute_workflows': {
        const executed = await executeWorkflows(supabase, openaiKey);

        return new Response(
          JSON.stringify({ success: true, workflows_executed: executed }),
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
    console.error('❌ Automation Engine Error:', error);

    return new Response(
      JSON.stringify({
        error: 'Automation Engine Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});

async function detectOpportunities(supabase: any, openaiKey?: string) {
  console.log("🔍 Detecting opportunities...");

  const { error } = await supabase.rpc('detect_opportunities');

  if (error) {
    console.error("Error detecting opportunities:", error);
    throw error;
  }

  console.log("✅ Opportunities detected");
}

async function autoScoreAllLeads(supabase: any): Promise<number> {
  console.log("📊 Auto-scoring all leads...");

  const { data: leads } = await supabase
    .from('leads')
    .select('id')
    .eq('status', 'active');

  if (!leads || leads.length === 0) {
    return 0;
  }

  let scored = 0;

  for (const lead of leads) {
    try {
      await supabase.rpc('calculate_lead_score', { p_lead_id: lead.id });
      scored++;
    } catch (error) {
      console.error(`Error scoring lead ${lead.id}:`, error);
    }
  }

  console.log(`✅ Scored ${scored} leads`);
  return scored;
}

async function processActivities(supabase: any): Promise<number> {
  console.log("⚡ Processing recent activities...");

  const { data: activities } = await supabase
    .from('crm_lead_activities')
    .select('*, leads(id, lead_score, stage)')
    .gte('created_at', new Date(Date.now() - 3600000).toISOString())
    .order('created_at', { ascending: false });

  if (!activities || activities.length === 0) {
    return 0;
  }

  let processed = 0;

  for (const activity of activities) {
    const lead = activity.crm_leads_enhanced;

    if (activity.activity_type === 'email_opened' && activity.score_impact === 0) {
      await supabase
        .from('crm_lead_activities')
        .update({ score_impact: 5 })
        .eq('id', activity.id);

      processed++;
    }

    if (activity.activity_type === 'link_clicked' && activity.score_impact === 0) {
      await supabase
        .from('crm_lead_activities')
        .update({ score_impact: 10 })
        .eq('id', activity.id);

      processed++;
    }

    if (activity.activity_type === 'document_viewed' && activity.score_impact === 0) {
      await supabase
        .from('crm_lead_activities')
        .update({ score_impact: 15 })
        .eq('id', activity.id);

      await supabase.rpc('create_ai_suggestion_for_lead', {
        p_lead_id: activity.lead_id,
        p_suggestion_type: 'call_now',
        p_suggestion_text: 'Lead a consulté le document - Appeler maintenant !',
        p_reasoning: 'Signal d\'intérêt fort : consultation de document',
        p_priority_score: 90,
        p_urgency: 'high'
      });

      processed++;
    }
  }

  console.log(`✅ Processed ${processed} activities`);
  return processed;
}

async function generateAISuggestions(
  supabase: any,
  openaiKey?: string,
  leadId?: string
): Promise<number> {
  console.log("🧠 Generating AI suggestions...");

  const query = supabase
    .from('leads')
    .select(`
      *,
      crm_interactions(count),
      crm_documents(count),
      crm_ai_suggestions(count)
    `)
    .eq('status', 'active');

  if (leadId) {
    query.eq('id', leadId);
  }

  const { data: leads } = await query;

  if (!leads || leads.length === 0) {
    return 0;
  }

  let suggestions = 0;

  for (const lead of leads) {
    const interactionCount = lead.crm_interactions?.[0]?.count || 0;
    const documentCount = lead.crm_documents?.[0]?.count || 0;
    const existingSuggestions = lead.crm_ai_suggestions?.[0]?.count || 0;

    if (existingSuggestions >= 3) {
      continue;
    }

    if (lead.lead_score >= 70 && interactionCount === 0) {
      await supabase.rpc('create_ai_suggestion_for_lead', {
        p_lead_id: lead.id,
        p_suggestion_type: 'call_now',
        p_suggestion_text: 'Lead chaud sans contact - Action immédiate requise',
        p_reasoning: `Score élevé (${lead.lead_score}) mais aucune interaction. Opportunité à saisir rapidement.`,
        p_priority_score: 95,
        p_urgency: 'critical'
      });
      suggestions++;
    }

    if (lead.stage === 'Devis Envoyé' && !lead.last_contact_at) {
      await supabase.rpc('create_ai_suggestion_for_lead', {
        p_lead_id: lead.id,
        p_suggestion_type: 'send_email',
        p_suggestion_text: 'Relancer sur le devis envoyé',
        p_reasoning: 'Devis envoyé sans suivi. Relance recommandée.',
        p_priority_score: 80,
        p_urgency: 'high'
      });
      suggestions++;
    }

    if (documentCount === 0 && lead.stage !== 'Nouveau Lead') {
      await supabase.rpc('create_ai_suggestion_for_lead', {
        p_lead_id: lead.id,
        p_suggestion_type: 'send_document',
        p_suggestion_text: 'Demander documents manquants',
        p_reasoning: 'Aucun document reçu. Nécessaire pour avancer.',
        p_priority_score: 70,
        p_urgency: 'normal'
      });
      suggestions++;
    }

    if (lead.next_followup_at && new Date(lead.next_followup_at) < new Date()) {
      await supabase.rpc('create_ai_suggestion_for_lead', {
        p_lead_id: lead.id,
        p_suggestion_type: 'call_now',
        p_suggestion_text: 'Suivi en retard - Contacter maintenant',
        p_reasoning: 'Date de suivi dépassée.',
        p_priority_score: 85,
        p_urgency: 'high'
      });
      suggestions++;
    }
  }

  console.log(`✅ Generated ${suggestions} AI suggestions`);
  return suggestions;
}

async function executeWorkflows(supabase: any, openaiKey?: string): Promise<number> {
  console.log("🔄 Executing automation workflows...");

  const { data: rules } = await supabase
    .from('crm_automation_rules')
    .select('*')
    .eq('is_active', true)
    .order('priority', { ascending: false });

  if (!rules || rules.length === 0) {
    return 0;
  }

  let executed = 0;

  for (const rule of rules) {
    try {
      if (rule.trigger_type === 'time_based') {
        const { data: leads } = await supabase
          .from('leads')
          .select('*')
          .eq('status', 'active');

        if (leads) {
          for (const lead of leads) {
            for (const action of rule.actions) {
              await executeAction(supabase, lead, action, rule.id);
              executed++;
            }
          }
        }
      }

      await supabase
        .from('crm_automation_rules')
        .update({
          execution_count: rule.execution_count + 1,
          last_executed_at: new Date().toISOString()
        })
        .eq('id', rule.id);

    } catch (error) {
      console.error(`Error executing rule ${rule.id}:`, error);
    }
  }

  console.log(`✅ Executed ${executed} workflow actions`);
  return executed;
}

async function executeAction(supabase: any, lead: any, action: any, ruleId: string) {
  const startTime = Date.now();

  try {
    switch (action.type) {
      case 'send_email':
        console.log(`📧 Would send email to ${lead.email}`);
        break;

      case 'send_sms':
        console.log(`📱 Would send SMS to ${lead.phone}`);
        break;

      case 'create_task':
        await supabase
          .from('crm_tasks')
          .insert({
            lead_id: lead.id,
            title: action.task_title || 'Tâche automatique',
            description: action.task_description,
            type: action.task_type || 'followup',
            priority: action.priority || 'medium',
            assigned_to: lead.assigned_to,
            auto_generated: true,
            ai_reasoning: 'Créé automatiquement par workflow'
          });
        break;

      case 'update_score':
        await supabase.rpc('calculate_lead_score', { p_lead_id: lead.id });
        break;

      case 'change_stage':
        await supabase
          .from('leads')
          .update({ stage: action.new_stage })
          .eq('id', lead.id);
        break;
    }

    await supabase
      .from('crm_automation_history')
      .insert({
        rule_id: ruleId,
        lead_id: lead.id,
        action_type: action.type,
        action_details: action,
        status: 'success',
        execution_time_ms: Date.now() - startTime
      });

  } catch (error) {
    await supabase
      .from('crm_automation_history')
      .insert({
        rule_id: ruleId,
        lead_id: lead.id,
        action_type: action.type,
        action_details: action,
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        execution_time_ms: Date.now() - startTime
      });
  }
}
