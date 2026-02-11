import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const MONETICO_MAC_KEY = '106FA85BF342FD4EE95C883D82865B5CC1F63890';

async function verifyMAC(data: string, receivedMAC: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(MONETICO_MAC_KEY);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));

  const calculatedMAC = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return calculatedMAC.toLowerCase() === receivedMAC.toLowerCase();
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const formData = await req.formData();
    const webhookData: any = {};

    for (const [key, value] of formData.entries()) {
      webhookData[key] = value;
    }

    console.log('Monetico webhook received:', webhookData);

    const {
      reference,
      montant,
      code_retour,
      cvx,
      motifrefus,
      numauto,
      date,
      heure,
      TPE,
      MAC: receivedMAC,
      authentification,
      brand,
      modepaiement,
    } = webhookData;

    const macString = `${TPE}*${date}*${montant}*${reference}*${code_retour}*${cvx}*${motifrefus}*${authentification}*${numauto}`;

    const isValidMAC = await verifyMAC(macString, receivedMAC);

    if (!isValidMAC) {
      console.error('Invalid MAC signature');
      return new Response('version=2\ncdr=1', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    const { data: payment, error: fetchError } = await supabase
      .from('monetico_payments')
      .select('id, lead_id, status')
      .eq('reference', reference)
      .single();

    if (fetchError || !payment) {
      console.error('Payment not found:', reference);
      return new Response('version=2\ncdr=1', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    let status = 'failed';
    if (code_retour === 'payetest' || code_retour === 'paiement') {
      status = 'success';
    } else if (code_retour === 'Annulation') {
      status = 'cancelled';
    }

    if (payment.status === 'pending' || payment.status === 'processing') {
      const updateData: any = {
        status,
        transaction_id: numauto,
        payment_date: status === 'success' ? new Date().toISOString() : null,
        card_type: brand,
        authorization_number: numauto,
        mac_received: receivedMAC,
        monetico_data: {
          ...webhookData,
          received_at: new Date().toISOString()
        }
      };

      if (modepaiement && modepaiement.includes('CB')) {
        const lastDigits = modepaiement.match(/\d{4}$/);
        if (lastDigits) {
          updateData.card_last4 = lastDigits[0];
        }
      }

      const { error: updateError } = await supabase
        .from('monetico_payments')
        .update(updateData)
        .eq('id', payment.id);

      if (updateError) {
        console.error('Error updating payment:', updateError);
        return new Response('version=2\ncdr=1', {
          status: 200,
          headers: { 'Content-Type': 'text/plain' }
        });
      }

      console.log('Payment updated successfully:', { paymentId: payment.id, status });
    }

    return new Response('version=2\ncdr=0', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });

  } catch (error: any) {
    console.error('Error processing Monetico webhook:', error);
    return new Response('version=2\ncdr=1', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
});
