import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

// ✅ MODE PRODUCTION - Identifiants vérifiés et corrects
// TPE: 7374133
// Société: taxiassur
// Clé MAC v3.0: Validée par Monético Manager
// Configuration vérifiée le: 11 février 2026

const MONETICO_CONFIG = {
  tpe: '7374133',
  societe: 'taxiassur',
  macKey: '106FA85BF342FD4EE95C883D82865B5CC1F63890',
  version: '3.0',
  langue: 'FR',
  urlServeur: 'https://p.monetico-services.com/paiement.cgi',  // ✅ PRODUCTION
  urlOK: 'https://taxiassur.com/espace-prospect/paiement-success',
  urlKO: 'https://taxiassur.com/espace-prospect/paiement-error',
};

async function calculateMAC(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(MONETICO_CONFIG.macKey);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));

  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function generateReference(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `TAX${timestamp}${random}`;
}

function formatMoneticoDate(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}:${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { leadId, amount, description } = await req.json();

    if (!leadId || !amount) {
      return new Response(
        JSON.stringify({ error: 'leadId et amount sont requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: lead, error: leadError } = await supabase
      .from('crm_leads')
      .select('email, first_name, last_name')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      return new Response(
        JSON.stringify({ error: 'Lead non trouvé' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const reference = generateReference();
    const dateTransaction = formatMoneticoDate(new Date());
    const montant = `${parseFloat(amount).toFixed(2)}EUR`;

    const texteLibre = description || `Paiement comptant assurance taxi - ${reference}`;
    const urlRetour = `${supabaseUrl}/functions/v1/monetico-webhook`;

    // Calcul du MAC selon la spec Monético v3.0
    // Format: version*TPE*date*montant*reference*texte-libre*version*lgue*societe*mail*
    const macString = [
      MONETICO_CONFIG.version,
      MONETICO_CONFIG.tpe,
      dateTransaction,
      montant,
      reference,
      texteLibre,
      MONETICO_CONFIG.version,
      MONETICO_CONFIG.langue,
      MONETICO_CONFIG.societe,
      lead.email || '',
      urlRetour,
      MONETICO_CONFIG.urlOK,
      MONETICO_CONFIG.urlKO,
    ].join('*');

    console.log('MAC String:', macString);
    const mac = await calculateMAC(macString);
    console.log('MAC calculé:', mac);

    const params: Record<string, string> = {
      version: MONETICO_CONFIG.version,
      TPE: MONETICO_CONFIG.tpe,
      date: dateTransaction,
      montant: montant,
      reference: reference,
      MAC: mac,
      url_retour: urlRetour,
      url_retour_ok: MONETICO_CONFIG.urlOK,
      url_retour_err: MONETICO_CONFIG.urlKO,
      lgue: MONETICO_CONFIG.langue,
      societe: MONETICO_CONFIG.societe,
      mail: lead.email || '',
      'texte-libre': texteLibre,
    };

    const { data: payment, error: paymentError } = await supabase
      .from('monetico_payments')
      .insert({
        lead_id: leadId,
        reference: reference,
        amount: parseFloat(amount),
        currency: 'EUR',
        status: 'pending',
        payment_url: MONETICO_CONFIG.urlServeur,
        return_url: params.url_retour,
        mac_sent: mac,
        customer_email: lead.email,
        customer_name: `${lead.first_name} ${lead.last_name}`,
        description: params['texte-libre'],
        monetico_data: params,
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Erreur création paiement:', paymentError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la création du paiement' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const formFields = Object.entries(params)
      .map(([key, value]) => `<input type="hidden" name="${key}" value="${value}">`)
      .join('\n');

    const htmlForm = `<!DOCTYPE html>
<html>
<head>
  <title>Redirection vers le paiement sécurisé</title>
  <meta charset="UTF-8">
</head>
<body>
  <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
    <h2>Redirection vers le paiement sécurisé Monetico...</h2>
    <p>Veuillez patienter quelques instants.</p>
  </div>
  <form id="monetico-form" method="POST" action="${MONETICO_CONFIG.urlServeur}">
    ${formFields}
  </form>
  <script>document.getElementById('monetico-form').submit();</script>
</body>
</html>`;

    return new Response(
      JSON.stringify({
        success: true,
        paymentId: payment.id,
        reference: reference,
        paymentUrl: MONETICO_CONFIG.urlServeur,
        formData: params,
        htmlForm: htmlForm,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Erreur:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
