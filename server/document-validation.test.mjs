import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./taxiassur-platform-api.mjs', import.meta.url), 'utf8');
const handler = source.slice(source.indexOf('async function adminDocumentPatch('), source.indexOf('async function adminLeadCreate('));
const create = new Function('verifiedAdminSession', 'readJsonBody', 'runPsql', 'parseJsonLine', 'quoteLiteral', 'json', 'queueProspectEventEmail', 'randomUUID', `${handler}; return adminDocumentPatch;`);
function fixture({ session = { sub: 'admin' }, status = 'validated', scan = 'clean', record = { status: 'pending' } } = {}) {
  const queries = [];
  const action = create(async () => session, async () => ({ status }), async sql => {
    queries.push(sql);
    if (sql.includes('SELECT jsonb_build_object(\'scan_status\'')) return JSON.stringify({ scan_status: scan });
    if (sql.includes('SELECT jsonb_build_object(\'status\'')) return JSON.stringify(record);
    if (sql.startsWith('WITH updated')) return JSON.stringify({ id: 'document', lead_id: 'lead', status });
    return 'null';
  }, JSON.parse, value => `'${String(value).replaceAll("'", "''")}'`, (_res, _origin, status, body) => ({ status, body }), async () => false, () => 'mail-id');
  return { queries, run: () => action({}, {}, '', 'request', '11111111-1111-4111-8111-111111111111') };
}

test('native validation rejects an absent session before reading documents', async () => {
  const f = fixture({ session: null });
  assert.equal((await f.run()).status, 401);
  assert.equal(f.queries.length, 0);
});
test('native validation keeps scanned files blocked', async () => {
  const f = fixture({ scan: 'infected' });
  assert.equal((await f.run()).status, 409);
  assert.ok(!f.queries.some(sql => sql.startsWith('WITH updated')));
});
test('quarantined documents cannot be validated even with a clean file scan', async () => {
  const f = fixture({ record: { status: 'quarantined' } });
  assert.equal((await f.run()).status, 409);
});
test('validation persists the boolean consumed by the prospect portal and updates file metadata', async () => {
  const f = fixture();
  assert.equal((await f.run()).status, 200);
  const sql = f.queries.find(sql => sql.startsWith('WITH updated'));
  assert.match(sql, /"validated":true/);
  assert.match(sql, /"validation_status":"validated"/);
  assert.match(sql, /UPDATE taxiassur.file_objects SET status='validated'/);
  // A migrated document may have records in both collections. Return one row
  // and audit once rather than evaluating a scalar subquery over both rows.
  assert.match(sql, /SELECT data::text FROM updated LIMIT 1/);
  assert.match(sql, /WHERE EXISTS\(SELECT 1 FROM updated\)\) SELECT/);
  assert.doesNotMatch(sql, /RETURNING \(SELECT data::text FROM updated\)/);
});
test('rejection clears previous validation metadata and remains possible for infected files', async () => {
  const f = fixture({ status: 'rejected', scan: 'infected' });
  assert.equal((await f.run()).status, 200);
  const sql = f.queries.find(sql => sql.startsWith('WITH updated'));
  assert.match(sql, /"validated":false/);
  assert.match(sql, /"validated_at":null/);
  assert.match(sql, /"validated_by":null/);
});
test('verified documents map to the validated status supported by native file storage', async () => {
  const f = fixture({ status: 'verified' });
  assert.equal((await f.run()).status, 200);
  const sql = f.queries.find(sql => sql.startsWith('WITH updated'));
  assert.match(sql, /"status":"verified"/);
  assert.match(sql, /UPDATE taxiassur.file_objects SET status='validated'/);
});
