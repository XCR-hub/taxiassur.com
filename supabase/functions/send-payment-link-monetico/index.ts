import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

/**
 * Edge Function : Envoi du lien de paiement Monetico par email
 *
 * Workflow :
 * 1. Récupère les infos du lead et du paiement
 * 2. Génère le lien vers la page de paiement (frontend)
 * 3. Envoie l'email au prospect avec le lien via IONOS
 * 4. Crée une notification pour le commercial
 */

interface RequestBody {
  paymentId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { paymentId }: RequestBody = await req.json();

    if (!paymentId) {
      return new Response(
        JSON.stringify({ success: false, error: 'paymentId requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer le paiement
    const { data: payment, error: paymentError } = await supabase
      .from('monetico_payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      console.error('Payment not found:', paymentError);
      return new Response(
        JSON.stringify({ success: false, error: 'Paiement introuvable' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer le lead
    const { data: lead, error: leadError } = await supabase
      .from('crm_leads')
      .select('id, first_name, last_name, email, access_token')
      .eq('id', payment.lead_id)
      .single();

    if (leadError || !lead || !lead.email) {
      console.error('Lead not found:', leadError);
      return new Response(
        JSON.stringify({ success: false, error: 'Lead ou email introuvable' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Générer le lien vers l'espace prospect
    const espaceProspectUrl = `https://taxiassur.com/espace-prospect/${lead.access_token}?tab=paiement`;

    // Template email HTML professionnel
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lien de paiement comptant</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
                💳 Paiement Comptant
              </h1>
              <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">
                TaxiAssur - Assurance Professionnelle
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #111827; font-size: 18px; margin: 0 0 20px 0;">
                Bonjour <strong>${lead.first_name} ${lead.last_name}</strong>,
              </p>

              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Votre lien de paiement sécurisé est prêt. Vous pouvez maintenant effectuer votre paiement comptant de manière rapide et sécurisée via notre plateforme Monetico CIC.
              </p>

              <!-- Payment Details Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border: 2px solid #e5e7eb; border-radius: 8px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="8" cellspacing="0">
                      <tr>
                        <td style="color: #6b7280; font-size: 14px; padding: 8px 0;">Montant à payer :</td>
                        <td align="right" style="color: #111827; font-size: 20px; font-weight: bold; padding: 8px 0;">
                          ${payment.amount} €
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #6b7280; font-size: 14px; padding: 8px 0;">Référence :</td>
                        <td align="right" style="color: #374151; font-size: 14px; font-weight: 600; font-family: monospace; padding: 8px 0;">
                          ${payment.reference}
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #6b7280; font-size: 14px; padding: 8px 0;">Description :</td>
                        <td align="right" style="color: #374151; font-size: 14px; padding: 8px 0;">
                          ${payment.description || 'Paiement comptant assurance taxi'}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${espaceProspectUrl}"
                       style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);">
                      🔒 Accéder au paiement
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #6b7280; font-size: 14px; text-align: center; margin: 20px 0;">
                Ce lien vous donne accès à votre espace personnel où vous pourrez effectuer le paiement en toute sécurité.
              </p>

              <!-- Security Info -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; margin: 30px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="color: #92400e; font-size: 14px; font-weight: 600; margin: 0 0 10px 0;">
                      🔒 Paiement 100% Sécurisé
                    </p>
                    <p style="color: #78350f; font-size: 13px; line-height: 1.5; margin: 0;">
                      Vos données bancaires sont protégées par Monetico Paiement (CIC), certifié PCI-DSS niveau 1. Technologie 3D Secure activée.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                Si vous avez des questions, notre équipe reste à votre disposition :<br>
                📞 <strong>01 80 85 57 81</strong><br>
                📧 <a href="mailto:contact@taxiassur.com" style="color: #2563eb; text-decoration: none;">contact@taxiassur.com</a>
              </p>

              <p style="color: #111827; font-size: 14px; margin: 20px 0 0 0;">
                Cordialement,<br>
                <strong>L'équipe TaxiAssur</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} TaxiAssur - Tous droits réservés<br>
                Courtier en assurance professionnelle pour taxis et VTC
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // Envoyer l'email via IONOS
    const emailResponse = await fetch(
      `${supabaseUrl}/functions/v1/send-email-ionos`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          to: lead.email,
          toName: `${lead.first_name} ${lead.last_name}`,
          subject: `💳 Votre lien de paiement comptant - ${payment.amount}€`,
          htmlBody: emailHtml,
          fromEmail: 'contact@taxiassur.com',
          fromName: 'TaxiAssur',
        }),
      }
    );

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('Erreur envoi email:', errorText);
      throw new Error('Erreur lors de l\'envoi de l\'email');
    }

    // Créer une notification CRM
    await supabase.from('crm_event_notifications').insert({
      lead_id: lead.id,
      event_type: 'communication_sent',
      title: '💳 Lien de paiement envoyé',
      message: `Lien de paiement de ${payment.amount}€ envoyé à ${lead.email} (Réf: ${payment.reference})`,
      priority: 1,
      action_url: `/backoffice/crm-killer/${lead.id}`,
      context_data: {
        payment_id: paymentId,
        reference: payment.reference,
        amount: payment.amount,
        email: lead.email,
        sent_at: new Date().toISOString(),
      },
    });

    console.log('✅ Email envoyé avec succès à:', lead.email);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email envoyé avec succès',
        email: lead.email,
        amount: payment.amount,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('❌ Erreur:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erreur inconnue',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
