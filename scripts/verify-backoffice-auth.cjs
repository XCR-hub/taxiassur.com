#!/usr/bin/env node

const { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } = require('node:fs');
const path = require('node:path');
const { collectPublicRuntimeConfigIssues } = require('./lib/runtime-public-config.cjs');

const SITE_URL = (process.env.SITE_URL || 'https://taxiassur.com').replace(/\/$/, '');
const NATIVE_API_URL = (process.env.TAXIASSUR_PLATFORM_API_URL || 'https://postgres-read-api.taxiassur.com/platform').replace(/\/$/, '');
const SKIP_LIVE = process.env.SKIP_LIVE_BACKOFFICE_AUTH_CHECK === '1';
const REPORT_PATH = process.env.BACKOFFICE_AUTH_REPORT || '';
const configuredMaxLiveJsAssets = Number.parseInt(process.env.BACKOFFICE_AUTH_MAX_LIVE_JS_ASSETS || '120', 10);
const MAX_LIVE_JS_ASSETS = Number.isFinite(configuredMaxLiveJsAssets) && configuredMaxLiveJsAssets > 0 ? configuredMaxLiveJsAssets : 120;
const configuredLiveBundleAttempts = Number.parseInt(process.env.BACKOFFICE_AUTH_LIVE_BUNDLE_ATTEMPTS || '5', 10);
const LIVE_BUNDLE_ATTEMPTS = Number.isFinite(configuredLiveBundleAttempts) && configuredLiveBundleAttempts > 0 ? Math.min(configuredLiveBundleAttempts, 8) : 5;
const configuredLiveBundleRetryDelayMs = Number.parseInt(process.env.BACKOFFICE_AUTH_LIVE_BUNDLE_RETRY_DELAY_MS || '5000', 10);
const LIVE_BUNDLE_RETRY_DELAY_MS = Number.isFinite(configuredLiveBundleRetryDelayMs) && configuredLiveBundleRetryDelayMs >= 0 ? Math.min(configuredLiveBundleRetryDelayMs, 15000) : 5000;
const checks = [];

const PASSWORD_RESET_MARKERS = [
  { name: 'reset_text', pattern: /Mot de passe oubli/i },
  { name: 'native_reset_endpoint', value: '/v1/auth/request-password-reset' },
  { name: 'native_reset_token', value: 'invalid_reset_token' },
];

const CRM_SIDEBAR_MARKERS = [
  { name: 'crm_sidebar_class', value: 'crm-sidebar' },
];

function read(relativePath) {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

function addCheck(name, ok, details = {}) {
  checks.push({ name, ok: Boolean(ok), details });
}

function markerExists(text, marker) {
  return marker.pattern ? marker.pattern.test(text) : text.includes(marker.value);
}

function summarizeMarkers(text, markers) {
  const found = Object.fromEntries(markers.map((marker) => [marker.name, markerExists(text, marker)]));
  return {
    ok: Object.values(found).every(Boolean),
    found,
  };
}

function summarizeBackofficeBundle(bundle) {
  const text = bundle.text || '';
  return {
    reset: summarizeMarkers(text, PASSWORD_RESET_MARKERS),
    sidebar: summarizeMarkers(text, CRM_SIDEBAR_MARKERS),
  };
}

function addBackofficeBundleChecks(prefix, bundle) {
  const { reset, sidebar } = summarizeBackofficeBundle(bundle);
  const baseDetails = {
    asset_count: bundle.asset_count,
    bytes: bundle.bytes,
    fetch_failures: bundle.fetch_failures || [],
    attempts: bundle.attempts,
    truncated: bundle.truncated,
    max_live_js_assets: bundle.max_live_js_assets,
  };

  addCheck(`${prefix} bundle exposes password reset UI`, bundle.available !== false && reset.ok, {
    ...baseDetails,
    found: reset.found,
    reason: bundle.reason,
  });
  addCheck(`${prefix} bundle contains persistent CRM sidebar marker`, bundle.available !== false && sidebar.ok, {
    ...baseDetails,
    found: sidebar.found,
    reason: bundle.reason,
  });
}

function hasRequiredBackofficeMarkers(bundle) {
  const { reset, sidebar } = summarizeBackofficeBundle(bundle);
  return bundle.available !== false && reset.ok && sidebar.ok;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout(ms = 12000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  return { controller, timeout };
}

async function fetchText(label, url, timeoutMs = 12000) {
  const { controller, timeout } = withTimeout(timeoutMs);
  try {
    const response = await fetch(url, {
      headers: { accept: 'text/plain,*/*', 'cache-control': 'no-cache' },
      signal: controller.signal,
    });
    const text = await response.text();
    return { label, ok: response.ok, status: response.status, text };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJson(label, url, timeoutMs = 12000, headers = {}) {
  const { controller, timeout } = withTimeout(timeoutMs);
  try {
    const response = await fetch(url, {
      headers: { accept: 'application/json', 'cache-control': 'no-cache', ...headers },
      signal: controller.signal,
    });
    const text = await response.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {}
    return { label, ok: response.ok, status: response.status, json };
  } finally {
    clearTimeout(timeout);
  }
}

function readLocalBuildBundle() {
  const distDir = path.join(process.cwd(), 'dist');
  const assetsDir = path.join(distDir, 'assets');

  if (!existsSync(assetsDir)) {
    return { available: false, reason: 'dist/assets is not present yet', text: '', asset_count: 0, bytes: 0 };
  }

  const indexPath = path.join(distDir, 'index.html');
  const jsFiles = readdirSync(assetsDir)
    .filter((file) => file.endsWith('.js'))
    .sort();
  const texts = [];

  if (existsSync(indexPath)) {
    texts.push(readFileSync(indexPath, 'utf8'));
  }

  for (const file of jsFiles) {
    texts.push(readFileSync(path.join(assetsDir, file), 'utf8'));
  }

  const text = texts.join('\n');
  return {
    available: true,
    text,
    asset_count: jsFiles.length,
    bytes: Buffer.byteLength(text, 'utf8'),
  };
}

function extractJsAssetPaths(text) {
  const assets = new Set();
  const assetPattern = /(?:^|["'(`,\s])((?:\.\/|\/)?assets\/[A-Za-z0-9._~@/-]+\.js)(?=["'`),\s]|$)/g;
  let match;

  while ((match = assetPattern.exec(text || '')) !== null) {
    let assetPath = match[1].replace(/^\.\//, '');
    if (!assetPath.startsWith('/')) assetPath = `/${assetPath}`;
    assets.add(assetPath);
  }

  return Array.from(assets);
}

async function fetchLiveBundle(seedTexts) {
  const queue = [];
  const seen = new Set();
  const failures = [];
  const texts = [...seedTexts];

  for (const seedText of seedTexts) {
    for (const assetPath of extractJsAssetPaths(seedText)) {
      if (!queue.includes(assetPath)) queue.push(assetPath);
    }
  }

  while (queue.length > 0 && seen.size < MAX_LIVE_JS_ASSETS) {
    const assetPath = queue.shift();
    if (!assetPath || seen.has(assetPath)) continue;
    seen.add(assetPath);

    const asset = await fetchText(`live asset ${assetPath}`, `${SITE_URL}${assetPath}?ts=${Date.now()}`, 12000);
    if (!asset.ok) {
      failures.push({ asset: assetPath, status: asset.status });
      continue;
    }

    texts.push(asset.text || '');
    for (const discoveredPath of extractJsAssetPaths(asset.text || '')) {
      if (!seen.has(discoveredPath) && !queue.includes(discoveredPath) && seen.size + queue.length < MAX_LIVE_JS_ASSETS) {
        queue.push(discoveredPath);
      }
    }
  }

  const text = texts.join('\n');
  return {
    available: seen.size > 0,
    reason: seen.size > 0 ? undefined : 'no live JS assets discovered from backoffice routes',
    text,
    asset_count: seen.size,
    bytes: Buffer.byteLength(text, 'utf8'),
    fetch_failures: failures.slice(0, 10),
    truncated: queue.length > 0,
    max_live_js_assets: MAX_LIVE_JS_ASSETS,
  };
}

async function fetchLiveBundleWithRetries(seedTexts) {
  let bestBundle = null;

  for (let attempt = 1; attempt <= LIVE_BUNDLE_ATTEMPTS; attempt += 1) {
    const bundle = await fetchLiveBundle(seedTexts);
    bundle.attempts = attempt;
    bestBundle = bundle;

    if (hasRequiredBackofficeMarkers(bundle)) return bundle;
    if (attempt < LIVE_BUNDLE_ATTEMPTS) await sleep(LIVE_BUNDLE_RETRY_DELAY_MS);
  }

  return bestBundle || { available: false, reason: 'live bundle retry scan produced no result', text: '', asset_count: 0, bytes: 0, attempts: 0 };
}

function verifySourceGuards() {
  const router = read('src/router.tsx');
  const login = read('src/components/AdminLogin.tsx');
  const setPassword = read('src/pages/SetPassword.tsx');
  const crmLayout = read('src/backoffice/CRMLayout.tsx');
  const productionHealth = read('scripts/verify-production-health.cjs');

  for (const route of ['/auth/set-password', '/auth/reset-password', '/reset-password', '/set-password', '/mot-de-passe-oublie']) {
    addCheck(`reset route exists: ${route}`, router.includes(`path: '${route}'`), { file: 'src/router.tsx' });
  }

  addCheck('login exposes native password reset action', login.includes('Mot de passe oubli') && login.includes('nativeAdminRequestPasswordReset'), {
    file: 'src/components/AdminLogin.tsx',
  });
  addCheck('set-password accepts strong native reset tokens', setPassword.includes("searchParams.get('token')") && setPassword.includes('[0-9a-f]{64}'), {
    file: 'src/pages/SetPassword.tsx',
  });
  addCheck('set-password invokes native password reset', setPassword.includes('nativeAdminResetPassword(resetToken, password)'), {
    file: 'src/pages/SetPassword.tsx',
  });
  addCheck('set-password no longer uses Supabase auth flows', !setPassword.includes('supabase.auth') && !login.includes('supabase.auth'), {
    file: 'src/pages/SetPassword.tsx',
  });
  addCheck('authenticated backoffice uses native password reset', crmLayout.includes('nativeAdminRequestPasswordReset(user.email)') && !crmLayout.includes('resetPasswordForEmail'), {
    file: 'src/backoffice/CRMLayout.tsx',
  });
  addCheck('set-password is noindex', setPassword.includes('noindex, nofollow'), {
    file: 'src/pages/SetPassword.tsx',
  });
  addCheck('authenticated backoffice mounts persistent CRM sidebar', crmLayout.includes('<NavigationMenu />') && crmLayout.includes('crm-sidebar'), {
    file: 'src/backoffice/CRMLayout.tsx',
  });
  addCheck('production health probes native platform API', productionHealth.includes('native-platform-health'), {
    file: 'scripts/verify-production-health.cjs',
  });
  addCheck('production health rejects server/service_role runtime Supabase keys', productionHealth.includes('Supabase runtime public key is not server/service_role'), {
    file: 'scripts/verify-production-health.cjs',
  });
}

function verifyLocalBuildGuards() {
  const bundle = readLocalBuildBundle();
  if (!bundle.available) {
    addCheck('local dist backoffice bundle checks skipped', true, { reason: bundle.reason });
    return;
  }

  addCheck('live bundle scanner budget covers local JS asset graph', bundle.asset_count <= MAX_LIVE_JS_ASSETS, {
    asset_count: bundle.asset_count,
    max_live_js_assets: MAX_LIVE_JS_ASSETS,
  });

  addBackofficeBundleChecks('local dist backoffice', bundle);
}

async function verifyLiveGuards() {
  if (SKIP_LIVE) {
    addCheck('live backoffice auth checks skipped', true, { reason: 'SKIP_LIVE_BACKOFFICE_AUTH_CHECK=1' });
    return;
  }

  const [backoffice, setPassword, envConfig] = await Promise.all([
    fetchText('backoffice', `${SITE_URL}/backoffice?ts=${Date.now()}`),
    fetchText('set-password', `${SITE_URL}/auth/set-password?ts=${Date.now()}`),
    fetchText('env-config', `${SITE_URL}/env-config.js?ts=${Date.now()}`),
  ]);

  const runtimeConfigText = envConfig.text || '';
  const runtimePublicConfigAudit = collectPublicRuntimeConfigIssues(runtimeConfigText, {
    requireEnvConfig: true,
    requireSupabaseAnonKey: true,
  });
  const supabasePublicKeyInfo = runtimePublicConfigAudit.supabase_public_key;

  addCheck('/backoffice is reachable', backoffice.ok && backoffice.status === 200, { status: backoffice.status });
  addCheck('/auth/set-password is reachable', setPassword.ok && setPassword.status === 200, { status: setPassword.status });
  addCheck('runtime env-config is reachable', envConfig.ok && runtimeConfigText.includes('window.ENV_CONFIG'), { status: envConfig.status });
  addCheck('runtime env-config exposes only browser-safe values', runtimePublicConfigAudit.ok, {
    issue_count: runtimePublicConfigAudit.issues.length,
    issues: runtimePublicConfigAudit.issues,
  });
  addCheck('runtime Supabase public key is not server/service_role', supabasePublicKeyInfo.ok, supabasePublicKeyInfo);

  const liveBundle = await fetchLiveBundleWithRetries([backoffice.text || '', setPassword.text || '']);
  addBackofficeBundleChecks('live backoffice', liveBundle);

  const nativeHealth = await fetchJson('native-platform-health', `${NATIVE_API_URL}/health`);
  addCheck('native backoffice platform API is healthy', nativeHealth.ok && nativeHealth.json?.ok === true, {
    status: nativeHealth.status,
    service: nativeHealth.json?.service || null,
  });
}

async function main() {
  verifySourceGuards();
  verifyLocalBuildGuards();
  await verifyLiveGuards();

  const report = {
    ok: checks.every((check) => check.ok),
    site_url: SITE_URL,
    checked_at: new Date().toISOString(),
    checks,
  };

  if (REPORT_PATH) {
    mkdirSync(path.dirname(path.resolve(REPORT_PATH)), { recursive: true });
    writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  }

  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
