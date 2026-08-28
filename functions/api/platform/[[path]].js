const UPSTREAM = 'https://postgres-read-api.taxiassur.com/platform/';

export async function onRequest({ request, params }) {
  const suffix = Array.isArray(params.path) ? params.path.join('/') : String(params.path || '');
  if (!suffix.startsWith('v1/')) return Response.json({ error: 'not_found' }, { status: 404 });
  const incoming = new URL(request.url);
  const target = new URL(suffix, UPSTREAM);
  target.search = incoming.search;
  const headers = new Headers(request.headers);
  for (const name of ['cookie', 'host', 'origin', 'referer', 'cf-connecting-ip', 'cf-ray']) headers.delete(name);
  try {
    const upstream = await fetch(target, { method: request.method, headers, body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body, redirect: 'manual' });
    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.delete('set-cookie');
    responseHeaders.set('Cache-Control', 'no-store');
    responseHeaders.set('X-Content-Type-Options', 'nosniff');
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return Response.json({ ok: false, error: 'platform_temporarily_unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '5' } });
  }
}
