import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'overview';

    let responseData = {};

    switch (action) {
      case 'overview':
        const { data: schedule } = await supabase
          .from('automation_schedule')
          .select('*')
          .order('job_name');

        const { data: recentHistory } = await supabase
          .from('cron_execution_history')
          .select('*')
          .order('started_at', { ascending: false })
          .limit(50);

        const { data: pendingEmails } = await supabase
          .from('email_queue')
          .select('*')
          .eq('status', 'pending')
          .order('priority', { ascending: false })
          .limit(20);

        const { data: unprocessedInbox } = await supabase
          .from('email_inbox')
          .select('*')
          .eq('processed', false)
          .order('received_at', { ascending: false })
          .limit(10);

        const { data: recentLeads } = await supabase
          .from('leads')
          .select('*')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false });

        const stats = {
          total_jobs: schedule?.length || 0,
          active_jobs: schedule?.filter(j => j.enabled).length || 0,
          total_executions_24h: recentHistory?.filter(h => 
            new Date(h.started_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
          ).length || 0,
          failed_executions_24h: recentHistory?.filter(h => 
            h.status === 'failed' && 
            new Date(h.started_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
          ).length || 0,
          pending_emails: pendingEmails?.length || 0,
          unprocessed_inbox: unprocessedInbox?.length || 0,
          leads_today: recentLeads?.length || 0
        };

        responseData = {
          stats,
          schedule,
          recent_history: recentHistory,
          pending_emails: pendingEmails,
          unprocessed_inbox: unprocessedInbox,
          recent_leads: recentLeads
        };
        break;

      case 'trigger_job':
        const body = await req.json();
        const jobName = body.job_name;

        if (!jobName) {
          throw new Error('job_name required');
        }

        const { data: job } = await supabase
          .from('automation_schedule')
          .select('*')
          .eq('job_name', jobName)
          .single();

        if (!job) {
          throw new Error(`Job ${jobName} not found`);
        }

        const cronJob = job.metadata?.job || jobName;

        const triggerResponse = await fetch(`${SUPABASE_URL}/functions/v1/cron-orchestrator`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ job: cronJob })
        });

        const triggerResult = await triggerResponse.json();

        responseData = {
          success: true,
          job_name: jobName,
          result: triggerResult
        };
        break;

      case 'toggle_job':
        const toggleBody = await req.json();
        const toggleJobName = toggleBody.job_name;
        const enabled = toggleBody.enabled;

        if (!toggleJobName || enabled === undefined) {
          throw new Error('job_name and enabled required');
        }

        await supabase
          .from('automation_schedule')
          .update({ enabled, updated_at: new Date().toISOString() })
          .eq('job_name', toggleJobName);

        responseData = {
          success: true,
          job_name: toggleJobName,
          enabled
        };
        break;

      case 'stats':
        const { data: allSchedule } = await supabase
          .from('automation_schedule')
          .select('*');

        const { data: allHistory } = await supabase
          .from('cron_execution_history')
          .select('*')
          .gte('started_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

        const { data: allLeads } = await supabase
          .from('leads')
          .select('*')
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

        const { data: emailsSent } = await supabase
          .from('email_queue')
          .select('*')
          .eq('status', 'sent')
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

        const weekStats = {
          total_executions: allHistory?.length || 0,
          success_rate: allHistory?.length > 0 
            ? ((allHistory.filter(h => h.status === 'success').length / allHistory.length) * 100).toFixed(2) + '%'
            : '0%',
          leads_generated: allLeads?.length || 0,
          emails_sent: emailsSent?.length || 0,
          jobs_config: allSchedule?.map(j => ({
            name: j.job_name,
            enabled: j.enabled,
            success_rate: j.total_runs > 0 
              ? ((j.success_runs / j.total_runs) * 100).toFixed(2) + '%'
              : 'N/A',
            avg_time: j.avg_execution_time_ms ? `${j.avg_execution_time_ms}ms` : 'N/A'
          }))
        };

        responseData = weekStats;
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: responseData
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[AUTOMATION DASHBOARD] Error:', error);

    return new Response(
      JSON.stringify({ 
        error: 'Dashboard API error', 
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});