import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

// 🔐 Configuration Monético depuis les secrets Supabase
// Les identifiants sensibles sont stockés dans les secrets de l'Edge Function
// Dashboard Supabase → Edge Functions → Secrets

// 🧪 MODE TEST ACTIVÉ - TPE encore en test chez Ingineco
const TEST_MODE = (Deno.env.get('MONETICO_MODE') || 'test') === 'test';

// Récupération des identifiants depuis les secrets Supabase
// ⚠️ IMPORTANT: Demandez vos vrais identifiants de TEST à Ingineco
// Ces valeurs par défaut sont des exemples et ne fonctionneront pas
const MONETICO_TPE = TEST_MODE
  ? Deno.env.get('MONETICO_TEST_TPE') || '7374133'  // Votre TPE de test Ingineco
  : Deno.env.get('MONETICO_TPE') || '7374133';

const MONETICO_SOCIETE = TEST_MODE
  ? Deno.env.get('MONETICO_TEST_SOCIETE') || 'taxiassur'  // Votre code société test
  : Deno.env.get('MONETICO_SOCIETE') || 'taxiassur';

const MONETICO_MAC_KEY = TEST_MODE
  ? Deno.env.get('MONETICO_TEST_MAC_KEY') || '106FA85BF342FD4EE95C883D82865B5CC1F63890'  // Votre clé MAC de test
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

    console.log('📦 Données reçues:', { leadId, amount, description });

    if (!leadId || !amount) {
      return new Response(
        JSON.stringify({ error: 'leadId et amount sont requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔍 Recherche du lead:', leadId);

    const { data: lead, error: leadError } = await supabase
      .from('crm_leads')
      .select('email, first_name, last_name, phone')
      .eq('id', leadId)
      .single();

    console.log('📊 Résultat:', { lead, leadError });

    if (leadError) {
      console.error('❌ Erreur DB:', leadError);
      return new Response(
        JSON.stringify({
          error: 'Lead non trouvé',
          details: leadError.message,
          leadId: leadId
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!lead) {
      console.error('❌ Lead null');
      return new Response(
        JSON.stringify({
          error: 'Lead non trouvé (null)',
          leadId: leadId
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const reference = generateReference();
    const dateTime = formatMoneticoDate(new Date());
    const montant = `${parseFloat(amount).toFixed(2)}EUR`;
    const email = lead.email || 'test@taxiassur.fr';
    const customerName = `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Client';

    const texteLibre = JSON.stringify({
      leadId: leadId,
      description: description || 'Acompte assurance taxi',
      mode: TEST_MODE ? 'TEST' : 'PRODUCTION'
    });

    // Format MAC Version 3.0 Monético :
    // TPE*date*montant*reference*texte-libre*version*lgue*societe*mail*nbrech*dateech1*montantech1*dateech2*montantech2*dateech3*montantech3*dateech4*montantech4
    const macData = [
      MONETICO_CONFIG.tpe,
      dateTime,
      montant,
      reference,
      texteLibre,
      MONETICO_CONFIG.version,
      MONETICO_CONFIG.langue,
      MONETICO_CONFIG.societe,
      email,
      '', // nbrech (nombre d'échéances, vide si paiement comptant)
      '', // dateech1
      '', // montantech1
      '', // dateech2
      '', // montantech2
      '', // dateech3
      '', // montantech3
      '', // dateech4
      '', // montantech4
    ].join('*');

    console.log('🔐 MAC Data:', macData);
    const mac = await calculateMAC(macData);
    console.log('🔐 MAC calculé:', mac.substring(0, 10) + '...');

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
        description: description || 'Acompte assurance taxi',
        monetico_data: {
          texte_libre: texteLibre,
          date: dateTime,
          mode: TEST_MODE ? 'TEST' : 'PRODUCTION',
          mac: mac
        },
        mac_sent: mac
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

    // Générer le formulaire HTML pour Monetico
    const htmlForm = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Paiement sécurisé - TaxiAssur</title>
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
          .logo {
            font-size: 32px;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 20px;
          }
          h1 {
            color: #1a202c;
            margin: 0 0 10px 0;
            font-size: 24px;
          }
          .amount {
            font-size: 48px;
            font-weight: bold;
            color: #667eea;
            margin: 20px 0;
          }
          .info {
            color: #4a5568;
            margin: 10px 0;
            font-size: 14px;
          }
          .spinner {
            width: 50px;
            height: 50px;
            border: 4px solid #f3f4f6;
            border-top-color: #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 30px auto;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .secure-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: #f0fdf4;
            color: #166534;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 600;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">🚕 TaxiAssur</div>
          <h1>Paiement sécurisé</h1>
          <div class="amount">${parseFloat(amount).toFixed(2)} €</div>
          <p class="info">Paiement comptant pour votre assurance taxi</p>
          <p class="info" style="font-size: 12px; color: #718096;">Référence: ${reference}</p>
          <div class="spinner"></div>
          <p class="info">Redirection vers la plateforme de paiement sécurisée...</p>
          <div class="secure-badge">
            🔒 Paiement sécurisé par Monético
          </div>
          <form id="monetico-form" method="POST" action="${MONETICO_CONFIG.urlServeur}">
            <input type="hidden" name="version" value="${formData.version}" />
            <input type="hidden" name="TPE" value="${formData.TPE}" />
            <input type="hidden" name="date" value="${formData.date}" />
            <input type="hidden" name="montant" value="${formData.montant}" />
            <input type="hidden" name="reference" value="${formData.reference}" />
            <input type="hidden" name="MAC" value="${formData.MAC}" />
            <input type="hidden" name="url_retour" value="${formData.url_retour}" />
            <input type="hidden" name="url_retour_ok" value="${formData.url_retour_ok}" />
            <input type="hidden" name="url_retour_err" value="${formData.url_retour_err}" />
            <input type="hidden" name="lgue" value="${formData.lgue}" />
            <input type="hidden" name="societe" value="${formData.societe}" />
            <input type="hidden" name="texte-libre" value="${formData.texte_libre}" />
            <input type="hidden" name="mail" value="${formData.mail}" />
          </form>
          <script>
            setTimeout(() => {
              document.getElementById('monetico-form').submit();
            }, 2000);
          </script>
        </div>
      </body>
      </html>
    `;

    return new Response(
      JSON.stringify({
        success: true,
        reference,
        htmlForm,
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
