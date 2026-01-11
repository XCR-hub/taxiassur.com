import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface WorkflowStep {
  agent: string;
  action: string;
  input: any;
  condition?: string;
}

interface Workflow {
  name: string;
  trigger: string;
  steps: WorkflowStep[];
}

const PREDEFINED_WORKFLOWS: Record<string, Workflow> = {
  "new_lead_processing": {
    name: "Traitement Nouveau Lead",
    trigger: "new_lead",
    steps: [
      { agent: "lead-scorer", action: "score", input: "{{lead_data}}" },
      { agent: "email-composer", action: "generate_welcome", input: "{{lead_data}}", condition: "score > 30" },
      { agent: "conversion", action: "plan_followup", input: "{{lead_data}}", condition: "score > 50" },
      { agent: "brain", action: "decide", input: "{{all_results}}" },
    ],
  },
  "daily_optimization": {
    name: "Optimisation Quotidienne",
    trigger: "scheduled",
    steps: [
      { agent: "brain", action: "analyze", input: { type: "daily_metrics" } },
      { agent: "content-creator", action: "generate_content", input: "{{content_gaps}}" },
      { agent: "conversion", action: "reactivate_cold_leads", input: "{{cold_leads}}" },
    ],
  },
  "lead_recovery": {
    name: "Recuperation Lead Perdu",
    trigger: "lead_inactive_7d",
    steps: [
      { agent: "lead-scorer", action: "rescore", input: "{{lead_data}}" },
      { agent: "brain", action: "analyze", input: "{{lead_history}}" },
      { agent: "email-composer", action: "generate_reactivation", input: "{{analysis}}" },
    ],
  },
};

async function callAgent(supabase: any, agentSlug: string, action: string, input: any) {
  const baseUrl = SUPABASE_URL.replace(".supabase.co", ".supabase.co/functions/v1");
  
  const agentEndpoints: Record<string, string> = {
    "brain": "llm-brain",
    "rag-expert": "llm-rag-agent",
    "conversion": "llm-conversion-agent",
    "email-composer": "llm-brain",
    "content-creator": "llm-brain",
    "lead-scorer": "llm-brain",
  };
  
  const endpoint = agentEndpoints[agentSlug] || "llm-brain";
  
  try {
    const response = await fetch(`${baseUrl}/${endpoint}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action,
        input,
        context: { orchestrated: true, agent_slug: agentSlug },
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Agent ${agentSlug} failed: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error calling agent ${agentSlug}:`, error);
    return { success: false, error: error.message };
  }
}

async function executeWorkflow(supabase: any, workflow: Workflow, triggerData: any) {
  const runId = crypto.randomUUID();
  const stepsLog: any[] = [];
  let currentResults: any = { trigger_data: triggerData };
  
  const { data: run } = await supabase.from("llm_orchestrator_runs").insert({
    id: runId,
    workflow_name: workflow.name,
    trigger_type: workflow.trigger === "new_lead" ? "event" : "scheduled",
    trigger_data: triggerData,
    status: "running",
    total_steps: workflow.steps.length,
  }).select().single();
  
  for (let i = 0; i < workflow.steps.length; i++) {
    const step = workflow.steps[i];
    const stepStart = Date.now();
    
    if (step.condition) {
      const conditionMet = evaluateCondition(step.condition, currentResults);
      if (!conditionMet) {
        stepsLog.push({
          step: i + 1,
          agent: step.agent,
          action: step.action,
          status: "skipped",
          reason: `Condition not met: ${step.condition}`,
        });
        continue;
      }
    }
    
    const resolvedInput = resolveInput(step.input, currentResults);
    
    try {
      const result = await callAgent(supabase, step.agent, step.action, resolvedInput);
      
      currentResults[`step_${i + 1}`] = result;
      currentResults[step.agent] = result;
      
      stepsLog.push({
        step: i + 1,
        agent: step.agent,
        action: step.action,
        status: result.success ? "completed" : "failed",
        duration_ms: Date.now() - stepStart,
        output_summary: result.success ? "Success" : result.error,
      });
      
      await supabase.from("llm_agent_interactions").insert({
        orchestrator_run_id: runId,
        from_agent_id: await getAgentId(supabase, "autonomous-orchestrator"),
        to_agent_id: await getAgentId(supabase, step.agent),
        interaction_type: "request",
        message: { action: step.action, input: resolvedInput },
        response: result,
        status: result.success ? "completed" : "failed",
      });
      
    } catch (error) {
      stepsLog.push({
        step: i + 1,
        agent: step.agent,
        action: step.action,
        status: "error",
        error: error.message,
      });
    }
    
    await supabase.from("llm_orchestrator_runs").update({
      current_step: i + 1,
      steps_log: stepsLog,
    }).eq("id", runId);
  }
  
  await supabase.from("llm_orchestrator_runs").update({
    status: "completed",
    final_output: currentResults,
    completed_at: new Date().toISOString(),
  }).eq("id", runId);
  
  return {
    run_id: runId,
    workflow: workflow.name,
    steps_executed: stepsLog.length,
    results: currentResults,
  };
}

function evaluateCondition(condition: string, context: any): boolean {
  try {
    if (condition.includes("score >")) {
      const threshold = parseInt(condition.split(">")[1].trim());
      const score = context.lead_scorer?.response?.score || context.step_1?.response?.score || 0;
      return score > threshold;
    }
    return true;
  } catch {
    return true;
  }
}

function resolveInput(input: any, context: any): any {
  if (typeof input === "string") {
    if (input.startsWith("{{") && input.endsWith("}}")) {
      const key = input.slice(2, -2);
      return context[key] || context.trigger_data || input;
    }
    return input;
  }
  return input;
}

async function getAgentId(supabase: any, slug: string): Promise<string | null> {
  const { data } = await supabase
    .from("llm_agents")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  return data?.id || null;
}

async function autonomousDecision(supabase: any, situation: any) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Tu es l'orchestrateur autonome de TaxiAssur. Tu analyses des situations et decides des workflows a executer.
          
Workflows disponibles:
- new_lead_processing: Pour traiter un nouveau lead
- daily_optimization: Pour optimisation quotidienne
- lead_recovery: Pour recuperer des leads inactifs

Reponds UNIQUEMENT en JSON avec ce format:
{
  "decision": "workflow_name ou 'custom'",
  "reasoning": "explication courte",
  "priority": 1-10,
  "custom_steps": [] // seulement si decision = 'custom'
}`,
        },
        {
          role: "user",
          content: `Situation a analyser: ${JSON.stringify(situation)}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
    }),
  });
  
  const data = await response.json();
  try {
    return JSON.parse(data.choices[0].message.content);
  } catch {
    return { decision: "new_lead_processing", reasoning: "Default fallback", priority: 5 };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { action, workflow_name, trigger_data, situation } = await req.json();
    
    let result;
    
    switch (action) {
      case "execute_workflow": {
        const workflow = PREDEFINED_WORKFLOWS[workflow_name];
        if (!workflow) {
          return new Response(
            JSON.stringify({ success: false, error: `Unknown workflow: ${workflow_name}` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        result = await executeWorkflow(supabase, workflow, trigger_data);
        break;
      }
      
      case "autonomous_decide": {
        const decision = await autonomousDecision(supabase, situation);
        
        if (decision.decision !== "custom" && PREDEFINED_WORKFLOWS[decision.decision]) {
          result = await executeWorkflow(
            supabase,
            PREDEFINED_WORKFLOWS[decision.decision],
            situation
          );
          result.autonomous_decision = decision;
        } else {
          result = { decision, message: "Custom workflow needed - not implemented yet" };
        }
        break;
      }
      
      case "process_new_lead": {
        result = await executeWorkflow(
          supabase,
          PREDEFINED_WORKFLOWS["new_lead_processing"],
          trigger_data
        );
        break;
      }
      
      case "daily_run": {
        result = await executeWorkflow(
          supabase,
          PREDEFINED_WORKFLOWS["daily_optimization"],
          { date: new Date().toISOString() }
        );
        break;
      }
      
      case "list_workflows": {
        result = {
          workflows: Object.keys(PREDEFINED_WORKFLOWS).map(key => ({
            name: key,
            display_name: PREDEFINED_WORKFLOWS[key].name,
            trigger: PREDEFINED_WORKFLOWS[key].trigger,
            steps_count: PREDEFINED_WORKFLOWS[key].steps.length,
          })),
        };
        break;
      }
      
      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
    
    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("Orchestrator error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
