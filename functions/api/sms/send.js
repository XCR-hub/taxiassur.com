import { json } from '../postgres-public/_shared.js';

const INTERNAL_DOMAINS = new Set(['taxiassur.com', 'taxiassur.fr', 'xcr.fr']);

async function authenticatedUser(request, env) {
  const authorization = request.headers.get('authorization') || '';
  if (!authorization.toLowerCase().startsWith('bearer ')) return null;
  const platformUrl = String(env.TAXIASSUR_PLATFORM_API_URL || 'https://postgres-read-api.taxiassur.com/platform').replace(/\/$/, '');
  const response = await fetch(`${platformUrl}/v1/auth/session`, {
    headers: { authorization, origin: 'https://taxiassur.com' },
  });
  if (!response.ok) return null;
  const session = await response.json().catch(() => null);
  const user = session?.user;
  const domain = String(user?.email || '').toLowerCase().split('@')[1];
  return user?.id && INTERNAL_DOMAINS.has(domain) ? user : null;
}

export async function onRequestPost({ request, env }) {
  const user = await authenticatedUser(request, env);
  if (!user) return json({ success: false, error: 'unauthorized' }, { status: 401, cacheControl: 'no-store' });
  const body = await request.json().catch(() => null);
  const to = typeof body?.to === 'string' ? body.to.trim() : '';
  const content = typeof body?.content === 'string' ? body.content.trim() : '';
  if (!to || !content) return json({ success: false, error: 'Missing required fields: to, content' }, { status: 400, cacheControl: 'no-store' });
  if (content.length > 480) return json({ success: false, error: 'sms_content_too_long' }, { status: 413, cacheControl: 'no-store' });

  const token = env.TAXIASSUR_SMS_API_TOKEN || '';
  const baseUrl = String(env.TAXIASSUR_SMS_API_URL || 'https://sms-api.taxiassur.com').replace(/\/$/, '');
  if (!token) return json({ success: false, error: 'sms_proxy_not_configured' }, { status: 503, cacheControl: 'no-store' });

  try {
    const response = await fetch(`${baseUrl}/api/sms/send`, {
      method: 'POST',
      headers: { accept: 'application/json', authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ to, content, tag: String(body.tag || 'crm-sms').slice(0, 64), requested_by: user.id }),
    });
    const result = await response.json().catch(() => ({}));
    return json(result, { status: response.status, cacheControl: 'no-store' });
  } catch {
    return json({ success: false, error: 'sms_service_unavailable' }, { status: 503, cacheControl: 'no-store' });
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: { allow: 'POST, OPTIONS' } });
}
