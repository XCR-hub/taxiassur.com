#!/usr/bin/env node

async function main() {
const siteUrl = process.env.TAXIASSUR_SITE_URL || 'https://taxiassur.com';
const runtimeText = await (await fetch(`${siteUrl}/env-config.js`, { cache: 'no-store' })).text();
const supabaseUrl = (runtimeText.match(/VITE_SUPABASE_URL\s*[:=]\s*["']([^"']+)/) || [])[1];
const anonKey = (runtimeText.match(/VITE_SUPABASE_ANON_KEY\s*[:=]\s*["']([^"']+)/) || [])[1];
if (!supabaseUrl || !anonKey) throw new Error('Runtime Supabase configuration unavailable');

const probes = [
  ['invite-admin-user', {}],
  ['send-sms', {}],
  ['send-client-access', {}],
  ['create-monetico-payment', {}],
  ['send-payment-link-monetico', {}],
];
const failures = [];
for (const [name, body] of probes) {
  const response = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
    method: 'POST',
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const ok = response.status === 401 || response.status === 403;
  console.log(`${ok ? 'OK' : 'FAIL'} ${name}: HTTP ${response.status}`);
  if (!ok) failures.push(`${name} accepted an anonymous browser token (HTTP ${response.status})`);
}
if (failures.length) {
  console.error(`Privileged production-function verification failed (${failures.length}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('Privileged production functions reject anonymous browser tokens.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});