import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};


const MONETICO_MODE = (Deno.env.get('MONETICO_MODE') || '').trim().toLowerCase();
const TEST_MODE = MONETICO_MODE === 'test';

const MONETICO_TPE = TEST_MODE
  ? Deno.env.get('MONETICO_TEST_TPE') || ''  // Votre TPE de test Ingineco
  : Deno.env.get('MONETICO_TPE') || '';

const MONETICO_SOCIETE = TEST_MODE
  ? Deno.env.get('MONETICO_TEST_SOCIETE') || ''  // Votre code sociÃƒÂ©tÃƒÂ© test
  : Deno.env.get('MONETICO_SOCIETE') || '';

const MONETICO_MAC_KEY = TEST_MODE
  ? Deno.env.get('MONETICO_TEST_MAC_KEY') || ''  // Votre clÃƒÂ© MAC de test
  : Deno.env.get('MONETICO_MAC_KEY') || '';
const MONETICO_OPERATIONAL_KEY = MONETICO_MAC_KEY.length % 2 === 1 ? '0' + MONETICO_MAC_KEY : MONETICO_MAC_KEY;

const MONETICO_CONFIG = {
  tpe: MONETICO_TPE,
  societe: MONETICO_SOCIETE,
  macKey: MONETICO_OPERATIONAL_KEY,
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

  // Convertir la clÃƒÂ© hexadÃƒÂ©cimale en bytes (CRUCIAL pour MonÃƒÂ©tico!)
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
    .toUpperCase(); // MonÃƒÂ©tico utilise uppercase
}

function generateReference(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(11));
  const suffix = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
  return `${TEST_MODE ? 'T' : 'P'}${suffix}`;
}

function formatMoneticoDate(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}:${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

const internalDomains = new Set(["taxiassur.com", "taxiassur.fr", "xcr.fr"]);

async function isAuthorized(req: Request, supabaseUrl: string, serviceKey: string): Promise<boolean> {
  const authorization = req.headers.get("Authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  if (token === serviceKey) return true;
  const admin = createClient(supabaseUrl, serviceKey);
  const { data, error } = await admin.auth.getUser(token);
  if (error) return false;
  const email = data.user?.email?.toLowerCase() || "";
  return internalDomains.has(email.split("@")[1]);
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!await isAuthorized(req, supabaseUrl, supabaseKey)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!['test', 'production'].includes(MONETICO_MODE) || !MONETICO_CONFIG.tpe || !MONETICO_CONFIG.societe || MONETICO_CONFIG.macKey.length < 32 || MONETICO_CONFIG.macKey.length > 256 || MONETICO_CONFIG.macKey.length % 2 !== 0 || !/^[0-9A-F]+$/i.test(MONETICO_CONFIG.macKey)) {
      return new Response(JSON.stringify({ error: 'Paiement temporairement indisponible' }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let payload: Record<string, unknown>;
    try {
      payload = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Corps JSON invalide' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rawLeadId = payload.leadId ?? payload.lead_id;
    const leadId = typeof rawLeadId === 'string' ? rawLeadId.trim() : '';
    const amount = typeof payload.amount === 'number' ? payload.amount : Number(payload.amount);
    const description = typeof payload.description === 'string'
      ? payload.description.trim().slice(0, 500)
      : 'Paiement assurance taxi';
    const customerEmail = typeof payload.customerEmail === 'string'
      ? payload.customerEmail.trim().toLowerCase().slice(0, 254)
      : '';
    const customerFirstName = typeof payload.customerFirstName === 'string'
      ? payload.customerFirstName.trim().slice(0, 100)
      : '';
    const customerLastName = typeof payload.customerLastName === 'string'
      ? payload.customerLastName.trim().slice(0, 100)
      : '';
    const customerPhone = typeof payload.customerPhone === 'string'
      ? payload.customerPhone.trim().slice(0, 32)
      : '';
    const rawRequestId = payload.requestId ?? payload.request_id;
    const requestId = typeof rawRequestId === 'string' ? rawRequestId.trim().toLowerCase() : '';
    if (requestId && !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(requestId)) {
      return new Response(JSON.stringify({ error: 'Identifiant de requete invalide' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!Number.isFinite(amount) || amount < 0.5 || amount > 999999.99) {
      return new Response(JSON.stringify({ error: 'Montant invalide' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (leadId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(leadId)) {
      return new Response(JSON.stringify({ error: 'Identifiant prospect invalide' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let email = customerEmail;
    let firstName = customerFirstName;
    let lastName = customerLastName;
    let phone: string | null = customerPhone || null;

    if (leadId) {
      const { data: leadData, error: leadError } = await supabase
        .from('crm_leads')
        .select('email, first_name, last_name, phone')
        .eq('id', leadId)
        .single();

      if (leadError || !leadData) {
        return new Response(JSON.stringify({ error: 'Prospect introuvable' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      email = String(leadData.email || '').trim().toLowerCase().slice(0, 254);
      firstName = String(leadData.first_name || '').trim().slice(0, 100);
      lastName = String(leadData.last_name || '').trim().slice(0, 100);
      phone = String(leadData.phone || '').trim().slice(0, 32) || null;
    }

    if (!email || !firstName || !lastName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'Coordonnees client incompletes ou invalides' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const fingerprintInput = JSON.stringify({
      leadId: leadId || null, amount: amount.toFixed(2), email, firstName, lastName, phone, description,
    });
    const fingerprintBytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(fingerprintInput));
    const requestFingerprint = Array.from(new Uint8Array(fingerprintBytes), (byte) => byte.toString(16).padStart(2, '0')).join('');

    const reference = generateReference();
    const dateTime = formatMoneticoDate(new Date());
    const montant = `${amount.toFixed(2)}EUR`;
    const customerName = `${firstName} ${lastName}`.trim();

    // Texte libre avec valeur simple (sans caractÃƒÂ¨res spÃƒÂ©ciaux pour ÃƒÂ©viter les problÃƒÂ¨mes de MAC)
    const texteLibreSimple = leadId
      ? `lead_${leadId}_${TEST_MODE ? 'TEST' : 'PROD'}`
      : `free_invoice_${TEST_MODE ? 'TEST' : 'PROD'}`;

    // Stocker les vraies donnÃƒÂ©es JSON sÃƒÂ©parÃƒÂ©ment pour notre DB
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
    const buildPaymentResponse = (payment: {
      id: string; reference: string; payment_access_token: string; mac_sent: string;
      monetico_data: { date?: string } | null;
    }) => {
      const storedDate = String(payment.monetico_data?.date || dateTime);
      return new Response(JSON.stringify({
        success: true, paymentId: payment.id, reference: payment.reference,
        paymentAccessToken: payment.payment_access_token,
        formData: {
          version: MONETICO_CONFIG.version, TPE: MONETICO_CONFIG.tpe, date: storedDate,
          montant, reference: payment.reference, MAC: payment.mac_sent,
          url_retour_ok: MONETICO_CONFIG.urlOK, url_retour_err: MONETICO_CONFIG.urlKO,
          lgue: MONETICO_CONFIG.langue, societe: MONETICO_CONFIG.societe,
          contexte_commande: contexteCommande, 'texte-libre': texteLibreSimple, mail: email,
        },
        actionUrl: MONETICO_CONFIG.urlServeur,
        mode: TEST_MODE ? 'TEST' : 'PRODUCTION',
        idempotent: payment.reference !== reference,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    };

    const findExistingPayment = async () => {
      if (!requestId) return null;
      const { data } = await supabase.from('monetico_payments')
        .select('id, reference, payment_access_token, mac_sent, monetico_data, request_fingerprint')
        .eq('request_id', requestId).maybeSingle();
      if (!data) return null;
      if (data.request_fingerprint !== requestFingerprint) return 'conflict' as const;
      return data;
    };

    const existingPayment = await findExistingPayment();
    if (existingPayment === 'conflict') {
      return new Response(JSON.stringify({ error: 'Identifiant de requete deja utilise avec des donnees differentes' }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (existingPayment) return buildPaymentResponse(existingPayment);

    // Format MAC Version 3.0 selon documentation officielle MonÃƒÂ©tico p.82
    // UNIQUEMENT les paramÃƒÂ¨tres avec valeurs dans l'ordre alphabÃƒÂ©tique (pas de paramÃƒÂ¨tres vides)
    const macData = `TPE=${MONETICO_CONFIG.tpe}*contexte_commande=${contexteCommande}*date=${dateTime}*lgue=${MONETICO_CONFIG.langue}*mail=${email}*montant=${montant}*reference=${reference}*societe=${MONETICO_CONFIG.societe}*texte-libre=${texteLibreSimple}*url_retour_err=${MONETICO_CONFIG.urlKO}*url_retour_ok=${MONETICO_CONFIG.urlOK}*version=${MONETICO_CONFIG.version}`;
    const mac = await calculateMAC(macData);

    const { data: paymentData, error: insertError } = await supabase
      .from('monetico_payments')
      .insert({
        reference,
        request_id: requestId || null,
        request_fingerprint: requestId ? requestFingerprint : null,
        lead_id: leadId || null,
        amount,
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
          is_free_invoice: !leadId
        },
        mac_sent: mac
      })
      .select('id, reference, payment_access_token, mac_sent, monetico_data')
      .single();

    if (insertError || !paymentData) {
      if (insertError?.code === '23505' && requestId) {
        const racedPayment = await findExistingPayment();
        if (racedPayment && racedPayment !== 'conflict') return buildPaymentResponse(racedPayment);
      }
      console.error('Monetico payment insert failed', insertError?.code || 'unknown');
      return new Response(JSON.stringify({ error: 'Impossible de preparer le paiement' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return buildPaymentResponse(paymentData);

  } catch (error: unknown) {
    console.error('Monetico payment preparation failed', error instanceof Error ? error.name : 'unknown');
    return new Response(
      JSON.stringify({
        error: 'Erreur serveur'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
