import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { timingSafeEqual } from 'node:crypto';

const env = loadEnv();
const config = {
  host: env.TAXIASSUR_SMS_API_HOST || '127.0.0.1', port: Number(env.TAXIASSUR_SMS_API_PORT || 8792),
  token: env.TAXIASSUR_SMS_API_TOKEN || '', brevoApiKey: env.BREVO_API_KEY || '',
  sender: env.TAXIASSUR_SMS_SENDER || 'TaxiAssur', enabled: String(env.TAXIASSUR_SMS_ENABLED || '').toLowerCase() === 'true',
};
if (config.token.length < 24) throw new Error('TAXIASSUR_SMS_API_TOKEN missing or too short');

createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    if (url.pathname === '/health' && req.method === 'GET') return sendJson(res, 200, { ok: true, service: 'taxiassur-sms-api', enabled: config.enabled, provider_configured: Boolean(config.brevoApiKey) });
    if (url.pathname !== '/api/sms/send' || req.method !== 'POST') return sendJson(res, 404, { success: false, error: 'not_found' });
    if (!authorized(req)) return sendJson(res, 401, { success: false, error: 'unauthorized' });
    if (!config.enabled) return sendJson(res, 503, { success: false, error: 'sms_service_disabled' });
    if (!config.brevoApiKey) return sendJson(res, 503, { success: false, error: 'BREVO_API_KEY not configured' });
    const body = await readBody(req); const recipient = normalizePhone(body.to); const content = String(body.content || '').trim();
    if (!recipient || !content) return sendJson(res, 400, { success: false, error: 'invalid_sms_request' });
    if (content.length > 480) return sendJson(res, 413, { success: false, error: 'sms_content_too_long' });
    const response = await fetch('https://api.brevo.com/v3/transactionalSMS/sms', {
      method: 'POST', headers: { 'api-key': config.brevoApiKey, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ type: 'transactional', unicodeEnabled: true, sender: config.sender.slice(0, 11), recipient, content, tag: String(body.tag || 'crm-sms').slice(0, 64) }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return sendJson(res, response.status, { success: false, error: 'Failed to send SMS', details: { code: data.code, message: data.message } });
    return sendJson(res, 200, { success: true, messageId: data.messageId, reference: data.reference, smsCount: data.smsCount || 1 });
  } catch (error) { return sendJson(res, error.statusCode || 500, { success: false, error: error.publicMessage || 'server_error' }); }
}).listen(config.port, config.host, () => console.log(`[taxiassur-sms-api] listening on http://${config.host}:${config.port}`));

function loadEnv() { const out = { ...process.env }; for (const file of [process.env.TAXIASSUR_SMS_API_ENV_FILE, 'F:/TaxiAssur/Secrets/taxiassur-sms-api.env'].filter(Boolean)) { if (!existsSync(file)) continue; for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) { const line = raw.trim(); const i = line.indexOf('='); if (!line || line.startsWith('#') || i < 1) continue; const key = line.slice(0, i).trim(); let value = line.slice(i + 1).trim(); if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1); if (!(key in out)) out[key] = value; } } return out; }
function authorized(req) { const auth = String(req.headers.authorization || ''); const value = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : ''; const a = Buffer.from(config.token); const b = Buffer.from(value); return Boolean(value) && a.length === b.length && timingSafeEqual(a, b); }
function normalizePhone(value) { let phone = String(value || '').replace(/[\s.()-]/g, ''); if (phone.startsWith('00')) phone = `+${phone.slice(2)}`; if (phone.startsWith('0')) phone = `+33${phone.slice(1)}`; if (!phone.startsWith('+')) phone = `+${phone}`; return /^\+[1-9]\d{7,14}$/.test(phone) ? phone : null; }
async function readBody(req) { let raw = ''; for await (const chunk of req) { raw += chunk.toString('utf8'); if (Buffer.byteLength(raw) > 16384) throw Object.assign(new Error(), { statusCode: 413, publicMessage: 'request_too_large' }); } try { return JSON.parse(raw || '{}'); } catch { throw Object.assign(new Error(), { statusCode: 400, publicMessage: 'invalid_json' }); } }
function sendJson(res, status, payload) { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }); res.end(JSON.stringify(payload)); }
