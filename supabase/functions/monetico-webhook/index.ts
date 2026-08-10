import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Edge Function : Webhook Monetico
 * Reçoit les notifications de paiement et met à jour le statut
 */

const MONETICO_MODE = (Deno.env.get('MONETICO_MODE') || '').trim().toLowerCase();
const TEST_MODE = MONETICO_MODE === 'test';
const MONETICO_MAC_KEY = TEST_MODE
  ? Deno.env.get('MONETICO_TEST_MAC_KEY') || ''
  : Deno.env.get('MONETICO_MAC_KEY') || '';
const MONETICO_OPERATIONAL_KEY = MONETICO_MAC_KEY.length % 2 === 1 ? '0' + MONETICO_MAC_KEY : MONETICO_MAC_KEY;
const MONETICO_TPE = TEST_MODE
  ? Deno.env.get('MONETICO_TEST_TPE') || ''
  : Deno.env.get('MONETICO_TPE') || '';

function constantTimeHexEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function verifyMAC(data: string, receivedMAC: string): Promise<boolean> {
  if ((MONETICO_OPERATIONAL_KEY.length < 32 || MONETICO_OPERATIONAL_KEY.length > 256 || MONETICO_OPERATIONAL_KEY.length % 2 !== 0 || !/^[0-9A-F]+$/i.test(MONETICO_OPERATIONAL_KEY)) || !/^[0-9A-F]{40}$/i.test(receivedMAC)) return false;
  const keyBytes = new Uint8Array(MONETICO_OPERATIONAL_KEY.length / 2);
  for (let i = 0; i < MONETICO_OPERATIONAL_KEY.length; i += 2) {
    keyBytes[i / 2] = parseInt(MONETICO_OPERATIONAL_KEY.slice(i, i + 2), 16);
  }
  const key = await crypto.subtle.importKey(
    "raw", keyBytes, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  const calculatedMAC = Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return constantTimeHexEqual(calculatedMAC.toLowerCase(), receivedMAC.toLowerCase());
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response('version=2\ncdr=1', { status: 405, headers: { 'Content-Type': 'text/plain' } });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Monetico webhook service configuration missing');
      return new Response('version=2\ncdr=1', { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (!['test', 'production'].includes(MONETICO_MODE) || !MONETICO_MAC_KEY || !MONETICO_TPE) {
      console.error('Monetico webhook configuration missing');
      return new Response('version=2\ncdr=1', { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }

    const formData = await req.formData();
    const webhookData: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (typeof value === 'string' && key.length <= 64 && value.length <= 4096) webhookData[key] = value;
    }

    // ⚠️ IMPORTANT: Monético envoie des noms avec tirets, pas underscores
    const reference = webhookData.reference;
    const montant = webhookData.montant;
    const codeRetour = webhookData['code-retour']; // Tiret, pas underscore!
    const cvx = webhookData.cvx;
    const numauto = webhookData.numauto;
    const date = webhookData.date;
    const TPE = webhookData.TPE;
    const receivedMAC = webhookData.MAC;
    const brand = webhookData.brand;

    if (!reference || !/^[A-Za-z0-9_-]{1,32}$/.test(reference) || !date || !montant || !codeRetour || !receivedMAC || TPE !== MONETICO_TPE) {
      console.error('Invalid Monetico webhook fields');
      return new Response('version=2\ncdr=1', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    // Vérifier la signature MAC selon doc Monético
    // Format CGI2 : TPE*date*montant*reference*texte-libre*version*code-retour*cvx*vld*brand
    const texte_libre = webhookData['texte-libre'] || '';
    const version = webhookData['version'] || '3.0';
    const vld = webhookData['vld'] || '';
    const brand_field = brand || '';

    // Construction chaîne MAC selon documentation Monético CGI2
    const macString = [
      TPE, date, montant, reference, texte_libre, version, codeRetour, cvx, vld, brand_field,
      webhookData.status3ds || "", numauto || "", webhookData.motifrefus || "",
      webhookData.originecb || "", webhookData.bincb || "", webhookData.hpancb || "",
      webhookData.ipclient || "", webhookData.originetr || "", webhookData.veres || "", webhookData.pares || "",
    ].join("*") + "*";

    const isValidMAC = await verifyMAC(macString, receivedMAC);

    if (!isValidMAC) {
      console.error("Invalid Monetico MAC signature");
      return new Response("version=2\ncdr=1", {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }

    // Retrieve the matching payment only after signature verification.
    const { data: payment, error: fetchError } = await supabase
      .from('monetico_payments')
      .select('*, crm_leads(id, first_name, last_name, email)')
      .eq('reference', reference)
      .single();

    if (fetchError || !payment) {
      console.error('Monetico payment not found');
      return new Response('version=2\ncdr=1', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    // Déterminer le statut (contrainte DB: pending, processing, success, failed, cancelled, refunded)
    const amountMatch = /^(\d{1,8}\.\d{2})EUR$/.exec(montant);
    const receivedAmount = amountMatch ? Number(amountMatch[1]) : Number.NaN;
    const expectedAmount = Number(payment.amount);
    if (!Number.isFinite(receivedAmount) || receivedAmount <= 0 || !Number.isFinite(expectedAmount) || Math.abs(receivedAmount - expectedAmount) > 0.005) {
      console.error("Monetico amount mismatch");
      return new Response("version=2\ncdr=1", { status: 200, headers: { "Content-Type": "text/plain" } });
    }

    const sanitizedWebhookData = {
      codeRetour,
      date,
      montant,
      cvx: cvx || null,
      numauto: numauto || null,
      brand: brand || null,
      vld: vld || null,
      status3ds: webhookData.status3ds || null,
      motifrefus: webhookData.motifrefus || null,
      mode: TEST_MODE ? 'TEST' : 'PRODUCTION',
    };

    const expectedSuccessCode = TEST_MODE ? 'payetest' : 'paiement';
    if (codeRetour !== expectedSuccessCode && codeRetour !== 'Annulation') {
      console.error('Unexpected Monetico return code for configured mode');
      return new Response('version=2\ncdr=1', { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }
    const paymentStatus = codeRetour === expectedSuccessCode ? 'success' : 'cancelled';


    // Traiter via la fonction RPC
    const { error: processError } = await supabase.rpc('process_monetico_payment', {
      p_reference: reference,
      p_status: paymentStatus,
      p_transaction_id: numauto || null,
      p_response_data: sanitizedWebhookData
    });

    if (processError) {
      console.error('Monetico payment processing failed', processError.code || 'unknown');
      return new Response('version=2\ncdr=1', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    return new Response('version=2\ncdr=0', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });

  } catch (error: unknown) {
    console.error('Monetico webhook failure', error instanceof Error ? error.name : 'unknown');
    return new Response('version=2\ncdr=1', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
});
