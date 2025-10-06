import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find opportunities contacted 7+ days ago without followup
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: opportunities, error: oppError } = await supabase
      .from('backlink_opportunities')
      .select('*')
      .eq('status', 'contacted')
      .lt('last_contacted', sevenDaysAgo.toISOString());

    if (oppError) throw oppError;

    if (!opportunities || opportunities.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No opportunities need follow-up',
          count: 0,
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Get follow-up template
    const { data: template, error: templateError } = await supabase
      .from('backlink_email_templates')
      .select('*')
      .eq('email_type', 'followup')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (templateError) throw templateError;

    const followupsSent: string[] = [];
    const followupsFailed: string[] = [];

    // Process each opportunity
    for (const opp of opportunities) {
      try {
        // Check if followup already sent
        const { data: existingFollowup } = await supabase
          .from('backlink_email_logs')
          .select('id')
          .eq('opportunity_id', opp.id)
          .eq('email_type', 'followup')
          .limit(1)
          .single();

        if (existingFollowup) {
          console.log(`Followup already sent for ${opp.domain}`);
          continue;
        }

        // Replace template variables
        const lastContactedDate = new Date(opp.last_contacted).toLocaleDateString('fr-FR');

        const emailSubject = template.subject
          .replace('{{domain}}', opp.domain);

        const emailBody = template.body
          .replace(/{{domain}}/g, opp.domain)
          .replace(/{{pageTitle}}/g, opp.page_title)
          .replace(/{{lastContactedDate}}/g, lastContactedDate);

        // Send follow-up email
        const sendgridResponse = await sendEmailViaSendGrid({
          to: opp.contact_email,
          subject: emailSubject,
          body: emailBody,
        });

        // Log email
        await supabase.from('backlink_email_logs').insert({
          opportunity_id: opp.id,
          email_type: 'followup',
          email_subject: emailSubject,
          email_body: emailBody,
          sendgrid_message_id: sendgridResponse.messageId,
          status: 'sent',
          sent_at: new Date().toISOString(),
        });

        // Update last_contacted
        await supabase
          .from('backlink_opportunities')
          .update({
            last_contacted: new Date().toISOString(),
          })
          .eq('id', opp.id);

        followupsSent.push(opp.id);

        console.log(`Follow-up sent to ${opp.domain}`);
      } catch (error) {
        console.error(`Failed to send follow-up to ${opp.domain}:`, error);
        followupsFailed.push(opp.id);
      }
    }

    // Send notification if followups sent
    if (followupsSent.length > 0) {
      await sendSlackNotification({
        message: `📨 ${followupsSent.length} follow-up emails sent automatically`,
        details: `Opportunities: ${followupsSent.map(id => opportunities.find(o => o.id === id)?.domain).join(', ')}`,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        followupsSent: followupsSent.length,
        followupsFailed: followupsFailed.length,
        sentIds: followupsSent,
        failedIds: followupsFailed,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error in auto-followup:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

// Helper: Send email via SendGrid
async function sendEmailViaSendGrid({
  to,
  subject,
  body,
}: {
  to: string;
  subject: string;
  body: string;
}) {
  const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY');

  if (!sendgridApiKey) {
    console.log('SendGrid API key not configured. Simulating email send.');
    return {
      messageId: `sim-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      success: true,
    };
  }

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sendgridApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: [{ email: to }],
          subject: subject,
        },
      ],
      from: {
        email: 'contact@taxiassur.com',
        name: 'TaxiAssur - Courtier Assurance Taxi',
      },
      content: [
        {
          type: 'text/plain',
          value: body,
        },
      ],
      tracking_settings: {
        click_tracking: { enable: true },
        open_tracking: { enable: true },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`SendGrid API error: ${response.statusText}`);
  }

  const messageId = response.headers.get('X-Message-Id') || `sg-${Date.now()}`;
  return { messageId, success: true };
}

// Helper: Send Slack notification
async function sendSlackNotification({
  message,
  details,
}: {
  message: string;
  details?: string;
}) {
  const slackWebhookUrl = Deno.env.get('SLACK_WEBHOOK_URL');

  if (!slackWebhookUrl) {
    console.log('Slack webhook not configured. Skipping notification.');
    return;
  }

  const payload = {
    text: message,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${message}*`,
        },
      },
    ],
  };

  if (details) {
    payload.blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: details,
      },
    });
  }

  try {
    await fetch(slackWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error('Failed to send Slack notification:', error);
  }
}