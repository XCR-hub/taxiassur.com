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

    const { contract_id, amount, admin_user_id } = await req.json();

    if (!contract_id || !amount) {
      throw new Error('contract_id and amount are required');
    }

    const { data: contract, error: contractError } = await supabaseClient
      .from('lead_contracts')
      .select('*, crm_leads(email, first_name, last_name, full_name)')
      .eq('id', contract_id)
      .single();

    if (contractError || !contract) {
      throw new Error('Contract not found');
    }

    const { data: paymentToken, error: tokenError } = await supabaseClient
      .rpc('create_down_payment_link', {
        p_contract_id: contract_id,
        p_amount: amount,
        p_expires_in_days: 7
      });

    if (tokenError) {
      throw tokenError;
    }

    const baseUrl = Deno.env.get('PUBLIC_URL') || 'https://taxiassur.com';
    const paymentLink = `${baseUrl}/paiement/${paymentToken}`;

    await supabaseClient
      .from('crm_interactions')
      .insert({
        lead_id: contract.lead_id,
        type: 'system',
        direction: 'outbound',
        channel: 'system',
        content: `Lien de paiement comptant généré : ${amount} EUR`,
        metadata: {
          contract_id,
          amount,
          payment_token: paymentToken,
          payment_link: paymentLink,
          created_by: admin_user_id
        }
      });

    const emailFunctionUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email-ionos`;
    const lead = contract.crm_leads as any;

    await fetch(emailFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
      },
      body: JSON.stringify({
        to: lead.email,
        subject: 'Réglez votre comptant pour finaliser votre contrat - TaxiAssur',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Bonjour ${lead.first_name || lead.full_name},</h2>
            <p>Votre contrat d'assurance taxi est prêt !</p>
            <p>Pour le finaliser, un comptant de <strong>${amount} EUR</strong> est requis.</p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;">👉 <a href="${paymentLink}" style="color: #2563eb; font-weight: bold;">Payez en ligne de manière sécurisée</a></p>
            </div>
            <p style="color: #6b7280; font-size: 14px;">Ce lien expire dans 7 jours.</p>
            <p>Une fois le paiement validé, vous pourrez signer électroniquement votre contrat.</p>
            <p>Cordialement,<br>L'équipe TaxiAssur<br>01 76 39 00 60</p>
          </div>
        `
      })
    });

    return new Response(
      JSON.stringify({
        success: true,
        payment_token: paymentToken,
        payment_link: paymentLink,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating payment link:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});