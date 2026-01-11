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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const brevoApiKey = Deno.env.get('BREVO_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting complete email sync...');

    const stats = {
      emails_retrieved: 0,
      emails_inserted: 0,
      emails_skipped: 0,
      emails_linked: 0,
      leads_created: 0,
      interactions_created: 0,
      errors: 0,
    };

    // Step 1: Sync emails from Brevo
    if (brevoApiKey) {
      console.log('Syncing emails from Brevo API...');
      let offset = 0;
      const batchSize = 100;

      while (stats.emails_retrieved < 500) {
        const response = await fetch(
          `https://api.brevo.com/v3/smtp/emails?limit=${batchSize}&offset=${offset}&sort=desc`,
          {
            method: 'GET',
            headers: { 'accept': 'application/json', 'api-key': brevoApiKey },
          }
        );

        if (!response.ok) break;

        const data = await response.json();
        if (!data.transactionalEmails || data.transactionalEmails.length === 0) break;

        for (const email of data.transactionalEmails) {
          stats.emails_retrieved++;
          const messageId = email.messageId || email.uuid || `brevo-${Date.now()}-${Math.random()}`;

          const { data: existing } = await supabase
            .from('email_messages')
            .select('id')
            .eq('message_id', messageId)
            .maybeSingle();

          if (existing) {
            stats.emails_skipped++;
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
            stats.errors++;
          } else {
            stats.emails_inserted++;
          }
        }

        offset += batchSize;
        if (data.transactionalEmails.length < batchSize) break;
      }

      console.log(`Retrieved ${stats.emails_retrieved} emails, inserted ${stats.emails_inserted}`);
    } else {
      console.log('BREVO_API_KEY not configured');
    }

    // Step 2: Link emails to leads
    console.log('Linking emails to leads...');
    const { data: unlinkedEmails } = await supabase
      .from('email_messages')
      .select('id, from_email, to_emails, direction')
      .is('lead_id', null)
      .limit(500);

    if (unlinkedEmails) {
      for (const email of unlinkedEmails) {
        const emailToMatch = email.direction === 'inbound'
          ? email.from_email
          : (email.to_emails?.[0] || null);

        if (!emailToMatch) continue;

        const { data: lead } = await supabase
          .from('leads')
          .select('id')
          .eq('email', emailToMatch)
          .maybeSingle();

        if (lead) {
          await supabase
            .from('email_messages')
            .update({ lead_id: lead.id, auto_matched: true })
            .eq('id', email.id);
          stats.emails_linked++;

          await supabase.from('crm_interactions').insert({
            lead_id: lead.id,
            type: email.direction === 'inbound' ? 'email_received' : 'email_sent',
            channel: 'email',
            content: `Email: ${email.id}`,
            metadata: { email_id: email.id },
          });
          stats.interactions_created++;
        }
      }
    }

    // Update last sync time
    await supabase
      .from('email_accounts')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('email', 'team@taxiassur.com');

    const hasEmails = stats.emails_retrieved > 0 || stats.emails_inserted > 0;

    return new Response(
      JSON.stringify({
        success: true,
        message: hasEmails
          ? `Synchronisation terminee: ${stats.emails_inserted} nouveaux emails`
          : 'Aucun email recupere - verifiez BREVO_API_KEY dans les secrets Supabase',
        stats,
        note: !brevoApiKey ? 'BREVO_API_KEY non configure' : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Fatal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});