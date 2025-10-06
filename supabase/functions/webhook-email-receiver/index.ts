import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const emailData = await req.json();

    console.log('[EMAIL WEBHOOK] Received email:', {
      from: emailData.from_email,
      subject: emailData.subject
    });

    const fromEmail = emailData.from_email || emailData.from || emailData.sender;
    const fromName = emailData.from_name || emailData.sender_name || fromEmail.split('@')[0];
    const subject = emailData.subject || '(Sans objet)';
    const body = emailData.body || emailData.text || emailData.message || '';
    const htmlBody = emailData.html_body || emailData.html || null;

    if (!fromEmail || !body) {
      throw new Error('Email invalide: from_email et body requis');
    }

    const { data: inboxData, error: inboxError } = await supabase
      .from('email_inbox')
      .insert({
        from_email: fromEmail,
        from_name: fromName,
        to_email: 'contact@taxiassur.com',
        subject: subject,
        body: body,
        html_body: htmlBody,
        received_at: new Date().toISOString(),
        processed: false,
        priority: 5,
        metadata: {
          source: 'webhook',
          raw_data: emailData
        }
      })
      .select()
      .single();

    if (inboxError) {
      console.error('[EMAIL WEBHOOK] Error inserting email:', inboxError);
      throw inboxError;
    }

    console.log('[EMAIL WEBHOOK] Email saved to inbox:', inboxData.id);

    const autoProcessResponse = await fetch(`${SUPABASE_URL}/functions/v1/email-auto-responder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        emailData: {
          from_email: fromEmail,
          from_name: fromName,
          subject: subject,
          body: body
        }
      })
    });

    const autoProcessResult = await autoProcessResponse.json();

    console.log('[EMAIL WEBHOOK] Auto-response result:', autoProcessResult);

    await supabase
      .from('email_inbox')
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
        auto_reply_sent: autoProcessResult.success || false,
        reply_sent_at: autoProcessResult.success ? new Date().toISOString() : null
      })
      .eq('id', inboxData.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email reçu et traité automatiquement',
        email_id: inboxData.id,
        auto_response_sent: autoProcessResult.success
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[EMAIL WEBHOOK] Error:', error);

    return new Response(
      JSON.stringify({ 
        error: 'Erreur traitement email', 
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});