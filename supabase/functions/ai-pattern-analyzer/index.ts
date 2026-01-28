import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AIEvent {
  id: string;
  event_type: string;
  action: string;
  lead_id: string;
  event_data: any;
  occurred_at: string;
  day_of_week: number;
  hour_of_day: number;
  led_to_conversion: boolean;
  next_stage: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("[ai-pattern-analyzer] Démarrage analyse patterns...");

    // Récupérer les événements non traités
    const { data: events, error: eventsError } = await supabase
      .from('crm_ai_events')
      .select('*')
      .eq('processed', false)
      .order('occurred_at', { ascending: false })
      .limit(1000);

    if (eventsError) throw eventsError;

    if (!events || events.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "Aucun événement à traiter", patterns_found: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[ai-pattern-analyzer] ${events.length} événements à analyser`);

    const patterns = [];
    const suggestions = [];

    // 1. PATTERN : Meilleur moment pour envoyer des emails
    const emailEvents = events.filter(e => e.event_type === 'email' && e.action === 'outbound');
    if (emailEvents.length > 20) {
      const emailsByHour = emailEvents.reduce((acc: any, e: AIEvent) => {
        const hour = e.hour_of_day;
        if (!acc[hour]) acc[hour] = { total: 0, conversions: 0 };
        acc[hour].total++;
        if (e.led_to_conversion) acc[hour].conversions++;
        return acc;
      }, {});

      const bestHours = Object.entries(emailsByHour)
        .map(([hour, stats]: [string, any]) => ({
          hour: parseInt(hour),
          rate: stats.conversions / stats.total,
          total: stats.total
        }))
        .filter(h => h.total > 5)
        .sort((a, b) => b.rate - a.rate)
        .slice(0, 3);

      if (bestHours.length > 0 && bestHours[0].rate > 0.2) {
        patterns.push({
          pattern_name: 'optimal_email_timing',
          pattern_type: 'timing',
          title: `Meilleur moment : ${bestHours[0].hour}h-${bestHours[0].hour + 1}h`,
          description: `Les emails envoyés entre ${bestHours[0].hour}h et ${bestHours[0].hour + 1}h ont un taux de conversion de ${(bestHours[0].rate * 100).toFixed(1)}%`,
          confidence_score: Math.min(95, bestHours[0].total * 2),
          success_rate: bestHours[0].rate * 100,
          sample_size: bestHours[0].total,
          conditions: [{ field: 'hour_of_day', operator: 'eq', value: bestHours[0].hour }],
          pattern_definition: { best_hours: bestHours.map(h => h.hour) },
          status: 'detected'
        });

        suggestions.push({
          title: "Optimiser l'horaire d'envoi des emails",
          description: `Envoyer automatiquement les emails aux leads entre ${bestHours[0].hour}h et ${bestHours[0].hour + 1}h`,
          trigger_event: 'email_draft_ready',
          trigger_conditions: {},
          suggested_actions: [{
            type: 'schedule_email',
            target_hour: bestHours[0].hour,
            reason: `Taux de conversion ${(bestHours[0].rate * 100).toFixed(1)}% à cette heure`
          }],
          predicted_success_rate: bestHours[0].rate * 100,
          workflow_priority: 8,
          status: 'suggested'
        });
      }
    }

    // 2. PATTERN : Séquence de statuts rapides vers conversion
    const statusChanges = events.filter(e => e.event_type === 'pipeline' && e.action === 'status_changed');
    if (statusChanges.length > 20) {
      const conversionPaths: any = {};

      statusChanges.forEach((e: AIEvent) => {
        if (e.led_to_conversion && e.event_data?.old_status && e.event_data?.new_status) {
          const path = `${e.event_data.old_status} -> ${e.event_data.new_status}`;
          if (!conversionPaths[path]) conversionPaths[path] = 0;
          conversionPaths[path]++;
        }
      });

      const topPath = Object.entries(conversionPaths)
        .sort((a: any, b: any) => b[1] - a[1])[0];

      if (topPath && topPath[1] > 3) {
        const [fromStatus, toStatus] = (topPath[0] as string).split(' -> ');
        patterns.push({
          pattern_name: 'fast_conversion_path',
          pattern_type: 'sequence',
          title: `Chemin rapide : ${fromStatus} → ${toStatus}`,
          description: `${topPath[1]} conversions réussies avec ce chemin`,
          confidence_score: 85,
          success_rate: 90,
          sample_size: topPath[1],
          conditions: [
            { field: 'current_status', operator: 'eq', value: fromStatus }
          ],
          pattern_definition: { from: fromStatus, to: toStatus },
          status: 'detected'
        });

        suggestions.push({
          title: `Suggérer le passage ${fromStatus} → ${toStatus}`,
          description: `Quand un lead est en "${fromStatus}" et tous les documents sont validés, suggérer automatiquement le passage en "${toStatus}"`,
          trigger_event: 'documents_all_validated',
          trigger_conditions: { current_status: fromStatus },
          suggested_actions: [{
            type: 'suggest_status_change',
            target_status: toStatus,
            reason: 'Documents validés + pattern de succès détecté'
          }],
          predicted_success_rate: 90,
          workflow_priority: 9,
          status: 'suggested'
        });
      }
    }

    // 3. PATTERN : Réactivité email = meilleur taux conversion
    const leadResponses: any = {};
    emailEvents.forEach((e: AIEvent) => {
      if (!leadResponses[e.lead_id]) {
        leadResponses[e.lead_id] = { emails: [], conversions: 0 };
      }
      leadResponses[e.lead_id].emails.push(e);
      if (e.led_to_conversion) leadResponses[e.lead_id].conversions++;
    });

    const avgResponseTimes = Object.values(leadResponses)
      .filter((l: any) => l.emails.length > 1)
      .map((l: any) => {
        const times = [];
        for (let i = 1; i < l.emails.length; i++) {
          const diff = new Date(l.emails[i].occurred_at).getTime() -
                      new Date(l.emails[i-1].occurred_at).getTime();
          times.push(diff / (1000 * 60 * 60)); // Heures
        }
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        return { avgTime, conversions: l.conversions };
      });

    if (avgResponseTimes.length > 5) {
      const fastResponders = avgResponseTimes.filter(r => r.avgTime < 4); // < 4h
      const slowResponders = avgResponseTimes.filter(r => r.avgTime >= 4);

      const fastConversionRate = fastResponders.reduce((sum, r) => sum + r.conversions, 0) / fastResponders.length;
      const slowConversionRate = slowResponders.length > 0
        ? slowResponders.reduce((sum, r) => sum + r.conversions, 0) / slowResponders.length
        : 0;

      if (fastConversionRate > slowConversionRate * 1.5) {
        patterns.push({
          pattern_name: 'fast_response_wins',
          pattern_type: 'behavior',
          title: 'Réactivité = Conversion',
          description: `Répondre en moins de 4h augmente le taux de conversion de ${((fastConversionRate / slowConversionRate - 1) * 100).toFixed(0)}%`,
          confidence_score: 80,
          success_rate: fastConversionRate * 100,
          sample_size: fastResponders.length,
          conditions: [{ field: 'response_time_hours', operator: 'lt', value: 4 }],
          pattern_definition: { threshold_hours: 4, boost_factor: fastConversionRate / slowConversionRate },
          status: 'detected'
        });

        suggestions.push({
          title: "Alerte réactivité : Répondre sous 4h",
          description: "Créer une notification prioritaire quand un email lead n'a pas eu de réponse depuis 3h",
          trigger_event: 'email_received_no_response',
          trigger_conditions: { hours_since_email: 3 },
          suggested_actions: [{
            type: 'create_urgent_notification',
            priority: 'high',
            message: 'Lead en attente de réponse depuis 3h - Taux conversion -50% après 4h'
          }],
          predicted_success_rate: fastConversionRate * 100,
          workflow_priority: 10,
          status: 'suggested'
        });
      }
    }

    // 4. PATTERN : Documents uploadés rapidement = conversion
    const docEvents = events.filter(e => e.event_type === 'document' && e.action === 'uploaded');
    if (docEvents.length > 10) {
      const docsWithConversion = docEvents.filter(e => e.led_to_conversion);
      const conversionRate = docsWithConversion.length / docEvents.length;

      if (conversionRate > 0.6) {
        patterns.push({
          pattern_name: 'document_upload_indicator',
          pattern_type: 'behavior',
          title: 'Upload documents = forte intention',
          description: `${(conversionRate * 100).toFixed(0)}% des leads qui uploadent des documents convertissent`,
          confidence_score: 90,
          success_rate: conversionRate * 100,
          sample_size: docEvents.length,
          conditions: [{ field: 'event_type', operator: 'eq', value: 'document' }],
          pattern_definition: { conversion_rate: conversionRate },
          status: 'detected'
        });

        suggestions.push({
          title: "Prioriser les leads avec documents",
          description: "Augmenter automatiquement la priorité des leads qui uploadent des documents",
          trigger_event: 'document_uploaded',
          trigger_conditions: {},
          suggested_actions: [{
            type: 'increase_priority',
            amount: 2,
            reason: `Taux conversion ${(conversionRate * 100).toFixed(0)}%`
          }],
          predicted_success_rate: conversionRate * 100,
          workflow_priority: 9,
          status: 'suggested'
        });
      }
    }

    // Sauvegarder les patterns
    for (const pattern of patterns) {
      await supabase
        .from('crm_ai_patterns')
        .upsert({ ...pattern, times_observed: 1 }, { onConflict: 'pattern_name' });
    }

    // Sauvegarder les suggestions
    for (const suggestion of suggestions) {
      await supabase
        .from('crm_ai_workflow_suggestions')
        .insert(suggestion);
    }

    // Marquer les événements comme traités
    await supabase
      .from('crm_ai_events')
      .update({ processed: true, analyzed_at: new Date().toISOString() })
      .in('id', events.map(e => e.id));

    console.log(`[ai-pattern-analyzer] ${patterns.length} patterns détectés, ${suggestions.length} suggestions créées`);

    return new Response(
      JSON.stringify({
        success: true,
        events_analyzed: events.length,
        patterns_detected: patterns.length,
        suggestions_created: suggestions.length,
        patterns,
        suggestions
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[ai-pattern-analyzer] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
