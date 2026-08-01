#!/usr/bin/env node

const { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } = require('node:fs');
const path = require('node:path');
const { collectPublicRuntimeConfigIssues, readRuntimeConfigValue } = require('./lib/runtime-public-config.cjs');

const SITE_URL = (process.env.SITE_URL || 'https://taxiassur.com').replace(/\/$/, '');
const SKIP_LIVE = process.env.SKIP_LIVE_BACKOFFICE_AUTH_CHECK === '1';
const REPORT_PATH = process.env.BACKOFFICE_AUTH_REPORT || '';
const configuredMaxLiveJsAssets = Number.parseInt(process.env.BACKOFFICE_AUTH_MAX_LIVE_JS_ASSETS || '80', 10);
const MAX_LIVE_JS_ASSETS = Number.isFinite(configuredMaxLiveJsAssets) && configuredMaxLiveJsAssets > 0 ? configuredMaxLiveJsAssets : 80;
const REQUIRED_ADMIN_EMAILS = (process.env.REQUIRED_BACKOFFICE_ADMIN_EMAILS || 'master@taxiassur.com')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);
const checks = [];

const PASSWORD_RESET_MARKERS = [
  { name: 'reset_text', pattern: /Mot de passe oubli/i },
  { name: 'supabase_reset_call', value: 'resetPasswordForEmail' },
  { name: 'reset_redirect', value: '/auth/set-password' },
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

function addBackofficeBundleChecks(prefix, bundle) {
  const reset = summarizeMarkers(bundle.text || '', PASSWORD_RESET_MARKERS);
  const sidebar = summarizeMarkers(bundle.text || '', CRM_SIDEBAR_MARKERS);
  const baseDetails = {
    asset_count: bundle.asset_count,
    bytes: bundle.bytes,
    fetch_failures: bundle.fetch_failures || [],
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
  };
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

  addCheck('login exposes password reset action', login.includes('Mot de passe oubli') && login.includes('resetPasswordForEmail'), {
    file: 'src/components/AdminLogin.tsx',
  });
  addCheck('login reset redirects to /auth/set-password', login.includes('/auth/set-password'), {
    file: 'src/components/AdminLogin.tsx',
  });
  addCheck('set-password handles Supabase PKCE code flow', setPassword.includes('exchangeCodeForSession(authCode)'), {
    file: 'src/pages/SetPassword.tsx',
  });
  addCheck('set-password handles Supabase token_hash flow', setPassword.includes("searchParams.get('token_hash')") && setPassword.includes('verifyOtp'), {
    file: 'src/pages/SetPassword.tsx',
  });
  addCheck('set-password handles implicit hash recovery flow', setPassword.includes('setSession({ access_token: accessToken, refresh_token: refreshToken })'), {
    file: 'src/pages/SetPassword.tsx',
  });
  addCheck('set-password is noindex', setPassword.includes('noindex, nofollow'), {
    file: 'src/pages/SetPassword.tsx',
  });
  addCheck('authenticated backoffice mounts persistent CRM sidebar', crmLayout.includes('<NavigationMenu />') && crmLayout.includes('crm-sidebar'), {
    file: 'src/backoffice/CRMLayout.tsx',
  });
  addCheck('production health probes admin_users REST bootstrap', productionHealth.includes('admin-users-runtime-rest-probe'), {
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
  const supabaseUrl = readRuntimeConfigValue(runtimeConfigText, 'VITE_SUPABASE_URL').replace(/\/$/, '');
  const supabaseAnonKey = readRuntimeConfigValue(runtimeConfigText, 'VITE_SUPABASE_ANON_KEY');
  const supabasePublicKeyInfo = runtimePublicConfigAudit.supabase_public_key;

  addCheck('/backoffice is reachable', backoffice.ok && backoffice.status === 200, { status: backoffice.status });
  addCheck('/auth/set-password is reachable', setPassword.ok && setPassword.status === 200, { status: setPassword.status });
  addCheck('runtime env-config is reachable', envConfig.ok && runtimeConfigText.includes('window.ENV_CONFIG'), { status: envConfig.status });
  addCheck('runtime env-config exposes only browser-safe values', runtimePublicConfigAudit.ok, {
    issue_count: runtimePublicConfigAudit.issues.length,
    issues: runtimePublicConfigAudit.issues,
  });
  addCheck('runtime Supabase public config exists for backoffice auth', Boolean(supabaseUrl && supabaseAnonKey), {
    has_url: Boolean(supabaseUrl),
    has_anon_key: Boolean(supabaseAnonKey),
  });
  addCheck('runtime Supabase public key is not server/service_role', supabasePublicKeyInfo.ok, supabasePublicKeyInfo);

  const liveBundle = await fetchLiveBundle([backoffice.text || '', setPassword.text || '']);
  addBackofficeBundleChecks('live backoffice', liveBundle);

  if (supabaseUrl && supabaseAnonKey) {
    const adminUsers = await fetchJson(
      'admin-users-rest',
      `${supabaseUrl}/rest/v1/admin_users?select=id,email,role,is_active&limit=1`,
      12000,
      { apikey: supabaseAnonKey, authorization: `Bearer ${supabaseAnonKey}` },
    );
    addCheck('admin_users REST bootstrap does not return 401/403', adminUsers.ok && Array.isArray(adminUsers.json), {
      status: adminUsers.status,
      rows: Array.isArray(adminUsers.json) ? adminUsers.json.length : null,
    });

    for (const email of REQUIRED_ADMIN_EMAILS) {
      const requiredUser = await fetchJson(
        `required-admin-user-${email}`,
        `${supabaseUrl}/rest/v1/admin_users?select=id,email,full_name,role,is_active&email=ilike.${encodeURIComponent(email)}&is_active=eq.true&limit=1`,
        12000,
        { apikey: supabaseAnonKey, authorization: `Bearer ${supabaseAnonKey}` },
      );
      const row = Array.isArray(requiredUser.json) ? requiredUser.json[0] : null;
      addCheck(`required active admin user exists: ${email}`, requiredUser.ok && Boolean(row), {
        status: requiredUser.status,
        rows: Array.isArray(requiredUser.json) ? requiredUser.json.length : null,
        role: row?.role || null,
        is_active: row?.is_active ?? null,
      });
    }
  }
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
