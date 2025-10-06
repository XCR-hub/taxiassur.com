import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { job } = await req.json();
    const startTime = Date.now();

    console.log(`[CRON] Starting job: ${job}`);

    let result;

    switch (job) {
      case 'daily_lead_followup':
        // Relance automatique des leads
        result = await fetch(`${SUPABASE_URL}/functions/v1/auto-followup`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({})
        });
        break;

      case 'daily_email_batch':
        // Envoi des emails en attente
        result = await fetch(`${SUPABASE_URL}/functions/v1/send-outreach-emails`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'send_batch',
            batchSize: 100
          })
        });
        break;

      case 'twice_weekly_partner_outreach':
        // Prospection partenaires (Lundi et Jeudi)
        result = await fetch(`${SUPABASE_URL}/functions/v1/partner-scraper-outreach`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'batch_outreach'
          })
        });
        break;

      case 'daily_content_generation':
        // Génération de contenu automatique
        const keywords = [
          'assurance taxi pas cher',
          'assurance taxi jeune conducteur',
          'prix assurance taxi paris',
          'assurance taxi électrique',
          'comparateur assurance taxi'
        ];

        const contentResults = [];
        for (const keyword of keywords) {
          try {
            const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-seo-content`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                keyword,
                type: 'blog',
                secondaryKeywords: ['RC professionnelle', 'devis gratuit', 'courtier ORIAS']
              })
            });
            
            const data = await response.json();
            contentResults.push({
              keyword,
              success: data.success,
              title: data.content?.title
            });

            // Délai entre générations
            await new Promise(resolve => setTimeout(resolve, 3000));
          } catch (err) {
            contentResults.push({ keyword, success: false, error: err.message });
          }
        }

        result = {
          ok: true,
          json: async () => ({
            success: true,
            articles_generated: contentResults.filter(r => r.success).length,
            results: contentResults
          })
        };
        break;

      case 'daily_competitor_monitoring':
        // Monitoring concurrence
        const competitors = [
          { name: 'April Taxi', website: 'april-taxi.fr' },
          { name: 'Allianz Pro', website: 'allianz.fr' },
          { name: 'AXA Pro', website: 'axa.fr' }
        ];

        for (const competitor of competitors) {
          await supabase
            .from('competitor_monitoring')
            .upsert({
              competitor_name: competitor.name,
              website: competitor.website,
              last_checked_at: new Date().toISOString(),
              metadata: { auto_check: true }
            }, {
              onConflict: 'website'
            });
        }

        result = {
          ok: true,
          json: async () => ({
            success: true,
            competitors_checked: competitors.length
          })
        };
        break;

      case 'weekly_ai_performance_analysis':
        // Analyse des performances IA
        const { data: learningData, error: learningError } = await supabase
          .from('ai_learning_data')
          .select('*')
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

        const { data: logs, error: logsError } = await supabase
          .from('automation_logs')
          .select('*')
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

        const stats = {
          total_ai_actions: logs?.length || 0,
          success_rate: logs ? (logs.filter(l => l.status === 'success').length / logs.length * 100) : 0,
          learning_data_collected: learningData?.length || 0,
          avg_performance_score: learningData?.reduce((acc, d) => acc + (d.performance_score || 0), 0) / (learningData?.length || 1)
        };

        result = {
          ok: true,
          json: async () => ({
            success: true,
            stats
          })
        };
        break;

      case 'hourly_process_incoming_emails':
        // Traiter les emails entrants non traités
        const { data: unprocessedEmails, error: emailError } = await supabase
          .from('email_inbox')
          .select('*')
          .eq('processed', false)
          .order('priority', { ascending: false })
          .limit(20);

        const emailResults = [];
        for (const email of unprocessedEmails || []) {
          try {
            const response = await fetch(`${SUPABASE_URL}/functions/v1/email-auto-responder`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                emailData: {
                  from_email: email.from_email,
                  from_name: email.from_name,
                  subject: email.subject,
                  body: email.body
                }
              })
            });

            const data = await response.json();
            emailResults.push({ email_id: email.id, success: data.success });
          } catch (err) {
            emailResults.push({ email_id: email.id, success: false, error: err.message });
          }
        }

        result = {
          ok: true,
          json: async () => ({
            success: true,
            emails_processed: emailResults.length
          })
        };
        break;

      default:
        throw new Error(`Unknown job: ${job}`);
    }

    const executionTime = Date.now() - startTime;
    const resultData = await result.json();

    // Log execution
    await supabase
      .from('automation_logs')
      .insert({
        action_type: `cron_${job}`,
        action_details: resultData,
        status: result.ok ? 'success' : 'failed',
        execution_time_ms: executionTime
      });

    console.log(`[CRON] Completed ${job} in ${executionTime}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        job,
        execution_time_ms: executionTime,
        result: resultData
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[CRON] Error:', error);

    await supabase
      .from('automation_logs')
      .insert({
        action_type: 'cron_error',
        status: 'failed',
        error_message: error.message
      });

    return new Response(
      JSON.stringify({ error: 'Cron job failed', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});