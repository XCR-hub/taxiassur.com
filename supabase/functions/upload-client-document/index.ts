import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Apikey, X-Client-Info',
};
const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };
const tokenPattern = /^[0-9a-f]{64}$/i;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedTypes = new Map([
  ['application/pdf', 'pdf'],
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);
const maxFileSize = 10 * 1024 * 1024;
const documentTypes = new Set(['licence_taxi', 'permis_conduire', 'piece_identite', 'carte_grise', 'releve_information', 'autorisation_stationnement', 'rib', 'autre']);

function respond(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function safeOriginalName(value: unknown): string {
  return String(value || '')
    .normalize('NFKC')
    .split('')
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join('')
    .replace(/[\\/]/g, '_')
    .trim()
    .slice(0, 180);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return respond(405, { success: false, error: 'Method not allowed' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!supabaseUrl || !serviceKey) return respond(503, { success: false, error: 'Service indisponible' });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return respond(400, { success: false, error: 'Corps JSON invalide' });
  }

  const accessToken = typeof body.accessToken === 'string' ? body.accessToken.trim() : '';
  const action = body.action === 'finalize' ? 'finalize' : body.action === 'prepare' ? 'prepare' : body.action === 'list-requests' ? 'list-requests' : '';
  if (!tokenPattern.test(accessToken) || !action) return respond(400, { success: false, error: 'Requete invalide' });

  const scope = body.scope === 'prospect' ? 'prospect' : 'client';
  const documentType = typeof body.documentType === 'string' ? body.documentType.trim().toLowerCase() : 'autre';
  if (!documentTypes.has(documentType)) return respond(400, { success: false, error: 'Type de document invalide' });

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: lead, error: leadError } = await admin
    .from('crm_leads')
    .select('id, email, deleted_at')
    .eq('access_token', accessToken)
    .is('deleted_at', null)
    .maybeSingle();
  if (leadError || !lead) return respond(403, { success: false, error: 'Acces invalide' });

  const { data: portalByLead } = await admin
    .from('client_portal_users')
    .select('id')
    .eq('is_active', true)
    .eq('lead_id', lead.id)
    .maybeSingle();
  let portal = portalByLead;
  if (!portal && typeof lead.email === 'string' && lead.email) {
    const { data: portalByEmail } = await admin
      .from('client_portal_users')
      .select('id')
      .eq('is_active', true)
      .ilike('email', lead.email)
      .maybeSingle();
    portal = portalByEmail;
  }
  if (scope === 'client' && !portal) return respond(403, { success: false, error: 'Acces invalide' });
  if (action === 'list-requests') {
    const { data, error } = await admin.from('crm_document_requests')
      .select('id, titre, description, compagnie, phase, obligatoire, bloquant, statut, created_at, document_url, document_filename, notes_admin')
      .eq('lead_id', lead.id).order('created_at', { ascending: false }).limit(100);
    if (error) return respond(500, { success: false, error: 'Chargement impossible' });
    return respond(200, { success: true, requests: data || [] });
  }

  const originalName = safeOriginalName(body.fileName);
  const mimeType = typeof body.mimeType === 'string' ? body.mimeType.toLowerCase().trim() : '';
  const declaredSize = Number(body.fileSize);
  const extension = allowedTypes.get(mimeType);
  if (!originalName || !extension || !Number.isInteger(declaredSize) || declaredSize < 1 || declaredSize > maxFileSize) {
    return respond(400, { success: false, error: 'Fichier invalide' });
  }

  const bucket = admin.storage.from('prospect-documents');
  if (action === 'prepare') {
    const uploadId = crypto.randomUUID();
    const path = `${lead.id}/${scope}/${uploadId}.${extension}`;
    const { data, error } = await bucket.createSignedUploadUrl(path, { upsert: false });
    if (error || !data?.token) return respond(502, { success: false, error: 'Preparation impossible' });
    return respond(200, { success: true, path, uploadToken: data.token });
  }

  const path = typeof body.path === 'string' ? body.path.trim() : '';
  const pathPattern = new RegExp(`^${lead.id}/${scope}/([0-9a-f-]{36})\\.${extension}$`, 'i');
  const match = path.match(pathPattern);
  if (!match || !uuidPattern.test(match[1])) return respond(400, { success: false, error: 'Chemin invalide' });

  const fileName = path.split('/').pop() || '';
  const { data: objects, error: listError } = await bucket.list(`${lead.id}/${scope}`, { search: fileName, limit: 2 });
  const stored = objects?.find((item) => item.name === fileName);
  const actualSize = Number(stored?.metadata?.size);
  const actualMime = String(stored?.metadata?.mimetype || stored?.metadata?.contentType || '').toLowerCase();
  if (listError || !stored || !Number.isFinite(actualSize) || actualSize !== declaredSize || actualSize > maxFileSize || actualMime !== mimeType) {
    await bucket.remove([path]);
    return respond(400, { success: false, error: 'Fichier televerse invalide' });
  }

  const requestId = typeof body.requestId === 'string' ? body.requestId : '';
  if (requestId && !uuidPattern.test(requestId)) {
    await bucket.remove([path]);
    return respond(400, { success: false, error: 'Demande invalide' });
  }
  const { data: existing } = await admin.from('prospect_documents').select('id').eq('file_path', path).maybeSingle();
  if (existing) {
    if (requestId) {
      const { data: request } = await admin.from('crm_document_requests').update({
        document_url: path, document_filename: originalName, document_size: actualSize,
        statut: 'recu', received_at: new Date().toISOString(),
      }).eq('id', requestId).eq('lead_id', lead.id).select('id').maybeSingle();
      if (!request) return respond(403, { success: false, error: 'Demande non autorisee' });
    }
    return respond(200, { success: true, documentId: existing.id });
  }
  const { data: document, error: insertError } = await admin.from('prospect_documents').insert({
    lead_id: lead.id,
    file_name: originalName,
    file_path: path,
    file_url: path,
    file_size: actualSize,
    mime_type: mimeType,
    document_type: documentType,
    status: 'pending',
    uploaded_by: 'prospect',
  }).select('id').single();
  if (insertError || !document) {
    await bucket.remove([path]);
    return respond(500, { success: false, error: 'Enregistrement impossible' });
  }
  if (requestId) {
    const { data: request, error: requestError } = await admin.from('crm_document_requests').update({
      document_url: path, document_filename: originalName, document_size: actualSize,
      statut: 'recu', received_at: new Date().toISOString(),
    }).eq('id', requestId).eq('lead_id', lead.id).select('id').maybeSingle();
    if (requestError || !request) {
      await admin.from('prospect_documents').delete().eq('id', document.id);
      await bucket.remove([path]);
      return respond(403, { success: false, error: 'Demande non autorisee' });
    }
  }
  return respond(200, { success: true, documentId: document.id });
});
