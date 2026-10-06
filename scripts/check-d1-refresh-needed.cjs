const { appendFileSync } = require('node:fs');

async function main() {
  const site = (process.env.SITE_URL || 'https://taxiassur.com').replace(/\/$/, '');
  const response = await fetch(`${site}/api/d1/health?ts=${Date.now()}`, {
    signal: AbortSignal.timeout(12000),
    headers: { 'cache-control': 'no-cache' },
  });
  if (!response.ok) throw new Error(`D1 health returned ${response.status}`);
  const health = await response.json();
  const generated = Date.parse(health.metadata?.generated_at || '');
  const age = (Date.now() - generated) / 3600000;
  const refresh = health.ok !== true || health.metadata?.available !== true || !Number.isFinite(age) || age >= 3;
  console.log(`D1 cache age: ${Number.isFinite(age) ? age.toFixed(2) : 'unknown'} hours; refresh: ${refresh}`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `refresh=${refresh}\n`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
