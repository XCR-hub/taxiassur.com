import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Apikey, X-Client-Info',
};
const headers = { ...cors, 'Content-Type': 'application/json' };
const tokenPattern = /^[0-9a-f]{64}$/i;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ibanPattern = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/;
const bicPattern = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
const allowedRibTypes = new Map([['application/pdf', 'pdf'], ['image/jpeg', 'jpg'], ['image/png', 'png']]);
const maxRibSize = 5 * 1024 * 1024;

const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return reply(405, { success: false, error: 'Method not allowed' });
  const url = Deno.env.get('SUPABASE_URL') || '';
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!url || !key) return reply(503, { success: false, error: 'Service indisponible' });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return reply(400, { success: false, error: 'JSON invalide' }); }
  const token = typeof body.accessToken === 'string' ? body.accessToken.trim() : '';
  const action = typeof body.action === 'string' ? body.action : '';
  if (!tokenPattern.test(token) || !['get', 'prepare-rib', 'submit'].includes(action)) {
    return reply(400, { success: false, error: 'Requete invalide' });
  }

  const admin = createClient(url, key, { auth: { persistSession: false } });
  const { data: lead } = await admin.from('crm_leads').select('id').eq('access_token', token).is('deleted_at', null).maybeSingle();
  if (!lead) return reply(403, { success: false, error: 'Acces invalide' });

  const { data: existing } = await admin.from('lead_subscription_details')
    .select('id, iban, bic, account_holder_name, desired_effect_date, debit_date, rib_file_url, rib_file_path')
    .eq('lead_id', lead.id).maybeSingle();

  if (action === 'get') {
    let ribPreviewUrl: string | null = null;
    if (existing?.rib_file_path) {
      const { data } = await admin.storage.from('documents').createSignedUrl(existing.rib_file_path, 300);
      ribPreviewUrl = data?.signedUrl || null;
    }
    return reply(200, {
      success: true,
      subscription: existing ? {
        iban: existing.iban, bic: existing.bic, account_holder_name: existing.account_holder_name,
        desired_effect_date: existing.desired_effect_date, debit_date: existing.debit_date,
        has_rib: Boolean(existing.rib_file_path || existing.rib_file_url), rib_preview_url: ribPreviewUrl,
      } : null,
    });
  }

  const mimeType = typeof body.mimeType === 'string' ? body.mimeType.toLowerCase().trim() : '';
  const fileSize = Number(body.fileSize);
  const extension = allowedRibTypes.get(mimeType);
  if (action === 'prepare-rib') {
    if (!extension || !Number.isInteger(fileSize) || fileSize < 1 || fileSize > maxRibSize) {
      return reply(400, { success: false, error: 'RIB invalide' });
    }
    const path = `rib/${lead.id}/${crypto.randomUUID()}.${extension}`;
    const { data, error } = await admin.storage.from('documents').createSignedUploadUrl(path, { upsert: false });
    if (error || !data?.token) return reply(502, { success: false, error: 'Preparation impossible' });
    return reply(200, { success: true, path, uploadToken: data.token });
  }

  const quoteId = typeof body.acceptedQuoteId === 'string' ? body.acceptedQuoteId : '';
  const iban = String(body.iban || '').replace(/\s/g, '').toUpperCase();
  const bic = String(body.bic || '').replace(/\s/g, '').toUpperCase();
  const holder = String(body.accountHolderName || '').normalize('NFKC').trim().slice(0, 150);
  const effectDate = String(body.desiredEffectDate || '');
  const debitDate = Number(body.debitDate);
  const ribPath = typeof body.ribPath === 'string' ? body.ribPath.trim() : '';
  if (!uuidPattern.test(quoteId) || !ibanPattern.test(iban) || !bicPattern.test(bic) || holder.length < 2 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(effectDate) || effectDate < new Date().toISOString().slice(0, 10) ||
      !Number.isInteger(debitDate) || debitDate < 1 || debitDate > 28) {
    return reply(400, { success: false, error: 'Informations invalides' });
  }
  const { data: quote } = await admin.from('lead_company_quotes').select('id').eq('lead_id', lead.id).or(`id.eq.${quoteId},company_id.eq.${quoteId}`).eq('status', 'accepted').maybeSingle();
  if (!quote) return reply(403, { success: false, error: 'Devis invalide' });

  let finalRibPath = existing?.rib_file_path || null;
  if (ribPath) {
    const ribPattern = new RegExp(`^rib/${lead.id}/([0-9a-f-]{36})\\.(pdf|jpg|png)$`, 'i');
    const match = ribPath.match(ribPattern);
    if (!match || !uuidPattern.test(match[1]) || !extension || fileSize < 1 || fileSize > maxRibSize) {
      return reply(400, { success: false, error: 'Chemin RIB invalide' });
    }
    const name = ribPath.split('/').pop() || '';
    const { data: objects } = await admin.storage.from('documents').list(`rib/${lead.id}`, { search: name, limit: 2 });
    const object = objects?.find((item) => item.name === name);
    const storedMime = String(object?.metadata?.mimetype || object?.metadata?.contentType || '').toLowerCase();
    if (!object || Number(object.metadata?.size) !== fileSize || storedMime !== mimeType) {
      await admin.storage.from('documents').remove([ribPath]);
      return reply(400, { success: false, error: 'RIB televerse invalide' });
    }
    finalRibPath = ribPath;
  }
  if (!finalRibPath && !existing?.rib_file_url) return reply(400, { success: false, error: 'RIB requis' });

  const values: Record<string, unknown> = {
    lead_id: lead.id, accepted_quote_id: quote.id, iban, bic, account_holder_name: holder,
    rib_file_path: finalRibPath,
    desired_effect_date: effectDate, debit_date: String(debitDate), updated_at: new Date().toISOString(),
  };
  if (ribPath) values.rib_uploaded_at = new Date().toISOString();
  const operation = existing
    ? admin.from('lead_subscription_details').update(values).eq('id', existing.id)
    : admin.from('lead_subscription_details').insert(values);
  const { error: saveError } = await operation;
  if (saveError) {
    if (ribPath) await admin.storage.from('documents').remove([ribPath]);
    return reply(500, { success: false, error: 'Enregistrement impossible' });
  }
  if (ribPath && existing?.rib_file_path && existing.rib_file_path !== ribPath) {
    await admin.storage.from('documents').remove([existing.rib_file_path]);
  }

  await admin.from('crm_event_notifications').insert({
    lead_id: lead.id, event_type: 'subscription_details_submitted',
    message: 'Coordonnees bancaires et dates renseignees', priority: 10,
    context_data: { has_rib: true, effect_date: effectDate, debit_date: debitDate },
  });
  return reply(200, { success: true });
});
