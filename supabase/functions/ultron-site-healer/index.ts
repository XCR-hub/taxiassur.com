import { isInternalRequest } from "../_shared/internal-auth.ts";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const EDGE_FUNCTIONS_TO_TEST = [
  "send-lead-notification",
  "send-email-ionos",
  "process-lead-queue",
  "pipeline-automation-engine",
  "generate-ai-decisions",
  "document-collector-ia",
  "gsc-sync-performance",
  "relance-engine",
];

const CRITICAL_TABLES = [
  "crm_leads",
  "ultron_lead_queue",
  "ultron_missions",
  "ultron_command_log",
  "email_queue",
  "crm_lead_documents",
  "prospect_documents",
  "system_config",
];

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const mode = body.mode || "full";

    console.log("[ULTRON-HEALER] Demarrage audit - mode:", mode);

    const report: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      mode,
      tables: {},
      crons: {},
      leads: {},
      email: {},
      storage: {},
      edge_functions: {},
      global_score: 100,
      total_repairs: 0,
      anomalies: [],
    };

    // ─── 1. AUDIT BDD COMPLET via fonction SQL ───────────────────
    if (mode === "full" || mode === "db") {
      const { data: auditResult, error: auditError } = await supabase
        .rpc("ultron_audit_full_site");

      if (auditError) {
        console.error("[HEALER] audit_full_site error:", auditError.message);
        report.db_audit_error = auditError.message;
      } else {
        report.db_audit = auditResult;
        if (auditResult?.global_score) {
          report.global_score = auditResult.global_score;
        }
        if (auditResult?.total_repairs) {
          report.total_repairs = auditResult.total_repairs;
        }
      }
    }

    // ─── 2. VERIFICATION TABLES CRITIQUES ────────────────────────
    if (mode === "full" || mode === "tables") {
      const tableResults: Record<string, unknown> = {};
      let tableErrors = 0;

      for (const table of CRITICAL_TABLES) {
        try {
          const { count, error } = await supabase
            .from(table)
            .select("*", { count: "exact", head: true });

          if (error) {
            tableResults[table] = { status: "error", error: error.message };
            tableErrors++;

            await supabase.from("ultron_anomalies").insert({
              anomaly_type: "table_access_error",
              subsystem: "DATABASE",
              severity: "high",
              description: `Acces table echoue: ${table} - ${error.message}`,
              affected_entity: table,
              auto_repairable: false,
            });
          } else {
            tableResults[table] = { status: "ok", count };
          }
        } catch (e) {
          tableResults[table] = { status: "exception", error: String(e) };
          tableErrors++;
        }
      }

      report.tables = { results: tableResults, errors: tableErrors };
      if (tableErrors > 0) {
        (report.anomalies as unknown[]).push({
          type: "table_errors",
          count: tableErrors,
          severity: "high",
        });
      }
    }

    // ─── 3. VERIFICATION LEADS RECENTS ───────────────────────────
    if (mode === "full" || mode === "leads") {
      const { data: recentLeads, error: leadsError } = await supabase
        .from("crm_leads")
        .select("id, email, pipeline_stage, access_token, created_at")
        .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString())
        .order("created_at", { ascending: false });

      if (!leadsError && recentLeads) {
        const withoutToken = recentLeads.filter((l) => !l.access_token);
        const withoutStage = recentLeads.filter((l) => !l.pipeline_stage);

        // Auto-repair: generer tokens manquants
        if (withoutToken.length > 0) {
          for (const lead of withoutToken) {
            const token = crypto.randomUUID().replace(/-/g, "");
            await supabase
              .from("crm_leads")
              .update({ access_token: token })
              .eq("id", lead.id);
          }
          (report.total_repairs as number) += withoutToken.length;
        }

        report.leads = {
          recent_7days: recentLeads.length,
          without_token_fixed: withoutToken.length,
          without_stage: withoutStage.length,
          status: "checked",
        };
      }
    }

    // ─── 4. VERIFICATION QUEUE EMAIL ─────────────────────────────
    if (mode === "full" || mode === "email") {
      const { data: queueData, error: queueError } = await supabase
        .from("email_queue")
        .select("status, created_at", { count: "exact" })
        .limit(200);

      if (!queueError && queueData) {
        const stuck = queueData.filter(
          (e) =>
            e.status === "pending" &&
            new Date(e.created_at) < new Date(Date.now() - 2 * 3600000),
        );
        const failed = queueData.filter((e) => e.status === "failed");

        if (stuck.length > 0 || failed.length > 0) {
          await supabase
            .from("email_queue")
            .update({ status: "pending", retry_count: 0 })
            .in("status", ["failed"])
            .lt("retry_count", 3);

          (report.total_repairs as number) += stuck.length + failed.length;
        }

        report.email = {
          queue_total: queueData.length,
          stuck_reset: stuck.length,
          failed_reset: failed.length,
        };
      }
    }

    // ─── 5. TEST EDGE FUNCTIONS (ping rapide) ────────────────────
    if (mode === "full" || mode === "edge") {
      const efResults: Record<string, unknown> = {};

      for (const fn of EDGE_FUNCTIONS_TO_TEST) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);

          const res = await fetch(
            `${supabaseUrl}/functions/v1/${fn}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${serviceKey}`,
              },
              body: JSON.stringify({ action: "health_check", ping: true }),
              signal: controller.signal,
            },
          ).catch(() => null);

          clearTimeout(timeout);

          if (res === null) {
            efResults[fn] = { status: "timeout" };
          } else if (res.ok || res.status === 400 || res.status === 422) {
            efResults[fn] = { status: "ok", http_status: res.status };
          } else if (res.status === 500) {
            efResults[fn] = { status: "error_500", http_status: res.status };
            (report.anomalies as unknown[]).push({
              type: "edge_function_500",
              function: fn,
              severity: "medium",
            });
          } else {
            efResults[fn] = { status: "unknown", http_status: res.status };
          }
        } catch (e) {
          efResults[fn] = {
            status: "exception",
            error: String(e).slice(0, 100),
          };
        }
      }

      report.edge_functions = efResults;
    }

    // ─── 6. CALCUL SCORE GLOBAL FINAL ────────────────────────────
    const { data: latestHealth } = await supabase
      .from("ultron_health_checks")
      .select("score")
      .gte("checked_at", new Date(Date.now() - 35 * 60000).toISOString())
      .limit(20);

    if (latestHealth && latestHealth.length > 0) {
      const avg = latestHealth.reduce((s, h) => s + (h.score || 100), 0) /
        latestHealth.length;
      report.global_score = Math.round(avg);
    }

    // ─── 7. LOG FINAL DANS ULTRON ────────────────────────────────
    await supabase.from("ultron_command_log").insert({
      action_type: "site_healer_run",
      subsystem: "ULTRON_SITE_HEALER",
      status: (report.global_score as number) >= 85 ? "success" : "warning",
      impact_score: report.total_repairs,
      details: {
        global_score: report.global_score,
        total_repairs: report.total_repairs,
        mode,
        anomalies_count: (report.anomalies as unknown[]).length,
      },
    });

    console.log(
      `[ULTRON-HEALER] Termine - Score: ${report.global_score} - Reparations: ${report.total_repairs}`,
    );

    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[ULTRON-HEALER] Erreur fatale:", err);
    return new Response(
      JSON.stringify({
        error: String(err),
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
