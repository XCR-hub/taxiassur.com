import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // TODO: Parser les données du webhook Monético
    // Le format exact dépend de la documentation Monético
    const formData = await req.formData();
    const webhookData: any = {};

    for (const [key, value] of formData.entries()) {
      webhookData[key] = value;
    }

    console.log('Monético webhook received:', webhookData);

    // TODO: Vérifier le MAC (signature) du webhook
    // Pour sécuriser que le webhook vient bien de Monético
    // const isValid = verifyMoneticoMAC(webhookData);
    // if (!isValid) {
    //   return new Response('Invalid MAC', { status: 403 });
    // }

    // Extraire les informations du webhook
    const {
      reference, // Notre paymentId
      montant,
      code_retour, // Code de retour Monético
      motif_refus,
      numauto, // Numéro d'autorisation
      date,
      // ... autres champs selon la documentation Monético
    } = webhookData;

    // Déterminer le statut du paiement
    let status = 'failed';
    let failureReason = motif_refus;

    // TODO: Adapter selon les codes de retour réels de Monético
    if (code_retour === 'payetest' || code_retour === 'paiement') {
      status = 'paid';
      failureReason = null;
    }

    // Mettre à jour le paiement
    const { data: payment, error: fetchError } = await supabase
      .from('lead_down_payments')
      .select('id, lead_id, status')
      .eq('monetico_order_id', reference)
      .single();

    if (fetchError || !payment) {
      console.error('Payment not found:', reference);
      return new Response('Payment not found', { status: 404 });
    }

    // Ne mettre à jour que si le statut est pending
    if (payment.status === 'pending') {
      const updateData: any = {
        status,
        transaction_id: numauto,
        updated_at: new Date().toISOString(),
      };

      if (status === 'paid') {
        updateData.paid_at = new Date().toISOString();
      } else {
        updateData.failed_at = new Date().toISOString();
        updateData.failure_reason = failureReason;
      }

      const { error: updateError } = await supabase
        .from('lead_down_payments')
        .update(updateData)
        .eq('id', payment.id);

      if (updateError) {
        console.error('Error updating payment:', updateError);
        return new Response('Error updating payment', { status: 500 });
      }

      // Logger l'événement
      await supabase
        .from('crm_event_notifications')
        .insert({
          lead_id: payment.lead_id,
          event_type: status === 'paid' ? 'payment_received' : 'payment_failed',
          title: status === 'paid' ? 'Paiement comptant reçu' : 'Paiement comptant échoué',
          message: status === 'paid'
            ? `Le paiement comptant a été confirmé (${montant})`
            : `Le paiement comptant a échoué : ${failureReason}`,
          priority: status === 'paid' ? 'high' : 'medium',
          metadata: {
            payment_id: payment.id,
            transaction_id: numauto,
            amount: montant,
            webhook_data: webhookData
          }
        });

      console.log('Payment updated successfully:', { paymentId: payment.id, status });
    }

    // Répondre à Monético selon leur format attendu
    // TODO: Adapter selon la documentation Monético
    return new Response('version=2\ncdr=0', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });

  } catch (error: any) {
    console.error('Error processing Monético webhook:', error);

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
