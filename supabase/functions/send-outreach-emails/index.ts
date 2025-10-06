import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface SendEmailRequest {
  opportunityIds?: string[];
  campaignId?: string;
  templateId?: string;
  sendNow?: boolean;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: SendEmailRequest = await req.json();
    const { opportunityIds, campaignId, templateId, sendNow = false } = body;

    if (!opportunityIds || opportunityIds.length === 0) {
      throw new Error('No opportunity IDs provided');
    }

    // Get opportunities
    const { data: opportunities, error: oppError } = await supabase
      .from('backlink_opportunities')
      .select('*')
      .in('id', opportunityIds)
      .eq('status', 'pending');

    if (oppError) throw oppError;
    if (!opportunities || opportunities.length === 0) {
      throw new Error('No valid opportunities found');
    }

    // Get email template
    let template;
    if (templateId) {
      const { data: templateData, error: templateError } = await supabase
        .from('backlink_email_templates')
        .select('*')
        .eq('id', templateId)
        .eq('is_active', true)
        .single();

      if (templateError) throw templateError;
      template = templateData;
    } else {
      // Use default template
      const { data: defaultTemplate } = await supabase
        .from('backlink_email_templates')
        .select('*')
        .eq('email_type', 'initial')
        .eq('is_active', true)
        .limit(1)
        .single();

      template = defaultTemplate;
    }

    if (!template) {
      throw new Error('No email template found');
    }

    const emailsSent: string[] = [];
    const emailsFailed: string[] = [];

    // Process each opportunity
    for (const opp of opportunities) {
      try {
        // Replace template variables
        const emailSubject = template.subject
          .replace('{{domain}}', opp.domain)
          .replace('{{pageTitle}}', opp.page_title);

        const emailBody = template.body
          .replace(/{{domain}}/g, opp.domain)
          .replace(/{{pageTitle}}/g, opp.page_title)
          .replace(/{{linkingTo}}/g, opp.linking_to || 'concurrent')
          .replace(/{{lastContactedDate}}/g, opp.last_contacted ? new Date(opp.last_contacted).toLocaleDateString('fr-FR') : '');

        if (sendNow) {
          // Send email via SendGrid (requires SENDGRID_API_KEY in env)
          // For demo, we simulate success
          const sendgridResponse = await sendEmailViaSendGrid({
            to: opp.contact_email,
            subject: emailSubject,
            body: emailBody,
          });

          // Log email
          await supabase.from('backlink_email_logs').insert({
            opportunity_id: opp.id,
            campaign_id: campaignId || null,
            email_type: 'initial',
            email_subject: emailSubject,
            email_body: emailBody,
            sendgrid_message_id: sendgridResponse.messageId,
            status: 'sent',
            sent_at: new Date().toISOString(),
          });

          // Update opportunity status
          await supabase
            .from('backlink_opportunities')
            .update({
              status: 'contacted',
              last_contacted: new Date().toISOString(),
            })
            .eq('id', opp.id);

          emailsSent.push(opp.id);
        } else {
          // Queue email for later
          await supabase.from('backlink_email_logs').insert({
            opportunity_id: opp.id,
            campaign_id: campaignId || null,
            email_type: 'initial',
            email_subject: emailSubject,
            email_body: emailBody,
            status: 'queued',
          });

          emailsSent.push(opp.id);
        }
      } catch (error) {
        console.error(`Failed to process opportunity ${opp.id}:`, error);
        emailsFailed.push(opp.id);
      }
    }

    // Update campaign stats if provided
    if (campaignId) {
      await supabase
        .from('backlink_outreach_campaigns')
        .update({
          sent_count: supabase.rpc('increment', { row_id: campaignId, amount: emailsSent.length }),
        })
        .eq('id', campaignId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent: emailsSent.length,
        emailsFailed: emailsFailed.length,
        sentIds: emailsSent,
        failedIds: emailsFailed,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error sending outreach emails:', error);

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

// Helper function to send email via SendGrid
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
    // Simulate success for demo purposes
    console.log('SendGrid API key not configured. Simulating email send.');
    return {
      messageId: `sim-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      success: true,
    };
  }

  // Real SendGrid implementation
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
      // Enable click tracking
      tracking_settings: {
        click_tracking: { enable: true },
        open_tracking: { enable: true },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`SendGrid API error: ${response.statusText}`);
  }

  // SendGrid returns message ID in X-Message-Id header
  const messageId = response.headers.get('X-Message-Id') || `sg-${Date.now()}`;

  return {
    messageId,
    success: true,
  };
}