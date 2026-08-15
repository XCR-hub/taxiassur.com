const fs = require('node:fs');

const envFiles = process.argv.slice(2).filter((value) => !value.startsWith('--'));
const reportArg = process.argv.find((value) => value.startsWith('--report='));
const reportPath = reportArg ? reportArg.slice('--report='.length) : 'C:/Windows/Temp/taxiassur-storage-inventory.json';
const env = { ...process.env };
for (const file of envFiles) {
  if (!fs.existsSync(file)) continue;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = raw.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (!match || match[1] in env) continue;
    env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}
const baseUrl = String(env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const key = env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!baseUrl || !key) throw new Error('Supabase server credentials are unavailable');
const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

async function request(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers: { ...headers, ...init.headers } });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
}

async function listFolder(bucket, prefix = '') {
  const files = [];
  for (let offset = 0; ; offset += 1000) {
    const rows = await request(`/storage/v1/object/list/${encodeURIComponent(bucket)}`, { method: 'POST', body: JSON.stringify({ prefix, limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } }) });
    for (const row of rows) {
      const objectPath = prefix ? `${prefix}/${row.name}` : row.name;
      if (row.id) files.push({ path: objectPath, size: Number(row.metadata?.size || 0), mime_type: row.metadata?.mimetype || null, updated_at: row.updated_at || null });
      else files.push(...await listFolder(bucket, objectPath));
    }
    if (rows.length < 1000) break;
  }
  return files;
}

(async () => {
  const buckets = await request('/storage/v1/bucket');
  const inventory = [];
  for (const bucket of buckets) {
    const files = await listFolder(bucket.id);
    inventory.push({ id: bucket.id, public: Boolean(bucket.public), file_count: files.length, total_bytes: files.reduce((sum, file) => sum + file.size, 0), files });
  }
  const report = { ok: true, checked_at: new Date().toISOString(), bucket_count: inventory.length, total_files: inventory.reduce((sum, item) => sum + item.file_count, 0), total_bytes: inventory.reduce((sum, item) => sum + item.total_bytes, 0), buckets: inventory };
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  process.stdout.write(JSON.stringify({ ok: true, bucket_count: report.bucket_count, total_files: report.total_files, total_bytes: report.total_bytes, report: reportPath }));
})().catch((error) => { process.stderr.write(JSON.stringify({ ok: false, error: error.message })); process.exitCode = 1; });
