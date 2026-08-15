const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');

const args = Object.fromEntries(process.argv.slice(2).map((item) => { const index = item.indexOf('='); return index > 0 ? [item.slice(0, index).replace(/^--/, ''), item.slice(index + 1)] : [item.replace(/^--/, ''), true]; }));
const env = { ...process.env };
for (const file of String(args.env || '').split(',').filter(Boolean)) {
  if (!fs.existsSync(file)) continue;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = raw.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (match && !(match[1] in env)) env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}
const baseUrl = String(env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const key = env.SUPABASE_SERVICE_ROLE_KEY || '';
const inventoryPath = args.inventory || 'C:/Windows/Temp/taxiassur-storage-inventory.json';
const destinationRoot = path.resolve(args.destination || 'F:/TaxiAssur/Documents/legacy');
const reportPath = args.report || 'C:/Windows/Temp/taxiassur-storage-migration.json';
if (!baseUrl || !key || !fs.existsSync(inventoryPath)) throw new Error('Migration configuration is incomplete');
const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8').replace(/^\uFEFF/, ''));
const objects = inventory.buckets.flatMap((bucket) => bucket.files.map((file) => ({ bucket: bucket.id, ...file })));
const report = { ok: false, started_at: new Date().toISOString(), destination: destinationRoot, expected_files: objects.length, migrated: 0, verified_existing: 0, failed: 0, total_bytes: 0, failures: [] };

function safeTarget(item) {
  const root = path.join(destinationRoot, item.bucket);
  const target = path.resolve(root, ...item.path.split('/'));
  if (!target.startsWith(`${root}${path.sep}`)) throw new Error('unsafe_object_path');
  return target;
}
async function hashFile(file) { const hash = createHash('sha256'); await pipeline(fs.createReadStream(file), hash); return hash.digest('hex'); }
async function migrate(item) {
  const target = safeTarget(item);
  if (fs.existsSync(target) && (await fsp.stat(target)).size === item.size) { report.verified_existing += 1; report.total_bytes += item.size; return; }
  await fsp.mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.partial`;
  await fsp.rm(temporary, { force: true });
  const encodedPath = item.path.split('/').map(encodeURIComponent).join('/');
  const response = await fetch(`${baseUrl}/storage/v1/object/authenticated/${encodeURIComponent(item.bucket)}/${encodedPath}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!response.ok || !response.body) throw new Error(`HTTP_${response.status}`);
  const hash = createHash('sha256');
  const source = Readable.fromWeb(response.body);
  source.on('data', (chunk) => hash.update(chunk));
  await pipeline(source, fs.createWriteStream(temporary, { flags: 'wx' }));
  const actualSize = (await fsp.stat(temporary)).size;
  if (actualSize !== item.size) { await fsp.rm(temporary, { force: true }); throw new Error(`size_mismatch_${actualSize}_${item.size}`); }
  await fsp.rename(temporary, target);
  report.migrated += 1; report.total_bytes += actualSize;
  return { sha256: hash.digest('hex') };
}
async function worker(queue) { while (queue.length) { const item = queue.shift(); try { await migrate(item); } catch (error) { report.failed += 1; report.failures.push({ bucket: item.bucket, path: item.path, error: error.message }); } } }

(async () => {
  await fsp.mkdir(destinationRoot, { recursive: true });
  const queue = [...objects];
  await Promise.all(Array.from({ length: Math.min(4, queue.length || 1) }, () => worker(queue)));
  report.completed_at = new Date().toISOString(); report.ok = report.failed === 0 && report.migrated + report.verified_existing === report.expected_files;
  await fsp.writeFile(reportPath, JSON.stringify(report, null, 2));
  process.stdout.write(JSON.stringify({ ok: report.ok, expected_files: report.expected_files, migrated: report.migrated, verified_existing: report.verified_existing, failed: report.failed, total_bytes: report.total_bytes, report: reportPath }));
  if (!report.ok) process.exitCode = 1;
})().catch(async (error) => { report.failures.push({ error: error.message }); report.failed += 1; await fsp.writeFile(reportPath, JSON.stringify(report, null, 2)); process.exitCode = 1; });
