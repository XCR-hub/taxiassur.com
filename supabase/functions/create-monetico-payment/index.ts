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

  // Convertir la clé hexadécimale en bytes (CRUCIAL pour Monético!)
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
    .toUpperCase(); // Monético utilise uppercase
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

    const {
      leadId,
      amount,
      description,
      customerEmail,
      customerFirstName,
      customerLastName,
      customerPhone,
      customReference,
      send_email // ✅ Paramètre pour envoyer automatiquement l'email
    } = await req.json();

    console.log('📦 Données reçues:', { leadId, amount, description, customerEmail });

    if (!amount) {
      return new Response(
        JSON.stringify({ error: 'amount est requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Variables pour stocker les infos client
    let lead: any = null;
    let email: string;
    let firstName: string;
    let lastName: string;
    let phone: string | null;

    if (leadId) {
      // Mode avec lead existant
      console.log('🔍 Recherche du lead:', leadId);

      const { data: leadData, error: leadError } = await supabase
        .from('crm_leads')
        .select('email, first_name, last_name, phone')
        .eq('id', leadId)
        .maybeSingle();

      console.log('📊 Résultat:', { lead: leadData, leadError });

      if (leadError) {
        console.error('❌ Erreur DB:', leadError);
        return new Response(
          JSON.stringify({
            error: 'Erreur lors de la recherche du lead',
            details: leadError.message,
            leadId: leadId
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!leadData) {
        console.error('❌ Lead introuvable avec ID:', leadId);
        return new Response(
          JSON.stringify({
            error: 'Lead introuvable',
            message: `Aucun lead trouvé avec l'ID: ${leadId}. Vérifiez que le lead existe dans la base de données.`,
            leadId: leadId
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      lead = leadData;
      email = lead.email || 'test@taxiassur.fr';
      firstName = lead.first_name || 'Client';
      lastName = lead.last_name || 'TaxiAssur';
      phone = lead.phone || null;
    } else {
      // Mode facturation libre (sans lead)
      console.log('💳 Mode facturation libre');

      if (!customerEmail || !customerFirstName || !customerLastName) {
        return new Response(
          JSON.stringify({
            error: 'Pour une facturation libre, email, firstName et lastName sont requis'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      email = customerEmail;
      firstName = customerFirstName;
      lastName = customerLastName;
      phone = customerPhone || null;
    }

    const reference = customReference || generateReference();
    const dateTime = formatMoneticoDate(new Date());
    const montant = `${parseFloat(amount).toFixed(2)}EUR`;
    const customerName = `${firstName} ${lastName}`.trim();

    // Texte libre avec valeur simple (sans caractères spéciaux pour éviter les problèmes de MAC)
    const texteLibreSimple = leadId
      ? `lead_${leadId}_${TEST_MODE ? 'TEST' : 'PROD'}`
      : `free_invoice_${TEST_MODE ? 'TEST' : 'PROD'}`;

    // Stocker les vraies données JSON séparément pour notre DB
    const texteLibreData = {
      leadId: leadId || null,
      description: description || 'Paiement assurance taxi',
      mode: TEST_MODE ? 'TEST' : 'PRODUCTION',
      isFreeInvoice: !leadId
    };

    // Contexte commande obligatoire (minimal avec billing)
    const contexteCommande = btoa(JSON.stringify({
      billing: {
        firstName: firstName,
        lastName: lastName,
        addressLine1: '1 rue de l\'assurance',
        city: 'Paris',
        postalCode: '75000',
        country: 'FR'
      }
    }));

    // Format MAC Version 3.0 selon documentation officielle Monético p.82
    // UNIQUEMENT les paramètres avec valeurs dans l'ordre alphabétique (pas de paramètres vides)
    const macData = `TPE=${MONETICO_CONFIG.tpe}*contexte_commande=${contexteCommande}*date=${dateTime}*lgue=${MONETICO_CONFIG.langue}*mail=${email}*montant=${montant}*reference=${reference}*societe=${MONETICO_CONFIG.societe}*texte-libre=${texteLibreSimple}*url_retour_err=${MONETICO_CONFIG.urlKO}*url_retour_ok=${MONETICO_CONFIG.urlOK}*version=${MONETICO_CONFIG.version}`;

    console.log('🔐 MAC Data:', macData);
    const mac = await calculateMAC(macData);
    console.log('🔐 MAC calculé:', mac.substring(0, 10) + '...');

    const { data: paymentData, error: insertError } = await supabase
      .from('monetico_payments')
      .insert({
        reference,
        lead_id: leadId || null,
        amount: parseFloat(amount),
        currency: 'EUR',
        status: 'pending',
        customer_email: email,
        customer_name: customerName,
        customer_phone: phone,
        description: description || 'Paiement assurance taxi',
        monetico_data: {
          texte_libre: texteLibreData,
          date: dateTime,
          mode: TEST_MODE ? 'TEST' : 'PRODUCTION',
          mac: mac,
          is_free_invoice: !leadId
        },
        mac_sent: mac
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Erreur insertion:', insertError);
    }

    const paymentId = paymentData?.id || null;

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
            }, 2000);
          </script>
        </div>
      </body>
      </html>
    `;

    // ✅ Envoi automatique de l'email au prospect si demandé
    if (send_email && leadId && lead) {
      try {
        console.log('📧 Envoi email automatique au prospect...');

        // Récupérer le token d'accès du lead
        const { data: leadWithToken } = await supabase
          .from('crm_leads')
          .select('access_token')
          .eq('id', leadId)
          .maybeSingle();

        const accessToken = leadWithToken?.access_token;

        if (accessToken && paymentId) {
          // ✅ Lien DIRECT vers le formulaire de paiement Monetico (pas l'espace prospect)
          const paymentUrl = `${supabaseUrl}/functions/v1/get-monetico-payment-form?payment_id=${paymentId}&token=${accessToken}`;

          // Appeler l'edge function d'envoi d'email
          await fetch(`${supabaseUrl}/functions/v1/send-payment-link-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({
              lead_id: leadId,
              payment_url: paymentUrl,
              amount: parseFloat(amount),
              email: email,
              first_name: firstName,
              last_name: lastName
            })
          });

          console.log('✅ Email envoyé automatiquement à:', email);
        }
      } catch (emailError) {
        console.error('⚠️ Erreur envoi email (non bloquant):', emailError);
        // Ne pas bloquer le paiement si l'email échoue
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        reference,
        paymentId,
        htmlForm,
        formData,
        actionUrl: MONETICO_CONFIG.urlServeur,
        mode: TEST_MODE ? 'TEST' : 'PRODUCTION',
        email_sent: send_email && leadId ? true : false
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
