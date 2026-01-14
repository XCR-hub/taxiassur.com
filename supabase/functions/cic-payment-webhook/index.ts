import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { payment_token, transaction_id, status, amount, provider_data = {} } = body;

    if (!payment_token || !transaction_id || !status) {
      throw new Error('payment_token, transaction_id and status are required');
    }

    console.log('CIC Payment Webhook received:', { payment_token, transaction_id, status, amount });

    if (status === 'paid' || status === 'success' || status === 'completed') {
      const { data: success, error } = await supabaseClient
        .rpc('record_down_payment', {
          p_payment_token: payment_token,
          p_transaction_id: transaction_id,
          p_provider_response: {
            provider: 'cic',
            status,
            amount,
            timestamp: new Date().toISOString(),
            ...provider_data
          }
        });

      if (error) {
        console.error('Error recording payment:', error);
        throw error;
      }

      if (!success) {
        throw new Error('Payment link invalid or expired');
      }

      const { data: contract } = await supabaseClient
        .from('lead_contracts')
        .select('*, crm_leads(id, email, first_name, last_name, full_name)')
        .eq('down_payment_link', payment_token)
        .single();

      if (contract) {
        const lead = contract.crm_leads as any;
        const baseUrl = Deno.env.get('PUBLIC_URL') || 'https://taxiassur.com';
        const signatureLink = `${baseUrl}/espace-prospect?token=${lead.access_token || ''}`;

        const emailFunctionUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email-ionos`;
        await fetch(emailFunctionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
          },
          body: JSON.stringify({
            to: lead.email,
            subject: 'Paiement comptant confirmé - TaxiAssur',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #10b981;">Bonjour ${lead.first_name || lead.full_name},</h2>
                <p>✅ Votre paiement de <strong>${amount} EUR</strong> a été confirmé !</p>
                <p>Vous pouvez maintenant signer votre contrat :</p>
                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0;">👉 <a href="${signatureLink}" style="color: #2563eb; font-weight: bold;">Signer mon contrat</a></p>
                </div>
                <p>Merci pour votre confiance.</p>
                <p>Cordialement,<br>L'équipe TaxiAssur<br>01 76 39 00 60</p>
              </div>
            `
          })
        });

        await supabaseClient
          .from('crm_interactions')
          .insert({
            lead_id: lead.id,
            type: 'payment',
            direction: 'inbound',
            channel: 'cic',
            content: `Paiement comptant reçu : ${amount} EUR (Transaction: ${transaction_id})`,
            metadata: {
              transaction_id,
              amount,
              payment_token,
              provider: 'cic',
              status
            }
          });
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Payment recorded successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (status === 'failed' || status === 'error' || status === 'cancelled') {
      const { error: updateError } = await supabaseClient
        .from('lead_contracts')
        .update({
          down_payment_status: 'failed',
          down_payment_metadata: {
            last_attempt: new Date().toISOString(),
            status,
            transaction_id,
            provider_data
          }
        })
        .eq('down_payment_link', payment_token);

      if (updateError) {
        console.error('Error updating failed payment:', updateError);
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Payment failure recorded' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook received' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing CIC webhook:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});