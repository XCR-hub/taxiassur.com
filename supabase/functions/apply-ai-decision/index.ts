import { isInternalRequest } from "../_shared/internal-auth.ts";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ??
  Deno.env.get("OpenAI_API_KEY") ?? "";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (!(await isInternalRequest(req))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { decision_id, approved_by } = await req.json();
    if (!decision_id) throw new Error("decision_id requis");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: decision, error: fetchErr } = await supabase
      .from("crm_ai_decisions")
      .select("*")
      .eq("id", decision_id)
      .single();

    if (fetchErr || !decision) throw new Error("Décision introuvable");
    if (decision.status !== "approved") {
      throw new Error("Décision non approuvée");
    }

    let actionResult: string | null = null;

    if (decision.lead_id) {
      const { data: lead } = await supabase
        .from("crm_leads")
        .select(
          "id, first_name, last_name, email, phone, status, pipeline_stage",
        )
        .eq("id", decision.lead_id)
        .maybeSingle();

      if (lead) {
        switch (decision.agent) {
          case "email_composer": {
            if (OPENAI_API_KEY && lead.email) {
              const res = await fetch(
                "https://api.openai.com/v1/chat/completions",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${OPENAI_API_KEY}`,
                  },
                  body: JSON.stringify({
                    model: "gpt-4o-mini",
                    max_tokens: 400,
                    messages: [
                      {
                        role: "system",
                        content:
                          "Tu es un commercial expert en assurance taxi chez TaxiAssur. Rédige des emails professionnels, chaleureux et orientés action.",
                      },
                      {
                        role: "user",
                        content:
                          `Rédige un email de relance pour ce prospect taxi:
Nom: ${lead.first_name} ${lead.last_name}
Contexte: ${decision.description}
Action suggérée: ${decision.suggested_action}

Email court (3-4 paragraphes), objet inclus, signature TaxiAssur.`,
                      },
                    ],
                  }),
                },
              );
              if (res.ok) {
                const data = await res.json();
                const emailContent = data.choices[0].message.content;
                await supabase.from("crm_interactions").insert({
                  lead_id: lead.id,
                  type: "email",
                  direction: "outbound",
                  subject: `[IA] ${decision.title}`,
                  content: emailContent,
                  notes:
                    `Email généré automatiquement par l'agent ${decision.agent} suite à approbation de la décision IA`,
                });
                actionResult = "Email de relance créé dans les interactions";
              }
            }
            break;
          }

          case "lead_scorer": {
            const scoreMap: Record<string, string> = {
              prediction: "DEVIS_ENVOYE",
              evaluation: "CONTACT_ETABLI",
            };
            const newStage = scoreMap[decision.decision_type];
            if (newStage && lead.pipeline_stage !== newStage) {
              await supabase
                .from("crm_leads")
                .update({ pipeline_stage: newStage })
                .eq("id", lead.id);
              actionResult = `Lead promu au stade: ${newStage}`;
            }
            break;
          }

          case "risk_analyzer":
          case "churn_predictor": {
            await supabase.from("crm_interactions").insert({
              lead_id: lead.id,
              type: "note",
              direction: "internal",
              subject: `[Alerte IA] ${decision.title}`,
              content:
                `${decision.description}\n\nRaisonnement: ${decision.rationale}\n\nAction recommandée: ${decision.suggested_action}`,
              notes: `Alerte générée par l'agent IA ${decision.agent}`,
            });
            actionResult = "Note d'alerte ajoutée à la timeline du lead";
            break;
          }

          default: {
            await supabase.from("crm_interactions").insert({
              lead_id: lead.id,
              type: "note",
              direction: "internal",
              subject: `[IA Appliqué] ${decision.title}`,
              content:
                `${decision.suggested_action}\n\n${decision.description}`,
              notes: `Action IA appliquée — Agent: ${decision.agent}`,
            });
            actionResult = "Action enregistrée dans la timeline";
            break;
          }
        }
      }
    }

    await supabase
      .from("crm_ai_decisions")
      .update({
        status: "auto_applied",
        applied_at: new Date().toISOString(),
        approved_by: approved_by ?? "system",
      })
      .eq("id", decision_id);

    return new Response(
      JSON.stringify({
        success: true,
        action_result: actionResult,
        decision_id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("apply-ai-decision error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
