import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatRequest {
  message?: string;
  messages?: Message[];
  context?: {
    userContext?: Record<string, unknown>;
    previousMessages?: Message[];
  };
}

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const MAX_MESSAGES = 10;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_TOTAL_CHARS = 8000;

const SYSTEM_PROMPT = `Tu es Tissya, l'assistante virtuelle de TaxiAssur, le courtier specialise en assurance taxi en France.

INFORMATIONS CLE SUR TAXIASSUR:
- Courtier independant comparant 5 compagnies majeures: GENERALI, MFA, +Simple, Solly Azar, ZEPHIR
- Economies moyennes de 30-35% pour les clients
- Plus de 2000 chauffeurs assures
- Attestation delivree sous 2h ouvrables
- Telephone: 01 80 85 57 86
- Email: contact@taxiassur.fr

GARANTIES PROPOSEES:
- RC Professionnelle obligatoire
- Protection juridique
- Assistance 24/7 (panne, accident, vol)
- Bris de glace
- Vol et incendie
- Dommages tous accidents

DOCUMENTS REQUIS:
- Carte professionnelle taxi ou carte VTC
- Permis de conduire
- Carte grise du vehicule
- Releve d'information (ancien assureur)
- RIB pour prelevement
- Piece d'identite

REGLES DE COMMUNICATION:
1. Reponds toujours en francais de maniere professionnelle mais chaleureuse
2. Sois concise (2-3 phrases max sauf si question complexe)
3. Encourage toujours vers la demande de devis ou le rappel telephonique
4. Si tu ne connais pas une reponse precise, oriente vers le contact telephonique
5. Utilise les emojis avec parcimonie (1-2 par message maximum)
6. Ne donne jamais de tarifs precis, oriente vers le devis personnalise`;

function truncateMessage(content: string): string {
  if (content.length <= MAX_MESSAGE_LENGTH) return content;
  return content.substring(0, MAX_MESSAGE_LENGTH - 3) + "...";
}

function truncateConversation(messages: Message[]): Message[] {
  const recentMessages = messages.slice(-MAX_MESSAGES);

  let totalChars = SYSTEM_PROMPT.length;
  const truncated: Message[] = [];

  for (let i = recentMessages.length - 1; i >= 0; i--) {
    const msg = recentMessages[i];
    const truncatedContent = truncateMessage(msg.content);
    const msgLength = truncatedContent.length;

    if (totalChars + msgLength > MAX_TOTAL_CHARS) {
      break;
    }

    truncated.unshift({ ...msg, content: truncatedContent });
    totalChars += msgLength;
  }

  return truncated;
}

async function callOpenAI(messages: Message[]): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenAI API error:", errorText);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "Je suis desole, je n'ai pas pu generer une reponse.";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body: ChatRequest = await req.json();

    let messages: Message[] = [];

    if (body.messages && Array.isArray(body.messages)) {
      messages = body.messages.filter(m => m.role && m.content);
    } else if (body.context?.previousMessages) {
      messages = body.context.previousMessages.filter(m => m.role && m.content);
      if (body.message) {
        messages.push({ role: "user", content: body.message });
      }
    } else if (body.message) {
      messages = [{ role: "user", content: body.message }];
    }

    if (messages.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No message provided",
          message: "Bonjour ! Comment puis-je vous aider avec votre assurance taxi ?",
          response: "Bonjour ! Comment puis-je vous aider avec votre assurance taxi ?",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const truncatedMessages = truncateConversation(messages);

    const aiResponse = await callOpenAI(truncatedMessages);

    return new Response(
      JSON.stringify({
        success: true,
        message: aiResponse,
        response: aiResponse,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Chatbot error:", error);

    const fallbackMessage = "Je rencontre une petite difficulte technique. Vous pouvez nous contacter directement au 01 80 85 57 86 ou via notre formulaire de contact. Notre equipe vous repondra immediatement !";

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        message: fallbackMessage,
        response: fallbackMessage,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});