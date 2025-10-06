import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const FROM_EMAIL = 'contact@taxiassur.com';
const FROM_NAME = 'TaxiAssur';

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { action, emailData, batchSize } = await req.json();

    if (action === 'send_single') {
      // Envoi d'un email unique
      const { to_email, to_name, subject, body, template_type, metadata } = emailData;

      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: [{ email: to_email, name: to_name || '' }],
              subject: subject
            }
          ],
          from: { email: FROM_EMAIL, name: FROM_NAME },
          reply_to: { email: FROM_EMAIL, name: FROM_NAME },
          content: [
            {
              type: 'text/plain',
              value: body
            },
            {
              type: 'text/html',
              value: body.replace(/\n/g, '<br>')
            }
          ],
          tracking_settings: {
            click_tracking: { enable: true },
            open_tracking: { enable: true }
          },
          custom_args: {
            template_type: template_type || 'outreach',
            ...metadata
          }
        }),
      });

      const success = response.status === 202;

      // Enregistrer dans la base
      await supabase
        .from('email_responses')
        .insert({
          to_email,
          subject,
          body,
          sent_at: new Date().toISOString(),
          delivery_status: success ? 'sent' : 'failed',
          template_used: template_type,
          metadata: { ...metadata, sendgrid_response: response.status }
        });

      // Log
      await supabase
        .from('automation_logs')
        .insert({
          action_type: 'email_sent',
          action_details: {
            to: to_email,
            subject,
            template: template_type,
            status: success ? 'sent' : 'failed'
          },
          status: success ? 'success' : 'failed'
        });

      return new Response(
        JSON.stringify({
          success,
          message: success ? 'Email envoyé avec succès' : 'Échec envoi email',
          status: response.status
        }),
        {
          status: success ? 200 : 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    else if (action === 'send_batch') {
      // Envoi en masse depuis email_responses avec status 'pending'
      const limit = batchSize || 50;

      const { data: pendingEmails, error } = await supabase
        .from('email_responses')
        .select('*')
        .eq('delivery_status', 'pending')
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) throw error;

      const results = [];

      for (const email of pendingEmails || []) {
        try {
          const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SENDGRID_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              personalizations: [
                {
                  to: [{ email: email.to_email }],
                  subject: email.subject
                }
              ],
              from: { email: FROM_EMAIL, name: FROM_NAME },
              reply_to: { email: FROM_EMAIL, name: FROM_NAME },
              content: [
                {
                  type: 'text/plain',
                  value: email.body
                },
                {
                  type: 'text/html',
                  value: email.body.replace(/\n/g, '<br>')
                }
              ],
              tracking_settings: {
                click_tracking: { enable: true },
                open_tracking: { enable: true }
              }
            }),
          });

          const success = response.status === 202;

          // Mettre à jour le statut
          await supabase
            .from('email_responses')
            .update({
              delivery_status: success ? 'sent' : 'failed',
              sent_at: new Date().toISOString()
            })
            .eq('id', email.id);

          results.push({
            email_id: email.id,
            to: email.to_email,
            success,
            status: response.status
          });

          // Délai entre envois (throttling humain)
          await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

        } catch (emailError) {
          console.error(`Error sending email ${email.id}:`, emailError);
          results.push({
            email_id: email.id,
            to: email.to_email,
            success: false,
            error: emailError.message
          });
        }
      }

      // Log batch
      await supabase
        .from('automation_logs')
        .insert({
          action_type: 'email_batch_sent',
          action_details: {
            total: results.length,
            sent: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length
          },
          status: 'success'
        });

      return new Response(
        JSON.stringify({
          success: true,
          total_processed: results.length,
          sent: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
          results
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    else if (action === 'check_status') {
      // Vérifier les stats SendGrid
      const statsResponse = await fetch(
        'https://api.sendgrid.com/v3/stats?start_date=' + 
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        {
          headers: {
            'Authorization': `Bearer ${SENDGRID_API_KEY}`,
          },
        }
      );

      const stats = await statsResponse.json();

      return new Response(
        JSON.stringify({
          success: true,
          stats
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    throw new Error('Action not supported');

  } catch (error) {
    console.error('Error:', error);

    await supabase
      .from('automation_logs')
      .insert({
        action_type: 'email_send_error',
        status: 'failed',
        error_message: error.message
      });

    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});