import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const MONETICO_MODE = (Deno.env.get('MONETICO_MODE') || '').trim().toLowerCase();
const TEST_MODE = MONETICO_MODE === 'test';

const MONETICO_TPE = TEST_MODE
  ? Deno.env.get('MONETICO_TEST_TPE') || ''
  : Deno.env.get('MONETICO_TPE') || '';

const MONETICO_SOCIETE = TEST_MODE
  ? Deno.env.get('MONETICO_TEST_SOCIETE') || ''
  : Deno.env.get('MONETICO_SOCIETE') || '';

const MONETICO_MAC_KEY = TEST_MODE
  ? Deno.env.get('MONETICO_TEST_MAC_KEY') || ''
  : Deno.env.get('MONETICO_MAC_KEY') || '';
const MONETICO_OPERATIONAL_KEY = MONETICO_MAC_KEY.length % 2 === 1 ? '0' + MONETICO_MAC_KEY : MONETICO_MAC_KEY;

const MONETICO_URL_SERVEUR = TEST_MODE
  ? 'https://p.monetico-services.com/test/paiement.cgi'
  : 'https://p.monetico-services.com/paiement.cgi';

const URL_OK = 'https://taxiassur.com/espace-prospect/paiement-success';
const URL_KO = 'https://taxiassur.com/espace-prospect/paiement-error';

async function calculateMAC(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hexKey = MONETICO_OPERATIONAL_KEY;
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
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    if (!['test', 'production'].includes(MONETICO_MODE) || !MONETICO_TPE || !MONETICO_SOCIETE || (MONETICO_OPERATIONAL_KEY.length < 32 || MONETICO_OPERATIONAL_KEY.length > 256 || MONETICO_OPERATIONAL_KEY.length % 2 !== 0 || !/^[0-9A-F]+$/i.test(MONETICO_OPERATIONAL_KEY))) {
      return new Response(JSON.stringify({ success: false, error: 'Paiement temporairement indisponible' }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ success: false, error: 'Service indisponible' }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    let payload: Record<string, unknown>;
    try { payload = await req.json(); } catch {
      return new Response(JSON.stringify({ success: false, error: 'JSON invalide' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const reference = typeof payload.reference === 'string' ? payload.reference.trim() : '';
    const accessToken = typeof payload.accessToken === 'string' ? payload.accessToken.trim().toLowerCase() : '';

    if (typeof reference !== 'string' || !/^[A-Za-z0-9_-]{8,50}$/.test(reference)) {
      return new Response(
        JSON.stringify({ success: false, error: 'reference invalide' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: payment, error: dbError } = await supabase
      .from('monetico_payments')
      .select('*, crm_leads(access_token)')
      .eq('reference', reference)
      .maybeSingle();

    if (dbError || !payment) {
      return new Response(
        JSON.stringify({ success: false, error: 'Paiement introuvable' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const leadAccessToken = payment.crm_leads?.access_token || '';
    if (!/^[0-9a-f]{64}$/.test(accessToken) || (
      payment.payment_access_token !== accessToken && leadAccessToken !== accessToken
    )) {
      return new Response(JSON.stringify({ success: false, error: 'Acces paiement invalide' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (payment.status === 'paid' || payment.status === 'success') {
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

    const numericAmount = Number(payment.amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > 999999.99 || payment.currency !== 'EUR') {
      return new Response(JSON.stringify({ success: false, error: 'Montant de paiement invalide' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const email = typeof payment.customer_email === 'string' ? payment.customer_email.trim().toLowerCase() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ success: false, error: 'Email de paiement invalide' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const customerParts = (payment.customer_name || 'Client TaxiAssur').split(' ');
    const firstName = customerParts[0] || 'Client';
    const lastName = customerParts.slice(1).join(' ') || 'TaxiAssur';

    const dateTime = formatMoneticoDate(new Date());
    const montant = `${numericAmount.toFixed(2)}EUR`;
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

    const { error: updateError } = await supabase
      .from('monetico_payments')
      .update({ mac_sent: mac, status: 'sent', updated_at: new Date().toISOString() })
      .eq('reference', reference)
      .in('status', ['pending', 'sent']);
    if (updateError) {
      console.error('Monetico payment form persistence failed', updateError.code || 'unknown');
      return new Response(JSON.stringify({ success: false, error: 'Paiement temporairement indisponible' }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
  } catch (err: unknown) {
    console.error('Monetico payment form failure', err instanceof Error ? err.name : 'unknown');
    return new Response(
      JSON.stringify({ success: false, error: 'Erreur serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
