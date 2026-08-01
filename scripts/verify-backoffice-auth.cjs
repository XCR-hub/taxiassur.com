#!/usr/bin/env node

const { readFileSync, writeFileSync, mkdirSync } = require('node:fs');
const path = require('node:path');

const SITE_URL = (process.env.SITE_URL || 'https://taxiassur.com').replace(/\/$/, '');
const SKIP_LIVE = process.env.SKIP_LIVE_BACKOFFICE_AUTH_CHECK === '1';
const REPORT_PATH = process.env.BACKOFFICE_AUTH_REPORT || '';
const checks = [];

function read(relativePath) {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

function addCheck(name, ok, details = {}) {
  checks.push({ name, ok: Boolean(ok), details });
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

function readRuntimeConfigValue(text, key) {
  const match = text.match(new RegExp(`${key}\\s*:\\s*['\"]([^'\"]+)['\"]`));
  return match?.[1] || '';
}

function inspectSupabasePublicKey(key) {
  if (!key) return { ok: false, type: 'missing' };
  if (key.startsWith('sb_secret_')) return { ok: false, type: 'sb_secret' };
  if (key.startsWith('sb_publishable_')) return { ok: true, type: 'sb_publishable' };

  const parts = key.split('.');
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
      return {
        ok: payload.role === 'anon',
        type: 'jwt',
        role: payload.role || null,
      };
    } catch (error) {
      return { ok: false, type: 'jwt', error: error instanceof Error ? error.message : String(error) };
    }
  }

  return { ok: false, type: 'unknown' };
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
  addCheck('login reset redirects to /auth/set-password', login.includes("/auth/set-password"), {
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

  addCheck('/backoffice is reachable', backoffice.ok && backoffice.status === 200, { status: backoffice.status });
  addCheck('/auth/set-password is reachable', setPassword.ok && setPassword.status === 200, { status: setPassword.status });
  addCheck('runtime env-config is reachable', envConfig.ok && envConfig.text.includes('window.ENV_CONFIG'), { status: envConfig.status });

  const supabaseUrl = readRuntimeConfigValue(envConfig.text || '', 'VITE_SUPABASE_URL').replace(/\/$/, '');
  const supabaseAnonKey = readRuntimeConfigValue(envConfig.text || '', 'VITE_SUPABASE_ANON_KEY');
  const supabasePublicKeyInfo = inspectSupabasePublicKey(supabaseAnonKey);
  addCheck('runtime Supabase public config exists for backoffice auth', Boolean(supabaseUrl && supabaseAnonKey), {
    has_url: Boolean(supabaseUrl),
    has_anon_key: Boolean(supabaseAnonKey),
  });
  addCheck('runtime Supabase public key is not server/service_role', supabasePublicKeyInfo.ok, supabasePublicKeyInfo);

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
  }
}

async function main() {
  verifySourceGuards();
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