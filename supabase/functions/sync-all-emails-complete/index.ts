import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    console.log('Starting complete email sync and lead assignment...');

    const results = {
      imap_sync: null as any,
      lead_assignment: null as any,
      success: true,
      errors: [] as string[],
    };

    // Étape 1 : Synchroniser les emails depuis IMAP (avec timeout)
    try {
      console.log('Step 1: Syncing emails from IMAP...');

      // Créer un timeout de 30 secondes pour éviter le blocage
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
        const imapResponse = await fetch(
          `${supabaseUrl}/functions/v1/sync-ionos-imap`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseAnonKey}`,
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);

        if (!imapResponse.ok) {
          const errorText = await imapResponse.text();
          throw new Error(`IMAP sync failed (${imapResponse.status}): ${errorText.substring(0, 200)}`);
        }

        results.imap_sync = await imapResponse.json();
        console.log('IMAP sync completed:', results.imap_sync);
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('IMAP sync timeout after 30 seconds. Check Supabase secrets configuration.');
        }
        throw fetchError;
      }
    } catch (imapError: any) {
      console.error('IMAP sync error:', imapError);
      results.errors.push(`IMAP sync: ${imapError.message}`);
      // Ne pas marquer comme échec total, continuer avec Brevo
      console.log('Continuing without IONOS IMAP sync...');
    }

    // Étape 2 : Affecter les emails aux leads
    try {
      console.log('Step 2: Assigning emails to leads...');
      
      const assignResponse = await fetch(
        `${supabaseUrl}/functions/v1/sync-emails-to-leads`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!assignResponse.ok) {
        const errorText = await assignResponse.text();
        throw new Error(`Lead assignment failed: ${errorText}`);
      }

      results.lead_assignment = await assignResponse.json();
      console.log('Lead assignment completed:', results.lead_assignment);
    } catch (assignError) {
      console.error('Lead assignment error:', assignError);
      results.errors.push(`Lead assignment: ${assignError.message}`);
      results.success = false;
    }

    // Calculer les statistiques globales
    const totalStats = {
      emails_retrieved: results.imap_sync?.stats?.total_retrieved || 0,
      emails_inserted: results.imap_sync?.stats?.inserted || 0,
      emails_skipped: results.imap_sync?.stats?.skipped || 0,
      leads_created: results.lead_assignment?.stats?.leads_created || 0,
      emails_linked: results.lead_assignment?.stats?.emails_linked || 0,
      interactions_created: results.lead_assignment?.stats?.interactions_created || 0,
      total_errors: (results.imap_sync?.stats?.errors || 0) + (results.lead_assignment?.stats?.errors || 0),
    };

    const finalResponse = {
      success: results.success && results.errors.length === 0,
      message: results.success 
        ? 'Complete email sync and lead assignment finished successfully'
        : 'Email sync completed with some errors',
      stats: totalStats,
      details: results,
      timestamp: new Date().toISOString(),
    };

    console.log('Complete sync finished:', finalResponse);

    return new Response(
      JSON.stringify(finalResponse),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: results.success ? 200 : 207, // 207 Multi-Status if partial success
      }
    );

  } catch (error) {
    console.error('Fatal error in sync-all-emails-complete:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});