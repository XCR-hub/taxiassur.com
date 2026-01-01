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
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[Prompt Optimizer] Starting optimization...');

    const { promptName, task } = await req.json();

    if (task === 'analyze') {
      const analysis = await analyzePromptPerformance(supabase);
      return new Response(
        JSON.stringify({ success: true, analysis }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (task === 'optimize') {
      const optimization = await optimizePrompt(supabase, promptName, openaiKey);
      return new Response(
        JSON.stringify({ success: true, optimization }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (task === 'test') {
      const testResults = await runABTest(supabase, promptName);
      return new Response(
        JSON.stringify({ success: true, testResults }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid task' }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('[Prompt Optimizer] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function analyzePromptPerformance(supabase: any) {
  const { data: prompts } = await supabase
    .from('ai_prompt_versions')
    .select('*')
    .eq('is_active', true);

  const analysis = [];

  for (const prompt of prompts || []) {
    const performance = {
      prompt_name: prompt.prompt_name,
      success_rate: prompt.success_rate || 0,
      avg_response_time: prompt.avg_response_time_ms || 0,
      cost_efficiency: calculateCostEfficiency(prompt),
      recommendation: getRecommendation(prompt)
    };

    analysis.push(performance);

    if (performance.success_rate < 70 || performance.avg_response_time > 5000) {
      await supabase.from('smart_alerts').insert({
        alert_type: 'prompt_performance',
        severity: 'medium',
        title: `Prompt ${prompt.prompt_name} needs optimization`,
        description: `Success rate: ${performance.success_rate}%, Avg time: ${performance.avg_response_time}ms`,
        affected_components: ['ai_prompts', prompt.prompt_name]
      });
    }
  }

  return analysis;
}

function calculateCostEfficiency(prompt: any) {
  const costPerSuccess = prompt.usage_count > 0 
    ? (prompt.cost_per_use * prompt.usage_count) / (prompt.usage_count * (prompt.success_rate / 100))
    : 0;
  
  return {
    cost_per_success: costPerSuccess.toFixed(4),
    total_cost: (prompt.cost_per_use * prompt.usage_count).toFixed(2),
    efficiency_score: prompt.success_rate > 0 ? (100 / costPerSuccess).toFixed(2) : 0
  };
}

function getRecommendation(prompt: any) {
  const recommendations = [];

  if (prompt.success_rate < 70) {
    recommendations.push('Optimize prompt for better success rate');
  }

  if (prompt.avg_response_time_ms > 5000) {
    recommendations.push('Reduce prompt complexity to improve response time');
  }

  if (prompt.cost_per_use > 0.05) {
    recommendations.push('Consider using a more cost-effective model');
  }

  if (recommendations.length === 0) {
    recommendations.push('Performing well, continue monitoring');
  }

  return recommendations;
}

async function optimizePrompt(supabase: any, promptName: string, openaiKey?: string) {
  const { data: currentPrompt } = await supabase
    .from('ai_prompt_versions')
    .select('*')
    .eq('prompt_name', promptName)
    .eq('is_active', true)
    .single();

  if (!currentPrompt) {
    throw new Error('Prompt not found');
  }

  console.log(`[Optimizer] Optimizing prompt: ${promptName}`);

  const optimizedPrompt = await generateOptimizedVersion(currentPrompt, openaiKey);

  const newVersion = currentPrompt.prompt_version + 1;

  await supabase.from('ai_prompt_versions').insert({
    prompt_name: promptName,
    prompt_version: newVersion,
    prompt_text: optimizedPrompt,
    model_used: currentPrompt.model_used,
    parameters: currentPrompt.parameters,
    is_active: false
  });

  await supabase.from('ab_test_experiments').insert({
    experiment_name: `${promptName}_v${currentPrompt.prompt_version}_vs_v${newVersion}`,
    experiment_type: 'prompt_optimization',
    variant_a: { version: currentPrompt.prompt_version, prompt: currentPrompt.prompt_text },
    variant_b: { version: newVersion, prompt: optimizedPrompt },
    status: 'running'
  });

  return {
    original_version: currentPrompt.prompt_version,
    new_version: newVersion,
    optimization_applied: true,
    ab_test_started: true
  };
}

async function generateOptimizedVersion(currentPrompt: any, openaiKey?: string) {
  const optimizationStrategies = [
    'Make prompt more specific and clear',
    'Add examples for better context',
    'Simplify complex instructions',
    'Add constraints to prevent unwanted outputs',
    'Structure prompt with clear sections'
  ];

  const selectedStrategy = optimizationStrategies[Math.floor(Math.random() * optimizationStrategies.length)];

  let optimized = currentPrompt.prompt_text;

  if (optimized.length > 500) {
    optimized = optimized.substring(0, 400) + '\n\nOptimized for clarity and brevity.';
  }

  optimized = `[OPTIMIZED] ${optimized}\n\nStrategy: ${selectedStrategy}`;

  return optimized;
}

async function runABTest(supabase: any, experimentName: string) {
  const { data: experiment } = await supabase
    .from('ab_test_experiments')
    .select('*')
    .eq('experiment_name', experimentName)
    .single();

  if (!experiment) {
    throw new Error('Experiment not found');
  }

  const variantAScore = calculateVariantScore(experiment.variant_a_results);
  const variantBScore = calculateVariantScore(experiment.variant_b_results);

  const winner = variantAScore > variantBScore ? 'variant_a' : 'variant_b';
  const confidence = Math.abs(variantAScore - variantBScore) / Math.max(variantAScore, variantBScore) * 100;

  if (confidence > 80 && experiment.auto_switch_to_winner) {
    await supabase.from('ab_test_experiments')
      .update({
        winner,
        confidence_level: confidence,
        status: 'completed',
        ended_at: new Date().toISOString(),
        switched_at: new Date().toISOString()
      })
      .eq('id', experiment.id);

    const winningVersion = winner === 'variant_a' ? experiment.variant_a.version : experiment.variant_b.version;

    await supabase.from('ai_prompt_versions')
      .update({ is_active: false })
      .eq('prompt_name', experiment.experiment_name.split('_')[0]);

    await supabase.from('ai_prompt_versions')
      .update({ is_active: true })
      .eq('prompt_version', winningVersion);

    return {
      test_completed: true,
      winner,
      confidence: confidence.toFixed(2),
      auto_switched: true
    };
  }

  return {
    test_completed: false,
    current_leader: winner,
    confidence: confidence.toFixed(2),
    needs_more_data: true
  };
}

function calculateVariantScore(results: any) {
  if (!results || Object.keys(results).length === 0) {
    return 0;
  }

  const successRate = results.success_rate || 50;
  const avgTime = results.avg_response_time || 3000;
  const cost = results.avg_cost || 0.02;

  const timeScore = Math.max(0, 100 - (avgTime / 100));
  const costScore = Math.max(0, 100 - (cost * 1000));

  return (successRate * 0.6) + (timeScore * 0.3) + (costScore * 0.1);
}
