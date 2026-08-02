#!/usr/bin/env node

const dotenv = require('dotenv');

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVER_KEY ||
  process.env.SUPABASE_SECRET_KEY;

const LIMIT = Math.max(1, Number.parseInt(process.env.CLIENT_ACCESS_OUTBOX_LIMIT || '10', 10));
const MAX_ATTEMPTS = Math.max(1, Number.parseInt(process.env.CLIENT_ACCESS_OUTBOX_MAX_ATTEMPTS || '5', 10));
const DRY_RUN = process.env.CLIENT_ACCESS_OUTBOX_DRY_RUN === '1';

function requireEnv() {
  if (!SUPABASE_URL) throw new Error('SUPABASE_URL or VITE_SUPABASE_URL is required');
  if (!SUPABASE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVER_KEY is required');
}

function baseUrl() {
  return SUPABASE_URL.replace(/\/$/, '');
}

function restHeaders(extra = {}) {
  return {
    apikey: SUPABASE_KEY,
    authorization: `Bearer ${SUPABASE_KEY}`,
    'content-type': 'application/json',
    ...extra,
  };
}

async function rest(pathname, options = {}) {
  const response = await fetch(`${baseUrl()}/rest/v1/${pathname}`, {
    ...options,
    headers: restHeaders(options.headers || {}),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${options.method || 'GET'} ${pathname} failed ${response.status}: ${text}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

async function loadPendingRows() {
  const params = new URLSearchParams({
    select: '*',
    status: 'eq.pending',
    scheduled_at: `lte.${new Date().toISOString()}`,
    order: 'scheduled_at.asc,created_at.asc',
    limit: String(LIMIT),
  });

  return rest(`client_portal_access_outbox?${params.toString()}`);
}

async function claimRow(row) {
  const attempts = Number(row.attempts || 0) + 1;
  const params = new URLSearchParams({
    id: `eq.${row.id}`,
    status: 'eq.pending',
  });

  const claimed = await rest(`client_portal_access_outbox?${params.toString()}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      status: 'processing',
      attempts,
      last_error: null,
      updated_at: new Date().toISOString(),
    }),
  });

  return Array.isArray(claimed) ? claimed[0] : null;
}

async function markRow(row, patch) {
  const params = new URLSearchParams({ id: `eq.${row.id}` });
  await rest(`client_portal_access_outbox?${params.toString()}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      ...patch,
      updated_at: new Date().toISOString(),
    }),
  });
}

async function invokeClientAccessEmail(row) {
  const response = await fetch(`${baseUrl()}/functions/v1/send-client-access`, {
    method: 'POST',
    headers: restHeaders(),
    body: JSON.stringify({
      lead_id: row.lead_id,
      source: 'client_portal_access_outbox',
      outbox_id: row.id,
    }),
  });

  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text };
  }

  if (!response.ok || payload?.success === false) {
    throw new Error(`send-client-access failed ${response.status}: ${JSON.stringify(payload).slice(0, 800)}`);
  }

  return payload;
}

async function processRow(row) {
  const claimed = await claimRow(row);
  if (!claimed) {
    return { id: row.id, lead_id: row.lead_id, status: 'skipped' };
  }

  if (DRY_RUN) {
    await markRow(claimed, {
      status: 'pending',
      scheduled_at: new Date().toISOString(),
      last_error: 'dry_run_not_sent',
    });
    return { id: claimed.id, lead_id: claimed.lead_id, status: 'dry_run' };
  }

  try {
    const result = await invokeClientAccessEmail(claimed);
    await markRow(claimed, {
      status: 'sent',
      processed_at: new Date().toISOString(),
      last_error: null,
    });
    return { id: claimed.id, lead_id: claimed.lead_id, status: 'sent', result };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const attempts = Number(claimed.attempts || 0);
    const maxAttempts = Math.max(1, Number(claimed.max_attempts || MAX_ATTEMPTS));
    const exhausted = attempts >= maxAttempts;
    const retryAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    await markRow(claimed, {
      status: exhausted ? 'failed' : 'pending',
      scheduled_at: exhausted ? new Date().toISOString() : retryAt,
      last_error: message.slice(0, 1000),
      processed_at: exhausted ? new Date().toISOString() : null,
    });
    return { id: claimed.id, lead_id: claimed.lead_id, status: exhausted ? 'failed' : 'retry', error: message };
  }
}

async function main() {
  requireEnv();

  const rows = await loadPendingRows();
  console.log(`Client portal access outbox: ${rows.length} row(s) to process`);

  const results = [];
  for (const row of rows) {
    const result = await processRow(row);
    results.push(result);
    console.log(`${result.status}: ${result.lead_id} (${result.id})`);
    if (result.error) console.error(result.error);
  }

  const failed = results.filter((result) => result.status === 'failed');
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
