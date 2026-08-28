const UPSTREAM = 'https://postgres-read-api.taxiassur.com';
const ALLOWED_PREFIXES = ['/rest/v1/', '/auth/v1/', '/storage/v1/', '/functions/v1/', '/realtime/v1/'];

export async function onRequest({ request, params }) {
  const suffix = Array.isArray(params.path) ? params.path.join('/') : String(params.path || '');
  const upstreamPath = `/${suffix}`;
  if (!ALLOWED_PREFIXES.some((prefix) => upstreamPath.startsWith(prefix))) {
    return Response.json({ error: 'not_found' }, { status: 404 });
  }

  const incoming = new URL(request.url);
  const target = new URL(upstreamPath, UPSTREAM);
  target.search = incoming.search;

  const headers = new Headers(request.headers);
  headers.delete('cookie');
  headers.delete('host');
  headers.delete('origin');
  headers.delete('referer');
  headers.delete('cf-connecting-ip');
  headers.delete('cf-ray');

  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    redirect: 'manual',
  });

  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete('set-cookie');
  responseHeaders.set('Cache-Control', 'no-store');
  responseHeaders.set('X-Content-Type-Options', 'nosniff');
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}
