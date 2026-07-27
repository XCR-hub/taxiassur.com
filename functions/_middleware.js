const APEX_HOST = 'taxiassur.com';
const WWW_HOST = 'www.taxiassur.com';

export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (url.hostname.toLowerCase() === WWW_HOST) {
    url.hostname = APEX_HOST;
    return Response.redirect(url.toString(), 301);
  }

  return context.next();
}
