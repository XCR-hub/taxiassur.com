import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const internalDomains = new Set(['taxiassur.com', 'taxiassur.fr', 'xcr.fr']);

async function isAuthorized(req: Request, supabaseUrl: string, serviceKey: string): Promise<boolean> {
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return false;
  if (token === serviceKey) return true;
  const admin = createClient(supabaseUrl, serviceKey);
  const { data, error } = await admin.auth.getUser(token);
  if (error) return false;
  const domain = (data.user?.email || '').toLowerCase().split('@')[1];
  return internalDomains.has(domain);
}
/**
 * Edge Function : Envoi du lien de paiement Monetico par email
 *
 * Workflow :
 * 1. Récupère les infos du lead et du paiement
 * 2. Génère le lien vers la page de paiement (frontend)
 * 3. Envoie l'email au prospect avec le lien via IONOS
 * 4. Crée une notification pour le commercial
 */

function escapeHtml(value: unknown): string {
  const entities: Record<string, string> = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  };
  return String(value ?? '').replace(/[&<>"']/g, (character) => entities[character]);
}
interface RequestBody {
  paymentId: string;
  accessToken?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ success: false, error: 'Service indisponible' }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let body: RequestBody;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ success: false, error: 'Corps JSON invalide' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const paymentId = typeof body.paymentId === 'string' ? body.paymentId.trim() : '';
    const staffAuthorized = await isAuthorized(req, supabaseUrl, supabaseServiceKey);
    const clientAccessToken = typeof body.accessToken === 'string' ? body.accessToken.trim() : '';
    const clientTokenCandidate = /^[0-9a-f]{64}$/i.test(clientAccessToken);

    if (!staffAuthorized && !clientTokenCandidate) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(paymentId)) {
      return new Response(
        JSON.stringify({ success: false, error: 'paymentId invalide' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer le paiement
    const { data: payment, error: paymentError } = await supabase
      .from('monetico_payments')
      .select('id, reference, amount, currency, status, description, lead_id')
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      console.error('Payment lookup failed');
      return new Response(
        JSON.stringify({ success: false, error: 'Paiement introuvable' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (payment.status !== 'pending' || payment.currency !== 'EUR' || !Number.isFinite(Number(payment.amount)) || Number(payment.amount) <= 0 || !payment.lead_id) {
      return new Response(JSON.stringify({ success: false, error: 'Paiement non envoyable' }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    // Récupérer le lead
    const { data: lead, error: leadError } = await supabase
      .from('crm_leads')
      .select('id, first_name, last_name, email, access_token')
      .eq('id', payment.lead_id)
      .single();

    if (leadError || !lead || typeof lead.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email) || lead.email.length > 254) {
      console.error('Payment recipient lookup failed');
      return new Response(
        JSON.stringify({ success: false, error: 'Lead ou email introuvable' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!staffAuthorized && clientAccessToken !== lead.access_token) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!lead.access_token || !/^[A-Za-z0-9_-]{20,200}$/.test(lead.access_token)) {
      return new Response(JSON.stringify({ success: false, error: 'Acces prospect indisponible' }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    // Générer le lien vers l'espace prospect
    const espaceProspectUrl = `https://taxiassur.com/espace-prospect?token=${encodeURIComponent(lead.access_token)}&tab=paiement`;

    const safeFirstName = escapeHtml(lead.first_name);
    const safeLastName = escapeHtml(lead.last_name);
    const safeAmount = escapeHtml(Number(payment.amount).toFixed(2));
    const safeReference = escapeHtml(payment.reference);
    const safeDescription = escapeHtml(payment.description || 'Paiement comptant assurance taxi');
    const recipientName = `${String(lead.first_name || '').replace(/[\r\n]/g, ' ').slice(0, 100)} ${String(lead.last_name || '').replace(/[\r\n]/g, ' ').slice(0, 100)}`.trim();
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
                Bonjour <strong>${safeFirstName} ${safeLastName}</strong>,
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
                          ${safeAmount} €
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #6b7280; font-size: 14px; padding: 8px 0;">Référence :</td>
                        <td align="right" style="color: #374151; font-size: 14px; font-weight: 600; font-family: monospace; padding: 8px 0;">
                          ${safeReference}
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #6b7280; font-size: 14px; padding: 8px 0;">Description :</td>
                        <td align="right" style="color: #374151; font-size: 14px; padding: 8px 0;">
                          ${safeDescription}
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

    const { data: claimedPayment, error: claimError } = await supabase
      .from('monetico_payments')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', paymentId)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle();
    if (claimError || !claimedPayment) {
      return new Response(JSON.stringify({ success: false, error: 'Lien deja envoye ou en cours' }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Envoyer l'email via IONOS
    let emailResponse: Response;
    try {
      emailResponse = await fetch(
      `${supabaseUrl}/functions/v1/send-email-ionos`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        signal: AbortSignal.timeout(30_000),
        body: JSON.stringify({
          to: lead.email,
          toName: recipientName,
          subject: `💳 Votre lien de paiement comptant - ${payment.amount}€`,
          htmlBody: emailHtml,
          fromEmail: 'contact@taxiassur.com',
          fromName: 'TaxiAssur',
        }),
      }
    );
    } catch {
      await supabase.from('monetico_payments').update({ status: 'delivery_uncertain', updated_at: new Date().toISOString() }).eq('id', paymentId).eq('status', 'processing');
      return new Response(JSON.stringify({ success: false, error: 'Statut d envoi incertain, vérification manuelle requise' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let relayResult: { success?: boolean } | null = null;
    try {
      relayResult = await emailResponse.json();
    } catch {
      // A malformed relay response is a failed delivery acknowledgement.
    }
    if (!emailResponse.ok || relayResult?.success !== true) {
      console.error('Payment email provider failed', emailResponse.status);
      const nextStatus = emailResponse.ok ? 'delivery_uncertain' : 'pending';
      await supabase.from('monetico_payments').update({ status: nextStatus, updated_at: new Date().toISOString() }).eq('id', paymentId).eq('status', 'processing');
      return new Response(JSON.stringify({ success: false, error: emailResponse.ok ? 'Statut d envoi incertain, vérification manuelle requise' : 'Echec envoi e-mail' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { error: sentError } = await supabase
      .from('monetico_payments')
      .update({ status: 'sent', updated_at: new Date().toISOString() })
      .eq('id', paymentId)
      .eq('status', 'processing');
    if (sentError) {
      console.error('Payment sent-status persistence failed', sentError.code || 'unknown');
      return new Response(JSON.stringify({ success: false, error: 'E-mail envoyé, audit non enregistré' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Créer une notification CRM
    const { error: notificationError } = await supabase.from('crm_event_notifications').insert({
      lead_id: lead.id,
      event_type: 'communication_sent',
      title: '💳 Lien de paiement envoyé',
      message: `Lien de paiement de ${payment.amount}€ envoyé à ${lead.email} (Réf: ${safeReference})`,
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
    if (notificationError) console.error('Payment CRM notification persistence failed');

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    console.error('Payment link email failed', error instanceof Error ? error.name : 'unknown');
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Erreur serveur',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
