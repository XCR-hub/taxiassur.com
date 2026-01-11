import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const HUGGINGFACE_API_KEY = Deno.env.get("HUGGINGFACE_API_KEY");
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface LLMConfig {
  model_id: string;
  display_name: string;
  provider: string;
  temperature: number;
  max_tokens: number;
  is_chairman: boolean;
}

interface LLMResponse {
  model_id: string;
  display_name: string;
  content: string;
  tokens_used: number;
  latency_ms: number;
  error?: string;
  anonymous_id: string;
}

async function callOpenAI(model: string, messages: any[], config: LLMConfig): Promise<LLMResponse> {
  const startTime = Date.now();
  const anonymousId = `model_${Math.random().toString(36).substring(2, 8)}`;
  
  if (!OPENAI_API_KEY) {
    return { model_id: config.model_id, display_name: config.display_name, content: "", tokens_used: 0, latency_ms: 0, error: "OpenAI API key not configured", anonymous_id: anonymousId };
  }
  
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, temperature: config.temperature, max_tokens: config.max_tokens }),
    });
    
    if (!response.ok) throw new Error(`OpenAI error: ${response.status}`);
    const data = await response.json();
    
    return {
      model_id: config.model_id,
      display_name: config.display_name,
      content: data.choices[0].message.content,
      tokens_used: data.usage?.total_tokens || 0,
      latency_ms: Date.now() - startTime,
      anonymous_id: anonymousId,
    };
  } catch (error) {
    return { model_id: config.model_id, display_name: config.display_name, content: "", tokens_used: 0, latency_ms: Date.now() - startTime, error: error instanceof Error ? error.message : "Unknown error", anonymous_id: anonymousId };
  }
}

async function callAnthropic(model: string, messages: any[], config: LLMConfig): Promise<LLMResponse> {
  const startTime = Date.now();
  const anonymousId = `model_${Math.random().toString(36).substring(2, 8)}`;
  
  if (!ANTHROPIC_API_KEY) {
    return { model_id: config.model_id, display_name: config.display_name, content: "", tokens_used: 0, latency_ms: 0, error: "Anthropic API key not configured", anonymous_id: anonymousId };
  }
  
  try {
    const systemMessage = messages.find(m => m.role === "system")?.content || "";
    const nonSystemMessages = messages.filter(m => m.role !== "system");
    
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: config.max_tokens,
        system: systemMessage,
        messages: nonSystemMessages,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    const content = data.content?.[0]?.text || "";
    
    return {
      model_id: config.model_id,
      display_name: config.display_name,
      content,
      tokens_used: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      latency_ms: Date.now() - startTime,
      anonymous_id: anonymousId,
    };
  } catch (error) {
    return { model_id: config.model_id, display_name: config.display_name, content: "", tokens_used: 0, latency_ms: Date.now() - startTime, error: error instanceof Error ? error.message : "Unknown error", anonymous_id: anonymousId };
  }
}

async function callGemini(model: string, messages: any[], config: LLMConfig): Promise<LLMResponse> {
  const startTime = Date.now();
  const anonymousId = `model_${Math.random().toString(36).substring(2, 8)}`;
  
  if (!GEMINI_API_KEY) {
    return { model_id: config.model_id, display_name: config.display_name, content: "", tokens_used: 0, latency_ms: 0, error: "Gemini API key not configured", anonymous_id: anonymousId };
  }
  
  try {
    const geminiMessages = messages.map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    })).filter(m => m.role !== "system");
    
    const systemPrompt = messages.find(m => m.role === "system")?.content || "";
    if (systemPrompt && geminiMessages.length > 0) {
      geminiMessages[0].parts[0].text = `${systemPrompt}\n\n${geminiMessages[0].parts[0].text}`;
    }
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: geminiMessages,
          generationConfig: { temperature: config.temperature, maxOutputTokens: config.max_tokens }
        }),
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    return {
      model_id: config.model_id,
      display_name: config.display_name,
      content,
      tokens_used: data.usageMetadata?.totalTokenCount || 0,
      latency_ms: Date.now() - startTime,
      anonymous_id: anonymousId,
    };
  } catch (error) {
    return { model_id: config.model_id, display_name: config.display_name, content: "", tokens_used: 0, latency_ms: Date.now() - startTime, error: error instanceof Error ? error.message : "Unknown error", anonymous_id: anonymousId };
  }
}

async function callOpenRouter(model: string, messages: any[], config: LLMConfig): Promise<LLMResponse> {
  const startTime = Date.now();
  const anonymousId = `model_${Math.random().toString(36).substring(2, 8)}`;
  
  if (!OPENROUTER_API_KEY) {
    return { model_id: config.model_id, display_name: config.display_name, content: "", tokens_used: 0, latency_ms: 0, error: "OpenRouter API key not configured", anonymous_id: anonymousId };
  }
  
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://taxiassur.fr",
        "X-Title": "TaxiAssur LLM Council",
      },
      body: JSON.stringify({ model, messages, temperature: config.temperature, max_tokens: config.max_tokens }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    return {
      model_id: config.model_id,
      display_name: config.display_name,
      content: data.choices?.[0]?.message?.content || "",
      tokens_used: data.usage?.total_tokens || 0,
      latency_ms: Date.now() - startTime,
      anonymous_id: anonymousId,
    };
  } catch (error) {
    return { model_id: config.model_id, display_name: config.display_name, content: "", tokens_used: 0, latency_ms: Date.now() - startTime, error: error instanceof Error ? error.message : "Unknown error", anonymous_id: anonymousId };
  }
}

async function callHuggingFace(model: string, messages: any[], config: LLMConfig): Promise<LLMResponse> {
  const startTime = Date.now();
  const anonymousId = `model_${Math.random().toString(36).substring(2, 8)}`;
  
  if (!HUGGINGFACE_API_KEY) {
    return { model_id: config.model_id, display_name: config.display_name, content: "", tokens_used: 0, latency_ms: 0, error: "HuggingFace API key not configured", anonymous_id: anonymousId };
  }
  
  try {
    const prompt = messages.map(m => {
      if (m.role === "system") return `<|system|>${m.content}</s>`;
      if (m.role === "user") return `<|user|>${m.content}</s>`;
      return `<|assistant|>${m.content}</s>`;
    }).join("\n") + "\n<|assistant|>";
    
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${model}`,
      {
        method: "POST",
        headers: { "Authorization": `Bearer ${HUGGINGFACE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          inputs: prompt,
          parameters: { max_new_tokens: config.max_tokens, temperature: config.temperature, return_full_text: false }
        }),
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HuggingFace error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    const content = Array.isArray(data) ? data[0]?.generated_text || "" : data.generated_text || "";
    
    return {
      model_id: config.model_id,
      display_name: config.display_name,
      content: content.replace(/<\|.*?\|>/g, "").trim(),
      tokens_used: Math.ceil(content.length / 4),
      latency_ms: Date.now() - startTime,
      anonymous_id: anonymousId,
    };
  } catch (error) {
    return { model_id: config.model_id, display_name: config.display_name, content: "", tokens_used: 0, latency_ms: Date.now() - startTime, error: error instanceof Error ? error.message : "Unknown error", anonymous_id: anonymousId };
  }
}

async function callLLM(config: LLMConfig, messages: any[]): Promise<LLMResponse> {
  const provider = config.provider.toLowerCase();
  const modelId = config.model_id;
  
  switch (provider) {
    case "openai":
      return callOpenAI(modelId.replace("openai/", ""), messages, config);
    case "anthropic":
      return callAnthropic(modelId.replace("anthropic/", ""), messages, config);
    case "google":
      return callGemini(modelId.replace("google/", ""), messages, config);
    case "openrouter":
      return callOpenRouter(modelId.replace("openrouter/", ""), messages, config);
    case "huggingface":
    case "meta":
    case "mistral":
      return callHuggingFace(modelId.replace(/^(huggingface|meta|mistral)\//, ""), messages, config);
    default:
      return callOpenRouter(modelId, messages, config);
  }
}

function getReviewPrompt(responses: LLMResponse[], query: string): string {
  const responsesText = responses
    .filter(r => r.content && !r.error)
    .map((r) => `\n=== Response ${r.anonymous_id} ===\n${r.content}\n`)
    .join("\n");
    
  return `You are a judge evaluating AI responses. Rank them on accuracy, insight, and clarity (1-10 each).\n\nUSER QUERY:\n${query}\n\nRESPONSES:\n${responsesText}\n\nRespond in JSON:\n{\n  "rankings": [\n    {"anonymous_id": "model_xxx", "accuracy_score": 8, "insight_score": 7, "clarity_score": 9, "reasoning": "..."}\n  ]\n}`;
}

function getChairmanPrompt(query: string, responses: LLMResponse[], rankings: any[]): string {
  const responsesText = responses
    .filter(r => r.content && !r.error)
    .map((r) => {
      const avgScores = rankings.flatMap(rk => rk.rankings || []).filter(rk => rk.anonymous_id === r.anonymous_id);
      const avgAcc = avgScores.length > 0 ? avgScores.reduce((a, b) => a + (b.accuracy_score || 0), 0) / avgScores.length : 0;
      return `\n=== ${r.display_name} (Accuracy: ${avgAcc.toFixed(1)}) ===\n${r.content}\n`;
    })
    .join("\n");
    
  return `You are the Chairman of an LLM Council. Synthesize the best parts of all responses into one comprehensive answer.\n\nUSER QUERY:\n${query}\n\nMODEL RESPONSES WITH SCORES:\n${responsesText}\n\nProvide the definitive final response:`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { query, session_id, single_turn } = await req.json();
    
    if (!query) {
      return new Response(JSON.stringify({ error: "Query is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    
    const startTime = Date.now();
    
    const { data: configs } = await supabase
      .from("llm_council_configs")
      .select("*")
      .eq("is_active", true)
      .order("priority_order");
      
    if (!configs || configs.length === 0) {
      throw new Error("No active LLM models configured");
    }
    
    const councilModels = configs.filter(c => !c.is_chairman);
    const chairmanConfig = configs.find(c => c.is_chairman) || councilModels[0];
    
    let sessionId = session_id;
    if (!sessionId) {
      const { data: newSession } = await supabase
        .from("llm_council_sessions")
        .insert({ query, status: "processing", chairman_model: chairmanConfig.model_id })
        .select()
        .single();
      sessionId = newSession?.id;
    }
    
    await supabase.from("llm_council_messages").insert({ session_id: sessionId, role: "user", content: query });
    
    console.log(`[LLM Council] Stage 1: Gathering ${councilModels.length} responses...`);
    
    const messages = [
      { role: "system", content: "You are an expert AI assistant for TaxiAssur, a French taxi insurance company. Provide accurate, insightful, and helpful responses in French when the query is in French." },
      { role: "user", content: query }
    ];
    
    const responsePromises = councilModels.slice(0, 6).map(config => callLLM(config, messages));
    const responses = await Promise.all(responsePromises);
    const validResponses = responses.filter(r => r.content && !r.error);
    
    for (const resp of responses) {
      await supabase.from("llm_council_responses").insert({
        session_id: sessionId,
        model_id: resp.model_id,
        display_name: resp.display_name,
        response_content: resp.content,
        tokens_used: resp.tokens_used,
        latency_ms: resp.latency_ms,
        status: resp.error ? "error" : "success",
        error_message: resp.error,
        anonymous_id: resp.anonymous_id,
      });
    }
    
    console.log(`[LLM Council] Stage 1 complete: ${validResponses.length}/${responses.length} successful`);
    
    let rankings: any[] = [];
    let finalResponse = "";
    let consensusScore = 0;
    
    if (!single_turn && validResponses.length > 1) {
      console.log(`[LLM Council] Stage 2: Cross-review...`);
      
      const reviewPrompt = getReviewPrompt(validResponses, query);
      const reviewMessages = [
        { role: "system", content: "You are an expert judge. Respond only with valid JSON." },
        { role: "user", content: reviewPrompt }
      ];
      
      const reviewPromises = councilModels.slice(0, 3).map(async config => {
        const reviewResp = await callLLM(config, reviewMessages);
        try {
          const jsonMatch = reviewResp.content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return { reviewer_model_id: config.model_id, rankings: parsed.rankings || [] };
          }
        } catch { console.error(`Failed to parse review from ${config.model_id}`); }
        return null;
      });
      
      const reviewResults = await Promise.all(reviewPromises);
      rankings = reviewResults.filter(r => r !== null);
      
      for (const ranking of rankings) {
        for (const rank of ranking.rankings) {
          await supabase.from("llm_council_rankings").insert({
            session_id: sessionId,
            reviewer_model_id: ranking.reviewer_model_id,
            ranked_model_id: rank.anonymous_id,
            anonymous_id: rank.anonymous_id,
            accuracy_score: rank.accuracy_score,
            insight_score: rank.insight_score,
            clarity_score: rank.clarity_score,
            reasoning: rank.reasoning,
          });
        }
      }
      
      console.log(`[LLM Council] Stage 2 complete: ${rankings.length} reviews`);
      console.log(`[LLM Council] Stage 3: Chairman synthesis...`);
      
      const chairmanPrompt = getChairmanPrompt(query, validResponses, rankings);
      const chairmanMessages = [
        { role: "system", content: "You are the Chairman of an LLM Council. Synthesize multiple AI responses into one comprehensive answer." },
        { role: "user", content: chairmanPrompt }
      ];
      
      const chairmanResp = await callLLM(chairmanConfig, chairmanMessages);
      finalResponse = chairmanResp.content;
      
      const allScores = rankings.flatMap(r => r.rankings || []);
      if (allScores.length > 0) {
        const avgScore = allScores.reduce((a, b) => a + ((b.accuracy_score || 0) + (b.insight_score || 0) + (b.clarity_score || 0)) / 3, 0) / allScores.length;
        consensusScore = avgScore * 10;
      }
      
      console.log(`[LLM Council] Stage 3 complete. Consensus: ${consensusScore.toFixed(1)}%`);
    } else {
      const bestResponse = validResponses.sort((a, b) => b.tokens_used - a.tokens_used)[0];
      finalResponse = bestResponse?.content || "No valid responses received from the council.";
      consensusScore = validResponses.length > 0 ? 75 : 0;
    }
    
    const totalTokens = responses.reduce((a, b) => a + b.tokens_used, 0);
    const processingTime = Date.now() - startTime;
    
    await supabase.from("llm_council_sessions").update({
      final_response: finalResponse,
      status: "completed",
      consensus_score: consensusScore,
      total_tokens_used: totalTokens,
      processing_time_ms: processingTime,
      updated_at: new Date().toISOString(),
    }).eq("id", sessionId);
      
    await supabase.from("llm_council_messages").insert({
      session_id: sessionId,
      role: "assistant",
      content: finalResponse,
      model_id: chairmanConfig.model_id,
      tokens_used: totalTokens,
    });
    
    return new Response(
      JSON.stringify({
        success: true,
        session_id: sessionId,
        query,
        individual_responses: responses.map(r => ({
          model_id: r.model_id,
          display_name: r.display_name,
          content: r.content,
          tokens_used: r.tokens_used,
          latency_ms: r.latency_ms,
          error: r.error,
        })),
        rankings: rankings.map(r => ({ reviewer: r.reviewer_model_id, rankings: r.rankings })),
        final_response: finalResponse,
        chairman_model: chairmanConfig.display_name,
        consensus_score: Math.round(consensusScore),
        total_tokens: totalTokens,
        processing_time_ms: processingTime,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("LLM Council error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});