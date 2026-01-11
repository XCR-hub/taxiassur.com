import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AgentConfig {
  id: string;
  name: string;
  slug: string;
  model_id: string;
  system_prompt: string;
  temperature: number;
  max_tokens: number;
  tools: string[];
}

interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: any[];
  tool_call_id?: string;
}

interface BrainRequest {
  action: "chat" | "analyze" | "delegate" | "decide" | "orchestrate";
  input: any;
  context?: any;
  conversation_id?: string;
  session_id?: string;
}

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function callOpenAI(messages: Message[], config: AgentConfig, tools?: any[]) {
  const startTime = Date.now();
  
  const body: any = {
    model: config.model_id,
    messages,
    temperature: config.temperature,
    max_tokens: config.max_tokens,
  };
  
  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = "auto";
  }
  
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }
  
  const data = await response.json();
  const latency = Date.now() - startTime;
  
  return {
    content: data.choices[0].message.content,
    tool_calls: data.choices[0].message.tool_calls,
    usage: data.usage,
    latency,
  };
}

async function getAgentConfig(supabase: any, slug: string): Promise<AgentConfig> {
  const { data, error } = await supabase
    .from("llm_agents")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  
  if (error || !data) {
    throw new Error(`Agent not found: ${slug}`);
  }
  
  return data;
}

async function logConversation(supabase: any, agentId: string, sessionId: string, messages: Message[], response: any) {
  const { data: conversation } = await supabase
    .from("llm_conversations")
    .upsert({
      agent_id: agentId,
      session_id: sessionId,
      status: "active",
      last_message_at: new Date().toISOString(),
    }, {
      onConflict: "session_id",
    })
    .select()
    .single();
  
  if (conversation) {
    const userMessage = messages[messages.length - 1];
    await supabase.from("llm_messages").insert([
      {
        conversation_id: conversation.id,
        agent_id: agentId,
        role: userMessage.role,
        content: userMessage.content,
      },
      {
        conversation_id: conversation.id,
        agent_id: agentId,
        role: "assistant",
        content: response.content,
        tokens_used: response.usage?.total_tokens || 0,
        latency_ms: response.latency,
        model_used: "gpt-4o",
      },
    ]);
  }
  
  return conversation;
}

const BRAIN_TOOLS = [
  {
    type: "function",
    function: {
      name: "delegate_to_agent",
      description: "Delegue une tache a un agent specialise",
      parameters: {
        type: "object",
        properties: {
          agent_slug: {
            type: "string",
            enum: ["rag-expert", "conversion", "email-composer", "content-creator", "lead-scorer", "chat-assistant"],
            description: "L'agent a qui deleguer",
          },
          task: {
            type: "string",
            description: "La tache a effectuer",
          },
          input: {
            type: "object",
            description: "Les donnees d'entree pour l'agent",
          },
        },
        required: ["agent_slug", "task"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "analyze_lead",
      description: "Analyse un lead pour determiner sa priorite et les actions a entreprendre",
      parameters: {
        type: "object",
        properties: {
          lead_id: { type: "string", description: "ID du lead" },
          lead_data: { type: "object", description: "Donnees du lead" },
        },
        required: ["lead_data"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_knowledge",
      description: "Recherche dans la base de connaissances TaxiAssur",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "La question ou recherche" },
          category: { type: "string", description: "Categorie optionnelle" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "make_decision",
      description: "Prend une decision strategique et l'enregistre",
      parameters: {
        type: "object",
        properties: {
          decision_type: {
            type: "string",
            enum: ["lead_priority", "action_recommendation", "workflow_trigger", "escalation"],
          },
          decision: { type: "string", description: "La decision prise" },
          reasoning: { type: "string", description: "Le raisonnement" },
          actions: { type: "array", items: { type: "string" }, description: "Actions a executer" },
        },
        required: ["decision_type", "decision", "reasoning"],
      },
    },
  },
];

async function executeTool(supabase: any, toolName: string, toolInput: any): Promise<any> {
  switch (toolName) {
    case "delegate_to_agent": {
      await supabase.from("llm_agent_tasks").insert({
        agent_id: (await getAgentConfig(supabase, toolInput.agent_slug)).id,
        task_type: "delegated",
        input_data: { task: toolInput.task, input: toolInput.input },
        status: "pending",
      });
      return { success: true, message: `Tache deleguee a ${toolInput.agent_slug}` };
    }
    
    case "analyze_lead": {
      const leadData = toolInput.lead_data;
      const score = Math.min(100, Math.floor(
        (leadData.phone ? 20 : 0) +
        (leadData.email ? 20 : 0) +
        (leadData.city ? 15 : 0) +
        (leadData.vehicle_type ? 15 : 0) +
        (leadData.message?.length > 50 ? 20 : 10) +
        (leadData.source === "google" ? 10 : 5)
      ));
      return {
        score,
        urgence: leadData.message?.toLowerCase().includes("urgent") ? 9 : 5,
        potentiel: score > 70 ? "eleve" : score > 40 ? "moyen" : "faible",
        recommandations: [
          score > 70 ? "Rappel immediat" : "Email de bienvenue",
          "Envoyer devis personnalise",
          "Planifier relance J+2",
        ],
      };
    }
    
    case "search_knowledge": {
      const { data: docs } = await supabase
        .from("llm_knowledge_documents")
        .select("title, content, category")
        .ilike("content", `%${toolInput.query}%`)
        .limit(3);
      return { results: docs || [], query: toolInput.query };
    }
    
    case "make_decision": {
      await supabase.from("llm_agent_memory").insert({
        agent_id: (await getAgentConfig(supabase, "brain")).id,
        memory_type: "decision",
        key: `decision_${Date.now()}`,
        value: toolInput,
        importance: 0.8,
      });
      return { recorded: true, decision: toolInput.decision };
    }
    
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const request: BrainRequest = await req.json();
    
    const brainConfig = await getAgentConfig(supabase, "brain");
    const sessionId = request.session_id || `brain_${Date.now()}`;
    
    const messages: Message[] = [
      { role: "system", content: brainConfig.system_prompt },
    ];
    
    if (request.context) {
      messages.push({
        role: "system",
        content: `Contexte actuel: ${JSON.stringify(request.context)}`,
      });
    }
    
    let userContent = "";
    switch (request.action) {
      case "chat":
        userContent = request.input.message || request.input;
        break;
      case "analyze":
        userContent = `Analyse cette situation et recommande des actions: ${JSON.stringify(request.input)}`;
        break;
      case "delegate":
        userContent = `Determine quel agent doit gerer cette tache et delegue: ${JSON.stringify(request.input)}`;
        break;
      case "decide":
        userContent = `Prends une decision strategique pour: ${JSON.stringify(request.input)}`;
        break;
      case "orchestrate":
        userContent = `Coordonne les agents pour accomplir: ${JSON.stringify(request.input)}`;
        break;
    }
    
    messages.push({ role: "user", content: userContent });
    
    let response = await callOpenAI(messages, brainConfig, BRAIN_TOOLS);
    let finalContent = response.content;
    
    if (response.tool_calls && response.tool_calls.length > 0) {
      const toolResults = [];
      for (const toolCall of response.tool_calls) {
        const toolInput = JSON.parse(toolCall.function.arguments);
        const result = await executeTool(supabase, toolCall.function.name, toolInput);
        toolResults.push({
          tool_call_id: toolCall.id,
          tool_name: toolCall.function.name,
          result,
        });
        
        await supabase.from("llm_tool_calls").insert({
          agent_id: brainConfig.id,
          tool_name: toolCall.function.name,
          tool_input: toolInput,
          tool_output: result,
          status: "success",
          latency_ms: response.latency,
        });
      }
      
      messages.push({
        role: "assistant",
        content: response.content || "",
        tool_calls: response.tool_calls,
      });
      
      for (const toolResult of toolResults) {
        messages.push({
          role: "tool",
          content: JSON.stringify(toolResult.result),
          tool_call_id: toolResult.tool_call_id,
        });
      }
      
      const finalResponse = await callOpenAI(messages, brainConfig);
      finalContent = finalResponse.content;
      response.usage.total_tokens += finalResponse.usage?.total_tokens || 0;
    }
    
    await logConversation(supabase, brainConfig.id, sessionId, messages, {
      content: finalContent,
      usage: response.usage,
      latency: response.latency,
    });
    
    await supabase.rpc("update_llm_agent_stats", {
      p_agent_id: brainConfig.id,
      p_tokens_used: response.usage?.total_tokens || 0,
      p_response_time_ms: response.latency,
      p_success: true,
    });
    
    return new Response(
      JSON.stringify({
        success: true,
        agent: "brain",
        action: request.action,
        response: finalContent,
        session_id: sessionId,
        usage: response.usage,
        latency_ms: response.latency,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Brain error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
