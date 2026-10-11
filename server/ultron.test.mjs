import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./taxiassur-platform-api.mjs', import.meta.url), 'utf8');
const handler = source.slice(source.indexOf('async function adminUltron('), source.indexOf('async function adminSeo('));
const create = new Function('verifiedAdminSession', 'recordsAll', 'json', `${handler}; return adminUltron;`);
const json = (_res, _origin, status, body) => ({ status, body });

test('ULTRON rejects unauthenticated reads before loading any records', async () => {
  const action = create(async () => null, () => { throw new Error('Unexpected read'); }, json);
  assert.equal((await action({ method: 'GET' }, {}, '', 'request')).status, 401);
});

test('ULTRON returns recent supervision data without exposing unrelated configuration', async () => {
  const today = new Date().toISOString().slice(0, 10);
  const records = {
    system_config: [{ key: 'smtp_password', value: 'private' }, { key: 'ultron_mode', value: 'active' }],
    cron_jobs_config: [{ name: 'daily', is_enabled: true }, { name: 'paused', is_active: false }],
    gsc_queries: [{ query: 'current', date: today, impressions: 100 }, { query: 'old', date: '2000-01-01', impressions: 900 }],
    ultron_health_checks: [{ id: 'zero', score: 0, checked_at: today }],
    ultron_anomalies: [{ id: 'fixed', repaired: true }, { id: 'open', repaired: false }],
    ultron_command_log: Array.from({ length: 25 }, (_, i) => ({ timestamp: String(i).padStart(2, '0') })),
  };
  const action = create(async () => ({ sub: 'admin' }), async key => records[key] || [], json);
  const { status, body } = await action({ method: 'GET' }, {}, '', 'request');
  assert.equal(status, 200);
  assert.deepEqual(body.configs, [{ key: 'ultron_mode', value: 'active' }]);
  assert.deepEqual(body.crons.map(row => row.active), [true, false]);
  assert.deepEqual(body.gsc.map(row => row.query), ['current']);
  assert.equal(body.health[0].score, 0);
  assert.deepEqual(body.anomalies.map(row => row.id), ['open']);
  assert.equal(body.logs.length, 20);
  assert.equal(body.logs[0].timestamp, '24');
});
