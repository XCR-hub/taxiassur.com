import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

const MONETICO_URL_SERVEUR = TEST_MODE
  ? 'https://p.monetico-services.com/test/paiement.cgi'
  : 'https://p.monetico-services.com/paiement.cgi';

const URL_OK = 'https://taxiassur.com/espace-prospect/paiement-success';
const URL_KO = 'https://taxiassur.com/espace-prospect/paiement-error';

async function calculateMAC(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hexKey = MONETICO_MAC_KEY;
  const keyBytes = new Uint8Array(hexKey.length / 2);
  for (let i = 0; i < hexKey.length; i += 2) {
    keyBytes[i / 2] = parseInt(hexKey.substr(i, 2), 16);
  }
  const key = await crypto.subtle.importKey(
    'raw', keyBytes, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { reference } = await req.json();

    if (!reference) {
      return new Response(
        JSON.stringify({ success: false, error: 'reference est requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: payment, error: dbError } = await supabase
      .from('monetico_payments')
      .select('*')
      .eq('reference', reference)
      .maybeSingle();

    if (dbError || !payment) {
      return new Response(
        JSON.stringify({ success: false, error: 'Paiement introuvable' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (payment.status === 'paid') {
      return new Response(
        JSON.stringify({ success: false, error: 'Ce paiement a deja ete effectue', status: 'paid' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (payment.status === 'cancelled') {
      return new Response(
        JSON.stringify({ success: false, error: 'Ce paiement a ete annule', status: 'cancelled' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const email = payment.customer_email || 'client@taxiassur.fr';
    const customerParts = (payment.customer_name || 'Client TaxiAssur').split(' ');
    const firstName = customerParts[0] || 'Client';
    const lastName = customerParts.slice(1).join(' ') || 'TaxiAssur';

    const dateTime = formatMoneticoDate(new Date());
    const montant = `${parseFloat(payment.amount).toFixed(2)}EUR`;
    const texteLibre = payment.lead_id
      ? `lead_${payment.lead_id}_${TEST_MODE ? 'TEST' : 'PROD'}`
      : `free_invoice_${TEST_MODE ? 'TEST' : 'PROD'}`;

    const contexteCommande = btoa(JSON.stringify({
      billing: {
        firstName,
        lastName,
        addressLine1: '1 rue de l\'assurance',
        city: 'Paris',
        postalCode: '75000',
        country: 'FR'
      }
    }));

    const macData = `TPE=${MONETICO_TPE}*contexte_commande=${contexteCommande}*date=${dateTime}*lgue=FR*mail=${email}*montant=${montant}*reference=${reference}*societe=${MONETICO_SOCIETE}*texte-libre=${texteLibre}*url_retour_err=${URL_KO}*url_retour_ok=${URL_OK}*version=3.0`;

    const mac = await calculateMAC(macData);

    await supabase
      .from('monetico_payments')
      .update({ mac_sent: mac, status: 'sent', updated_at: new Date().toISOString() })
      .eq('reference', reference);

    return new Response(
      JSON.stringify({
        success: true,
        formData: {
          action: MONETICO_URL_SERVEUR,
          fields: {
            version: '3.0',
            TPE: MONETICO_TPE,
            date: dateTime,
            montant,
            reference,
            MAC: mac,
            url_retour_ok: URL_OK,
            url_retour_err: URL_KO,
            lgue: 'FR',
            societe: MONETICO_SOCIETE,
            contexte_commande: contexteCommande,
            'texte-libre': texteLibre,
            mail: email,
          }
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Erreur get-monetico-payment-form:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Erreur interne' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
