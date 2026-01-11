import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const brevoApiKey = Deno.env.get('BREVO_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting email sync...');

    const stats = {
      total_retrieved: 0,
      inserted: 0,
      skipped: 0,
      errors: 0,
    };

    // Use Brevo API since IMAP doesn't work in Deno Edge Functions
    if (!brevoApiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'BREVO_API_KEY not configured. IMAP is not supported in Edge Functions.',
          note: 'Configure BREVO_API_KEY in Supabase Edge Function secrets to sync emails.',
          stats,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch sent emails from Brevo
    let offset = 0;
    const batchSize = 100;
    const maxEmails = 500;

    while (stats.total_retrieved < maxEmails) {
      const response = await fetch(
        `https://api.brevo.com/v3/smtp/emails?limit=${batchSize}&offset=${offset}&sort=desc`,
        {
          method: 'GET',
          headers: {
            'accept': 'application/json',
            'api-key': brevoApiKey,
          },
        }
      );

      if (!response.ok) {
        console.error('Brevo API error:', response.status);
        break;
      }

      const data = await response.json();
      if (!data.transactionalEmails || data.transactionalEmails.length === 0) break;

      for (const email of data.transactionalEmails) {
        stats.total_retrieved++;

        const messageId = email.messageId || email.uuid || `brevo-${Date.now()}-${Math.random()}`;

        const { data: existing } = await supabase
          .from('email_messages')
          .select('id')
          .eq('message_id', messageId)
          .maybeSingle();

        if (existing) {
          stats.skipped++;
          continue;
        }

        const toEmails = email.to ? (Array.isArray(email.to) ? email.to.map((t: any) => t.email || t) : [email.to]) : [];

        const { error: insertError } = await supabase.from('email_messages').insert({
          message_id: messageId,
          from_email: email.from || 'team@taxiassur.com',
          from_name: email.from || 'TaxiAssur',
          to_emails: toEmails.filter(Boolean),
          to_names: toEmails.filter(Boolean),
          subject: email.subject || '(Pas de sujet)',
          body_text: email.textContent || '',
          body_html: email.htmlContent || '',
          received_at: email.date || new Date().toISOString(),
          sent_at: email.date || new Date().toISOString(),
          direction: 'outbound',
          status: 'sent',
          channel: 'email',
          provider: 'brevo',
          is_read: true,
          has_attachments: false,
          metadata: { brevo_uuid: email.uuid, template_id: email.templateId },
        });

        if (insertError) {
          console.error('Insert error:', insertError);
          stats.errors++;
        } else {
          stats.inserted++;
        }
      }

      offset += batchSize;
      if (data.transactionalEmails.length < batchSize) break;
    }

    // Update last sync time
    await supabase
      .from('email_accounts')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('email', 'team@taxiassur.com');

    return new Response(
      JSON.stringify({
        success: true,
        message: `Email sync completed: ${stats.inserted} new emails from Brevo`,
        stats,
        provider: 'brevo',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Email sync error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});