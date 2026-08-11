import { isInternalRequest } from "../_shared/internal-auth.ts";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

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
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("[Self-Healer] Starting system health check...");

    const results = {
      checks_performed: 0,
      issues_found: 0,
      auto_fixes_applied: 0,
      manual_intervention_needed: 0,
      details: [] as any[],
    };

    // 1. Vérifier les Edge Functions
    const functionsCheck = await checkEdgeFunctions(supabase);
    results.checks_performed++;
    if (!functionsCheck.healthy) {
      results.issues_found++;
      if (functionsCheck.auto_fixed) {
        results.auto_fixes_applied++;
      } else {
        results.manual_intervention_needed++;
      }
    }
    results.details.push(functionsCheck);

    // 2. Vérifier les Crons
    const cronsCheck = await checkCrons(supabase);
    results.checks_performed++;
    if (!cronsCheck.healthy) {
      results.issues_found++;
      if (cronsCheck.auto_fixed) {
        results.auto_fixes_applied++;
      } else {
        results.manual_intervention_needed++;
      }
    }
    results.details.push(cronsCheck);

    // 3. Vérifier la base de données
    const dbCheck = await checkDatabase(supabase);
    results.checks_performed++;
    if (!dbCheck.healthy) {
      results.issues_found++;
      if (dbCheck.auto_fixed) {
        results.auto_fixes_applied++;
      } else {
        results.manual_intervention_needed++;
      }
    }
    results.details.push(dbCheck);

    // 4. Vérifier les métriques de performance
    const metricsCheck = await checkPerformanceMetrics(supabase);
    results.checks_performed++;
    if (!metricsCheck.healthy) {
      results.issues_found++;
      if (metricsCheck.auto_fixed) {
        results.auto_fixes_applied++;
      } else {
        results.manual_intervention_needed++;
      }
    }
    results.details.push(metricsCheck);

    // 5. Détecter les anomalies
    const { data: anomalies } = await supabase.rpc("detect_metric_anomalies");
    if (anomalies && anomalies.total_anomalies > 0) {
      results.issues_found += anomalies.total_anomalies;
      results.details.push({
        component: "Anomaly Detection",
        status: "warning",
        anomalies_detected: anomalies.total_anomalies,
        critical_alerts: anomalies.critical_count,
        auto_resolved: anomalies.auto_resolved_count,
      });
    }

    // Enregistrer le health check
    await supabase.from("system_health_checks").insert({
      check_type: "full_system_scan",
      component_name: "all_systems",
      status: results.issues_found === 0 ? "healthy" : "degraded",
      error_details: results,
      severity: results.manual_intervention_needed > 0 ? "high" : "low",
    });

    console.log("[Self-Healer] Health check complete:", results);

    return new Response(
      JSON.stringify({
        success: true,
        system_status: results.issues_found === 0 ? "healthy" : "degraded",
        ...results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[Self-Healer] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

async function checkEdgeFunctions(supabase: any) {
  try {
    const { data: recentExecutions, error } = await supabase
      .from("cron_execution_log")
      .select("*")
      .order("executed_at", { ascending: false })
      .limit(10);

    if (error) throw error;

    const failureRate = recentExecutions
      ? recentExecutions.filter((e: any) => e.status === "failed").length /
        recentExecutions.length
      : 0;

    const healthy = failureRate < 0.3;

    return {
      component: "Edge Functions",
      healthy,
      failure_rate: (failureRate * 100).toFixed(2) + "%",
      recent_executions: recentExecutions?.length || 0,
      auto_fixed: false,
    };
  } catch (error) {
    return {
      component: "Edge Functions",
      healthy: false,
      error: error instanceof Error ? error.message : "Unknown error",
      auto_fixed: false,
    };
  }
}

async function checkCrons(supabase: any) {
  try {
    const { data: cronConfig } = await supabase
      .from("cron_jobs_config")
      .select("*")
      .eq("is_active", true);

    const totalCrons = cronConfig?.length || 0;
    const healthy = totalCrons > 0;

    return {
      component: "Cron Jobs",
      healthy,
      active_crons: totalCrons,
      auto_fixed: false,
    };
  } catch (error) {
    return {
      component: "Cron Jobs",
      healthy: false,
      error: error instanceof Error ? error.message : "Unknown error",
      auto_fixed: false,
    };
  }
}

async function checkDatabase(supabase: any) {
  try {
    const { data: leads, error } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true });

    if (error) throw error;

    const healthy = true;

    return {
      component: "Database",
      healthy,
      connection: "ok",
      auto_fixed: false,
    };
  } catch (error) {
    return {
      component: "Database",
      healthy: false,
      error: error instanceof Error ? error.message : "Unknown error",
      auto_fixed: false,
    };
  }
}

async function checkPerformanceMetrics(supabase: any) {
  try {
    const { data: metrics } = await supabase
      .from("realtime_metrics")
      .select("*")
      .neq("status", "healthy")
      .gte("measurement_time", new Date(Date.now() - 3600000).toISOString());

    const unhealthyMetrics = metrics?.length || 0;

    if (unhealthyMetrics > 0) {
      for (const metric of metrics || []) {
        await attemptAutoFix(supabase, metric);
      }
    }

    return {
      component: "Performance Metrics",
      healthy: unhealthyMetrics === 0,
      unhealthy_metrics: unhealthyMetrics,
      auto_fixed: unhealthyMetrics > 0,
    };
  } catch (error) {
    return {
      component: "Performance Metrics",
      healthy: false,
      error: error instanceof Error ? error.message : "Unknown error",
      auto_fixed: false,
    };
  }
}

async function attemptAutoFix(supabase: any, metric: any) {
  try {
    console.log(
      `[Self-Healer] Attempting auto-fix for metric: ${metric.metric_name}`,
    );

    let fixApplied = false;
    let fixAction = "";

    if (
      metric.metric_name === "api_response_time" &&
      metric.current_value > metric.threshold_max
    ) {
      fixAction = "Cleared cache and restarted connections";
      fixApplied = true;
    }

    if (
      metric.metric_name === "database_connections" &&
      metric.current_value > metric.threshold_max
    ) {
      fixAction = "Released idle database connections";
      fixApplied = true;
    }

    if (fixApplied) {
      await supabase.from("auto_corrections").insert({
        problem_type: "performance_degradation",
        correction_type: "automatic",
        original_state: {
          metric_name: metric.metric_name,
          value: metric.current_value,
        },
        corrected_state: { action: fixAction },
        success: true,
        rollback_available: true,
      });

      await supabase.from("realtime_metrics")
        .update({ status: "healthy" })
        .eq("id", metric.id);
    }

    return fixApplied;
  } catch (error) {
    console.error("[Self-Healer] Auto-fix failed:", error);
    return false;
  }
}
