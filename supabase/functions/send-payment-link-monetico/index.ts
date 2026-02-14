import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { createHmac } from 'node:crypto';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

/**
 * Edge Function : Génération du lien Monetico et envoi de l'email
 *
 * Workflow :
 * 1. Récupère les infos du lead et du paiement
 * 2. Génère le formulaire Monetico avec signature HMAC
 * 3. Envoie l'email au prospect avec le lien
 * 4. Marque le paiement comme "envoyé"
 * 5. Crée une notification pour le commercial
 */

interface PaymentData {
  payment_id: string;
  lead_id: string;
  amount: number;
  reference: string;
  description?: string;
}

function generateMoneticoMAC(params: Record<string, string>, key: string): string {
  // Ordre des champs pour la signature Monetico
  const orderedFields = [
    'TPE',
    'date',
    'montant',
    'reference',
    'texte-libre',
    'version',
    'lgue',
    'societe',
    'mail',
    'nbrech',
    'dateech1',
    'montantech1',
  ];

  // Construire la chaîne à signer
  let dataToSign = '';
  orderedFields.forEach(field => {
    if (params[field] !== undefined) {
      dataToSign += params[field] + '*';
    }
  });

  // Ajouter la clé
  dataToSign += key;

  // Générer le HMAC SHA1
  const hmac = createHmac('sha1', key);
  hmac.update(dataToSign);
  return hmac.digest('hex');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const brevoApiKey = Deno.env.get('BREVO_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { payment_id }: { payment_id: string } = await req.json();

    if (!payment_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'payment_id requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer le paiement et le lead
    const { data: payment, error: paymentError } = await supabase
      .from('monetico_payments')
      .select(`
        id,
        lead_id,
        amount,
        payment_reference,
        description,
        crm_leads (
          id,
          first_name,
          last_name,
          email,
          access_token
        )
      `)
      .eq('id', payment_id)
      .single();

    if (paymentError || !payment) {
      console.error('Payment not found:', paymentError);
      return new Response(
        JSON.stringify({ success: false, error: 'Paiement introuvable' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lead = payment.crm_leads;
    if (!lead || !lead.email) {
      return new Response(
        JSON.stringify({ success: false, error: 'Lead ou email introuvable' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Configuration Monetico (MODE TEST)
    const moneticoConfig = {
      TPE: Deno.env.get('MONETICO_TPE') || '1234567',
      societe: Deno.env.get('MONETICO_SOCIETE') || 'taxiassur',
      cle: Deno.env.get('MONETICO_KEY') || 'test_key',
      url: 'https://p.monetico-services.com/test/paiement.cgi',
      version: '3.0',
      lgue: 'FR',
    };

    // Paramètres du paiement
    const date = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
    const montant = `${payment.amount.toFixed(2)}EUR`;

    const moneticoParams: Record<string, string> = {
      TPE: moneticoConfig.TPE,
      date: date,
      montant: montant,
      reference: payment.payment_reference,
      'texte-libre': payment.description || 'Paiement assurance taxi',
      version: moneticoConfig.version,
      lgue: moneticoConfig.lgue,
      societe: moneticoConfig.societe,
      mail: lead.email,
      // URLs de retour
      'url_retour': `${supabaseUrl.replace('/rest/v1', '')}/functions/v1/monetico-webhook`,
      'url_retour_ok': `https://taxiassur.com/paiement/success?ref=${payment.payment_reference}`,
      'url_retour_err': `https://taxiassur.com/paiement/error?ref=${payment.payment_reference}`,
    };

    // Générer la signature MAC
    const MAC = generateMoneticoMAC(moneticoParams, moneticoConfig.cle);

    // Construire l'URL du formulaire
    const formParams = new URLSearchParams({
      ...moneticoParams,
      MAC,
    });

    const paymentUrl = `${moneticoConfig.url}?${formParams.toString()}`;

    // Mettre à jour l'URL de paiement
    await supabase
      .from('monetico_payments')
      .update({ payment_url: paymentUrl })
      .eq('id', payment_id);

    // Préparer l'email
    const espaceProspectUrl = `https://taxiassur.com/espace-prospect/${lead.access_token}?tab=paiement`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .amount { font-size: 32px; font-weight: bold; color: #f97316; margin: 20px 0; }
          .button { display: inline-block; background: #f97316; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
          .button:hover { background: #ea580c; }
          .info-box { background: white; padding: 20px; border-left: 4px solid #f97316; margin: 20px 0; }
          .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔒 Lien de paiement sécurisé</h1>
            <p>Finalisez votre souscription</p>
          </div>
          <div class="content">
            <p>Bonjour ${lead.first_name} ${lead.last_name},</p>

            <p>Votre dossier d'assurance est prêt ! Pour finaliser votre souscription, merci de procéder au paiement comptant.</p>

            <div class="info-box">
              <strong>Montant à régler :</strong>
              <div class="amount">${payment.amount.toFixed(2)} €</div>
              <p><strong>Référence :</strong> ${payment.payment_reference}</p>
              <p><strong>Description :</strong> ${payment.description || 'Paiement comptant assurance taxi'}</p>
            </div>

            <div style="text-align: center;">
              <a href="${paymentUrl}" class="button">
                💳 Payer maintenant
              </a>
            </div>

            <p style="margin-top: 30px;">
              <strong>💡 Vous pouvez également :</strong>
            </p>
            <ul>
              <li>Accéder à votre <a href="${espaceProspectUrl}">espace prospect</a></li>
              <li>Voir tous vos documents</li>
              <li>Suivre l'avancement de votre dossier</li>
            </ul>

            <div class="info-box" style="background: #fef3c7; border-left-color: #f59e0b;">
              <strong>🔒 Paiement 100% sécurisé</strong>
              <p>Vos données bancaires sont protégées par Monetico Paiement (CIC), certifié PCI-DSS niveau 1.</p>
            </div>

            <p>Si vous avez des questions, notre équipe reste à votre disposition :</p>
            <ul>
              <li>📞 Téléphone : 01 80 85 57 88</li>
              <li>📧 Email : team@taxiassur.com</li>
            </ul>

            <p>À très bientôt,<br>
            <strong>L'équipe TaxiAssur</strong></p>
          </div>
          <div class="footer">
            <p>TaxiAssur - Assurance professionnelle pour taxis et VTC</p>
            <p>Ce lien de paiement expire dans 7 jours</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Envoyer l'email via Brevo
    if (brevoApiKey) {
      try {
        const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'api-key': brevoApiKey,
          },
          body: JSON.stringify({
            sender: {
              name: 'TaxiAssur',
              email: 'noreply@taxiassur.com'
            },
            to: [{
              email: lead.email,
              name: `${lead.first_name} ${lead.last_name}`
            }],
            subject: `🔒 Votre lien de paiement sécurisé - ${payment.amount.toFixed(2)}€`,
            htmlContent: emailHtml,
            tags: ['payment', 'monetico'],
          }),
        });

        if (!brevoResponse.ok) {
          const errorText = await brevoResponse.text();
          console.error('Brevo error:', errorText);
          throw new Error(`Erreur envoi email: ${brevoResponse.status}`);
        }

        // Marquer le paiement comme envoyé
        await supabase
          .rpc('mark_payment_as_sent', { p_payment_id: payment_id });

        console.log('Email sent successfully to:', lead.email);

      } catch (emailError) {
        console.error('Error sending email:', emailError);

        // Enregistrer l'erreur mais ne pas bloquer
        await supabase
          .from('monetico_payments')
          .update({
            email_error: emailError.message
          })
          .eq('id', payment_id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment_url: paymentUrl,
        email_sent: !!brevoApiKey,
        message: 'Lien de paiement généré et email envoyé'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-payment-link-monetico:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erreur serveur'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
