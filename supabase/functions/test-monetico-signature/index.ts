import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const MONETICO_CONFIG = {
  tpe: '7374133',
  societe: 'taxiassur',
  macKey: '106FA85BF342FD4EE95C883D82865B5CC1F63890',
  version: '3.0',
  langue: 'FR',
};

async function calculateMAC(data: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));

  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
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
    const { testKey } = await req.json().catch(() => ({ testKey: null }));
    const keyToUse = testKey || MONETICO_CONFIG.macKey;

    // Données de test
    const dateTransaction = formatMoneticoDate(new Date());
    const reference = 'TEST123';
    const montant = '10.00EUR';
    const texteLibre = 'Test paiement';
    const email = 'test@taxiassur.com';
    const urlRetour = 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/monetico-webhook';
    const urlOK = 'https://taxiassur.com/espace-prospect/paiement-success';
    const urlKO = 'https://taxiassur.com/espace-prospect/paiement-error';

    // Calcul MAC selon spec Monético v3.0
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
      email,
      urlRetour,
      urlOK,
      urlKO,
    ].join('*');

    const mac = await calculateMAC(macString, keyToUse);

    // Paramètres complets
    const params = {
      version: MONETICO_CONFIG.version,
      TPE: MONETICO_CONFIG.tpe,
      date: dateTransaction,
      montant: montant,
      reference: reference,
      MAC: mac,
      url_retour: urlRetour,
      url_retour_ok: urlOK,
      url_retour_err: urlKO,
      lgue: MONETICO_CONFIG.langue,
      societe: MONETICO_CONFIG.societe,
      mail: email,
      'texte-libre': texteLibre,
    };

    return new Response(
      JSON.stringify({
        success: true,
        debug: {
          macString: macString,
          macCalculated: mac,
          keyUsed: testKey ? 'Custom key provided' : 'Default key from config',
          keyLength: keyToUse.length,
        },
        params: params,
        testUrl: 'https://p.monetico-services.com/paiement.cgi',
        htmlForm: `
<!DOCTYPE html>
<html>
<head>
  <title>Test Monético - Signature</title>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
    .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { color: #333; }
    .debug { background: #f0f0f0; padding: 15px; border-radius: 4px; margin: 20px 0; }
    .debug pre { margin: 0; overflow-x: auto; }
    .params { background: #e8f4f8; padding: 15px; border-radius: 4px; }
    .btn { display: inline-block; background: #007bff; color: white; padding: 12px 24px; border-radius: 4px; text-decoration: none; margin-top: 20px; }
    .btn:hover { background: #0056b3; }
    code { background: #fff; padding: 2px 6px; border-radius: 3px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔍 Test Signature Monético</h1>

    <h2>Configuration</h2>
    <div class="debug">
      <strong>TPE:</strong> ${params.TPE}<br>
      <strong>Société:</strong> ${params.societe}<br>
      <strong>Version:</strong> ${params.version}<br>
      <strong>Date transaction:</strong> ${params.date}
    </div>

    <h2>Chaîne MAC</h2>
    <div class="debug">
      <pre>${macString}</pre>
    </div>

    <h2>Signature Calculée (MAC)</h2>
    <div class="debug">
      <code style="font-size: 14px; word-break: break-all;">${mac}</code>
    </div>

    <h2>Paramètres Complets</h2>
    <div class="params">
      ${Object.entries(params).map(([key, value]) => `<strong>${key}:</strong> ${value}<br>`).join('')}
    </div>

    <form method="POST" action="https://p.monetico-services.com/paiement.cgi">
      ${Object.entries(params).map(([key, value]) => `<input type="hidden" name="${key}" value="${value}">`).join('\n      ')}
      <button type="submit" class="btn">🚀 Tester le Paiement</button>
    </form>
  </div>
</body>
</html>`,
      }, null, 2),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
