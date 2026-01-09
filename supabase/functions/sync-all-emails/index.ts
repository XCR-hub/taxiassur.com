import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function callEdgeFunction(functionName: string, supabaseUrl: string, anonKey: string) {
  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/${functionName}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      }
    );

    const data = await response.json();
    return {
      function: functionName,
      success: response.ok,
      data,
    };
  } catch (error) {
    return {
      function: functionName,
      success: false,
      error: error.message,
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    console.log('Starting complete email sync for team@taxiassur.com');
    console.log('Syncing from: IONOS IMAP, Brevo API, SendGrid API');

    const results = [];

    console.log('1/3 - Syncing Brevo emails...');
    const brevoResult = await callEdgeFunction('sync-brevo-emails', supabaseUrl, supabaseAnonKey);
    results.push(brevoResult);

    console.log('2/3 - Syncing SendGrid emails...');
    const sendGridResult = await callEdgeFunction('sync-sendgrid-emails', supabaseUrl, supabaseAnonKey);
    results.push(sendGridResult);

    console.log('3/3 - Syncing IONOS IMAP...');
    const ionosResult = await callEdgeFunction('sync-ionos-imap', supabaseUrl, supabaseAnonKey);
    results.push(ionosResult);

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { count } = await supabase
      .from('email_messages')
      .select('*', { count: 'exact', head: true });

    const summary = {
      total_emails_in_database: count || 0,
      sync_results: results,
      timestamp: new Date().toISOString(),
    };

    console.log('Email sync complete:', summary);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Complete email sync finished. Total emails in database: ${count || 0}`,
        summary,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in sync-all-emails:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});