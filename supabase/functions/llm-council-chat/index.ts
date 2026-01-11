import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
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

interface RankingResult {
  reviewer_model_id: string;
  rankings: {
    anonymous_id: string;
    accuracy_score: number;
    insight_score: number;
    clarity_score: number;
    reasoning: string;
  }[];
}

async function callLLM(config: LLMConfig, messages: any[], apiKey: string | undefined): Promise<LLMResponse> {
  const startTime = Date.now();
  const anonymousId = `model_${Math.random().toString(36).substring(2, 8)}`;
  
  const apiKeyToUse = apiKey || OPENAI_API_KEY;
  const baseUrl = apiKey ? "https://openrouter.ai/api/v1" : "https://api.openai.com/v1";
  const modelId = apiKey ? config.model_id : "gpt-4o";
  
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKeyToUse}`,
        "Content-Type": "application/json",
        ...(apiKey ? {
          "HTTP-Referer": "https://taxiassur.com",
          "X-Title": "TaxiAssur LLM Council"
        } : {})
      },
      body: JSON.stringify({
        model: modelId,
        messages,
        temperature: config.temperature,
        max_tokens: config.max_tokens,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    const latency = Date.now() - startTime;
    
    return {
      model_id: config.model_id,
      display_name: config.display_name,
      content: data.choices[0].message.content,
      tokens_used: data.usage?.total_tokens || 0,
      latency_ms: latency,
      anonymous_id: anonymousId,
    };
  } catch (error) {
    return {
      model_id: config.model_id,
      display_name: config.display_name,
      content: "",
      tokens_used: 0,
      latency_ms: Date.now() - startTime,
      error: error instanceof Error ? error.message : "Unknown error",
      anonymous_id: anonymousId,
    };
  }
}

async function getReviewPrompt(responses: LLMResponse[], query: string): string {
  const responsesText = responses
    .filter(r => r.content && !r.error)
    .map((r, i) => `\n=== Response ${r.anonymous_id} ===\n${r.content}\n`)
    .join("\n");
    
  return `You are a judge evaluating AI responses to a user query. Your task is to rank the responses based on accuracy, insight, and clarity.

USER QUERY:
${query}

RESPONSES TO EVALUATE:
${responsesText}

For each response, provide:
1. accuracy_score (1-10): How factually correct and relevant is the answer?
2. insight_score (1-10): How insightful and valuable is the response?
3. clarity_score (1-10): How clear and well-structured is the writing?
4. brief_reasoning: 1-2 sentence explanation

Respond in JSON format:
{
  "rankings": [
    {
      "anonymous_id": "model_xxx",
      "accuracy_score": 8,
      "insight_score": 7,
      "clarity_score": 9,
      "reasoning": "Clear and accurate response..."
    }
  ]
}`;
}

async function getChairmanPrompt(query: string, responses: LLMResponse[], rankings: RankingResult[]): string {
  const responsesText = responses
    .filter(r => r.content && !r.error)
    .map((r) => {
      const avgScores = rankings
        .flatMap(rk => rk.rankings)
        .filter(rk => rk.anonymous_id === r.anonymous_id);
      
      const avgAccuracy = avgScores.length > 0 
        ? avgScores.reduce((a, b) => a + b.accuracy_score, 0) / avgScores.length 
        : 0;
      const avgInsight = avgScores.length > 0 
        ? avgScores.reduce((a, b) => a + b.insight_score, 0) / avgScores.length 
        : 0;
        
      return `\n=== ${r.display_name} (Avg Accuracy: ${avgAccuracy.toFixed(1)}, Insight: ${avgInsight.toFixed(1)}) ===\n${r.content}\n`;
    })
    .join("\n");
    
  return `You are the Chairman of an LLM Council. Multiple AI models have provided responses to a user query, and they have reviewed each other's work.

Your task is to synthesize the best parts of all responses into a single, comprehensive final answer.

USER QUERY:
${query}

MODEL RESPONSES WITH PEER REVIEW SCORES:
${responsesText}

Now, write the definitive final response that:
1. Incorporates the most accurate information from all responses
2. Addresses any conflicting viewpoints
3. Is clear, comprehensive, and actionable
4. Credits insights where appropriate (e.g., "As noted by the council...")

Provide your final synthesized response:`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { query, session_id, single_turn } = await req.json();
    
    if (!query) {
      return new Response(
        JSON.stringify({ error: "Query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
        .insert({
          query,
          status: "processing",
          chairman_model: chairmanConfig.model_id,
        })
        .select()
        .single();
      sessionId = newSession?.id;
    }
    
    await supabase.from("llm_council_messages").insert({
      session_id: sessionId,
      role: "user",
      content: query,
    });
    
    console.log(`[LLM Council] Stage 1: Gathering ${councilModels.length} responses...`);
    
    const messages = [
      { role: "system", content: "You are an expert AI assistant. Provide accurate, insightful, and helpful responses. Be concise but thorough." },
      { role: "user", content: query }
    ];
    
    const responsePromises = councilModels.slice(0, 5).map(config => 
      callLLM(config, messages, OPENROUTER_API_KEY)
    );
    
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
    
    let rankings: RankingResult[] = [];
    let finalResponse = "";
    let consensusScore = 0;
    
    if (!single_turn && validResponses.length > 1) {
      console.log(`[LLM Council] Stage 2: Cross-review...`);
      
      const reviewPrompt = await getReviewPrompt(validResponses, query);
      
      const reviewPromises = councilModels.slice(0, 3).map(async config => {
        const reviewMessages = [
          { role: "system", content: "You are an expert judge. Respond only with valid JSON." },
          { role: "user", content: reviewPrompt }
        ];
        
        const reviewResp = await callLLM(config, reviewMessages, OPENROUTER_API_KEY);
        
        try {
          const jsonMatch = reviewResp.content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
              reviewer_model_id: config.model_id,
              rankings: parsed.rankings || [],
            };
          }
        } catch {
          console.error(`Failed to parse review from ${config.model_id}`);
        }
        return null;
      });
      
      const reviewResults = await Promise.all(reviewPromises);
      rankings = reviewResults.filter(r => r !== null) as RankingResult[];
      
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
      
      const chairmanPrompt = await getChairmanPrompt(query, validResponses, rankings);
      const chairmanMessages = [
        { role: "system", content: "You are the Chairman of an LLM Council. Synthesize multiple AI responses into one comprehensive answer." },
        { role: "user", content: chairmanPrompt }
      ];
      
      const chairmanResp = await callLLM(chairmanConfig, chairmanMessages, OPENROUTER_API_KEY);
      finalResponse = chairmanResp.content;
      
      const allScores = rankings.flatMap(r => r.rankings);
      if (allScores.length > 0) {
        const avgScore = allScores.reduce((a, b) => a + (b.accuracy_score + b.insight_score + b.clarity_score) / 3, 0) / allScores.length;
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
    
    await supabase
      .from("llm_council_sessions")
      .update({
        final_response: finalResponse,
        status: "completed",
        consensus_score: consensusScore,
        total_tokens_used: totalTokens,
        processing_time_ms: processingTime,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);
      
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
        rankings: rankings.map(r => ({
          reviewer: r.reviewer_model_id,
          rankings: r.rankings,
        })),
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