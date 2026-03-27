import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const REPORT_EMAIL = "team@taxiassur.com";

interface DecisionStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  auto_applied: number;
  avg_confidence: number;
}

interface AgentStats {
  agent: string;
  count: number;
  avg_confidence: number;
  auto_applied: number;
}

interface LeadInsight {
  lead_name: string;
  email: string;
  pipeline_stage: string;
  decisions_count: number;
  top_action: string;
  ai_score: number | null;
  risk_level: string | null;
}

async function sendEmailSMTP(
  to: string,
  subject: string,
  htmlBody: string
): Promise<void> {
  const SMTP_HOST = Deno.env.get("IONOS_SMTP_HOST") || "smtp.ionos.fr";
  const SMTP_PORT = parseInt(Deno.env.get("IONOS_SMTP_PORT") || "465");
  const SMTP_USER = Deno.env.get("IONOS_EMAIL_USER") || "team@taxiassur.com";
  const SMTP_PASS = Deno.env.get("IONOS_EMAIL_PASSWORD");

  if (!SMTP_PASS) {
    throw new Error("IONOS_EMAIL_PASSWORD not configured");
  }

  const conn = await Deno.connectTls({
    hostname: SMTP_HOST,
    port: SMTP_PORT,
  });

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  async function readResponse(): Promise<string> {
    const buffer = new Uint8Array(4096);
    const n = await conn.read(buffer);
    if (n === null) return "";
    return decoder.decode(buffer.subarray(0, n));
  }

  async function sendCommand(command: string): Promise<string> {
    await conn.write(encoder.encode(command + "\r\n"));
    return await readResponse();
  }

  try {
    await readResponse();
    await sendCommand("EHLO taxiassur.com");
    await sendCommand("AUTH LOGIN");
    await sendCommand(btoa(SMTP_USER));
    const authResponse = await sendCommand(btoa(SMTP_PASS));

    if (authResponse.includes("535")) {
      throw new Error("SMTP authentication failed");
    }

    await sendCommand(`MAIL FROM:<${SMTP_USER}>`);
    await sendCommand(`RCPT TO:<${to}>`);
    await sendCommand("DATA");

    const now = new Date();
    const dateStr = now.toUTCString();

    const emailContent = [
      `From: TaxiAssur IA <${SMTP_USER}>`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `Date: ${dateStr}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: 8bit`,
      ``,
      htmlBody,
      `.`,
    ].join("\r\n");

    await sendCommand(emailContent);
    await sendCommand("QUIT");
    conn.close();
  } catch (error) {
    conn.close();
    throw error;
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildReportHTML(
  stats: DecisionStats,
  agentStats: AgentStats[],
  topInsights: LeadInsight[],
  recentDecisions: Array<{ agent: string; title: string; confidence_score: number; status: string; suggested_action: string; created_at: string }>,
  leadsCount: number,
  dateRange: string
): string {
  const confidenceColor = stats.avg_confidence >= 0.8 ? "#10b981" : stats.avg_confidence >= 0.6 ? "#f59e0b" : "#ef4444";

  const agentRows = agentStats
    .sort((a, b) => b.count - a.count)
    .map(
      (a) => `
      <tr>
        <td style="padding: 10px 14px; border-bottom: 1px solid #e5e7eb; font-weight: 500;">${agentLabel(a.agent)}</td>
        <td style="padding: 10px 14px; border-bottom: 1px solid #e5e7eb; text-align: center;">${a.count}</td>
        <td style="padding: 10px 14px; border-bottom: 1px solid #e5e7eb; text-align: center;">${(a.avg_confidence * 100).toFixed(0)}%</td>
        <td style="padding: 10px 14px; border-bottom: 1px solid #e5e7eb; text-align: center;">${a.auto_applied}</td>
      </tr>`
    )
    .join("");

  const insightRows = topInsights
    .slice(0, 5)
    .map(
      (l) => `
      <tr>
        <td style="padding: 10px 14px; border-bottom: 1px solid #e5e7eb;">
          <strong>${l.lead_name}</strong><br>
          <span style="color: #6b7280; font-size: 12px;">${l.email}</span>
        </td>
        <td style="padding: 10px 14px; border-bottom: 1px solid #e5e7eb; text-align: center;">
          <span style="background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 12px; font-size: 12px;">${pipelineLabel(l.pipeline_stage)}</span>
        </td>
        <td style="padding: 10px 14px; border-bottom: 1px solid #e5e7eb; text-align: center;">${l.ai_score ?? "-"}</td>
        <td style="padding: 10px 14px; border-bottom: 1px solid #e5e7eb; text-align: center;">
          <span style="color: ${riskColor(l.risk_level)};">${l.risk_level ?? "-"}</span>
        </td>
        <td style="padding: 10px 14px; border-bottom: 1px solid #e5e7eb; font-size: 13px;">${l.top_action}</td>
      </tr>`
    )
    .join("");

  const decisionRows = recentDecisions
    .slice(0, 10)
    .map(
      (d) => `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #f3f4f6; font-size: 13px;">${agentLabel(d.agent)}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #f3f4f6; font-size: 13px; font-weight: 500;">${d.title}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #f3f4f6; text-align: center; font-size: 13px;">${(d.confidence_score * 100).toFixed(0)}%</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #f3f4f6; text-align: center;">
          <span style="background: ${statusColor(d.status)}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px;">${statusLabel(d.status)}</span>
        </td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 700px; margin: 0 auto; padding: 24px;">

    <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 32px; margin-bottom: 24px; color: white;">
      <div style="display: flex; align-items: center; margin-bottom: 16px;">
        <div style="width: 40px; height: 40px; background: #3b82f6; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
          <span style="font-size: 20px;">&#129302;</span>
        </div>
        <div>
          <h1 style="margin: 0; font-size: 22px; font-weight: 700;">Rapport IA Governance - TaxiAssur</h1>
          <p style="margin: 4px 0 0; font-size: 14px; color: #94a3b8;">${dateRange}</p>
        </div>
      </div>
      <p style="margin: 0; font-size: 14px; color: #cbd5e1;">Analyse quotidienne automatique de vos leads par les 8 agents IA</p>
    </div>

    <div style="display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap;">
      <div style="flex: 1; min-width: 120px; background: white; border-radius: 10px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); text-align: center;">
        <div style="font-size: 28px; font-weight: 700; color: #1e293b;">${stats.total}</div>
        <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Decisions totales</div>
      </div>
      <div style="flex: 1; min-width: 120px; background: white; border-radius: 10px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); text-align: center;">
        <div style="font-size: 28px; font-weight: 700; color: #f59e0b;">${stats.pending}</div>
        <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">En attente</div>
      </div>
      <div style="flex: 1; min-width: 120px; background: white; border-radius: 10px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); text-align: center;">
        <div style="font-size: 28px; font-weight: 700; color: #10b981;">${stats.approved + stats.auto_applied}</div>
        <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Approuvees</div>
      </div>
      <div style="flex: 1; min-width: 120px; background: white; border-radius: 10px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); text-align: center;">
        <div style="font-size: 28px; font-weight: 700; color: ${confidenceColor};">${(stats.avg_confidence * 100).toFixed(0)}%</div>
        <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Confiance moy.</div>
      </div>
    </div>

    <div style="background: white; border-radius: 10px; padding: 24px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
      <h2 style="margin: 0 0 16px; font-size: 16px; color: #1e293b;">Performance par Agent</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #f8fafc;">
            <th style="padding: 10px 14px; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Agent</th>
            <th style="padding: 10px 14px; text-align: center; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Decisions</th>
            <th style="padding: 10px 14px; text-align: center; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Confiance</th>
            <th style="padding: 10px 14px; text-align: center; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Auto-app.</th>
          </tr>
        </thead>
        <tbody>${agentRows || '<tr><td colspan="4" style="padding: 20px; text-align: center; color: #9ca3af;">Aucune donnee agent</td></tr>'}</tbody>
      </table>
    </div>

    ${topInsights.length > 0 ? `
    <div style="background: white; border-radius: 10px; padding: 24px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
      <h2 style="margin: 0 0 16px; font-size: 16px; color: #1e293b;">Leads analyses (Top 5)</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #f8fafc;">
            <th style="padding: 10px 14px; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase;">Lead</th>
            <th style="padding: 10px 14px; text-align: center; font-size: 12px; color: #6b7280; text-transform: uppercase;">Pipeline</th>
            <th style="padding: 10px 14px; text-align: center; font-size: 12px; color: #6b7280; text-transform: uppercase;">Score IA</th>
            <th style="padding: 10px 14px; text-align: center; font-size: 12px; color: #6b7280; text-transform: uppercase;">Risque</th>
            <th style="padding: 10px 14px; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase;">Action suggere</th>
          </tr>
        </thead>
        <tbody>${insightRows}</tbody>
      </table>
    </div>` : ""}

    ${recentDecisions.length > 0 ? `
    <div style="background: white; border-radius: 10px; padding: 24px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
      <h2 style="margin: 0 0 16px; font-size: 16px; color: #1e293b;">Dernieres decisions IA</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #f8fafc;">
            <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #6b7280;">Agent</th>
            <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #6b7280;">Decision</th>
            <th style="padding: 8px 12px; text-align: center; font-size: 12px; color: #6b7280;">Confiance</th>
            <th style="padding: 8px 12px; text-align: center; font-size: 12px; color: #6b7280;">Statut</th>
          </tr>
        </thead>
        <tbody>${decisionRows}</tbody>
      </table>
    </div>` : ""}

    <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 20px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 8px; font-size: 14px; color: #1e40af;">Actions recommandees</h3>
      <ul style="margin: 0; padding-left: 20px; color: #1e3a5f; font-size: 13px; line-height: 1.8;">
        ${stats.pending > 0 ? `<li><strong>${stats.pending} decisions en attente</strong> de validation dans le backoffice</li>` : ""}
        ${stats.pending === 0 && stats.total === 0 ? `<li>Aucune decision generee - verifiez que des leads actifs existent dans le CRM</li>` : ""}
        ${stats.auto_applied > 0 ? `<li>${stats.auto_applied} decisions auto-appliquees avec succes</li>` : ""}
        <li>Connectez-vous au <a href="https://taxiassur.com/admin" style="color: #2563eb;">backoffice</a> pour voir le detail</li>
      </ul>
    </div>

    <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
      <p style="margin: 0;">TaxiAssur - Rapport automatique IA Governance</p>
      <p style="margin: 4px 0 0;">Genere le ${new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
    </div>

  </div>
</body>
</html>`;
}

function agentLabel(agent: string): string {
  const labels: Record<string, string> = {
    lead_scorer: "Lead Scorer",
    email_composer: "Email Composer",
    negotiation_assistant: "Negotiation",
    risk_analyzer: "Risk Analyzer",
    churn_predictor: "Churn Predictor",
    cross_sell_recommender: "Cross-Sell",
    sentiment_analyzer: "Sentiment",
    response_generator: "Response Gen.",
  };
  return labels[agent] ?? agent;
}

function pipelineLabel(stage: string): string {
  const labels: Record<string, string> = {
    nouveau_lead: "Nouveau",
    contact_etabli: "Contact",
    devis_envoye: "Devis",
    devis_accepte: "Accepte",
    documents_collectes: "Documents",
    contrat_signe: "Signe",
    client_actif: "Client",
  };
  return labels[stage] ?? stage ?? "Nouveau";
}

function statusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: "#f59e0b",
    approved: "#10b981",
    auto_applied: "#3b82f6",
    rejected: "#ef4444",
  };
  return colors[status] ?? "#6b7280";
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "En attente",
    approved: "Approuve",
    auto_applied: "Auto-app.",
    rejected: "Rejete",
  };
  return labels[status] ?? status;
}

function riskColor(risk: string | null): string {
  if (risk === "HIGH") return "#ef4444";
  if (risk === "MEDIUM") return "#f59e0b";
  return "#10b981";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const dateRange = `${yesterday.toLocaleDateString("fr-FR")} - ${now.toLocaleDateString("fr-FR")}`;

    console.log(`[AI Governance Report] Generating report for ${dateRange}`);

    const { data: decisions24h } = await supabase
      .from("crm_ai_decisions")
      .select("id, lead_id, agent, decision_type, title, description, confidence_score, suggested_action, status, created_at")
      .gte("created_at", yesterday.toISOString())
      .order("created_at", { ascending: false });

    const allDecisions = decisions24h ?? [];

    const stats: DecisionStats = {
      total: allDecisions.length,
      pending: allDecisions.filter((d) => d.status === "pending").length,
      approved: allDecisions.filter((d) => d.status === "approved").length,
      rejected: allDecisions.filter((d) => d.status === "rejected").length,
      auto_applied: allDecisions.filter((d) => d.status === "auto_applied").length,
      avg_confidence:
        allDecisions.length > 0
          ? allDecisions.reduce((sum, d) => sum + (d.confidence_score ?? 0), 0) / allDecisions.length
          : 0,
    };

    const agentMap = new Map<string, { count: number; totalConf: number; autoApplied: number }>();
    for (const d of allDecisions) {
      const entry = agentMap.get(d.agent) ?? { count: 0, totalConf: 0, autoApplied: 0 };
      entry.count++;
      entry.totalConf += d.confidence_score ?? 0;
      if (d.status === "auto_applied") entry.autoApplied++;
      agentMap.set(d.agent, entry);
    }
    const agentStats: AgentStats[] = Array.from(agentMap.entries()).map(([agent, data]) => ({
      agent,
      count: data.count,
      avg_confidence: data.count > 0 ? data.totalConf / data.count : 0,
      auto_applied: data.autoApplied,
    }));

    const leadIds = [...new Set(allDecisions.map((d) => d.lead_id).filter(Boolean))];
    let topInsights: LeadInsight[] = [];

    if (leadIds.length > 0) {
      const { data: leads } = await supabase
        .from("crm_leads")
        .select("id, first_name, last_name, email, pipeline_stage, ai_lead_score, ai_risk_level")
        .in("id", leadIds.slice(0, 20));

      if (leads) {
        topInsights = leads.map((l) => {
          const leadDecisions = allDecisions.filter((d) => d.lead_id === l.id);
          const topDecision = leadDecisions.sort((a, b) => (b.confidence_score ?? 0) - (a.confidence_score ?? 0))[0];
          return {
            lead_name: `${l.first_name ?? ""} ${l.last_name ?? ""}`.trim() || "Sans nom",
            email: l.email ?? "-",
            pipeline_stage: l.pipeline_stage ?? "nouveau_lead",
            decisions_count: leadDecisions.length,
            top_action: topDecision?.suggested_action ?? "-",
            ai_score: l.ai_lead_score,
            risk_level: l.ai_risk_level,
          };
        });
        topInsights.sort((a, b) => (b.ai_score ?? 0) - (a.ai_score ?? 0));
      }
    }

    const { count: leadsCount } = await supabase
      .from("crm_leads")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .is("is_archived", false);

    const recentDecisions = allDecisions.slice(0, 10).map((d) => ({
      agent: d.agent,
      title: d.title,
      confidence_score: d.confidence_score ?? 0,
      status: d.status,
      suggested_action: d.suggested_action ?? "",
      created_at: d.created_at,
    }));

    const htmlReport = buildReportHTML(
      stats,
      agentStats,
      topInsights,
      recentDecisions,
      leadsCount ?? 0,
      dateRange
    );

    const subject = `[TaxiAssur IA] Rapport Governance ${now.toLocaleDateString("fr-FR")} - ${stats.total} decisions, ${(stats.avg_confidence * 100).toFixed(0)}% confiance`;

    await sendEmailSMTP(REPORT_EMAIL, subject, htmlReport);

    console.log(`[AI Governance Report] Email sent to ${REPORT_EMAIL}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Rapport envoye a ${REPORT_EMAIL}`,
        stats: {
          decisions_24h: stats.total,
          pending: stats.pending,
          approved: stats.approved + stats.auto_applied,
          avg_confidence: stats.avg_confidence,
          leads_analyzed: leadIds.length,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[AI Governance Report] Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
