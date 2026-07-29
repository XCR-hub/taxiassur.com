#!/usr/bin/env node

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVER_KEY ||
  process.env.SUPABASE_SECRET_KEY;
const CLAMSCAN_PATH = process.env.CLAMSCAN_PATH || 'clamscan';
const CLAMSCAN_DATABASE_PATH = process.env.CLAMSCAN_DATABASE_PATH || '';
const CLAMSCAN_EXTRA_ARGS = (process.env.CLAMSCAN_ARGS || '').split(/\s+/).filter(Boolean);
const SCAN_LIMIT = Number.parseInt(process.env.SCAN_LIMIT || '25', 10);

const DEFAULT_BUCKETS = {
  prospect_documents: 'prospect-documents',
  crm_lead_documents: 'crm-documents',
  client_document_requests: 'client-documents',
  email_attachments: 'email-attachments',
};

function requireEnv() {
  if (!SUPABASE_URL) throw new Error('SUPABASE_URL is required');
  if (!SUPABASE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVER_KEY is required');
}

function restHeaders(extra = {}) {
  return {
    apikey: SUPABASE_KEY,
    authorization: `Bearer ${SUPABASE_KEY}`,
    'content-type': 'application/json',
    ...extra,
  };
}

function objectUrl(row) {
  if (!row.file_path) return null;
  if (/^https?:\/\//i.test(row.file_path)) return row.file_path;

  const bucket = row.storage_bucket || DEFAULT_BUCKETS[row.source_table];
  if (!bucket) return null;

  const encodedPath = String(row.file_path)
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');

  return `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/${bucket}/${encodedPath}`;
}

async function rest(pathname, options = {}) {
  const response = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${pathname}`, {
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

async function downloadToTemp(row) {
  const url = objectUrl(row);
  if (!url) throw new Error('missing_file_path_or_bucket');

  const response = await fetch(url, {
    headers: restHeaders(),
  });

  if (!response.ok) {
    throw new Error(`download_failed_${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const safeName = (row.file_name || `${row.id}.bin`).replace(/[^\w.-]+/g, '_');
  const tempPath = path.join(os.tmpdir(), `taxiassur-scan-${Date.now()}-${safeName}`);
  fs.writeFileSync(tempPath, Buffer.from(arrayBuffer));
  return tempPath;
}

function scanFile(filePath) {
  const startedAt = new Date().toISOString();
  const args = [...CLAMSCAN_EXTRA_ARGS];
  if (CLAMSCAN_DATABASE_PATH) args.push('--database', CLAMSCAN_DATABASE_PATH);
  args.push('--no-summary', filePath);

  const result = spawnSync(CLAMSCAN_PATH, args, {
    encoding: 'utf8',
    windowsHide: true,
  });
  const finishedAt = new Date().toISOString();

  if (result.error) {
    return {
      status: 'error',
      startedAt,
      finishedAt,
      result: {
        error: result.error.message,
        stdout: result.stdout || '',
        stderr: result.stderr || '',
      },
    };
  }

  if (result.status === 0) {
    return {
      status: 'clean',
      startedAt,
      finishedAt,
      result: {
        exit_code: result.status,
        stdout: result.stdout || '',
        stderr: result.stderr || '',
      },
    };
  }

  if (result.status === 1) {
    return {
      status: 'infected',
      startedAt,
      finishedAt,
      result: {
        exit_code: result.status,
        stdout: result.stdout || '',
        stderr: result.stderr || '',
      },
    };
  }

  return {
    status: 'error',
    startedAt,
    finishedAt,
    result: {
      exit_code: result.status,
      stdout: result.stdout || '',
      stderr: result.stderr || '',
    },
  };
}

async function patchScan(row, scan) {
  await rest(`document_security_scans?id=eq.${encodeURIComponent(row.id)}`, {
    method: 'PATCH',
    headers: { prefer: 'return=minimal' },
    body: JSON.stringify({
      status: scan.status,
      scan_started_at: scan.startedAt,
      scan_finished_at: scan.finishedAt,
      engine: 'clamav',
      result: scan.result,
      updated_at: new Date().toISOString(),
    }),
  });

  if (row.document_id && ['prospect_documents', 'crm_lead_documents', 'client_document_requests'].includes(row.source_table)) {
    await rest(`${row.source_table}?id=eq.${encodeURIComponent(row.document_id)}`, {
      method: 'PATCH',
      headers: { prefer: 'return=minimal' },
      body: JSON.stringify({
        security_scan_status: scan.status,
        security_scan_checked_at: scan.finishedAt,
        security_scan_engine: 'clamav',
        security_scan_result: scan.result,
      }),
    });
  }
}

async function main() {
  requireEnv();

  const pending = await rest(
    `document_security_scans?status=eq.pending&select=*&order=created_at.asc&limit=${SCAN_LIMIT}`,
  );

  console.log(`Pending scans: ${pending.length}`);

  for (const row of pending) {
    let tempPath = null;

    try {
      await rest(`document_security_scans?id=eq.${encodeURIComponent(row.id)}`, {
        method: 'PATCH',
        headers: { prefer: 'return=minimal' },
        body: JSON.stringify({
          status: 'pending',
          scan_started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      });

      tempPath = await downloadToTemp(row);
      const scan = scanFile(tempPath);
      await patchScan(row, scan);
      console.log(`${row.source_table}/${row.document_id || row.id}: ${scan.status}`);
    } catch (error) {
      const scan = {
        status: 'error',
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        result: { error: error instanceof Error ? error.message : String(error) },
      };
      await patchScan(row, scan);
      console.log(`${row.source_table}/${row.document_id || row.id}: error`);
    } finally {
      if (tempPath) {
        try {
          fs.unlinkSync(tempPath);
        } catch {
        }
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
