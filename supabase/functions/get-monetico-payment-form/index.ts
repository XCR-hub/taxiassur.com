import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const TEST_MODE = (Deno.env.get('MONETICO_MODE') || 'test') === 'test';

const MONETICO_TPE = TEST_MODE
  ? Deno.env.get('MONETICO_TEST_TPE') || '7374133'
  : Deno.env.get('MONETICO_TPE') || '7374133';

const MONETICO_SOCIETE = TEST_MODE
  ? Deno.env.get('MONETICO_TEST_SOCIETE') || 'taxiassur'
  : Deno.env.get('MONETICO_SOCIETE') || 'taxiassur';

const MONETICO_MAC_KEY = TEST_MODE
  ? Deno.env.get('MONETICO_TEST_MAC_KEY') || '106FA85BF342FD4EE95C883D82865B5CC1F63890'
  : Deno.env.get('MONETICO_MAC_KEY') || '106FA85BF342FD4EE95C883D82865B5CC1F63890';

const MONETICO_CONFIG = {
  tpe: MONETICO_TPE,
  societe: MONETICO_SOCIETE,
  macKey: MONETICO_MAC_KEY,
  version: '3.0',
  langue: 'FR',
  urlServeur: TEST_MODE
    ? 'https://p.monetico-services.com/test/paiement.cgi'
    : 'https://p.monetico-services.com/paiement.cgi',
  urlOK: 'https://taxiassur.com/espace-prospect/paiement-success',
  urlKO: 'https://taxiassur.com/espace-prospect/paiement-error',
};

async function calculateMAC(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hexKey = MONETICO_CONFIG.macKey;
  const keyBytes = new Uint8Array(hexKey.length / 2);

  for (let i = 0; i < hexKey.length; i += 2) {
    keyBytes[i / 2] = parseInt(hexKey.substr(i, 2), 16);
  }

  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));

  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
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
    const url = new URL(req.url);
    const paymentId = url.searchParams.get('payment_id');
    const token = url.searchParams.get('token');

    if (!paymentId || !token) {
      return new Response('payment_id et token requis', { status: 400 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: payment, error: paymentError } = await supabase
      .from('monetico_payments')
      .select('*')
      .eq('id', paymentId)
      .maybeSingle();

    if (paymentError || !payment) {
      return new Response('Paiement introuvable', { status: 404 });
    }

    const { data: lead, error: leadError } = await supabase
      .from('crm_leads')
      .select('id, first_name, last_name, email, access_token')
      .eq('id', payment.lead_id)
      .eq('access_token', token)
      .maybeSingle();

    if (leadError || !lead) {
      return new Response('Accès non autorisé', { status: 403 });
    }

    const dateTime = formatMoneticoDate(new Date());
    const montant = `${parseFloat(payment.amount).toFixed(2)}EUR`;
    const reference = payment.reference;
    const email = lead.email;

    const texteLibreSimple = `lead_${payment.lead_id}_${TEST_MODE ? 'TEST' : 'PROD'}`;

    const contexteCommande = btoa(JSON.stringify({
      billing: {
        firstName: lead.first_name,
        lastName: lead.last_name,
        addressLine1: '1 rue de l\'assurance',
        city: 'Paris',
        postalCode: '75000',
        country: 'FR'
      }
    }));

    const macData = `TPE=${MONETICO_CONFIG.tpe}*contexte_commande=${contexteCommande}*date=${dateTime}*lgue=${MONETICO_CONFIG.langue}*mail=${email}*montant=${montant}*reference=${reference}*societe=${MONETICO_CONFIG.societe}*texte-libre=${texteLibreSimple}*url_retour_err=${MONETICO_CONFIG.urlKO}*url_retour_ok=${MONETICO_CONFIG.urlOK}*version=${MONETICO_CONFIG.version}`;

    const mac = await calculateMAC(macData);

    const formData = {
      version: MONETICO_CONFIG.version,
      TPE: MONETICO_CONFIG.tpe,
      date: dateTime,
      montant: montant,
      reference: reference,
      MAC: mac,
      url_retour_ok: MONETICO_CONFIG.urlOK,
      url_retour_err: MONETICO_CONFIG.urlKO,
      lgue: MONETICO_CONFIG.langue,
      societe: MONETICO_CONFIG.societe,
      contexte_commande: contexteCommande,
      'texte-libre': texteLibreSimple,
      mail: email
    };

    const htmlForm = `<!DOCTYPE html>
<html>
<head>
  <title>Redirection vers Monetico...</title>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      margin: 0;
      padding: 20px;
    }
    .container {
      background: white;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      text-align: center;
      max-width: 500px;
    }
    .logo { font-size: 32px; font-weight: bold; color: #667eea; margin-bottom: 20px; }
    h1 { color: #1a202c; margin: 0 0 10px 0; font-size: 24px; }
    .amount { font-size: 48px; font-weight: bold; color: #667eea; margin: 20px 0; }
    .info { color: #4a5568; margin: 10px 0; font-size: 14px; }
    .spinner {
      width: 50px; height: 50px;
      border: 4px solid #f3f4f6;
      border-top-color: #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 30px auto;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .secure-badge {
      display: inline-flex; align-items: center; gap: 8px;
      background: #f0fdf4; color: #166534;
      padding: 8px 16px; border-radius: 20px;
      font-size: 13px; font-weight: 600; margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">🚕 TaxiAssur</div>
    <h1>Paiement sécurisé</h1>
    <div class="amount">${parseFloat(payment.amount).toFixed(2)} €</div>
    <p class="info">${payment.description || 'Paiement comptant assurance taxi'}</p>
    <p class="info" style="font-size: 12px; color: #718096;">Référence: ${reference}</p>
    <div class="spinner"></div>
    <p class="info">Redirection vers la plateforme de paiement sécurisée...</p>
    <div class="secure-badge">🔒 Paiement sécurisé par Monético</div>
    <form id="monetico-form" method="POST" action="${MONETICO_CONFIG.urlServeur}">
      <input type="hidden" name="version" value="${formData.version}" />
      <input type="hidden" name="TPE" value="${formData.TPE}" />
      <input type="hidden" name="date" value="${formData.date}" />
      <input type="hidden" name="montant" value="${formData.montant}" />
      <input type="hidden" name="reference" value="${formData.reference}" />
      <input type="hidden" name="MAC" value="${formData.MAC}" />
      <input type="hidden" name="url_retour_ok" value="${formData.url_retour_ok}" />
      <input type="hidden" name="url_retour_err" value="${formData.url_retour_err}" />
      <input type="hidden" name="lgue" value="${formData.lgue}" />
      <input type="hidden" name="societe" value="${formData.societe}" />
      <input type="hidden" name="contexte_commande" value="${formData.contexte_commande}" />
      <input type="hidden" name="texte-libre" value="${formData['texte-libre']}" />
      <input type="hidden" name="mail" value="${formData.mail}" />
    </form>
    <script>
      setTimeout(() => {
        document.getElementById('monetico-form').submit();
      }, 1500);
    </script>
  </div>
</body>
</html>`;

    return new Response(htmlForm, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      }
    });

  } catch (error) {
    console.error('Erreur:', error);
    return new Response(
      `Erreur: ${error.message}`,
      { status: 500, headers: corsHeaders }
    );
  }
});
