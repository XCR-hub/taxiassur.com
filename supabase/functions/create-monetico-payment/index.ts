import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface PaymentRequest {
  leadId: string;
  amount: number;
  leadEmail: string;
  leadName: string;
  paymentId: string;
}

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

    const { leadId, amount, leadEmail, leadName, paymentId }: PaymentRequest = await req.json();

    console.log('Creating Monético payment:', { leadId, amount, leadEmail, paymentId });

    // TODO: Intégration API Monético à compléter avec les informations fournies
    //
    // ÉTAPES À IMPLÉMENTER :
    // 1. Générer les paramètres de paiement Monético
    // 2. Calculer le MAC (Message Authentication Code)
    // 3. Créer l'URL de paiement avec les paramètres
    // 4. Enregistrer la référence de transaction
    // 5. Envoyer un email au prospect avec le lien de paiement
    //
    // PARAMÈTRES MONÉTICO ATTENDUS (à confirmer) :
    // - TPE (Numéro de terminal)
    // - date (au format jj/MM/aaaa:HH:mm:ss)
    // - montant (montant en centimes)
    // - reference (référence unique de commande)
    // - MAC (signature HMAC-SHA1)
    // - url_retour_ok
    // - url_retour_err
    // - lgue (langue)
    // - societe (nom de la société)
    // - etc.

    // Pour l'instant, on génère juste un placeholder
    const mockPaymentUrl = `https://p.monetico-services.com/paiement.cgi?version=3.0&TPE=PLACEHOLDER&date=${new Date().toISOString()}&montant=${amount}EUR&reference=${paymentId}`;

    // Mettre à jour le paiement avec l'URL
    const { error: updateError } = await supabase
      .from('lead_down_payments')
      .update({
        payment_url: mockPaymentUrl,
        monetico_order_id: paymentId,
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentId);

    if (updateError) {
      throw updateError;
    }

    // TODO: Envoyer un email au prospect avec le lien de paiement
    // Via la fonction send-email-universal ou send-crm-email

    return new Response(
      JSON.stringify({
        success: true,
        paymentUrl: mockPaymentUrl,
        message: 'Lien de paiement créé (API Monético à configurer)',
        note: 'Cette fonction sera complétée avec les paramètres API Monético réels'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Error creating Monético payment:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erreur lors de la création du paiement'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
