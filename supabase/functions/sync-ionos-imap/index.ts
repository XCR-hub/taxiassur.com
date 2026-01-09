import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: accounts, error: accountsError } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('is_active', true)
      .eq('email', 'team@taxiassur.com');

    if (accountsError) {
      throw new Error(`Error fetching accounts: ${accountsError.message}`);
    }

    if (!accounts || accounts.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'No active email accounts found for team@taxiassur.com'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const account = accounts[0];
    const results = {
      inbox: 0,
      sent: 0,
      total: 0,
      errors: [] as string[],
    };

    const imapHost = account.imap_host || 'imap.ionos.fr';
    const imapPort = account.imap_port || 993;

    console.log(`Syncing IONOS IMAP for ${account.email}`);
    console.log(`Host: ${imapHost}:${imapPort}`);

    await supabase
      .from('email_accounts')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', account.id);

    results.errors.push(
      'IMAP sync requires proper IMAP client library. Please configure IONOS API access or use a dedicated IMAP sync service.'
    );

    return new Response(
      JSON.stringify({
        success: results.errors.length === 0,
        message: `IONOS IMAP sync completed`,
        results,
        note: 'IMAP sync functionality needs proper IMAP library implementation'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in sync-ionos-imap:', error);
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