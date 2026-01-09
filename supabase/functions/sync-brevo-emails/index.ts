import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BrevoEmail {
  messageId: string;
  subject: string;
  sender: { email: string; name?: string };
  to: Array<{ email: string; name?: string }>;
  cc?: Array<{ email: string; name?: string }>;
  htmlContent?: string;
  textContent?: string;
  date: string;
  tags?: string[];
  templateId?: number;
}

async function fetchBrevoSentEmails(apiKey: string, limit: number = 500): Promise<BrevoEmail[]> {
  const emails: BrevoEmail[] = [];
  let offset = 0;
  const batchSize = 100;

  try {
    while (emails.length < limit) {
      const response = await fetch(
        `https://api.brevo.com/v3/smtp/emails?limit=${batchSize}&offset=${offset}&sort=desc`,
        {
          method: 'GET',
          headers: {
            'accept': 'application/json',
            'api-key': apiKey,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Brevo API error: ${response.status} - ${errorText}`);
        break;
      }

      const data = await response.json();

      if (!data.transactionalEmails || data.transactionalEmails.length === 0) {
        break;
      }

      emails.push(...data.transactionalEmails);
      offset += batchSize;

      if (data.transactionalEmails.length < batchSize) {
        break;
      }
    }
  } catch (error) {
    console.error('Error fetching Brevo emails:', error);
  }

  return emails;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const brevoApiKey = Deno.env.get('BREVO_API_KEY');

    if (!brevoApiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'BREVO_API_KEY not configured in environment'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Fetching emails from Brevo API...');
    const brevoEmails = await fetchBrevoSentEmails(brevoApiKey, 1000);
    console.log(`Retrieved ${brevoEmails.length} emails from Brevo`);

    let inserted = 0;
    let skipped = 0;
    let errors = 0;

    for (const email of brevoEmails) {
      try {
        const { data: existing } = await supabase
          .from('email_messages')
          .select('id')
          .eq('message_id', email.messageId)
          .maybeSingle();

        if (existing) {
          skipped++;
          continue;
        }

        const emailData = {
          message_id: email.messageId,
          thread_id: null,
          from_email: email.sender.email,
          from_name: email.sender.name || email.sender.email,
          to_emails: email.to.map(t => t.email),
          to_names: email.to.map(t => t.name || t.email),
          cc_emails: email.cc?.map(c => c.email) || [],
          subject: email.subject || '(No Subject)',
          body_text: email.textContent || '',
          body_html: email.htmlContent || '',
          received_at: email.date,
          sent_at: email.date,
          direction: 'outbound',
          status: 'sent',
          channel: 'email',
          provider: 'brevo',
          is_read: true,
          has_attachments: false,
          tags: email.tags || [],
          metadata: {
            template_id: email.templateId,
            brevo_message_id: email.messageId,
          },
        };

        const { error: insertError } = await supabase
          .from('email_messages')
          .insert(emailData);

        if (insertError) {
          console.error(`Error inserting email ${email.messageId}:`, insertError);
          errors++;
        } else {
          inserted++;
        }

      } catch (error) {
        console.error(`Error processing email ${email.messageId}:`, error);
        errors++;
      }
    }

    const { error: updateError } = await supabase
      .from('email_accounts')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('email', 'team@taxiassur.com');

    if (updateError) {
      console.error('Error updating last_sync_at:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Brevo emails synced successfully',
        stats: {
          total_retrieved: brevoEmails.length,
          inserted,
          skipped,
          errors,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in sync-brevo-emails:', error);
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