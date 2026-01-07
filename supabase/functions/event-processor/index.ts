import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey" };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { event_type, lead_id, client_id, payload, source } = await req.json();

    console.log(`Event received: ${event_type} for lead ${lead_id}`);

    const { data: event } = await supabase.from('crm_events').insert({ event_type, event_category: categorizeEvent(event_type), lead_id, client_id, payload, source: source || 'api', processed: false }).select().single();
    if (!event) throw new Error('Failed to create event');

    const { data: workflows } = await supabase.from('workflow_automations').select('*').eq('is_active', true).eq('trigger_event', event_type);
    let autoActionsTriggered = 0;

    if (workflows && workflows.length > 0) {
      for (const workflow of workflows) {
        const shouldTrigger = await evaluateWorkflowConditions(supabase, workflow.trigger_conditions, lead_id, payload);
        if (shouldTrigger) {
          console.log(`Workflow triggered: ${workflow.workflow_name}`);
          for (const action of workflow.actions) {
            await supabase.from('crm_actions').insert({ event_id: event.id, action_type: action.type, channel: action.channel || 'internal', lead_id, client_id, content: action, status: 'pending' });
          }
          autoActionsTriggered++;
          await supabase.from('workflow_automations').update({ success_count: workflow.success_count + 1, last_executed_at: new Date().toISOString() }).eq('id', workflow.id);
        }
      }
    }

    let councilDecision = null;
    if (shouldInvolveCouncil(event_type)) {
      console.log(`Invoking IA Council...`);
      const councilResponse = await supabase.functions.invoke('ia-council', { body: { event_id: event.id, lead_id, event_type, context: payload } });
      if (councilResponse.data) councilDecision = councilResponse.data.council_decision;
    }

    await supabase.from('crm_events').update({ processed: true, processed_at: new Date().toISOString() }).eq('id', event.id);
    await executeHighPriorityActions(supabase, event.id);

    return new Response(JSON.stringify({ success: true, event_id: event.id, auto_actions_triggered: autoActionsTriggered, council_invoked: !!councilDecision, council_decision: councilDecision }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (error) {
    console.error("Error processing event:", error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

function categorizeEvent(eventType: string): string {
  if (eventType.includes('LEAD')) return 'lead_management';
  if (eventType.includes('CLIENT')) return 'client_management';
  if (eventType.includes('DOCUMENT')) return 'documents';
  if (eventType.includes('QUOTE')) return 'quotes';
  if (eventType.includes('SIGNATURE')) return 'contracts';
  if (eventType.includes('PAYMENT')) return 'payments';
  if (eventType.includes('CHURN')) return 'retention';
  return 'general';
}

function shouldInvolveCouncil(eventType: string): boolean {
  const criticalEvents = ['LEAD_CREATED', 'EMAIL_OPENED', 'NO_RESPONSE_48H', 'NO_RESPONSE_72H', 'DOCUMENTS_RECEIVED', 'DOCUMENTS_MISSING', 'QUOTE_SENT', 'QUOTE_NOT_SIGNED_7D', 'CHURN_RISK_DETECTED', 'CLIENT_INACTIVE_90D', 'CONTRACT_ANNIVERSARY'];
  return criticalEvents.includes(eventType);
}

async function evaluateWorkflowConditions(supabase: any, conditions: any, leadId: string, payload: any): Promise<boolean> {
  if (!conditions) return true;
  const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).single();
  if (!lead) return false;

  for (const [key, value] of Object.entries(conditions)) {
    if (key === 'hours_since_creation') {
      const hoursSince = Math.floor((Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60));
      if (hoursSince < (value as number)) return false;
    }
    if (key === 'days_since_change') {
      const daysSince = Math.floor((Date.now() - new Date(lead.updated_at || lead.created_at).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince < (value as number)) return false;
    }
    if (key === 'status' && lead.status !== value) return false;
    if (key === 'no_contact' && value === true) {
      const { data: interactions } = await supabase.from('crm_interactions').select('id').eq('lead_id', leadId).limit(1);
      if (interactions && interactions.length > 0) return false;
    }
    if (key === 'documents_complete' && value === false) {
      const { data: docs } = await supabase.from('lead_documents').select('document_type').eq('lead_id', leadId);
      const required = ['carte_grise', 'permis_conduire', 'justificatif_domicile'];
      const hasAll = required.every(type => docs?.some(d => d.document_type === type));
      if (hasAll) return false;
    }
  }
  return true;
}

async function executeHighPriorityActions(supabase: any, eventId: string) {
  const { data: actions } = await supabase.from('crm_actions').select('*').eq('event_id', eventId).eq('status', 'pending').order('created_at', { ascending: true });
  if (!actions || actions.length === 0) return;

  for (const action of actions) {
    try {
      const result = await executeAction(supabase, action);
      await supabase.from('crm_actions').update({ status: result.success ? 'completed' : 'failed', executed_at: new Date().toISOString(), result: result }).eq('id', action.id);
    } catch (error) {
      await supabase.from('crm_actions').update({ status: 'failed', executed_at: new Date().toISOString(), result: { error: error instanceof Error ? error.message : 'Unknown error' } }).eq('id', action.id);
    }
  }
}

async function executeAction(supabase: any, action: any) {
  const actionMap: Record<string, string> = { 'send_welcome_email': 'send_email', 'send_sms_reminder': 'send_sms', 'make_phone_call': 'call', 'send_quote': 'send_quote', 'request_missing_documents': 'request_documents', 'send_loyalty_offer': 'send_loyalty_offer', 'ai_voice_call': 'voice_call' };
  const mappedAction = actionMap[action.action_type] || action.action_type;
  try {
    const response = await supabase.functions.invoke('ia-auto-executor', { body: { action: mappedAction, lead_id: action.lead_id, channel: action.channel, content: action.content } });
    return { success: true, response: response.data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}