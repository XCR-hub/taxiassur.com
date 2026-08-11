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

interface RAGRequest {
  action: "query" | "index" | "search" | "answer";
  query?: string;
  document?: {
    title: string;
    content: string;
    source_type: string;
    category?: string;
    tags?: string[];
  };
  options?: {
    top_k?: number;
    category_filter?: string;
    include_sources?: boolean;
  };
}

async function getEmbedding(text: string): Promise<number[]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
    }),
  });
  
  const data = await response.json();
  return data.data[0].embedding;
}

function chunkText(text: string, chunkSize: number = 500, overlap: number = 100): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let currentChunk = "";
  
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      const words = currentChunk.split(" ");
      currentChunk = words.slice(-Math.floor(overlap / 10)).join(" ") + " " + sentence;
    } else {
      currentChunk += (currentChunk ? " " : "") + sentence;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

async function indexDocument(supabase: any, document: any) {
  const { data: doc, error: docError } = await supabase
    .from("llm_knowledge_documents")
    .insert({
      title: document.title,
      source_type: document.source_type,
      content: document.content,
      category: document.category,
      tags: document.tags || [],
      content_hash: await hashContent(document.content),
    })
    .select()
    .single();
  
  if (docError) throw docError;
  
  const chunks = chunkText(document.content);
  const chunkInserts = [];
  
  for (let i = 0; i < chunks.length; i++) {
    const embedding = await getEmbedding(chunks[i]);
    chunkInserts.push({
      document_id: doc.id,
      chunk_index: i,
      content: chunks[i],
      embedding: embedding,
      token_count: Math.ceil(chunks[i].length / 4),
      metadata: { position: i, total_chunks: chunks.length },
    });
  }
  
  await supabase.from("llm_knowledge_chunks").insert(chunkInserts);
  
  await supabase.from("llm_knowledge_documents").update({
    chunk_count: chunks.length,
    last_indexed_at: new Date().toISOString(),
  }).eq("id", doc.id);
  
  return { document_id: doc.id, chunks_created: chunks.length };
}

async function hashContent(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

async function searchKnowledge(supabase: any, query: string, options: any = {}) {
  const queryEmbedding = await getEmbedding(query);
  const topK = options.top_k || 5;
  
  const rpcQuery = supabase.rpc("match_knowledge_chunks", {
    query_embedding: queryEmbedding,
    match_threshold: 0.7,
    match_count: topK,
  });
  
  const { data: chunks, error } = await rpcQuery;
  
  if (error) {
    const { data: fallbackChunks } = await supabase
      .from("llm_knowledge_chunks")
      .select(`
        id,
        content,
        document_id,
        llm_knowledge_documents!inner(title, category, source_type)
      `)
      .limit(topK);
    
    return fallbackChunks || [];
  }
  
  return chunks || [];
}

async function generateRAGAnswer(supabase: any, query: string, chunks: any[], options: any = {}) {
  const context = chunks.map((c, i) => 
    `[Source ${i + 1}]: ${c.content}`
  ).join("\n\n");
  
  const { data: agentConfig } = await supabase
    .from("llm_agents")
    .select("*")
    .eq("slug", "rag-expert")
    .maybeSingle();
  
  const systemPrompt = agentConfig?.system_prompt || 
    "Tu es un expert en assurance taxi. Reponds aux questions en te basant sur le contexte fourni.";
  
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: agentConfig?.model_id || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "system",
          content: `Contexte de la base de connaissances TaxiAssur:\n\n${context}\n\nUtilise UNIQUEMENT ces informations pour repondre. Si l'information n'est pas dans le contexte, dis-le clairement.`,
        },
        { role: "user", content: query },
      ],
      temperature: agentConfig?.temperature || 0.3,
      max_tokens: agentConfig?.max_tokens || 1000,
    }),
  });
  
  const data = await response.json();
  const answer = data.choices[0].message.content;
  
  await supabase.from("llm_knowledge_queries").insert({
    query_text: query,
    retrieved_chunk_ids: chunks.map(c => c.id),
    response_generated: answer,
  });
  
  if (agentConfig) {
    await supabase.rpc("update_llm_agent_stats", {
      p_agent_id: agentConfig.id,
      p_tokens_used: data.usage?.total_tokens || 0,
      p_response_time_ms: 0,
      p_success: true,
    });
  }
  
  const result: any = {
    answer,
    chunks_used: chunks.length,
  };
  
  if (options.include_sources) {
    result.sources = chunks.map(c => ({
      content_preview: c.content.substring(0, 200) + "...",
      document_title: c.llm_knowledge_documents?.title,
      category: c.llm_knowledge_documents?.category,
    }));
  }
  
  return result;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const request: RAGRequest = await req.json();
    
    let result;
    
    switch (request.action) {
      case "index": {
        if (!request.document) {
          return new Response(
            JSON.stringify({ success: false, error: "Document required for indexing" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        result = await indexDocument(supabase, request.document);
        break;
      }
      
      case "search": {
        if (!request.query) {
          return new Response(
            JSON.stringify({ success: false, error: "Query required for search" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const chunks = await searchKnowledge(supabase, request.query, request.options);
        result = { chunks, count: chunks.length };
        break;
      }
      
      case "query":
      case "answer": {
        if (!request.query) {
          return new Response(
            JSON.stringify({ success: false, error: "Query required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const searchedChunks = await searchKnowledge(supabase, request.query, request.options);
        result = await generateRAGAnswer(supabase, request.query, searchedChunks, request.options);
        break;
      }
      
      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unknown action: ${request.action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
    
    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("RAG Agent error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
