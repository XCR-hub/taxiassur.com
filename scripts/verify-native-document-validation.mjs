import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const apiPath = process.argv[2] || 'F:/TaxiAssur/Api/taxiassur-platform-api.mjs';
const reportPath = process.argv[3] || 'F:/TaxiAssur/Logs/native-document-validation.json';
const quote = value => `'${String(value).replaceAll("'", "''")}'`;
const id = randomUUID();
const leadId = randomUUID();
const requestIds = [];
const report = { ok: false, checked_at: new Date().toISOString(), api_path: apiPath, error: null };
try {
  const source = readFileSync(apiPath, 'utf8');
  const start = source.indexOf('async function adminDocumentPatch(');
  const end = source.indexOf('async function adminLeadCreate(', start);
  if (start < 0 || end < start) throw new Error('Document handler not found');
  const create = new Function('verifiedAdminSession', 'readJsonBody', 'runPsql', 'parseJsonLine', 'quoteLiteral', 'json', 'queueProspectEventEmail', 'randomUUID', `${source.slice(start, end)}; return adminDocumentPatch;`);
  const document = { id, lead_id: leadId, status: 'pending', validated: false, file_name: 'native-validation-smoke.pdf', security_scan_status: 'clean' };
  let sql = `BEGIN;
    SET LOCAL statement_timeout = '15s';
    INSERT INTO taxiassur.records(collection, record_id, data, origin) VALUES
      ('prospect_documents', ${quote(id)}, ${quote(JSON.stringify(document))}::jsonb, 'rollback-smoke-test'),
      ('crm_lead_documents', ${quote(id)}, ${quote(JSON.stringify(document))}::jsonb, 'rollback-smoke-test');
    INSERT INTO taxiassur.file_objects(id, owner_type, owner_id, document_type, original_name, storage_path, mime_type, size_bytes, sha256_hex, scan_status, status)
      VALUES (${quote(id)}::uuid, 'system', ${quote(leadId)}, 'piece_identite', 'native-validation-smoke.pdf', ${quote(`rollback-smoke/${id}.pdf`)}, 'application/pdf', 1, ${quote('0'.repeat(64))}, 'clean', 'pending');
  `;
  for (const status of ['validated', 'verified', 'rejected', 'pending']) {
    const requestId = randomUUID();
    requestIds.push(requestId);
    let mutation;
    const action = create(async () => ({ sub: 'rollback-smoke-test' }), async () => ({ status }), async query => {
      if (query.startsWith('WITH updated')) { mutation = query; return JSON.stringify({ ...document, status }); }
      if (query.includes("SELECT jsonb_build_object('scan_status'")) return JSON.stringify({ scan_status: 'clean' });
      if (query.includes("SELECT jsonb_build_object('status'")) return JSON.stringify({ status: 'pending', scan_status: 'clean' });
      return 'null';
    }, JSON.parse, quote, (_res, _origin, status, body) => ({ status, body }), async () => false, randomUUID);
    const response = await action({}, {}, '', requestId, id);
    if (response.status !== 200 || !mutation) throw new Error(`Unable to build ${status} mutation`);
    const validated = ['validated', 'verified'].includes(status);
    sql += mutation + `
      DO $smoke$ BEGIN
        IF (SELECT count(*) FROM taxiassur.records WHERE collection IN ('prospect_documents','crm_lead_documents') AND record_id=${quote(id)} AND data->>'status'=${quote(status)} AND data->>'validated'=${quote(String(validated))}) <> 2 THEN RAISE EXCEPTION 'Document status mismatch: ${status}'; END IF;
        IF (SELECT status FROM taxiassur.file_objects WHERE id=${quote(id)}::uuid) <> ${quote(status === 'verified' ? 'validated' : status)} THEN RAISE EXCEPTION 'File status mismatch: ${status}'; END IF;
        IF (SELECT count(*) FROM taxiassur.audit_events WHERE request_id=${quote(requestId)}::uuid) <> 1 THEN RAISE EXCEPTION 'Expected one audit event: ${status}'; END IF;
      END $smoke$;
    `;
  }
  sql += `ROLLBACK;
    SELECT jsonb_build_object('records_remaining', (SELECT count(*) FROM taxiassur.records WHERE record_id=${quote(id)}), 'files_remaining', (SELECT count(*) FROM taxiassur.file_objects WHERE id=${quote(id)}::uuid), 'audit_remaining', (SELECT count(*) FROM taxiassur.audit_events WHERE request_id IN (${requestIds.map(value => quote(value) + '::uuid').join(',')})))::text;
  `;
  const env = {};
  for (const line of readFileSync('F:/TaxiAssur/Secrets/postgresql.env', 'utf8').split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line);
    if (match) env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
  const result = spawnSync(env.ASSUR_LOCAL_PSQL_PATH || 'F:/TaxiAssur/PostgreSQL/runtime/pgsql/bin/psql.exe', ['-X', '-q', '-A', '-t', '-h', env.POSTGRES_HOST || '127.0.0.1', '-p', env.POSTGRES_PORT || '5432', '-U', env.TAXIASSUR_APP_USER || 'taxiassur_app', '-d', env.POSTGRES_DB || 'taxiassur', '-v', 'ON_ERROR_STOP=1', '-f', '-'], {
    input: sql, encoding: 'utf8', windowsHide: true, timeout: 60_000,
    env: { ...process.env, PGPASSWORD: env.TAXIASSUR_APP_PASSWORD || '', PGCLIENTENCODING: 'UTF8' },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr.slice(0, 1000));
  const lines = result.stdout.trim().split(/\r?\n/);
  const cleanup = JSON.parse(lines.at(-1));
  if (Object.values(cleanup).some(count => count !== 0)) throw new Error('Smoke transaction was not rolled back');
  report.ok = true;
  report.checks = ['validated', 'verified', 'rejected', 'pending', 'duplicate_records', 'single_audit_event', 'transaction_rolled_back'];
  report.cleanup = cleanup;
} catch (error) {
  report.error = error.message;
} finally {
  writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
}
if (!report.ok) process.exitCode = 1;
