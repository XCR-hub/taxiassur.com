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

    console.log('[Pattern Learning] Analyzing data for patterns...');

    const patterns = await discoverPatterns(supabase);
    
    const newRules = await generateRulesFromPatterns(supabase, patterns);
    
    await optimizeExistingRules(supabase);
    
    await cleanupIneffectiveRules(supabase);

    return new Response(
      JSON.stringify({
        success: true,
        patterns_discovered: patterns.length,
        new_rules_created: newRules.length,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('[Pattern Learning] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function discoverPatterns(supabase: any) {
  const patterns = [];

  const { data: recentLeads } = await supabase
    .from('crm_leads_enhanced')
    .select('*')
    .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())
    .order('created_at', { ascending: false })
    .limit(1000);

  if (!recentLeads || recentLeads.length === 0) {
    return patterns;
  }

  const conversionPattern = analyzeConversionPattern(recentLeads);
  if (conversionPattern.confidence > 70) {
    patterns.push(conversionPattern);
    await supabase.from('discovered_patterns').insert(conversionPattern);
  }

  const timePattern = analyzeTimePattern(recentLeads);
  if (timePattern.confidence > 70) {
    patterns.push(timePattern);
    await supabase.from('discovered_patterns').insert(timePattern);
  }

  const sourcePattern = analyzeSourcePattern(recentLeads);
  if (sourcePattern.confidence > 70) {
    patterns.push(sourcePattern);
    await supabase.from('discovered_patterns').insert(sourcePattern);
  }

  const scorePattern = analyzeScorePattern(recentLeads);
  if (scorePattern.confidence > 70) {
    patterns.push(scorePattern);
    await supabase.from('discovered_patterns').insert(scorePattern);
  }

  console.log(`[Pattern Learning] Discovered ${patterns.length} patterns`);

  return patterns;
}

function analyzeConversionPattern(leads: any[]) {
  const convertedLeads = leads.filter(l => l.status === 'converted');
  const conversionRate = (convertedLeads.length / leads.length) * 100;

  const avgResponseTime = convertedLeads.reduce((sum, lead) => {
    if (lead.first_contact_at && lead.converted_at) {
      const diff = new Date(lead.converted_at).getTime() - new Date(lead.first_contact_at).getTime();
      return sum + diff;
    }
    return sum;
  }, 0) / convertedLeads.length;

  const avgResponseDays = avgResponseTime / (1000 * 60 * 60 * 24);

  return {
    pattern_type: 'conversion_timing',
    pattern_description: `Les leads convertissent en moyenne après ${avgResponseDays.toFixed(1)} jours`,
    occurrences: convertedLeads.length,
    confidence_score: conversionRate > 10 ? 85 : 70,
    data_sample: {
      conversion_rate: conversionRate.toFixed(2),
      avg_days_to_convert: avgResponseDays.toFixed(1),
      total_analyzed: leads.length
    },
    suggested_rule: {
      name: 'Auto-relance optimisée',
      trigger: `after ${Math.floor(avgResponseDays / 2)} days without response`,
      action: 'send_followup_email'
    }
  };
}

function analyzeTimePattern(leads: any[]) {
  const hourlyDistribution: any = {};
  
  leads.forEach(lead => {
    const hour = new Date(lead.created_at).getHours();
    hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
  });

  const bestHours = Object.entries(hourlyDistribution)
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 3)
    .map(([hour]) => parseInt(hour));

  return {
    pattern_type: 'optimal_contact_time',
    pattern_description: `Les meilleurs moments sont ${bestHours.join('h, ')}h`,
    occurrences: leads.length,
    confidence_score: 80,
    data_sample: {
      best_hours: bestHours,
      distribution: hourlyDistribution
    },
    suggested_rule: {
      name: 'Contact aux heures optimales',
      trigger: 'new_lead_received',
      action: `schedule_contact_at_hour_${bestHours[0]}`
    }
  };
}

function analyzeSourcePattern(leads: any[]) {
  const sourceConversion: any = {};
  
  leads.forEach(lead => {
    const source = lead.source || 'unknown';
    if (!sourceConversion[source]) {
      sourceConversion[source] = { total: 0, converted: 0 };
    }
    sourceConversion[source].total++;
    if (lead.status === 'converted') {
      sourceConversion[source].converted++;
    }
  });

  const bestSource = Object.entries(sourceConversion)
    .map(([source, data]: any) => ({
      source,
      rate: (data.converted / data.total) * 100
    }))
    .sort((a, b) => b.rate - a.rate)[0];

  return {
    pattern_type: 'source_performance',
    pattern_description: `La meilleure source est ${bestSource?.source} avec ${bestSource?.rate.toFixed(1)}% de conversion`,
    occurrences: leads.length,
    confidence_score: 75,
    data_sample: {
      best_source: bestSource?.source,
      conversion_rate: bestSource?.rate,
      all_sources: sourceConversion
    },
    suggested_rule: {
      name: 'Prioriser source performante',
      trigger: 'new_lead_from_best_source',
      action: 'increase_priority_score'
    }
  };
}

function analyzeScorePattern(leads: any[]) {
  const convertedLeads = leads.filter(l => l.status === 'converted' && l.score);
  
  if (convertedLeads.length === 0) {
    return {
      pattern_type: 'score_threshold',
      pattern_description: 'Pas assez de données',
      occurrences: 0,
      confidence_score: 0,
      data_sample: {},
      suggested_rule: null
    };
  }

  const avgConvertedScore = convertedLeads.reduce((sum, l) => sum + (l.score || 0), 0) / convertedLeads.length;
  
  const nonConvertedLeads = leads.filter(l => l.status !== 'converted' && l.score);
  const avgNonConvertedScore = nonConvertedLeads.length > 0 
    ? nonConvertedLeads.reduce((sum, l) => sum + (l.score || 0), 0) / nonConvertedLeads.length
    : 0;

  return {
    pattern_type: 'score_threshold',
    pattern_description: `Les leads convertis ont un score moyen de ${avgConvertedScore.toFixed(0)}`,
    occurrences: convertedLeads.length,
    confidence_score: 85,
    data_sample: {
      avg_converted_score: avgConvertedScore.toFixed(0),
      avg_non_converted_score: avgNonConvertedScore.toFixed(0),
      threshold: Math.floor(avgConvertedScore * 0.8)
    },
    suggested_rule: {
      name: 'Auto-qualification par score',
      trigger: `lead_score_above_${Math.floor(avgConvertedScore * 0.8)}`,
      action: 'mark_as_hot_lead_and_notify_sales'
    }
  };
}

async function generateRulesFromPatterns(supabase: any, patterns: any[]) {
  const newRules = [];

  for (const pattern of patterns) {
    if (!pattern.suggested_rule || pattern.rule_created) {
      continue;
    }

    const { data: existingRule } = await supabase
      .from('crm_automation_rules')
      .select('id')
      .eq('name', pattern.suggested_rule.name)
      .maybeSingle();

    if (existingRule) {
      console.log(`[Pattern Learning] Rule already exists: ${pattern.suggested_rule.name}`);
      continue;
    }

    const rule = {
      name: pattern.suggested_rule.name,
      description: `Généré automatiquement depuis le pattern: ${pattern.pattern_description}`,
      category: 'auto_generated',
      trigger_type: pattern.suggested_rule.trigger,
      trigger_conditions: pattern.data_sample,
      actions: [{
        type: pattern.suggested_rule.action,
        parameters: pattern.data_sample
      }],
      is_active: true,
      priority: 5
    };

    const { data: createdRule, error } = await supabase
      .from('crm_automation_rules')
      .insert(rule)
      .select()
      .single();

    if (!error && createdRule) {
      await supabase
        .from('discovered_patterns')
        .update({ 
          rule_created: true, 
          created_rule_id: createdRule.id 
        })
        .eq('pattern_type', pattern.pattern_type);

      newRules.push(createdRule);
      console.log(`[Pattern Learning] Created new rule: ${rule.name}`);
    }
  }

  return newRules;
}

async function optimizeExistingRules(supabase: any) {
  const { data: rules } = await supabase
    .from('rule_performance_tracking')
    .select('*')
    .eq('should_optimize', true);

  if (!rules || rules.length === 0) {
    return;
  }

  for (const rule of rules) {
    console.log(`[Pattern Learning] Optimizing rule: ${rule.rule_type}`);

    const optimizations = [];

    if (rule.avg_execution_time_ms > 5000) {
      optimizations.push('Reduce execution time');
    }

    if (rule.successes / rule.executions < 0.8) {
      optimizations.push('Improve success rate');
    }

    await supabase
      .from('rule_performance_tracking')
      .update({ 
        optimization_suggestions: optimizations,
        should_optimize: false 
      })
      .eq('id', rule.id);
  }
}

async function cleanupIneffectiveRules(supabase: any) {
  const { data: ineffectiveRules } = await supabase
    .from('rule_performance_tracking')
    .select('*')
    .eq('should_keep', false);

  if (!ineffectiveRules || ineffectiveRules.length === 0) {
    return;
  }

  for (const rule of ineffectiveRules) {
    console.log(`[Pattern Learning] Disabling ineffective rule: ${rule.rule_id}`);

    await supabase
      .from('crm_automation_rules')
      .update({ is_active: false })
      .eq('id', rule.rule_id);

    await supabase
      .from('smart_alerts')
      .insert({
        alert_type: 'rule_disabled',
        severity: 'low',
        title: 'Règle d\'automatisation désactivée',
        description: `La règle ${rule.rule_type} a été désactivée en raison de performances insuffisantes`,
        affected_components: ['automation_rules']
      });
  }
}
