import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface InboundSMS {
  from: string;
  to: string;
  text: string;
  messageId?: string;
  date?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let payload: InboundSMS;

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      payload = {
        from: formData.get("from")?.toString() || formData.get("sender")?.toString() || "",
        to: formData.get("to")?.toString() || formData.get("recipient")?.toString() || "+33744410598",
        text: formData.get("text")?.toString() || formData.get("content")?.toString() || formData.get("body")?.toString() || "",
        messageId: formData.get("messageId")?.toString() || formData.get("message_id")?.toString(),
        date: formData.get("date")?.toString(),
      };
    } else {
      const json = await req.json();
      payload = {
        from: json.from || json.sender || json.From || "",
        to: json.to || json.recipient || json.To || "+33744410598",
        text: json.text || json.content || json.body || json.Body || json.message || "",
        messageId: json.messageId || json.message_id || json.MessageSid || json.SmsSid,
        date: json.date || json.DateSent,
      };
    }

    if (!payload.from || !payload.text) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing from or text" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let phoneNumber = payload.from.replace(/[\s\-\.]/g, "");
    if (phoneNumber.startsWith("0")) {
      phoneNumber = "+33" + phoneNumber.substring(1);
    }
    if (!phoneNumber.startsWith("+")) {
      phoneNumber = "+" + phoneNumber;
    }

    console.log(`[SMS INBOUND] From: ${phoneNumber}, Content: ${payload.text.substring(0, 50)}...`);

    // Find matching lead by phone
    const phoneVariants = [
      phoneNumber,
      phoneNumber.replace("+33", "0"),
      phoneNumber.replace("+33", "33"),
    ];

    const { data: matchingLead } = await supabase
      .from("crm_leads")
      .select("id, first_name, last_name, email, phone, pipeline_stage")
      .or(phoneVariants.map(p => `phone.eq.${p}`).join(","))
      .limit(1)
      .maybeSingle();

    const leadId = matchingLead?.id || null;

    // Get or create conversation
    const { data: convId } = await supabase.rpc("get_or_create_sms_conversation", {
      p_phone_number: phoneNumber,
      p_lead_id: leadId,
    });

    const conversationId = convId;

    // AI Analysis of inbound message
    let aiAnalysis: Record<string, unknown> | null = null;
    let aiSuggestedReply: string | null = null;

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (openaiKey) {
      try {
        const leadContext = matchingLead
          ? `Lead: ${matchingLead.first_name} ${matchingLead.last_name}, Email: ${matchingLead.email}, Etape pipeline: ${matchingLead.pipeline_stage}`
          : "Lead inconnu";

        const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: `Tu es un assistant commercial pour TaxiAssur (courtier assurance taxi).
Analyse ce SMS entrant d'un prospect/client et reponds en JSON:
{
  "intent": "question|document|confirmation|refus|demande_rappel|urgence|autre",
  "sentiment": "positif|neutre|negatif",
  "urgency": "haute|moyenne|basse",
  "summary": "resume en 1 phrase",
  "suggested_reply": "reponse SMS courte et pro (max 160 chars)",
  "action_needed": "description action commerciale recommandee",
  "auto_reply_safe": true/false
}
Contexte: ${leadContext}
Notre numero: 07 44 41 05 98. On vend de l'assurance taxi.`,
              },
              { role: "user", content: payload.text },
            ],
            temperature: 0.3,
            max_tokens: 500,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const parsed = JSON.parse(aiData.choices[0].message.content);
          aiAnalysis = {
            intent: parsed.intent,
            sentiment: parsed.sentiment,
            urgency: parsed.urgency,
            summary: parsed.summary,
            action_needed: parsed.action_needed,
            auto_reply_safe: parsed.auto_reply_safe,
          };
          aiSuggestedReply = parsed.suggested_reply;
        }
      } catch (aiErr) {
        console.error("AI analysis error:", aiErr);
      }
    }

    // Insert message
    const { data: messageRecord, error: insertError } = await supabase
      .from("sms_messages")
      .insert({
        conversation_id: conversationId,
        lead_id: leadId,
        direction: "inbound",
        from_number: phoneNumber,
        to_number: "+33744410598",
        content: payload.text,
        status: "received",
        provider_message_id: payload.messageId || null,
        ai_analysis: aiAnalysis,
        ai_suggested_reply: aiSuggestedReply,
        is_automated: false,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
    }

    // Update conversation
    await supabase
      .from("sms_conversations")
      .update({
        last_message_at: new Date().toISOString(),
        unread_count: supabase.rpc ? 1 : 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversationId);

    // Increment unread count
    await supabase.rpc("increment_sms_unread", { p_conversation_id: conversationId }).catch(() => {
      // Fallback if function doesn't exist yet
    });

    // Log as CRM interaction
    if (leadId) {
      await supabase.from("crm_interactions").insert({
        lead_id: leadId,
        type: "sms",
        direction: "inbound",
        subject: `SMS recu de ${phoneNumber}`,
        content: payload.text,
        metadata: {
          conversation_id: conversationId,
          message_id: messageRecord?.id,
          ai_analysis: aiAnalysis,
          provider_message_id: payload.messageId,
        },
      });
    }

    // Create notification for commercial
    if (leadId) {
      await supabase.from("crm_event_notifications").insert({
        lead_id: leadId,
        type: "sms_received",
        title: `SMS recu de ${matchingLead?.first_name || phoneNumber}`,
        message: payload.text.substring(0, 200),
        priority: aiAnalysis?.urgency === "haute" ? 1 : 3,
        context_data: {
          conversation_id: conversationId,
          phone: phoneNumber,
          ai_suggested_reply: aiSuggestedReply,
        },
      }).catch(() => {});
    }

    return new Response(
      JSON.stringify({
        success: true,
        message_id: messageRecord?.id,
        conversation_id: conversationId,
        lead_id: leadId,
        ai_analysis: aiAnalysis,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Inbound SMS error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
