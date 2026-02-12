import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

// 🧪 MODE TEST - Identifiants de test Monético officiels
// ⚠️ À REMPLACER par vos vrais identifiants de test fournis par Monético
// Documentation: https://www.monetico-paiement.fr/fr/info/documentations/Monetico_Paiement_documentation_technique_v2.0.pdf

const TEST_MODE = false; // ✅ MODE PRODUCTION ACTIVÉ

const MONETICO_CONFIG = TEST_MODE ? {
  // 🧪 PARAMÈTRES DE TEST
  // IMPORTANT: Remplacez ces valeurs par celles fournies dans votre espace test Monético
  tpe: '1234567',              // ⚠️ TPE de test fourni par Monético
  societe: 'CompanyTest',      // ⚠️ Société de test fournie par Monético
  macKey: 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',  // ⚠️ Clé MAC de test
  version: '3.0',
  langue: 'FR',
  urlServeur: 'https://p.monetico-services.com/test/paiement.cgi',  // ✅ URL TEST avec /test/
  urlOK: 'https://taxiassur.com/espace-prospect/paiement-success',
  urlKO: 'https://taxiassur.com/espace-prospect/paiement-error',
} : {
  // 🚀 PARAMÈTRES DE PRODUCTION (inchangés)
  tpe: '7374133',
  societe: 'taxiassur',
  macKey: '106FA85BF342FD4EE95C883D82865B5CC1F63890',
  version: '3.0',
  langue: 'FR',
  urlServeur: 'https://p.monetico-services.com/paiement.cgi',
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
  const prefix = TEST_MODE ? 'TEST' : 'TAX';
  return `${prefix}${timestamp}${random}`;
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
      .select('email, nom, prenom, telephone')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      return new Response(
        JSON.stringify({ error: 'Lead non trouvé' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const reference = generateReference();
    const dateTime = formatMoneticoDate(new Date());
    const montant = `${parseFloat(amount).toFixed(2)}EUR`;
    const email = lead.email || 'test@taxiassur.fr';
    const customerName = `${lead.prenom || ''} ${lead.nom || ''}`.trim() || 'Client';

    const texteLibre = JSON.stringify({
      leadId: leadId,
      description: description || 'Acompte assurance taxi',
      mode: TEST_MODE ? 'TEST' : 'PRODUCTION'
    });

    const macData = `${MONETICO_CONFIG.version}*${MONETICO_CONFIG.tpe}*${dateTime}*${montant}*${reference}*${texteLibre}*${MONETICO_CONFIG.version}*${MONETICO_CONFIG.langue}*${MONETICO_CONFIG.societe}*${email}**********`;

    console.log('MAC Data:', macData);
    const mac = await calculateMAC(macData);

    const { error: insertError } = await supabase
      .from('monetico_payments')
      .insert({
        reference,
        lead_id: leadId,
        amount: parseFloat(amount),
        currency: 'EUR',
        status: 'pending',
        customer_email: email,
        customer_name: customerName,
        payment_data: {
          texte_libre: texteLibre,
          date: dateTime,
          mode: TEST_MODE ? 'TEST' : 'PRODUCTION'
        }
      });

    if (insertError) {
      console.error('Erreur insertion:', insertError);
    }

    const formData = {
      version: MONETICO_CONFIG.version,
      TPE: MONETICO_CONFIG.tpe,
      date: dateTime,
      montant: montant,
      reference: reference,
      MAC: mac,
      url_retour: MONETICO_CONFIG.urlOK,
      url_retour_ok: MONETICO_CONFIG.urlOK,
      url_retour_err: MONETICO_CONFIG.urlKO,
      lgue: MONETICO_CONFIG.langue,
      societe: MONETICO_CONFIG.societe,
      texte_libre: texteLibre,
      mail: email,
      mode: TEST_MODE ? 'TEST' : 'PRODUCTION'
    };

    console.log('Mode:', TEST_MODE ? '🧪 TEST' : '🚀 PRODUCTION');
    console.log('URL:', MONETICO_CONFIG.urlServeur);
    console.log('TPE:', MONETICO_CONFIG.tpe);

    return new Response(
      JSON.stringify({
        success: true,
        reference,
        formData,
        actionUrl: MONETICO_CONFIG.urlServeur,
        mode: TEST_MODE ? 'TEST' : 'PRODUCTION'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Erreur:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: TEST_MODE ? 'Mode TEST - Vérifiez vos identifiants de test Monético' : 'Erreur serveur'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
