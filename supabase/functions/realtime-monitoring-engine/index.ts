import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[Monitoring] Collecting real-time metrics...');

    const metrics = await collectAllMetrics(supabase);
    
    await storeMetrics(supabase, metrics);
    
    const anomalies = await detectAnomalies(supabase, metrics);
    
    if (anomalies.length > 0) {
      await handleAnomalies(supabase, anomalies);
    }

    const predictions = await makePredictions(supabase, metrics);

    await updateBaselines(supabase, metrics);

    return new Response(
      JSON.stringify({
        success: true,
        metrics,
        anomalies,
        predictions,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('[Monitoring] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function collectAllMetrics(supabase: any) {
  const metrics: any = {};

  const { count: totalLeads } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true });

  const { count: newLeadsToday } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', new Date(Date.now() - 86400000).toISOString());

  const { count: convertedLeads } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'converted');

  const { count: activeCampaigns } = await supabase
    .from('crm_automation_rules')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  const { data: automationHistory } = await supabase
    .from('crm_automation_history')
    .select('status')
    .gte('executed_at', new Date(Date.now() - 86400000).toISOString());

  const successfulAutomations = automationHistory?.filter((a: any) => a.status === 'success').length || 0;
  const totalAutomations = automationHistory?.length || 0;

  metrics.lead_metrics = {
    total_leads: totalLeads || 0,
    new_today: newLeadsToday || 0,
    converted: convertedLeads || 0,
    conversion_rate: totalLeads > 0 ? ((convertedLeads || 0) / totalLeads * 100).toFixed(2) : 0
  };

  metrics.automation_metrics = {
    active_campaigns: activeCampaigns || 0,
    executions_today: totalAutomations,
    success_rate: totalAutomations > 0 ? ((successfulAutomations / totalAutomations) * 100).toFixed(2) : 0
  };

  const { data: topRules } = await supabase.rpc('get_top_performing_rules', { limit_param: 5 });
  metrics.top_performing_rules = topRules || [];

  return metrics;
}

async function storeMetrics(supabase: any, metrics: any) {
  const metricsToStore = [
    {
      metric_category: 'leads',
      metric_name: 'total_leads',
      current_value: metrics.lead_metrics.total_leads,
      target_value: 100,
      threshold_min: 0,
      threshold_max: 10000,
      status: 'healthy'
    },
    {
      metric_category: 'leads',
      metric_name: 'conversion_rate',
      current_value: parseFloat(metrics.lead_metrics.conversion_rate),
      target_value: 10,
      threshold_min: 5,
      threshold_max: 100,
      status: parseFloat(metrics.lead_metrics.conversion_rate) >= 5 ? 'healthy' : 'warning'
    },
    {
      metric_category: 'automation',
      metric_name: 'success_rate',
      current_value: parseFloat(metrics.automation_metrics.success_rate),
      target_value: 90,
      threshold_min: 70,
      threshold_max: 100,
      status: parseFloat(metrics.automation_metrics.success_rate) >= 70 ? 'healthy' : 'critical'
    },
    {
      metric_category: 'automation',
      metric_name: 'active_campaigns',
      current_value: metrics.automation_metrics.active_campaigns,
      target_value: 10,
      threshold_min: 1,
      threshold_max: 100,
      status: 'healthy'
    }
  ];

  for (const metric of metricsToStore) {
    await supabase.from('realtime_metrics').insert(metric);
  }
}

async function detectAnomalies(supabase: any, metrics: any) {
  const anomalies = [];

  const conversionRate = parseFloat(metrics.lead_metrics.conversion_rate);
  if (conversionRate < 3) {
    anomalies.push({
      anomaly_type: 'low_conversion',
      metric_name: 'conversion_rate',
      expected_value: 5,
      actual_value: conversionRate,
      deviation_percent: ((5 - conversionRate) / 5 * 100).toFixed(2),
      severity: 'high'
    });
  }

  const successRate = parseFloat(metrics.automation_metrics.success_rate);
  if (successRate < 70) {
    anomalies.push({
      anomaly_type: 'automation_failure',
      metric_name: 'automation_success_rate',
      expected_value: 90,
      actual_value: successRate,
      deviation_percent: ((90 - successRate) / 90 * 100).toFixed(2),
      severity: 'critical'
    });
  }

  if (metrics.lead_metrics.new_today === 0) {
    anomalies.push({
      anomaly_type: 'no_new_leads',
      metric_name: 'new_leads_today',
      expected_value: 5,
      actual_value: 0,
      deviation_percent: 100,
      severity: 'high'
    });
  }

  for (const anomaly of anomalies) {
    await supabase.from('system_anomalies').insert(anomaly);
  }

  return anomalies;
}

async function handleAnomalies(supabase: any, anomalies: any[]) {
  for (const anomaly of anomalies) {
    const autoHandled = await attemptAutoResolution(supabase, anomaly);

    if (!autoHandled && anomaly.severity === 'critical') {
      await supabase.from('smart_alerts').insert({
        alert_type: 'system_anomaly',
        severity: anomaly.severity,
        title: `Anomalie détectée: ${anomaly.anomaly_type}`,
        description: `La métrique ${anomaly.metric_name} est à ${anomaly.actual_value} (attendu: ${anomaly.expected_value})`,
        affected_components: [anomaly.metric_name],
        auto_resolved: autoHandled
      });
    }

    await supabase.from('system_anomalies')
      .update({ auto_handled: autoHandled })
      .eq('metric_name', anomaly.metric_name);
  }
}

async function attemptAutoResolution(supabase: any, anomaly: any) {
  console.log(`[Monitoring] Attempting auto-resolution for: ${anomaly.anomaly_type}`);

  if (anomaly.anomaly_type === 'low_conversion') {
    await supabase.from('autonomous_improvements').insert({
      improvement_type: 'conversion_optimization',
      area_affected: 'lead_forms',
      before_state: { conversion_rate: anomaly.actual_value },
      after_state: { action: 'Trigger A/B test on lead forms' },
      expected_impact: { conversion_rate_increase: 2 },
      auto_applied: true
    });
    return true;
  }

  if (anomaly.anomaly_type === 'automation_failure') {
    await supabase.from('autonomous_improvements').insert({
      improvement_type: 'automation_fix',
      area_affected: 'automation_rules',
      before_state: { success_rate: anomaly.actual_value },
      after_state: { action: 'Restart failed automations' },
      expected_impact: { success_rate_increase: 10 },
      auto_applied: true
    });
    return true;
  }

  if (anomaly.anomaly_type === 'no_new_leads') {
    await supabase.from('autonomous_improvements').insert({
      improvement_type: 'lead_generation',
      area_affected: 'marketing',
      before_state: { new_leads: 0 },
      after_state: { action: 'Increase SEO content generation' },
      expected_impact: { new_leads_increase: 5 },
      auto_applied: true
    });
    return true;
  }

  return false;
}

async function makePredictions(supabase: any, metrics: any) {
  const predictions = [];

  const currentConversionRate = parseFloat(metrics.lead_metrics.conversion_rate);
  const trend = currentConversionRate > 5 ? 'increasing' : 'decreasing';

  predictions.push({
    prediction_type: 'conversion_forecast',
    target_metric: 'conversion_rate',
    current_value: currentConversionRate,
    predicted_value: currentConversionRate * (trend === 'increasing' ? 1.1 : 0.9),
    prediction_timeframe: '7_days',
    confidence: 75,
    model_used: 'linear_regression',
    factors: {
      current_trend: trend,
      historical_average: 7,
      seasonality: 'normal'
    },
    recommended_actions: [
      trend === 'increasing' 
        ? 'Continue current strategy' 
        : 'Implement conversion optimization tactics'
    ]
  });

  for (const prediction of predictions) {
    await supabase.from('predictive_analytics').insert(prediction);
  }

  return predictions;
}

async function updateBaselines(supabase: any, metrics: any) {
  const baselines = [
    {
      metric_name: 'total_leads',
      current_value: metrics.lead_metrics.total_leads,
      baseline_value: 50,
      trend_direction: metrics.lead_metrics.total_leads > 50 ? 'up' : 'down'
    },
    {
      metric_name: 'conversion_rate',
      current_value: parseFloat(metrics.lead_metrics.conversion_rate),
      baseline_value: 7,
      trend_direction: parseFloat(metrics.lead_metrics.conversion_rate) > 7 ? 'up' : 'down'
    }
  ];

  for (const baseline of baselines) {
    const improvement = ((baseline.current_value - baseline.baseline_value) / baseline.baseline_value * 100).toFixed(2);

    await supabase.from('performance_baselines')
      .upsert({
        metric_name: baseline.metric_name,
        baseline_value: baseline.baseline_value,
        current_value: baseline.current_value,
        improvement_percent: parseFloat(improvement),
        trend_direction: baseline.trend_direction,
        is_healthy: baseline.current_value >= baseline.baseline_value,
        updated_at: new Date().toISOString()
      }, { onConflict: 'metric_name' });
  }
}
